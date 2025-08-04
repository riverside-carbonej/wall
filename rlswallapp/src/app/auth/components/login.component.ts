import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>RLS Wall App</h1>
          <p>Sign in to access your walls</p>
        </div>

        <!-- Error Messages -->
        <div class="error-message" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>

        <!-- Organization Access Notice -->
        <div class="domain-notice">
          <img src="assets/images/beaver-logo.png" alt="Riverside Schools Logo" class="riverside-logo">
          Anyone in the Riverside organization can access this application
        </div>

        <!-- Google Sign In -->
        <button 
          (click)="signInWithGoogle()" 
          [disabled]="loading"
          class="google-signin-btn"
        >
          <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {{ loading ? 'Signing in with Google...' : 'Sign in with Riverside Schools Account' }}
        </button>

        <div class="help-text">
          <p>Use your Riverside Schools Google account to access the wall application.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--md-sys-color-background);
      padding: 20px;
    }

    .login-card {
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 24px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .login-header h1 {
      margin: 0 0 8px 0;
      color: var(--md-sys-color-on-surface);
      font-size: 28px;
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
    }

    .login-header p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
    }

    .error-message {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
    }

    .domain-notice {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 13px;
      font-family: 'Google Sans', sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-icon {
      font-size: 16px;
    }

    .riverside-logo {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      object-fit: contain;
    }

    .google-signin-btn {
      width: 100%;
      padding: 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 20px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .google-signin-btn:hover:not(:disabled) {
      background: var(--md-sys-color-surface-container-low);
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .google-signin-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-icon {
      flex-shrink: 0;
    }

    .help-text {
      text-align: center;
      margin-top: 24px;
      padding: 16px;
      background: var(--md-sys-color-surface-variant);
      border-radius: 12px;
    }

    .help-text p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-family: 'Google Sans', sans-serif;
      line-height: 1.4;
    }

    .divider {
      text-align: center;
      margin: 24px 0;
      position: relative;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 12px;
      font-family: 'Google Sans', sans-serif;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--md-sys-color-outline-variant);
    }

    .divider span {
      background: var(--md-sys-color-surface);
      padding: 0 16px;
      position: relative;
    }

    .login-form {
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface);
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
    }

    .form-input {
      width: 100%;
      padding: 16px 20px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 16px;
      font-size: 16px;
      font-family: 'Google Sans', sans-serif;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      padding: 15px 19px;
      box-shadow: 0 0 0 3px var(--md-sys-color-primary-container);
    }

    .form-input.error {
      border-color: var(--md-sys-color-error);
    }

    .field-error {
      color: var(--md-sys-color-error);
      font-size: 12px;
      margin-top: 4px;
      font-family: 'Google Sans', sans-serif;
    }

    .signin-btn {
      width: 100%;
      padding: 16px;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      border-radius: 20px;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .signin-btn:hover:not(:disabled) {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .signin-btn:disabled {
      background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
      color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    .auth-toggle {
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
    }

    .toggle-btn {
      background: none;
      border: none;
      color: var(--md-sys-color-primary);
      cursor: pointer;
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
      text-decoration: underline;
    }

    .toggle-btn:hover {
      color: var(--md-sys-color-primary);
      opacity: 0.8;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 24px;
        border-radius: 16px;
      }

      .login-header h1 {
        font-size: 24px;
      }
    }
  `]
})
export class LoginComponent {
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  signInWithGoogle(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.signInWithGoogle().subscribe({
      next: (user) => {
        console.log('Login successful:', user.email);
        this.loading = false;
        this.router.navigate(['/walls']).then(() => {
          window.location.reload();
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(error);
      }
    });
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}