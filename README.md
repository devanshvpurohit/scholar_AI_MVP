# 🎓 Scholar AI 2.0 (SPA Edition)

A powerful, standalone **Angular Single Page Application** that transforms study materials into personalized learning plans, flashcards, and quizzes using **Google Gemini AI**.

> **Note:** This version is fully client-side. No backend server is required!

## ✨ Features

- **📂 Serverless Architecture**: Runs entirely in the browser using Angular + LocalStorage.
- **🤖 Gemini AI Integration**: Direct client-side AI generation for summaries and study plans.
- **📄 Multi-Format Support**:
  - **PDF** (via `pdf.js`)
  - **DOCX** (via `mammoth.js`)
  - **Text / Markdown / HTML**
- **💾 Auto-Save**: All study guides are saved automatically to your browser's Local Storage.
- **📥 Instant Exports**: Download Quizzes, Summaries, and Flashcards as text files instantly.
- **🔐 Secure**: Your API Key is stored locally on your device and never sent to our servers.

## 🚀 Quick Start

1.  **Install Dependencies**:
    ```bash
    cd frontend-angular
    npm install
    ```

2.  **Run the App**:
    ```bash
    npm start
    ```
    Open [http://localhost:4200](http://localhost:4200) in your browser.

## 🔑 Setup

To use the AI features, you need a **Google Gemini API Key**:
1.  Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Paste it into the app when prompted.

## 🛠️ Project Structure

```
scholarAI_2/
└── frontend-angular/      # The Main Application
    ├── src/
    │   ├── app/
    │   │   ├── components/  # Home, Guide, Login
    │   │   └── services/    # Logic Layer
    │   │       ├── api.service.ts     # Main Facade
    │   │       ├── file.service.ts    # PDF/Doc Parsing
    │   │       ├── gemini.service.ts  # AI Interaction
    │   │       └── data.service.ts    # LocalStorage DB
```

## 📄 License

MIT License
