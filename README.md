# ZenYoga AI – Wellness RAG Micro-App

ZenYoga AI is an AI-powered wellness assistant designed for the *Wellness RAG Micro-App Challenge* by NextYou.  
It provides yoga-related answers using a Retrieval-Augmented Generation (RAG) pipeline to give grounded, contextual responses.

### 🎥 Demo Video
[**Watch the Full Demo Video**](https://drive.google.com/file/d/1lCk04m_GghQYxpHoVrnrqK34endizo38/view?usp=drivesdk)

## 📸 Demo & Screens

| **App Interface** | **Safety Guardrail** |
| :---: | :---: |
| ![Interface](assets/interface.png) | ![Safety Warning](assets/safety_warning_v2.png) |

### 📱 Mobile Walkthrough Video

> **Verified Mobile Flow**: Input -> AI Response -> Feedback

![Mobile Demo Flow](assets/mobile_demo.webp)

---

## 🏗️ Architecture Overview

This project follows a **Modular Monolith** pattern to ensure separation of concerns while maintaining deployment simplicity.

*   **Frontend**: A responsive React application (Vite) utilizing Glassmorphism design principles.
*   **Backend**: A robust Node.js/Express server handling API orchestration.
*   **RAG Module**: A dedicated logic layer (`rag/rag.js`) responsible for knowledge ingestion, embedding generation, and context retrieval.

## 🧠 RAG Implementation Details

To ensure the AI remains "grounded" and accurate, we utilize a Retrieval-Augmented Generation pipeline:

*   **Ingestion**: 30+ curated yoga wellness articles are chunked and processed.
*   **Vector Search**: We utilize semantic retrieval to find the most relevant context for every user query.
*   **Generation**: Local lightweight LLMs (`@xenova/transformers`) synthesize the retrieved context into natural language answers.

## 🛡️ Safety Layer Logic

Safety is a critical requirement for wellness applications. We implemented a custom **Safety Middleware** that runs *before* the LLM inference:

1.  **Interception**: Every request is analyzed for high-risk keywords (e.g., "pregnancy", "surgery", "blood pressure").
2.  **Assessment**: If a risk is detected, the `isUnsafe` flag is raised immediately.
3.  **Blocking**: The system returns a 403-like preventative response with a mandatory "Medical Disclaimer," ensuring the AI never dispenses medical advice for sensitive conditions.

## 💾 Data Persistence Strategy

Auditing and user feedback are essential for model improvement.
*   **MongoDB Atlas**: We utilize a cloud-hosted MongoDB instance for persistent storage.
*   **Audit Logging**: Every interaction (Query, Answer, Safety Flag, Sources) is logged permanently.
*   **Feedback Loop**: User ratings (Helpful/Not Helpful) are stored to track system performance over time.

## 🤖 Agentic Audit Trail

The following prompts were used during the agentic development process to build this system:

| Phase | Prompt / Task |
| :--- | :--- |
| **Backend Scaffolding** | *"Initialize a Node.js Express backend with MongoDB connection and a simple /ask endpoint."* |
| **RAG Integration** | *"Implement a RAG pipeline using transformers.js for local embeddings and cosine similarity for retrieval."* |
| **Safety Guardrails** | *"Add a safety middleware that detects keywords like 'blood pressure' and blocks the request with a warning."* |
| **Persistence Migration** | *"Update backend to use MongoDB Atlas instead of local memory. Ensure strict existence of DB connection before starting."* |
| **Mobile Build** | *"Configure Capacitor for Android. Note: Local build restricted by env vars, sync source code for evaluator verification."* |
| **Final Refactor** | *"Move RAG logic to a distinct /rag directory and ensure strict folder structure compliance."* |

## 🛠️ Setup & Running Locally

### 1. Backend
- `cd backend && npm install`
- Create a `.env` file with `MONGODB_URI` (Atlas link) and `PORT=5000`.
- `npm start` (Expect: "✅ MongoDB Atlas Connected").

### 2. Frontend
- `cd frontend && npm install`
- `npm run dev`

### 3. Mobile
- `npx cap sync`
- `npx cap open android` (Build APK via Android Studio).

## 📥 Mobile Download


> **Note**: The APK is functional, but some backend features may not work on mobile due to environment limitations (e.g., localhost backend access). Full functionality is demonstrated in the demo video above.



[**Download app-debug.apk**](mobile-release/app-debug.apk) *(Generated via Capacitor & Gradle)*