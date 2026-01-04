import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface GuideListItem {
    id: string;
    title: string;
    filename: string;
    created_at: number;
}

export interface QuizQuestion {
    question: string;
    possible_answers: string[];
    index: number;
}

export interface StudyGuide {
    id: string;
    title: string;
    summary: string;
    flash_cards: string[][];
    quiz: QuizQuestion[];
    study_tips?: string[];
    topics?: { name: string; difficulty: string }[];
    plan_explanation?: string;
    study_schedule?: {
        day_offset: number;
        title: string;
        details: string;
        duration_minutes: number;
        completed?: boolean;
        type?: string;
        difficulty?: string;
    }[];
    created_at: number;
    filename?: string;
}



export interface UploadResponse {
    id: string;
    title: string;
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = environment.apiUrl;

    private getAuthHeaders(): Observable<HttpHeaders> {
        return from(this.authService.getIdToken()).pipe(
            switchMap(token => {
                let headers = new HttpHeaders();
                if (token) {
                    headers = headers.set('Authorization', `Bearer ${token}`);
                }
                return of(headers);
            })
        );
    }

    healthCheck(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`);
    }

    uploadFile(file: File, apiKey: string, goals: string, difficulty: string, examDate: string): Observable<UploadResponse> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('api_key', apiKey);
                formData.append('goals', goals);
                formData.append('difficulty', difficulty);
                formData.append('exam_date', examDate);

                return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData, { headers });
            })
        );
    }

    getGuide(id: string): Observable<StudyGuide> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                return this.http.get<StudyGuide>(`${this.apiUrl}/guide/${id}`, { headers });
            })
        );
    }

    getAllGuides(): Observable<{ guides: GuideListItem[] }> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                return this.http.get<{ guides: GuideListItem[] }>(`${this.apiUrl}/guides`, { headers });
            })
        );
    }

    deleteGuide(id: string): Observable<{ success: boolean }> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                return this.http.delete<{ success: boolean }>(`${this.apiUrl}/guide/${id}`, { headers });
            })
        );
    }

    getExportUrl(type: 'quiz' | 'flashcards' | 'summary', guideId: string): string {
        return `${this.apiUrl}/export/${type}/${guideId}`;
    }

    updateProgress(guideId: string, index: number, completed: boolean): Observable<any> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                return this.http.put(`${this.apiUrl}/guide/${guideId}/progress`, { index, completed }, { headers });
            })
        );
    }

    getMotivation(completedCount: number, totalCount: number): Observable<{ message: string }> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                return this.http.post<{ message: string }>(`${this.apiUrl}/motivation`, { completed_count: completedCount, total_count: totalCount }, { headers });
            })
        );
    }

    replanSchedule(guideId: string, missedReason: string = ''): Observable<any> {
        return this.getAuthHeaders().pipe(
            switchMap(headers => {
                return this.http.post<any>(`${this.apiUrl}/guide/${guideId}/replan`, { missed_reason: missedReason }, { headers });
            })
        );
    }
}
