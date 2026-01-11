const { pipeline, env } = require('@xenova/transformers');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Skip local model checks for speed if desired, or keep defaults
env.localModelPath = './models';
env.allowRemoteModels = true;

class RAGService {
    constructor() {
        this.embedder = null;
        this.generator = null;
        this.documents = [];
        this.isReady = false;
    }

    async initialize() {
        console.log('Initializing RAG Service...');
        try {
            // Load embedding model
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

            // Load generation model (lightweight)
            // Using LaMini-Flan-T5-248M for reasonable quality/speed balance on CPU
            this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M');

            // Load documents
            // Ensure path resolution is robust
            const articlesPath = path.join(__dirname, 'data', 'articles.json');
            const articlesRaw = fs.readFileSync(articlesPath, 'utf-8');
            const articles = JSON.parse(articlesRaw);

            console.log(`Ingesting ${articles.length} articles...`);
            await this.ingest(articles);

            this.isReady = true;
            console.log('RAG Service Initialized.');
        } catch (error) {
            console.error('Failed to initialize RAG Service:', error);
        }
    }

    async ingest(articles) {
        this.documents = [];
        for (const article of articles) {
            // Create a composite text for embedding (Title + Content)
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
        // Dot product (assuming normalized vectors)
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
        if (!this.isReady) return { answer: "System is still loading...", sources: [] };

        const relevantDocs = await this.retrieve(query);

        // Construct Context
        const context = relevantDocs.map((doc, index) =>
            `Source ${index + 1}: ${doc.title}\n${doc.content}`
        ).join('\n\n');

        const prompt = `Answer the question based on the context below. If the answer is not in the context, say "I don't know based on the provided sources".\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

        // Generate Answer
        const output = await this.generator(prompt, {
            max_new_tokens: 150,
            temperature: 0.7,
            repetition_penalty: 1.2
        });

        const answerText = output[0].generated_text;

        return {
            answer: answerText,
            sources: relevantDocs.map(d => ({ title: d.title, id: d.id }))
        };
    }
}

module.exports = new RAGService();
