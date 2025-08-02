import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ErrorDialogData {
  title: string;
  message: string;
  showRetry?: boolean;
  details?: string;
}

@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="error-dialog">
      <div class="dialog-header">
        <mat-icon class="error-icon">error</mat-icon>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content class="dialog-content">
        <p class="error-message">{{ data.message }}</p>
        
        <div *ngIf="data.details" class="error-details">
          <details>
            <summary>Technical Details</summary>
            <pre>{{ data.details }}</pre>
          </details>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions class="dialog-actions">
        <button 
          mat-outlined-button 
          [mat-dialog-close]="false"
          class="close-button">
          <mat-icon>close</mat-icon>
          Close
        </button>
        
        <button 
          *ngIf="data.showRetry"
          mat-raised-button 
          color="primary"
          [mat-dialog-close]="true"
          class="retry-button">
          <mat-icon>refresh</mat-icon>
          Retry
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .error-dialog {
      min-width: 300px;
      max-width: 500px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .error-icon {
      color: var(--md-sys-color-error);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .dialog-content {
      margin: 0;
    }

    .error-message {
      margin: 0 0 16px 0;
      color: var(--md-sys-color-on-surface);
      line-height: 1.5;
    }

    .error-details {
      margin-top: 16px;
    }

    .error-details summary {
      cursor: pointer;
      font-weight: 500;
      color: var(--md-sys-color-primary);
      margin-bottom: 8px;
    }

    .error-details pre {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface-variant);
      padding: 12px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 8px 0 0 0;
    }

    .dialog-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
      padding: 0;
    }

    .close-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Material Dialog Overrides */
    ::ng-deep .mat-mdc-dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    ::ng-deep .mat-mdc-dialog-content {
      max-height: 400px;
      overflow-y: auto;
    }
  `]
})
export class ErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogData
  ) {}
}