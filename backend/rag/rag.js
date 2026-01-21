const { OpenRouter } = require("@openrouter/sdk");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// OPTIMIZATION: Zero-RAM Architecture for Render Free Tier
// 1. Retrieval: Keyword/Jaccard Similarity (No heavy embedding models)
// 2. Generation: OpenRouter Multi-Model Fallback (Gemini -> DeepSeek -> Phi3)

class RAGService {
    constructor() {
        this.client = null;
        this.documents = [];
        this.isReady = false;
    }

    async initialize() {
        console.log('Initializing RAG Service (Zero-RAM Mode)...');
        try {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn("⚠️ OPENROUTER_API_KEY missing.");
            }

            this.client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

            // Load documents INSTANTLY (JSON parse only)
            const articlesPath = path.join(__dirname, 'data', 'articles.json');
            const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));

            // Pre-process for keyword search
            this.documents = articles.map(doc => ({
                ...doc,
                tokens: (doc.title + " " + doc.content).toLowerCase().split(/\W+/).filter(w => w.length > 2)
            }));

            this.isReady = true;
            console.log(`✅ RAG Ready (${this.documents.length} docs). System memory usage: Low.`);

        } catch (error) {
            console.error('❌ RAG Init Failed:', error);
        }
    }

    calculateScore(queryTokens, docTokens) {
        let matchCount = 0;
        const distinctDocTokens = new Set(docTokens);
        for (const token of queryTokens) {
            if (distinctDocTokens.has(token)) {
                matchCount++;
            }
        }
        return matchCount;
    }

    async retrieve(query, k = 3) {
        if (!this.isReady) return [];

        const queryTokens = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);

        const scoredDocs = this.documents.map(doc => ({
            doc,
            score: this.calculateScore(queryTokens, doc.tokens)
        }));

        scoredDocs.sort((a, b) => b.score - a.score);
        return scoredDocs.slice(0, k).map(item => item.doc);
    }

    async generateWithRetry(prompt) {
        const models = [
            "google/gemini-2.0-flash-exp:free",
            "deepseek/deepseek-r1-distill-llama-70b:free",
            "microsoft/phi-3-mini-128k-instruct:free",
            "meta-llama/llama-3.1-8b-instruct:free"
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
            }
        }
        throw new Error("All AI models are currently busy.");
    }

    async answer(query) {
        if (!this.isReady) return { answer: "System is initializing...", sources: [] };

        try {
            const docs = await this.retrieve(query);
            const context = docs.map((d, i) => `[${i + 1}] ${d.title}: ${d.content}`).join('\n\n');
            const prompt = `You are a yoga expert. Answer based on this context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

            const answerText = await this.generateWithRetry(prompt);

            return {
                answer: answerText,
                sources: docs.map(d => ({ title: d.title, id: d.id }))
            };
        } catch (error) {
            console.error("AI Error:", error);
            // Honest error message for the user
            return { answer: "I'm sorry, I'm having trouble connecting to the cloud AI right now. Please try again in 10 seconds.", sources: [] };
        }
    }
}

module.exports = new RAGService();
