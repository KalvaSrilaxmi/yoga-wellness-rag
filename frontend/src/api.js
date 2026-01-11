import axios from 'axios';

// For mobile (Capacitor), we cannot use localhost from the phone as that refers to the phone itself.
// We must use the computer's IP address (if on same WiFi) or a public URL.
// Users can override this with VITE_API_URL in .env.local
const LOCAL_DEV_IP = '10.0.2.2'; // Standard Emulator IP for Android, works for localhost
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const API_URL = BASE_URL;

export const askQuestion = async (query) => {
    try {
        const response = await axios.post(`${API_URL}/ask`, { query });
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const sendFeedback = async (logId, helpful) => {
    try {
        await axios.post(`${API_URL}/feedback`, { logId, helpful });
    } catch (error) {
        console.error('Feedback Error:', error);
    }
};
