const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const fsRegular = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

// Initialize Firebase Admin
let db;
try {
    if (!admin.apps.length) {
        const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountVar) {
            // If the JSON is provided as a string in env
            const serviceAccount = JSON.parse(serviceAccountVar);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Fallback for local development or ambient credentials
            admin.initializeApp({
                projectId: "medkey-vault"
            });
        }
    }
    db = admin.firestore();
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}
const GUIDES_COLLECTION = 'study_guides';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8069;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Uploads
const UPLOAD_DIR = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
if (!fsRegular.existsSync(UPLOAD_DIR)) {
    fsRegular.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const upload = multer({ dest: UPLOAD_DIR });

// Gemini Configuration
const HARDCODED_GEMINI_KEY = "AIzaSyApLxKHefoVZKTzUy8qOttT4rSO81xtxa0";
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || HARDCODED_GEMINI_KEY;

function getGeminiKey(req) {
    const headerKey = req.headers['x-gemini-api-key'];
    if (headerKey) return headerKey;

    // Check body or query if needed, but usually multipart form for upload
    if (req.body && req.body.api_key) return req.body.api_key;

    return DEFAULT_GEMINI_KEY;
}

// --- Helper Functions ---

async function extractTextFromFile(filePath, originalFilename, mimeType) {
    const ext = path.extname(originalFilename).toLowerCase();

    try {
        if (ext === '.pdf') {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else if (ext === '.txt' || ext === '.md') {
            return await fs.readFile(filePath, 'utf8');
        } else {
            console.warn("Audio/Video not fully supported in local Node version yet.");
            return "";
        }
    } catch (error) {
        console.error("Text Extraction Error Detail:", error);
        throw new Error("Failed to extract text from file: " + error.message);
    }
}


async function promptEverything(transcript, goals, difficulty, examDate, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the latest 2.0 Flash Experimental model
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
        You are an expert, autonomous study planner. The user's specific goal is: '${goals}'.
        The Target Difficulty Level is: '${difficulty}'.
        The Exam Date is: '${examDate}' (If provided, strictly plan backwards from this date).
        
        Analyze the transcript and generate a comprehensive study system adapted to this difficulty.
        1. **Autonomous Study Plan**: Generate a self-sufficient day-by-day schedule leading up to the exam.
        2. **Tag Topics by Difficulty**: Identify key topics and rate them (Easy/Medium/Hard).
        3. **Spaced Repetition**: Insert specific 'Revision' slots for hard topics to ensure retention.
        4. **Feasibility**: Ensure daily study time is realistic (30-60 mins max per session).
        5. **Personalization**: Provide specific study tips for this material.
        
        Return a SINGLE VALID JSON object with this EXACT structure:
        {
          "title": "Catchy Title",
          "summary": "Detailed summary...",
          "topics": [
             {"name": "Topic A", "difficulty": "Hard"},
             {"name": "Topic B", "difficulty": "Medium"}
          ],
          "study_tips": ["Tip 1", "Tip 2..."],
          "flash_cards": [["Q1", "A1"], ...], 
          "quiz": [
            {"question": "Q1", "possible_answers": ["A","B","C","D"], "index": 0, "related_topic": "Topic A"}
          ],
          "study_schedule": [
            {"day_offset": 1, "title": "Study: Topic A", "details": "Deep dive...", "duration_minutes": 45, "type": "learning", "difficulty": "Hard", "completed": false}
          ]
        }
        
        Transcript:
        ${transcript.substring(0, 50000)} 
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("AI returned empty response");

        try {
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw text:", text);
            throw new Error("Failed to parse AI response as JSON");
        }
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
}

// --- Routes ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', backend: 'node-express' });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }

        // Get params from body (multer parses these)
        const goals = req.body.goals || "";
        const difficulty = req.body.difficulty || "Intermediate";
        const examDate = req.body.exam_date || "";
        const userProvidedKey = req.body.api_key;

        // Determine API Key
        const apiKey = userProvidedKey || DEFAULT_GEMINI_KEY;
        if (!apiKey) {
            return res.status(400).json({ error: "No API Key provided" });
        }

        // Process File
        const transcript = await extractTextFromFile(req.file.path, req.file.originalname, req.file.mimetype);

        // Cleanup uploaded file
        await fs.unlink(req.file.path);

        if (!transcript && !req.file.mimetype.startsWith('audio/')) {
            return res.status(400).json({ error: "Could not extract text." });
        }

        // Generate Guide
        const guideData = await promptEverything(transcript, goals, difficulty, examDate, apiKey);

        // Add Metadata
        const guideId = uuidv4();
        guideData.id = guideId;
        guideData.created_at = Date.now();
        guideData.filename = req.file.originalname;
        guideData.goals = goals;
        guideData.user_id = req.body.user_id || "anonymous";

        // Save to Firestore
        if (!db) throw new Error("Database not initialized. Check server logs.");
        await db.collection(GUIDES_COLLECTION).doc(guideId).set(guideData);

        res.json(guideData);

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

app.get('/api/guides', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        const userId = req.query.user_id;
        let query = db.collection(GUIDES_COLLECTION);

        if (userId) {
            query = query.where('user_id', '==', userId);
        }

        const snapshot = await query.orderBy('created_at', 'desc').get();
        const guides = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            guides.push({
                id: data.id,
                title: data.title,
                filename: data.filename,
                created_at: data.created_at
            });
        });

        res.json({ guides });
    } catch (error) {
        console.error("List Guides Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/guide/:id', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        const doc = await db.collection(GUIDES_COLLECTION).doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: "Guide not found" });
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/guide/:id/progress', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        const { index, completed } = req.body;
        const docRef = db.collection(GUIDES_COLLECTION).doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Guide not found" });

        const data = doc.data();
        if (data.study_schedule && data.study_schedule[index]) {
            data.study_schedule[index].completed = completed;
            await docRef.update({ study_schedule: data.study_schedule });
            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Task not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/motivation', async (req, res) => {
    try {
        const { completed_count, total_count } = req.body;
        const apiKey = getGeminiKey(req);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
            User has completed ${completed_count} out of ${total_count} study sessions.
            Give them a short, punchy, 1-sentence motivational quote or nudge to keep going.
            Don't be generic. Be witty if possible.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        res.json({ message: text.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/guide/:id/replan', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        const { missed_reason } = req.body;
        const docRef = db.collection(GUIDES_COLLECTION).doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Guide not found" });
        const guideData = doc.data();
        const apiKey = getGeminiKey(req);

        // Filter remaining tasks
        const remainingTasks = (guideData.study_schedule || []).filter(task => !task.completed);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
            Expert study planner. User missed tasks for reason: '${missed_reason}'.
            Remaining: ${JSON.stringify(remainingTasks)}.
            Generate updated schedule. Return JSON: {"study_schedule": [...], "plan_explanation": "..." }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const newPlan = JSON.parse(jsonStr);

        // Update Doc
        await docRef.update({
            study_schedule: newPlan.study_schedule,
            plan_explanation: newPlan.plan_explanation
        });

        res.json(newPlan);
    } catch (error) {
        console.error("Replan Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/guide/:id', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(GUIDES_COLLECTION).doc(req.params.id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Internal Server Error: " + (err.message || "Unknown Error") });
});

// Start Server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Node.js Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
