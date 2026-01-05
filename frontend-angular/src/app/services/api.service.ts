import { Injectable, inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { FileService } from './file.service';
import { GeminiService } from './gemini.service';
import { DataService, GuideListItem, StudyGuide } from './data.service';

// Re-export for components that import from here
export { GuideListItem, StudyGuide };

export interface QuizQuestion {
    question: string;
    possible_answers: string[];
    index: number;
}
export interface UploadResponse {
    id: string;
    title: string;
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private fileService = inject(FileService);
    private geminiService = inject(GeminiService);
    private dataService = inject(DataService);

    healthCheck(): Observable<any> {
        return of({ status: 'ok', backend: 'angular-client-only' });
    }

    uploadFile(file: File, apiKey: string, goals: string, difficulty: string, examDate: string, modelName: string): Observable<UploadResponse> {
        // Save API key for future requests (motivation/replan)
        localStorage.setItem('gemini_api_key', apiKey);

        return from(this.fileService.extractText(file)).pipe(
            switchMap(transcript => {
                // If it's a PDF/Doc/Txt check if empty
                if (!transcript && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
                    throw new Error("Could not extract text from file.");
                }

                return from(this.geminiService.generateStudyGuide(transcript, goals, difficulty, examDate, apiKey, modelName));
            }),
            switchMap(guideData => {
                // Ensure data structure
                if (typeof guideData === 'string') {
                    // Fallback if AI returned raw string despite JSON instruction
                    throw new Error("AI response was not valid JSON. Please try again.");
                }

                const guideId = Date.now().toString();
                const newGuide: StudyGuide = {
                    ...guideData,
                    id: guideId,
                    created_at: Date.now(),
                    filename: file.name,
                    goals: goals
                };
                return this.dataService.saveGuide(newGuide);
            }),
            map(savedGuide => ({ id: savedGuide.id, title: savedGuide.title }))
        );
    }

    getGuide(id: string): Observable<StudyGuide> {
        return this.dataService.getGuide(id);
    }

    getAllGuides(): Observable<{ guides: GuideListItem[] }> {
        return this.dataService.getAllGuides();
    }

    deleteGuide(id: string): Observable<{ success: boolean }> {
        return this.dataService.deleteGuide(id).pipe(map(success => ({ success })));
    }

    getExportUrl(type: 'quiz' | 'flashcards' | 'summary', guideId: string): string {
        // Not used in client-side version directly as URL. 
        // Components should be updated to handle export via Blob if needed.
        return '';
    }

    updateProgress(guideId: string, index: number, completed: boolean): Observable<any> {
        return this.dataService.updateProgress(guideId, index, completed);
    }

    getMotivation(completedCount: number, totalCount: number): Observable<{ message: string }> {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) return of({ message: "Keep going! (Add API Key to get AI motivation)" });

        return from(this.geminiService.getMotivation(completedCount, totalCount, apiKey)).pipe(
            map(message => ({ message }))
        );
    }

    replanSchedule(guideId: string, missedReason: string = ''): Observable<any> {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) return throwError(() => new Error("API Key required for replanning"));

        return this.getGuide(guideId).pipe(
            switchMap(guide => {
                return from(this.geminiService.replanSchedule(guide, missedReason, apiKey)).pipe(
                    switchMap(newPlan => {
                        return this.dataService.updateSchedule(guideId, newPlan.study_schedule, newPlan.plan_explanation).pipe(
                            map(() => newPlan)
                        );
                    })
                );
            })
        );
    }
}
