# ZenYoga AI (Wellness RAG Micro-App)

A full-stack AI micro-product that answers yoga & fitness related queries using a RAG (Retrieval-Augmented Generation) pipeline.

## 📱 Mobile APK Download

The Android project is configured using Capacitor. Since the APK requires Android Studio to build, the source code is prepared in `/frontend/android`.

**To build the APK yourself:**
1.  Navigate to `frontend`: `cd frontend`
2.  Install dependencies: `npm install`
3.  Open in Android Studio: `npx cap open android`
4.  Build -> Build Bundle(s) / APK(s) -> Build APK.

*Note: There is no pre-built APK in this repo as it exceeds file size limits and requires signing keys.*

## Features
- **RAG Pipeline**: Retrieves relevant yoga context to answer questions accurately.
- **Safety First**: Automatically detects unsafe queries (e.g., pregnancy, injuries) and provides warnings.
- **Persistent Data**: Connected to MongoDB Atlas for cloud storage.
- **Premium UI**: Glassmorphism design and smooth animations.

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion
- **Mobile**: Capacitor (Android)
- **Backend**: Node.js + Express
- **AI/RAG**: `@xenova/transformers`
- **Database**: MongoDB Atlas

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
# Ensure .env has your MONGODB_URI
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Connection Config
To run on mobile, you must ensure the backend is accessible.
Edit `frontend/src/api.js` or set `VITE_API_URL` environment variable to your computer's IP address (e.g., `http://192.168.1.10:5000`).