import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface GuideListItem {
    id: string;
    title: string;
    filename: string;
    created_at: number;
}

export interface StudyGuide {
    id: string;
    title: string;
    summary: string;
    flash_cards: string[][];
    quiz: any[];
    study_tips?: string[];
    topics?: { name: string; difficulty: string }[];
    plan_explanation?: string;
    study_schedule?: any[];
    created_at: number;
    filename?: string;
    goals?: string;
}

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private readonly STORAGE_KEY = 'scholar_ai_guides';

    constructor() { }

    private getGuidesFromStorage(): Record<string, StudyGuide> {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }

    private saveGuidesToStorage(guides: Record<string, StudyGuide>) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(guides));
    }

    saveGuide(guide: StudyGuide): Observable<StudyGuide> {
        const guides = this.getGuidesFromStorage();
        guides[guide.id] = guide;
        this.saveGuidesToStorage(guides);
        return of(guide);
    }

    getGuide(id: string): Observable<StudyGuide> {
        const guides = this.getGuidesFromStorage();
        const guide = guides[id];
        if (!guide) {
            throw new Error('Guide not found');
        }
        return of(guide);
    }

    getAllGuides(): Observable<{ guides: GuideListItem[] }> {
        const guidesMap = this.getGuidesFromStorage();
        const guidesList: GuideListItem[] = Object.values(guidesMap).map(g => ({
            id: g.id,
            title: g.title,
            filename: g.filename || 'Unknown File',
            created_at: g.created_at
        })).sort((a, b) => b.created_at - a.created_at);

        return of({ guides: guidesList });
    }

    deleteGuide(id: string): Observable<boolean> {
        const guides = this.getGuidesFromStorage();
        if (guides[id]) {
            delete guides[id];
            this.saveGuidesToStorage(guides);
            return of(true);
        }
        return of(false);
    }

    updateProgress(id: string, index: number, completed: boolean): Observable<any> {
        const guides = this.getGuidesFromStorage();
        const guide = guides[id];
        if (guide && guide.study_schedule && guide.study_schedule[index]) {
            guide.study_schedule[index].completed = completed;
            this.saveGuidesToStorage(guides);
            return of({ success: true });
        }
        throw new Error('Task not found');
    }

    updateSchedule(id: string, newSchedule: any[], explanation: string): Observable<any> {
        const guides = this.getGuidesFromStorage();
        const guide = guides[id];
        if (guide) {
            guide.study_schedule = newSchedule;
            guide.plan_explanation = explanation;
            this.saveGuidesToStorage(guides);
            return of({ success: true });
        }
        throw new Error('Guide not found');
    }
}
