async function testHF() {
    console.log("Testing Hugging Face Router (No Key)...");
    try {
        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: "Hello world" })
            }
        );

        console.log("Status:", response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log("✅ Success! Output shape:", Array.isArray(data) ? data.length : "Unknown");
        } else {
            const err = await response.text();
            console.log("❌ Failed Body:", err);
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

testHF();
