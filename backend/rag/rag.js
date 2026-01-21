const { pipeline, env } = require('@xenova/transformers');
const { OpenRouter } = require("@openrouter/sdk");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure local environment for embeddings (Lightweight, ~100MB RAM)
env.localModelPath = './models';
env.allowRemoteModels = true;
env.useBrowserCache = false;

class RAGService {
    constructor() {
        this.embedder = null;
        this.client = null;
        this.documents = [];
        this.isReady = false;
    }

    async initialize() {
        console.log('Initializing RAG Service (Llama 3.1 Mode)...');
        try {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn("⚠️ OPENROUTER_API_KEY missing.");
            }

            this.client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

            // Load lightweight embedding model locally
            console.log('Loading Embeddings...');
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true
            });

            // Load and ingest documents
            const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'articles.json'), 'utf-8'));
            this.documents = [];

            console.log(`Ingesting ${articles.length} articles...`);
            for (const article of articles) {
                const output = await this.embedder(`${article.title}. ${article.content}`, { pooling: 'mean', normalize: true });
                this.documents.push({ ...article, embedding: output.data });
            }

            this.isReady = true;
            console.log(`✅ RAG Ready (${this.documents.length} docs). Using Llama 3.1 8B.`);

        } catch (error) {
            console.error('❌ RAG Init Failed:', error);
        }
    }

    cosineSimilarity(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }

    async retrieve(query, k = 3) {
        if (!this.isReady) return [];
        const output = await this.embedder(query, { pooling: 'mean', normalize: true });
        const queryEmb = output.data;

        return this.documents
            .map(doc => ({ doc, score: this.cosineSimilarity(queryEmb, doc.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k)
            .map(item => item.doc);
    }

    async answer(query) {
        if (!this.isReady) return { answer: "System is still initializing...", sources: [] };

        try {
            const docs = await this.retrieve(query);
            const context = docs.map((d, i) => `[${i + 1}] ${d.title}: ${d.content}`).join('\n\n');
            const prompt = `You are a yoga expert. Answer based on this context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

            // Using Llama 3.1 8B Instruct (Free & Reliable)
            const completion = await this.client.chat.send({
                model: "meta-llama/llama-3.1-8b-instruct:free",
                messages: [{ role: "user", content: prompt }]
            });

            return {
                answer: completion.choices[0]?.message?.content || "No answer generated.",
                sources: docs.map(d => ({ title: d.title, id: d.id }))
            };
        } catch (error) {
            console.error("AI Error:", error);
            // Fallback message handles 429/404
            return { answer: "The AI brain is currently busy (Rate Limited). Please try again in 10 seconds.", sources: [] };
        }
    }
}

module.exports = new RAGService();
