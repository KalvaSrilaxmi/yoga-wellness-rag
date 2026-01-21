// Script to test rag.js logic LOCALLY to ensure no syntax errors
const ragService = require('./rag/rag');

async function test() {
    console.log("🚀 Testing RAG Service Locally...");

    // 1. Initialize
    await ragService.initialize();

    if (!ragService.isReady) {
        console.error("❌ Failed to initialize RAG");
        return;
    }

    // 2. Ask Question
    const query = "What are the benefits of yoga?";
    console.log(`\n❓ Asking: "${query}"`);
    console.log("   (This triggers Gemini to expand keywords -> Then searches docs -> Then generates answer)");

    try {
        const response = await ragService.answer(query);
        console.log("\n✅ Response Received:");
        console.log("---------------------------------------------------");
        console.log(response.answer);
        console.log("---------------------------------------------------");

        if (response.sources.length > 0) {
            console.log("📚 Sources Used:", response.sources.map(s => s.title).join(", "));
        } else {
            console.log("⚠️ No sources found (Check keyword expansion)");
        }
    } catch (error) {
        console.error("❌ Error during answer:", error);
    }
}

test();
