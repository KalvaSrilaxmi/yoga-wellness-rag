const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function main() {
    console.log("🔍 Testing User's Requested Model: gemini-3-flash-preview");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        console.error("❌ Error: Missing GEMINI_API_KEY in .env file");
        return;
    }

    const client = new GoogleGenAI({ apiKey });

    // Models to test based on user input and common experimental ones
    const modelsToTest = [
        "gemini-3-flash-preview",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash"
    ];

    for (const modelName of modelsToTest) {
        console.log(`\n👉 Attempting model: '${modelName}'...`);
        try {
            const response = await client.models.generateContent({
                model: modelName,
                contents: "Hello",
            });
            console.log("✅ SUCCESS!");
            console.log(response.text());
            return;
        } catch (error) {
            console.log("❌ Failed.");
            console.log(`Error: ${error.message.split('\n')[0]}`);
            if (error.message.includes('404')) {
                console.log("   (Model not found or API disabled)");
            }
        }
    }
}

main();
