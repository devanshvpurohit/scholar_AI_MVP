import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    email = '';
    password = '';
    isSignUp = false;
    loading = false;
    error = '';

    ngOnInit() {
        this.authService.user$.subscribe(user => {
            if (user) {
                this.router.navigate(['/home']);
            }
        });
    }

    async onSubmit() {
        this.loading = true;
        this.error = '';

        try {
            if (this.isSignUp) {
                await this.authService.signUpWithEmail(this.email, this.password);
            } else {
                await this.authService.signInWithEmail(this.email, this.password);
            }
            this.router.navigate(['/home']);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                this.error = 'Invalid email or password.';
            } else if (err.code === 'auth/email-already-in-use') {
                this.error = 'Email is already in use.';
            } else {
                this.error = err.message || 'Authentication failed';
            }
        } finally {
            this.loading = false;
        }
    }

    async signInWithGoogle() {
        this.loading = true;
        this.error = '';

        try {
            await this.authService.signInWithGoogle();
            this.router.navigate(['/home']);
        } catch (err: any) {
            console.error(err);
            this.error = err.message || 'Google sign-in failed';
        } finally {
            this.loading = false;
        }
    }

    toggleMode() {
        this.isSignUp = !this.isSignUp;
        this.error = '';
    }

    continueAsGuest() {
        this.router.navigate(['/home']);
    }
}
