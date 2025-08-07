import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BugReportService } from '../../services/bug-report.service';
import { AuthService } from '../../../core/services/auth.service';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { FormFieldComponent } from '../form-field/form-field.component';

@Component({
  selector: 'app-bug-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialIconComponent,
    ThemedButtonComponent,
    FormFieldComponent
  ],
  template: `
    <div class="bug-report-dialog" [class.submitting]="isSubmitting">
      <!-- Dialog backdrop -->
      <div class="dialog-backdrop" (click)="onCancel()"></div>
      
      <!-- Dialog content -->
      <div class="dialog-container">
        <!-- Header -->
        <div class="dialog-header">
          <div class="dialog-icon">
            <mat-icon [icon]="'bug_report'"></mat-icon>
          </div>
          <div class="dialog-title-group">
            <h2 class="dialog-title">Report a Bug</h2>
            <p class="dialog-subtitle">Help us improve by describing the issue</p>
          </div>
          <button class="close-button" (click)="onCancel()" [disabled]="isSubmitting">
            <mat-icon [icon]="'close'"></mat-icon>
          </button>
        </div>

        <!-- Content -->
        <div class="dialog-content">
          @if (!isAuthenticated) {
            <div class="auth-message">
              <mat-icon [icon]="'lock'"></mat-icon>
              <p>You must be logged in to report a bug.</p>
            </div>
          } @else {
            <!-- Instructions -->
            <div class="instructions">
              <p>Please include:</p>
              <ul>
                <li>What you were trying to do</li>
                <li>What actually happened</li>
                <li>Any error messages you saw</li>
                <li>Steps to reproduce the issue</li>
              </ul>
            </div>

            <!-- Description field -->
            <div class="form-field-wrapper">
              <label for="bug-description" class="field-label">Describe the issue</label>
              <textarea
                id="bug-description"
                class="text-area"
                [(ngModel)]="description"
                [disabled]="isSubmitting"
                placeholder="Example: When I click on 'Create Wall', nothing happens and the page freezes..."
                rows="10"
                maxlength="5000">
              </textarea>
              <div class="field-hint">{{ description.length }} / 5000 characters</div>
            </div>

            <!-- Messages -->
            @if (errorMessage) {
              <div class="message error-message">
                <mat-icon [icon]="'error'"></mat-icon>
                <span>{{ errorMessage }}</span>
              </div>
            }

            @if (successMessage) {
              <div class="message success-message">
                <mat-icon [icon]="'check_circle'"></mat-icon>
                <span>{{ successMessage }}</span>
              </div>
            }
          }
        </div>

        <!-- Actions -->
        <div class="dialog-actions">
          <app-themed-button
            [label]="'Cancel'"
            [variant]="'basic'"
            [color]="'primary'"
            [disabled]="isSubmitting"
            (buttonClick)="onCancel()">
          </app-themed-button>
          
          <app-themed-button
            [label]="isSubmitting ? 'Sending...' : 'Send Report'"
            [variant]="'raised'"
            [color]="'primary'"
            [icon]="isSubmitting ? '' : 'send'"
            [disabled]="!description.trim() || isSubmitting || !isAuthenticated"
            (buttonClick)="onSubmit()">
          </app-themed-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bug-report-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }

    .dialog-container {
      position: relative;
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-extra-large);
      box-shadow: var(--md-sys-elevation-5);
      width: 90vw;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Header */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: var(--md-sys-spacing-4);
      padding: var(--md-sys-spacing-6);
      padding-bottom: 0;
      position: relative;
    }

    .dialog-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dialog-icon mat-icon {
      color: var(--md-sys-color-on-primary-container);
      font-size: 24px;
    }

    .dialog-title-group {
      flex: 1;
      min-width: 0;
    }

    .dialog-title {
      font-size: var(--md-sys-typescale-headline-small-size);
      font-weight: var(--md-sys-typescale-headline-small-weight);
      line-height: var(--md-sys-typescale-headline-small-line-height);
      color: var(--md-sys-color-on-surface);
      margin: 0;
      font-family: 'Google Sans', sans-serif;
    }

    .dialog-subtitle {
      font-size: var(--md-sys-typescale-body-medium-size);
      line-height: var(--md-sys-typescale-body-medium-line-height);
      color: var(--md-sys-color-on-surface-variant);
      margin: var(--md-sys-spacing-1) 0 0 0;
      font-family: 'Google Sans', sans-serif;
    }

    .close-button {
      position: absolute;
      top: var(--md-sys-spacing-3);
      right: var(--md-sys-spacing-3);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .close-button:hover {
      background: var(--md-sys-color-surface-container);
    }

    .close-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Content */
    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--md-sys-spacing-6);
      padding-top: var(--md-sys-spacing-4);
    }

    .auth-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--md-sys-spacing-3);
      padding: var(--md-sys-spacing-8) var(--md-sys-spacing-4);
      text-align: center;
    }

    .auth-message mat-icon {
      font-size: 48px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .auth-message p {
      font-size: var(--md-sys-typescale-body-large-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      font-family: 'Google Sans', sans-serif;
    }

    .instructions {
      background: var(--md-sys-color-surface-container);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-medium);
      padding: var(--md-sys-spacing-4);
      margin-bottom: var(--md-sys-spacing-5);
    }

    .instructions p {
      font-size: var(--md-sys-typescale-body-medium-size);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 var(--md-sys-spacing-2) 0;
      font-family: 'Google Sans', sans-serif;
    }

    .instructions ul {
      margin: 0;
      padding-left: var(--md-sys-spacing-5);
    }

    .instructions li {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: var(--md-sys-spacing-1) 0;
      font-family: 'Google Sans', sans-serif;
    }

    /* Form field */
    .form-field-wrapper {
      margin-bottom: var(--md-sys-spacing-4);
    }

    .field-label {
      display: block;
      font-size: var(--md-sys-typescale-body-medium-size);
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      margin-bottom: var(--md-sys-spacing-2);
      font-family: 'Google Sans', sans-serif;
    }

    .text-area {
      width: 100%;
      padding: var(--md-sys-spacing-3);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      font-size: var(--md-sys-typescale-body-large-size);
      font-family: 'Google Sans', sans-serif;
      line-height: 1.5;
      resize: vertical;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .text-area:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .text-area:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      padding: calc(var(--md-sys-spacing-3) - 1px);
    }

    .text-area:disabled {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      cursor: not-allowed;
    }

    .field-hint {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-on-surface-variant);
      margin-top: var(--md-sys-spacing-1);
      text-align: right;
      font-family: 'Google Sans', sans-serif;
    }

    /* Messages */
    .message {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
      padding: var(--md-sys-spacing-3);
      border-radius: var(--md-sys-shape-corner-medium);
      margin-top: var(--md-sys-spacing-4);
      font-size: var(--md-sys-typescale-body-medium-size);
      font-family: 'Google Sans', sans-serif;
    }

    .error-message {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      border: 1px solid var(--md-sys-color-error);
    }

    .success-message {
      background: var(--md-sys-color-tertiary-container);
      color: var(--md-sys-color-on-tertiary-container);
      border: 1px solid var(--md-sys-color-tertiary);
    }

    .message mat-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    /* Actions */
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--md-sys-spacing-3);
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-6);
      border-top: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface);
      border-radius: 0 0 var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large);
    }

    /* Loading state */
    .bug-report-dialog.submitting .dialog-container {
      pointer-events: none;
    }

    .bug-report-dialog.submitting .dialog-backdrop {
      cursor: wait;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .dialog-container {
        width: 95vw;
        max-height: 95vh;
      }

      .dialog-header {
        padding: var(--md-sys-spacing-4);
        padding-bottom: 0;
      }

      .dialog-content {
        padding: var(--md-sys-spacing-4);
        padding-top: var(--md-sys-spacing-3);
      }

      .dialog-actions {
        padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      }

      .dialog-title {
        font-size: var(--md-sys-typescale-title-medium-size);
      }

      .instructions {
        padding: var(--md-sys-spacing-3);
      }
    }

    /* Animations */
    @media (prefers-reduced-motion: reduce) {
      .bug-report-dialog,
      .dialog-container {
        animation: none;
      }
    }
  `]
})
export class BugReportDialogComponent implements OnInit {
  description = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  isAuthenticated = false;

  constructor(
    private bugReportService: BugReportService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    this.isAuthenticated = !!this.authService.currentUser;
    if (!this.isAuthenticated) {
      this.errorMessage = 'You must be logged in to report a bug.';
    }
  }

  onCancel(): void {
    // Remove the dialog from DOM
    const dialog = document.querySelector('app-bug-report-dialog');
    if (dialog) {
      dialog.remove();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.description.trim() || this.isSubmitting || !this.isAuthenticated) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.bugReportService.submitBugReport(this.description).toPromise();
      this.successMessage = 'Bug report sent successfully! Thank you for your feedback.';
      
      // Close dialog after a short delay
      setTimeout(() => {
        this.onCancel();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      this.errorMessage = 'Failed to send bug report. Please try again or email directly to jack.carbone@riversideschools.net';
    } finally {
      this.isSubmitting = false;
    }
  }
}