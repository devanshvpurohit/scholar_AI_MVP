# 🎓 Scholar AI 2.0 (SPA Edition)

A powerful, standalone **Angular Single Page Application** that transforms study materials into personalized learning plans, flashcards, and quizzes using **Google Gemini AI**.

> **Note:** This version is fully client-side and serverless.

## ✨ Features

- **📂 Serverless Architecture**: Runs entirely in the browser using Angular + Firebase.
- **🔥 Firebase Integration**: 
  - **Auth**: Google Sign-In.ownerproof-5632248-1767853354-9c3387978f37
  - **Firestore**: Cloud storage for your study guides (synced across devices).
- **🤖 Gemini AI Integration**: Direct client-side AI generation (Supports Gemini 1.5 Flash).
- **📄 Multi-Format Support**: PDF, DOCX, Text, Markdown.
- **📥 Instant Exports**: Download Quizzes, Summaries, and Flashcards.
- **🚀 Vercel Ready**: Optimized for instant deployment.

## 🚀 Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run the App**:
    ```bash
    npm start
    ```
    Open [http://localhost:4200](http://localhost:4200).

## ☁️ Deployment (Vercel)

This project is configured for Vercel.
1.  Push to GitHub.
2.  Import project in Vercel.
3.  Framework Preset: **Angular**.
4.  **Output Directory**: Set this to `dist/frontend-angular/browser`. (Important!)
5.  **Environment Variables**: 
    - Add `FIREBASE_SERVICE_ACCOUNT` with the *entire usage JSON* of your Service Account Key.
6.  Deploy!

## 🔑 Setup

To use the AI features, you need a **Google Gemini API Key**:
1.  Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Paste it into the app when prompted.

To use Firebase:
1.  Ensure `src/environments/environment.ts` has your Firebase config.

## 📄 License

MIT License




