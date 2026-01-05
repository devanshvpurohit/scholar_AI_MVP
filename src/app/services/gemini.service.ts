import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
    providedIn: 'root'
})
export class GeminiService {

    constructor() { }

    async generateStudyGuide(transcript: string, goals: string, difficulty: string, examDate: string, apiKey: string, modelName: string = "gemini-1.5-flash-001"): Promise<any> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName,
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
        
        Transcript (Excerpt):
        ${transcript.substring(0, 25000)} 
    `;

        return this.generateWithRetry(model, prompt);
    }

    async getMotivation(completedCount: number, totalCount: number, apiKey: string): Promise<string> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

        const prompt = `
          User has completed ${completedCount} out of ${totalCount} study sessions.
          Give them a short, punchy, 1-sentence motivational quote or nudge to keep going.
          Don't be generic. Be witty if possible.
      `;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    }

    async replanSchedule(guideData: any, missedReason: string, apiKey: string): Promise<any> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001", generationConfig: { responseMimeType: "application/json" } });

        const remainingTasks = (guideData.study_schedule || []).filter((task: any) => !task.completed);

        const prompt = `
          You are an expert study planner. 
          The user has ${guideData.study_schedule.length} total tasks, and has ${remainingTasks.length} remaining.
          Their current remaining schedule is: ${JSON.stringify(remainingTasks)}.
          Reason for missing tasks: '${missedReason}'.
          
          Please generate a NEW, updated study schedule that helps them catch up.
          1. Explain WHY you changed the plan based on their reason (e.g., if busy, make sessions shorter).
          2. Adapt the schedule (insert revisions, adjust duration).
          
          Return JSON: {"study_schedule": [{"day_offset": 1, "title": "...", "details": "...", "duration_minutes": 30, "type": "learning", "difficulty": "Hard"}], "plan_explanation": "..." }
      `;

        return this.generateWithRetry(model, prompt);
    }

    private async generateWithRetry(model: any, prompt: string, maxRetries = 3): Promise<any> {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Clean JSON markdown if present (for JSON mode models this is less needed but safe)
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

                // Try parsing if it looks like JSON/Object, otherwise return text
                try {
                    return JSON.parse(jsonStr);
                } catch {
                    return text;
                }

            } catch (error: any) {
                console.error(`AI Generation Attempt ${attempt + 1} Failed:`, error.message);
                if (error.message.includes('429') || error.message.includes('503')) {
                    attempt++;
                    if (attempt >= maxRetries) throw new Error(`AI Generation Failed after ${maxRetries} retries: Quota Exceeded.`);
                    const delay = Math.pow(2, attempt) * 2000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }
    }
}
