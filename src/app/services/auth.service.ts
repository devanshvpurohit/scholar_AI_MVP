import { Injectable, inject } from '@angular/core';
import {
    Auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
    User,
    onAuthStateChanged,
    getIdToken
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth = inject(Auth);
    private userSubject = new BehaviorSubject<User | null>(null);
    private loadingSubject = new BehaviorSubject<boolean>(true);

    user$: Observable<User | null> = this.userSubject.asObservable();
    loading$: Observable<boolean> = this.loadingSubject.asObservable();

    constructor() {
        onAuthStateChanged(this.auth, (user) => {
            this.userSubject.next(user);
            this.loadingSubject.next(false);
        });
    }

    get currentUser(): User | null {
        return this.userSubject.value;
    }

    get isAuthenticated(): boolean {
        return this.userSubject.value !== null;
    }

    async getIdToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (user) {
            return getIdToken(user);
        }
        return null;
    }

    async signInWithEmail(email: string, password: string): Promise<User> {
        const credential = await signInWithEmailAndPassword(this.auth, email, password);
        return credential.user;
    }

    async signUpWithEmail(email: string, password: string): Promise<User> {
        const credential = await createUserWithEmailAndPassword(this.auth, email, password);
        return credential.user;
    }

    async signInWithGoogle(): Promise<User> {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(this.auth, provider);
        return credential.user;
    }

    async signOut(): Promise<void> {
        await signOut(this.auth);
    }
}
