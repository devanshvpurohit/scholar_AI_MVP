import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of } from 'rxjs';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, query, where } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface GuideListItem {
    id: string;
    title: string;
    filename: string;
    created_at: number;
}

export interface StudyGuide {
    id: string;
    userId?: string;
    title: string;
    summary: string;
    flash_cards: { front: string, back: string }[];
    quiz: any[];
    study_tips?: string[];
    topics?: { name: string; difficulty: string }[];
    plan_explanation?: string;
    study_schedule?: any[];
    created_at: number;
    filename?: string;
    goals?: string;
}

import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private http = inject(HttpClient);
    private readonly COLLECTION = 'guides';

    constructor() { }

    private get userId(): string {
        return this.authService.currentUser?.uid || 'anonymous';
    }

    saveGuide(guide: StudyGuide): Observable<StudyGuide> {
        if (!guide.id) guide.id = Date.now().toString();
        guide.userId = this.userId;

        // Try saving via Serverless Function (Bypasses Permission Rules)
        return this.http.post<{ success: boolean; id: string }>('/api/saveGuide', guide).pipe(
            map(() => guide)
        );

        // Old Direct Firestore Code (Kept for reference if API fails or for other methods)
        /*
        const guideDoc = doc(this.firestore, this.COLLECTION, guide.id);
        return from(setDoc(guideDoc, guide)).pipe(map(() => guide));
        */
    }

    getGuide(id: string): Observable<StudyGuide> {
        return this.http.get<StudyGuide>(`/api/getGuide?id=${id}`);
    }

    getAllGuides(): Observable<{ guides: GuideListItem[] }> {
        return this.http.get<{ guides: GuideListItem[] }>(`/api/getGuides?userId=${this.userId}`);
    }

    deleteGuide(id: string): Observable<boolean> {
        const guideDoc = doc(this.firestore, this.COLLECTION, id);
        return from(deleteDoc(guideDoc)).pipe(map(() => true));
    }

    updateProgress(id: string, index: number, completed: boolean): Observable<any> {
        // Firestore update specific field in array is hard without reading whole array.
        // Easiest way: Get guide, update array, save back. 
        // OR if we model schedule as subcollection... but let's stick to single document for simplicity (less quota usage).

        return this.getGuide(id).pipe(
            map(guide => {
                if (guide && guide.study_schedule && guide.study_schedule[index]) {
                    guide.study_schedule[index].completed = completed;
                    const guideDoc = doc(this.firestore, this.COLLECTION, id);
                    updateDoc(guideDoc, { study_schedule: guide.study_schedule });
                    return { success: true };
                }
                throw new Error('Task not found');
            })
        );
    }

    updateSchedule(id: string, newSchedule: any[], explanation: string): Observable<any> {
        const guideDoc = doc(this.firestore, this.COLLECTION, id);
        return from(updateDoc(guideDoc, {
            study_schedule: newSchedule,
            plan_explanation: explanation
        })).pipe(map(() => ({ success: true })));
    }
}
