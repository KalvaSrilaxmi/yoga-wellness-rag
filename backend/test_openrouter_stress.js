const { OpenRouter } = require("@openrouter/sdk");
require('dotenv').config();

const models = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free"
];

const testPrompts = [
    "One line joke.",
    "What is yoga?",
    "Physics fact.",
    "Capital of France?"
];

async function stressTest() {
    console.log("🔥 Focused Stress Test: Gemini vs Llama\n");
    const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    let rankings = [];

    for (const model of models) {
        console.log(`\n👉 Testing ${model}`);
        let successCount = 0;

        for (const prompt of testPrompts) {
            try {
                const completion = await client.chat.send({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                });

                if (completion && completion.choices) {
                    process.stdout.write("✅ ");
                    successCount++;
                } else {
                    process.stdout.write("❌ ");
                }
            } catch (error) {
                process.stdout.write("❌ ");
            }
        }
        rankings.push({ model, score: successCount });
    }

    console.log("\n\n📊 RESULTS:");
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach(r => console.log(`${r.model}: ${r.score}/${testPrompts.length}`));

    console.log(`\n🏆 WINNER: ${rankings[0].model}`);
}

stressTest();
