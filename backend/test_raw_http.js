const https = require('https');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash';

console.log(`🔍 Testing Raw REST API for model: ${MODEL}`);
console.log(`🔑 Method: POST https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`);

const data = JSON.stringify({
    contents: [{
        parts: [{ text: "Explain how AI works" }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`\n📄 HTTP Status: ${res.statusCode}`);
        try {
            const json = JSON.parse(body);
            if (res.statusCode === 200) {
                console.log("✅ SUCCESS! Raw API call worked.");
                console.log("Response snippet:", json.candidates[0].content.parts[0].text.substring(0, 50) + "...");
            } else {
                console.log("❌ FAILED.");
                console.log("Error Message:", JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log("Raw Body:", body);
        }
    });
});

req.on('error', (error) => {
    console.error("Network Error:", error);
});

req.write(data);
req.end();
