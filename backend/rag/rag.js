const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { OpenRouter } = require("@openrouter/sdk");

// LOCAL CONFIGURATION 
// Using local models avoids all external API issues and connectivity problems.
// Models:
// 1. Embeddings: Xenova/all-MiniLM-L6-v2 (Small, fast)
// 2. Generation: Xenova/LaMini-Flan-T5-248M (The 'Small' variant that actually works)

// Configure transformers to run locally
env.allowLocalModels = false;
env.useBrowserCache = false;

class RAGService {
    constructor() {
        this.embedder = null;
        this.openrouter = null;
        this.documents = [];
        this.isReady = false;
        this.initializationError = null;
    }

    async initialize() {
        console.log('Initializing Local RAG Service...');
        try {
            // 1. Load Embedding Model
            console.log('Loading Embedding Model...');
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true
            });

            // 2. Initialize OpenRouter
            console.log('Initializing OpenRouter Generation Client...');
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn("⚠️ OPENROUTER_API_KEY is missing!");
            }
            this.openrouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

            // 3. Load Documents
            const articlesPath = path.join(__dirname, 'data', 'articles.json');
            const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));

            console.log('Ingesting articles...');
            this.documents = [];
            for (const article of articles) {
                // Pre-compute embeddings
                const output = await this.embedder(article.title + ". " + article.content, { pooling: 'mean', normalize: true });
                this.documents.push({
                    ...article,
                    embedding: output.data
                });
            }

            this.isReady = true;
            console.log('✅ RAG Service Ready (Local Mode)');

        } catch (error) {
            console.error('❌ RAG Init Failed:', error);
            this.initializationError = error.message;
        }
    }

    // Mathematical similarity check
    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async retrieve(query, k = 3) {
        if (!this.embedder) return [];

        const output = await this.embedder(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = output.data;

        const scoredDocs = this.documents.map(doc => ({
            doc,
            score: this.cosineSimilarity(queryEmbedding, doc.embedding) // Using embedding comparison
        }));

        // Sort by highest score
        scoredDocs.sort((a, b) => b.score - a.score);

        return scoredDocs.slice(0, k).map(item => item.doc);
    }

    async answer(query) {
        if (!this.isReady) {
            return {
                answer: "The AI is still warming up. Please wait a moment...",
                sources: []
            };
        }

        try {
            // 1. Find relevant docs
            const docs = await this.retrieve(query);

            // 2. Prepare context
            const context = docs.map((d, i) => `[${i + 1}] ${d.title}: ${d.content}`).join('\n\n');
            const prompt = `Question: ${query}\nContext: ${context}\nAnswer:`;

            // 3. Generate Answer via OpenRouter
            console.log("Generating answer via OpenRouter...");
            const completion = await this.openrouter.chat.send({
                model: "openrouter/auto",
                max_tokens: 150,
                messages: [
                    { role: "system", content: "You are a helpful wellness and yoga assistant. Answer the user's question accurately using ONLY the provided context." },
                    { role: "user", content: prompt }
                ]
            });

            return {
                answer: completion?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.",
                sources: docs.map(d => ({ title: d.title, id: d.id }))
            };

        } catch (error) {
            console.error("Generation Error:", error);
            return { answer: "I encountered an error generating the answer.", sources: [] };
        }
    }
}

module.exports = new RAGService();
