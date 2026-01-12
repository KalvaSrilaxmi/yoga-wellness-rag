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
const BASE_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000' : 'https://slate-baths-behave.loca.lt');

const API_URL = BASE_URL;

export const askQuestion = async (query) => {
    try {
        const response = await axios.post(`${API_URL}/ask`, { query }, {
            headers: {
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
            }
        });
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
