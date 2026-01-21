const { pipeline, env } = require('@xenova/transformers');
const { OpenRouter } = require("@openrouter/sdk");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// OPTIMIZATION: Keep local embeddings (lightweight, ~100MB), use OpenRouter for Generation (Zero RAM)
env.localModelPath = './models';
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.useFSCache = false;

class RAGService {
    constructor() {
        this.embedder = null;
        this.client = null;
        this.documents = [];
        this.isReady = false;
        this.initializationError = null;
    }

    async initialize() {
        console.log('Initializing RAG Service (OpenRouter DeepSeek Mode)...');
        this.initializationError = null;
        try {
            if (global.gc) { global.gc(); }

            // 1. Check API Key
            if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.includes("YOUR_")) {
                console.warn("⚠️ WARNING: OPENROUTER_API_KEY is missing. RAG will fail to generate answers.");
            }

            // 2. Initialize OpenRouter Client
            this.client = new OpenRouter({
                apiKey: process.env.OPENROUTER_API_KEY,
            });

            // 3. Load Embedding Model (Runs locally, safe for free tier)
            console.log('Loading Local Embedding Model...');
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true
            });

            // 4. Load Documents
            const articlesPath = path.join(__dirname, 'data', 'articles.json');
            const articlesRaw = fs.readFileSync(articlesPath, 'utf-8');
            const articles = JSON.parse(articlesRaw);

            console.log(`Ingesting ${articles.length} articles...`);
            await this.ingest(articles);

            this.isReady = true;
            if (global.gc) { global.gc(); }
            console.log('RAG Service Initialized Successfully.');

        } catch (error) {
            console.error('Failed to initialize RAG Service:', error);
            this.initializationError = error.message;
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
        if (!this.isReady) return { answer: "System is initializing... (please wait)", sources: [] };

        try {
            const relevantDocs = await this.retrieve(query);

            const context = relevantDocs.map((doc, index) =>
                `Source ${index + 1}: ${doc.title}\n${doc.content}`
            ).join('\n\n');

            const systemPrompt = `You are a helpful and safe yoga wellness assistant. 
Answer the question based ONLY on the provided context. 
If the answer is not in the context, say "I don't know based on the provided sources".`;

            const userContent = `CONTEXT:\n${context}\n\nQUESTION: ${query}`;

            // Call OpenRouter API
            const stream = await this.client.chat.send({
                model: "deepseek/deepseek-r1:free", // Using the robust free alias
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                stream: true
            });

            // Buffer the stream response
            let finalAnswer = "";
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    finalAnswer += content;
                }
            }

            return {
                answer: finalAnswer || "No response received from AI.",
                sources: relevantDocs.map(d => ({ title: d.title, id: d.id }))
            };
        } catch (error) {
            console.error("OpenRouter Inference Error:", error);
            // Handle specific OpenRouter errors if needed in future
            return { answer: "I'm having trouble connecting to the DeepSeek AI. Please check your internet or API Key.", sources: [] };
        }
    }
}

module.exports = new RAGService();
