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

    async generateWithRetry(prompt) {
        // List of free models to try in order of preference
        const models = [
            "google/gemini-2.0-flash-exp:free",      // Fast, Smart
            "deepseek/deepseek-r1-distill-llama-70b:free", // Powerful
            "microsoft/phi-3-mini-128k-instruct:free", // Reliable backup
            "meta-llama/llama-3.1-8b-instruct:free"    // Popular backup
        ];

        for (const model of models) {
            try {
                console.log(`🤖 Trying model: ${model}...`);
                const completion = await this.client.chat.send({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                });

                if (completion?.choices?.[0]?.message?.content) {
                    console.log(`✅ Success with ${model}`);
                    return completion.choices[0].message.content;
                }
            } catch (error) {
                console.warn(`⚠️ Failed with ${model}: ${error.status || error.message}`);
                // Continue to next model
            }
        }
        throw new Error("All AI models are currently busy or offline.");
    }

    async answer(query) {
        if (!this.isReady) return { answer: "System is initializing...", sources: [] };

        try {
            const docs = await this.retrieve(query);
            const context = docs.map((d, i) => `[${i + 1}] ${d.title}: ${d.content}`).join('\n\n');
            const prompt = `You are a yoga expert. Answer based on this context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

            // Use the new robust retry mechanism
            const answerText = await this.generateWithRetry(prompt);

            return {
                answer: answerText,
                sources: docs.map(d => ({ title: d.title, id: d.id }))
            };
        } catch (error) {
            console.error("AI Error:", error);

            // EMERGENCY FALLBACK (Interview Safety Net)
            // If all AI models fail, we return the retrieved text directly.
            // This guarantees an answer is ALWAYS shown.
            if (docs && docs.length > 0) {
                console.log("⚠️ Activating Emergency Backup Mode (Direct Quote)");
                return {
                    answer: "Note: AI service is currently busy. Here is the relevant information from our database:\n\n" + docs[0].content,
                    sources: docs.map(d => ({ title: d.title, id: d.id }))
                };
            }

            return { answer: "I'm sorry, I couldn't connect to the knowledge base right now. Please try again.", sources: [] };
        }
    }
}

module.exports = new RAGService();
