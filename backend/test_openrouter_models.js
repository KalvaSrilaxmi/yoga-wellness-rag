const { OpenRouter } = require("@openrouter/sdk");
require('dotenv').config();

const models = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "deepseek/deepseek-r1-distill-llama-70b:free",
    "qwen/qwen-2-7b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "google/gemini-2.0-flash-thinking-exp:free"
];

async function testModels() {
    console.log("🔍 Benchmarking OpenRouter Free Models...");
    const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    let winner = null;

    for (const model of models) {
        process.stdout.write(`👉 Testing ${model}... `);
        try {
            const start = Date.now();
            const completion = await client.chat.send({
                model: model,
                messages: [{ role: "user", content: "Hello" }]
            });
            const time = Date.now() - start;

            if (completion && completion.choices) {
                console.log(`✅ OK (${time}ms)`);
                if (!winner) winner = model; // First working model is default winner
            } else {
                console.log(`❌ No Output`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.status || error.message}`);
        }
    }

    console.log("\n🏆 Recommended Model: " + (winner || "None (All failed)"));
}

testModels();
