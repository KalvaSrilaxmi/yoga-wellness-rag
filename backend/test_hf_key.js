require('dotenv').config();

async function testHF() {
    const apiKey = process.env.HF_API_KEY;
    console.log(`Testing HF Router (Array Input): ${apiKey ? 'Key Loaded' : 'Missing Key'}`);

    try {
        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    inputs: ["Hello world"],
                    options: { wait_for_model: true, use_cache: false }
                })
            }
        );

        console.log("Status:", response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log("✅ Success! Output received.");
            // Log deep structure to understand what we got
            console.log("Data type:", Array.isArray(data) ? "Array" : typeof data);
            if (Array.isArray(data)) {
                console.log("Length:", data.length);
                if (data.length > 0) console.log("Sample:", data[0]);
            } else {
                console.log("Data:", JSON.stringify(data).substring(0, 100));
            }
        } else {
            const err = await response.text();
            console.log("❌ Failed Body:", err);
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

testHF();
