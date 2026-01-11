const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB Atlas Connected');
    } catch (err) {
        console.error('❌ MongoDB Atlas Connection Error:', err.message);
        // Force exit on failure to prevent non-persistent mode
        process.exit(1);
    }
};

const LogSchema = new mongoose.Schema({
    query: { type: String, required: true },
    answer: { type: String, required: true },
    isUnsafe: { type: Boolean, default: false },
    sources: [{ title: String, id: String }],
    timestamp: { type: Date, default: Date.now }
});

const FeedbackSchema = new mongoose.Schema({
    logId: { type: mongoose.Schema.Types.ObjectId, ref: 'Log' },
    helpful: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', LogSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

module.exports = { connectDB, Log, Feedback };
