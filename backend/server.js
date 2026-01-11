const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, Log, Feedback } = require('./database');
const { checkSafety } = require('./safety');
const ragService = require('./rag');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Services
connectDB();
ragService.initialize();

app.get('/', (req, res) => {
    res.send('Wellness RAG API is running');
});

app.post('/ask', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        // 1. Safety Check
        const safetyResult = checkSafety(query);
        if (safetyResult.isUnsafe) {
            // Log Unsafe Query
            await Log.create({
                query,
                answer: safetyResult.message,
                isUnsafe: true,
                sources: []
            });
            return res.json({
                answer: safetyResult.message,
                sources: [],
                isUnsafe: true
            });
        }

        // 2. RAG Answer
        const { answer, sources } = await ragService.answer(query);

        // 3. Log Interaction
        const logEntry = await Log.create({
            query,
            answer,
            isUnsafe: false,
            sources
        });

        res.json({
            answer,
            sources,
            isUnsafe: false,
            logId: logEntry._id
        });

    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/feedback', async (req, res) => {
    try {
        const { logId, helpful } = req.body;
        await Feedback.create({ logId, helpful });
        res.json({ success: true });
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Feedback failed' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
