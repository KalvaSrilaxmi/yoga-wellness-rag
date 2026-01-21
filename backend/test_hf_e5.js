require('dotenv').config();

async function testHF() {
    const apiKey = process.env.HF_API_KEY;
    console.log(`Testing HF Router (E5-Small): ${apiKey ? 'Key Loaded' : 'Missing Key'}`);

    try {
        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/intfloat/e5-small-v2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    inputs: ["Hello world"],
                    options: { wait_for_model: true }
                })
            }
        );

        console.log("Status:", response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log("✅ Success! Output received.");
            if (Array.isArray(data)) {
                console.log("Length:", data.length);
                // Check if it's a vector (array of floats) or array of arrays
                const first = data[0];
                console.log("First item type:", Array.isArray(first) ? "Vector" : typeof first);
                if (Array.isArray(first)) console.log("Vector dim:", first.length);
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
