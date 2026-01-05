import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService, StudyGuide, QuizQuestion } from '../../services/api.service';

@Component({
    selector: 'app-guide',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './guide.component.html',
    styleUrl: './guide.component.scss'
})
export class GuideComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private authService = inject(AuthService);
    private apiService = inject(ApiService);

    user$ = this.authService.user$;

    guideId = '';
    guide: StudyGuide | null = null;
    loading = true;
    error = '';

    activeTab: 'summary' | 'flashcards' | 'quiz' | 'schedule' = 'summary';

    // Flashcard state
    currentCardIndex = 0;
    isFlipped = false;

    // Quiz state
    quizStarted = false;
    currentQuestionIndex = 0;
    selectedAnswer: number | null = null;
    quizAnswers: (number | null)[] = [];
    quizCompleted = false;
    quizScore = 0;

    ngOnInit() {
        this.guideId = this.route.snapshot.paramMap.get('id') || '';
        if (this.guideId) {
            this.loadGuide();
        } else {
            this.error = 'No guide ID provided';
            this.loading = false;
        }
    }

    get completedTaskCount(): number {
        return this.guide?.study_schedule?.filter((s: any) => s.completed).length || 0;
    }

    get totalTaskCount(): number {
        return this.guide?.study_schedule?.length || 0;
    }

    get progressPercentage(): number {
        if (this.totalTaskCount === 0) return 0;
        return Math.round((this.completedTaskCount / this.totalTaskCount) * 100);
    }

    async loadGuide() {
        try {
            this.guide = await this.apiService.getGuide(this.guideId).toPromise() || null;
            if (this.guide?.quiz) {
                this.quizAnswers = new Array(this.guide.quiz.length).fill(null);
            }
        } catch (err: any) {
            this.error = err.error?.error || 'Failed to load study guide';
        } finally {
            this.loading = false;
        }
    }

    setActiveTab(tab: 'summary' | 'flashcards' | 'quiz' | 'schedule') {
        this.activeTab = tab;
        if (tab === 'flashcards') {
            this.resetFlashcards();
        }
        if (tab === 'quiz') {
            this.resetQuiz();
        }
    }

    // Flashcard methods
    flipCard() {
        this.isFlipped = !this.isFlipped;
    }

    nextCard() {
        if (this.guide && this.currentCardIndex < this.guide.flash_cards.length - 1) {
            this.currentCardIndex++;
            this.isFlipped = false;
        }
    }

    prevCard() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.isFlipped = false;
        }
    }

    resetFlashcards() {
        this.currentCardIndex = 0;
        this.isFlipped = false;
    }

    // Quiz methods
    startQuiz() {
        this.quizStarted = true;
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.quizAnswers = new Array(this.guide?.quiz?.length || 0).fill(null);
        this.quizCompleted = false;
    }

    selectAnswer(index: number) {
        if (!this.quizCompleted) {
            this.selectedAnswer = index;
            this.quizAnswers[this.currentQuestionIndex] = index;
        }
    }

    nextQuestion() {
        if (this.guide && this.currentQuestionIndex < this.guide.quiz.length - 1) {
            this.currentQuestionIndex++;
            this.selectedAnswer = this.quizAnswers[this.currentQuestionIndex];
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.selectedAnswer = this.quizAnswers[this.currentQuestionIndex];
        }
    }

    submitQuiz() {
        if (!this.guide) return;

        this.quizCompleted = true;
        this.quizScore = 0;

        for (let i = 0; i < this.guide.quiz.length; i++) {
            if (this.quizAnswers[i] === this.guide.quiz[i].index) {
                this.quizScore++;
            }
        }
    }

    resetQuiz() {
        this.quizStarted = false;
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.quizAnswers = new Array(this.guide?.quiz?.length || 0).fill(null);
        this.quizCompleted = false;
        this.quizScore = 0;
    }

    getQuizPercentage(): number {
        if (!this.guide) return 0;
        return Math.round((this.quizScore / this.guide.quiz.length) * 100);
    }

    isAnswerCorrect(questionIndex: number): boolean {
        if (!this.guide) return false;
        return this.quizAnswers[questionIndex] === this.guide.quiz[questionIndex].index;
    }

    // Export methods - Client Side Generation
    downloadFile(filename: string, content: string) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    exportQuiz() {
        if (!this.guide) return;
        let content = `Quiz: ${this.guide.title}\n\n`;
        this.guide.quiz.forEach((q, i) => {
            content += `${i + 1}. ${q.question}\n`;
            q.possible_answers.forEach((ans: string, j: number) => {
                content += `   ${String.fromCharCode(65 + j)}) ${ans}\n`;
            });
            content += '\n';
        });

        // Add Answer Key
        content += '\n--- Answer Key ---\n';
        this.guide.quiz.forEach((q, i) => {
            content += `${i + 1}. ${String.fromCharCode(65 + q.index)}\n`;
        });

        this.downloadFile(`${this.guide.title}_quiz.txt`, content);
    }

    exportFlashcards() {
        if (!this.guide) return;
        let content = `Flashcards: ${this.guide.title}\n\n`;
        this.guide.flash_cards.forEach((card: any, i) => {
            content += `Q: ${card.front}\nA: ${card.back}\n\n`;
        });
        this.downloadFile(`${this.guide.title}_flashcards.txt`, content);
    }

    exportSummary() {
        if (!this.guide) return;
        const content = `Study Summary: ${this.guide.title}\n\n${this.guide.summary}`;
        this.downloadFile(`${this.guide.title}_summary.txt`, content);
    }

    // Share
    copyShareLink() {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        // TODO: Add toast notification
    }

    addToGoogleCalendar(session: any) {
        const date = new Date();
        date.setDate(date.getDate() + session.day_offset);
        date.setHours(10, 0, 0, 0); // Default to 10:00 AM

        const startTime = date.toISOString().replace(/-|:|\.\d\d\d/g, '');

        const endDate = new Date(date.getTime() + session.duration_minutes * 60000);
        const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

        const title = encodeURIComponent(`Study: ${session.title}`);
        const details = encodeURIComponent(`${session.details}\n\nStudy Guide: ${window.location.href}`);

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
        window.open(url, '_blank');
    }

    replanning = false;
    motivationParams: string | null = null;

    async toggleTask(index: number, event: any) {
        const completed = event.target.checked;
        if (!this.guide || !this.guide.study_schedule) return;
        this.guide.study_schedule[index].completed = completed;

        try {
            await this.apiService.updateProgress(this.guideId, index, completed).toPromise();
        } catch (e) {
            console.error('Failed to update progress', e);
        }
    }

    async getMotivation() {
        if (!this.guide || !this.guide.study_schedule) return;
        const completed = this.guide.study_schedule.filter((s: any) => s.completed).length;
        const total = this.guide.study_schedule.length;

        try {
            const res = await this.apiService.getMotivation(completed, total).toPromise();
            this.motivationParams = res?.message || 'Keep going!';
            setTimeout(() => this.motivationParams = null, 8000);
        } catch (e) {
            console.error(e);
        }
    }

    async replan() {
        if (!confirm('This will regenerate future tasks. Continue?')) return;
        const reason = prompt('Why are you replanning? (Optional: e.g., "I missed yesterday due to illness")', '') || '';

        this.replanning = true;
        try {
            const res = await this.apiService.replanSchedule(this.guideId, reason).toPromise();
            if (this.guide && res) {
                this.guide.study_schedule = res.study_schedule || res;
                this.guide.plan_explanation = res.plan_explanation;

                if (this.guide.plan_explanation) {
                    alert('AI Agent says: \n' + this.guide.plan_explanation);
                }
            }
        } catch (e: any) {
            alert('Replanning failed: ' + (e.error?.error || e.message));
        } finally {
            this.replanning = false;
        }
    }

    async signOut() {
        await this.authService.signOut();
        this.router.navigate(['/login']);
    }
}
