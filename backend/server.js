const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, Log, Feedback } = require('./database');
const { checkSafety } = require('./safety');
// Update import to point to the new dedicated RAG module
const ragService = require('../rag/rag');

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
            // Creating log entry using required "Track B" schema
            const logEntry = new Log({
                userQuery: query,
                aiAnswer: safetyResult.message,
                isUnsafe: true,
                retrievedChunks: [],
                timestamp: new Date()
            });
            const savedLog = await logEntry.save();

            return res.json({
                answer: safetyResult.message,
                sources: [],
                isUnsafe: true,
                logId: savedLog._id // Send ID for feedback
            });
        }

        // 2. RAG Answer
        const { answer, sources } = await ragService.answer(query);

        // 3. Log Interaction
        // Creating log entry using required "Track B" schema
        const logEntry = new Log({
            userQuery: query,
            aiAnswer: answer,
            isUnsafe: false,
            retrievedChunks: sources,
            timestamp: new Date()
        });
        const savedLog = await logEntry.save();

        res.json({
            answer,
            sources,
            isUnsafe: false,
            logId: savedLog._id
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
