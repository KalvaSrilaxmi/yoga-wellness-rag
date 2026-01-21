import axios from 'axios';

// For mobile (Capacitor), we cannot use localhost from the phone as that refers to the phone itself.
// We must use the computer's IP address (if on same WiFi) or a public URL.
// Users can override this with VITE_API_URL in .env.local
const LOCAL_DEV_IP = '10.0.2.2'; // Standard Emulator IP for Android, works for localhost
// For mobile testing on real device, use your machine's LAN IP
// Smart URL Strategy:
// 1. If running on Laptop (localhost), use Local Backend (Fast/Reliable).
// 2. If running on Mobile (APK), use Public Tunnel (Bypasses Firewall).
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000' : 'http://192.168.31.157:5000');
const API_URL = BASE_URL;

export const askQuestion = async (query) => {
    try {
        const response = await axios.post(`${API_URL}/ask`, { query }, {
            timeout: 90000, // 90 Seconds timeout for Render Free Tier Cold Starts
            headers: {
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
            }
        });
        return response.data;
    } catch (error) {
        // 1. Safety Violation (403) - Pass to UI for Red Warning
        if (error.response && error.response.status === 403) {
            throw error;
        }

        // 2. Timeout / Network Error (Common on Free Tier Cold Starts)
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || !error.response) {
            console.error('Timeout/Network Error:', error);
            throw new Error("Server is waking up (Free Tier). Please wait 30 seconds and try again.");
        }

        // 3. Other Server Errors
        console.error('API Error:', error);
        throw new Error("Server encountered an error. Please try again.");
    }
};

export const sendFeedback = async (logId, helpful) => {
    try {
        await axios.post(`${API_URL}/feedback`, { logId, helpful });
    } catch (error) {
        console.error('Feedback Error:', error);
    }
};
