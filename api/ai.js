
const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, customApiKey, modelName } = req.body;
    const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
        return res.status(400).json({
            error: 'No API key provided.',
            troubleshoot: 'Either provide a Custom API Key in the UI, or set GEMINI_API_KEY in Vercel Environment Variables and REDEPLOY.',
            envDetected: !!process.env.GEMINI_API_KEY
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName || "gemini-2.5-flash-lite",
            generationConfig: action === 'motivation' ? {} : { responseMimeType: "application/json" }
        });

        let prompt = "";

        if (action === 'generate') {
            const { transcript, goals, difficulty, examDate } = req.body;
            prompt = `
        You are an expert academic tutor. Generate a comprehensive study guide based on this transcript:
        "${transcript.substring(0, 20000)}"

        Context:
        - Student Goals: ${goals}
        - Difficulty Level: ${difficulty}
        - Target Exam Date: ${examDate || 'Not specified'}

        Return a JSON object with:
        {
          "title": "Clear Topic Title",
          "summary": "Detailed markdown summary",
          "flash_cards": [ {"front": "question", "back": "answer"} ],
          "quiz": [ {"question": "...", "possible_answers": ["...", "..."], "index": 0} ],
          "study_tips": ["tip 1"],
          "topics": [ {"name": "Topic A", "difficulty": "Medium"} ],
          "study_schedule": [
             {"day_offset": 1, "title": "...", "details": "...", "duration_minutes": 30, "difficulty": "Medium", "completed": false}
          ]
        }
      `;
        } else if (action === 'motivation') {
            const { completedCount, totalCount } = req.body;
            prompt = `
        User has completed ${completedCount} out of ${totalCount} study sessions.
        Give them a short, punchy, 1-sentence motivational quote.
      `;
        } else if (action === 'replan') {
            const { guideData, missedReason } = req.body;
            // Provide context for what the material is about
            const materialContext = {
                title: guideData.title,
                summary: guideData.summary ? guideData.summary.substring(0, 5000) : "No summary available"
            };

            // Only pass necessary schedule data to avoid prompt size issues
            const currentSchedule = (guideData.study_schedule || []).map(t => ({
                day_offset: t.day_offset,
                title: t.title,
                duration_minutes: t.duration_minutes,
                completed: !!t.completed,
                difficulty: t.difficulty || 'Medium',
                type: t.type || 'learning'
            }));

            prompt = `
        You are an expert study planner. 
        Material Context:
        Title: ${materialContext.title}
        Key Summary: ${materialContext.summary}

        Current Schedule Status: ${JSON.stringify(currentSchedule)}
        
        The student needs to REPLAN their schedule because: '${missedReason || 'They missed some study sessions and need to catch up.'}'.
        
        Generate a NEW, optimized study schedule that:
        1. Helps them catch up on any missed topics.
        2. Maintains a realistic workload (30-60 mins/day).
        3. Covers the remaining material effectively given the context provided.
        
        You MUST return valid JSON exactly in this format:
        {
          "study_schedule": [
             {
               "day_offset": 1, 
               "title": "Study: Topic Name", 
               "details": "Explanation of what to study...", 
               "duration_minutes": 30, 
               "difficulty": "Hard/Medium/Easy", 
               "type": "learning/revision", 
               "completed": false
             }
          ],
          "plan_explanation": "A short, encouraging explanation of how this new plan helps them stay on track."
        }
      `;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (action === 'motivation') {
            return res.status(200).json({ message: text.trim() });
        }

        try {
            // More robust JSON cleaning
            const cleanJson = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            const jsonData = JSON.parse(cleanJson);
            return res.status(200).json(jsonData);
        } catch (e) {
            console.error("JSON Parse Error. Raw text:", text);
            return res.status(500).json({ error: "AI returned invalid format", details: e.message, raw: text });
        }

    } catch (error) {
        console.error('AI Error Details:', error);
        return res.status(500).json({
            error: 'AI Operation Failed',
            details: error.message,
            stack: error.stack,
            envSet: !!process.env.GEMINI_API_KEY
        });
    }
}
