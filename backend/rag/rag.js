const { pipeline, env } = require('@xenova/transformers');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// OPTIMIZATION: Configure environment for low-memory usage
env.localModelPath = './models';
env.allowRemoteModels = true;
// Disable caching to save memory
env.useBrowserCache = false;
env.useFSCache = false;

class RAGService {
    constructor() {
        this.embedder = null;
        this.generator = null;
        this.documents = [];
        this.isReady = false;
        this.initializationError = null;
    }

    async initialize() {
        console.log('Initializing RAG Service (Optimized Mode)...');
        this.initializationError = null;
        try {
            if (global.gc) { global.gc(); } // Force GC if available

            // 1. Load Embedding Model First
            console.log('Loading Embedding Model...');
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true // Ensure quantization
            });

            // 2. Load Generation Model Second (Sequential loading reduces memory spike)
            console.log('Loading Generation Model...');
            // Using LaMini-Flan-T5-77M (Confirmed correct name) for maximum efficiency
            this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M', {
                quantized: true
            });

            // 3. Load documents
            const articlesPath = path.join(__dirname, 'data', 'articles.json');
            const articlesRaw = fs.readFileSync(articlesPath, 'utf-8');
            const articles = JSON.parse(articlesRaw);

            console.log(`Ingesting ${articles.length} articles...`);
            await this.ingest(articles);

            // Free up JSON memory
            this.isReady = true;
            if (global.gc) { global.gc(); } // Final Cleanup
            console.log('RAG Service Initialized Successfully.');

        } catch (error) {
            console.error('Failed to initialize RAG Service:', error);
            // Enhanced Error Reporting for Memory
            if (error.message.includes('memory') || error.message.includes('allocation')) {
                this.initializationError = "Out of Memory: Server lacks RAM for AI models.";
            } else {
                this.initializationError = error.message;
            }
        }
    }

    async ingest(articles) {
        this.documents = [];
        for (const article of articles) {
            const textToEmbed = `${article.title}. ${article.content}`;
            const embedding = await this.getEmbedding(textToEmbed);

            this.documents.push({
                ...article,
                embedding: embedding
            });
        }
    }

    async getEmbedding(text) {
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return output.data;
    }

    cosineSimilarity(vecA, vecB) {
        let dot = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
        }
        return dot;
    }

    async retrieve(query, k = 3) {
        if (!this.isReady) throw new Error('RAG Service not ready');
        const queryEmbedding = await this.getEmbedding(query);
        const scoredDocs = this.documents.map(doc => ({
            doc,
            score: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }));
        scoredDocs.sort((a, b) => b.score - a.score);
        return scoredDocs.slice(0, k).map(item => item.doc);
    }

    async answer(query) {
        if (this.initializationError) {
            return { answer: `System Failed: ${this.initializationError}`, sources: [] };
        }
        if (!this.isReady) return { answer: "System is still waking up... (Loading AI models, please wait ~60s)", sources: [] };

        try {
            const relevantDocs = await this.retrieve(query);
            const context = relevantDocs.map((doc, index) =>
                `Source ${index + 1}: ${doc.title}\n${doc.content}`
            ).join('\n\n');

            const prompt = `Answer based on this context only:\n\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

            const output = await this.generator(prompt, {
                max_new_tokens: 150,
                temperature: 0.7,
                repetition_penalty: 1.2
            });

            return {
                answer: output[0].generated_text,
                sources: relevantDocs.map(d => ({ title: d.title, id: d.id }))
            };
        } catch (error) {
            console.error("Inference Error:", error);
            return { answer: "Error generating answer (likely memory limit reached).", sources: [] };
        }
    }
}

module.exports = new RAGService();
