const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const CANDIDATE_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-pro",
    "gemini-1.0-pro",
    "gemini-2.0-flash-exp"
];

async function main() {
    console.log("🔍 Brute-force Testing Gemini Models...");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        console.error("❌ Error: Missing GEMINI_API_KEY in .env file");
        return;
    }

    const client = new GoogleGenAI({ apiKey });

    for (const modelName of CANDIDATE_MODELS) {
        process.stdout.write(`Testing '${modelName}'... `);
        try {
            const response = await client.models.generateContent({
                model: modelName,
                contents: "Hello",
            });
            console.log("✅ SUCCESS!");
            console.log(`\n🎉 FOUND WORKING MODEL: ${modelName}`);
            console.log("------------------------------------------------");
            console.log("Update rag.js to use this model name.");
            return; // Exit on first success
        } catch (error) {
            console.log("❌ Failed");
            // console.log(`   Error: ${error.message.split('\n')[0]}`); // Concise error
        }
    }

    console.log("\n❌ ALL MODELS FAILED.");
    console.log("Possible causes:");
    console.log("1. API Key does not have access to Generative Language API.");
    console.log("2. API Key is restricted to specific IP/Referrer.");
    console.log("3. Google Cloud Project does not have billing enabled (required for some models).");
}

main();
