import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// Note: This component is deprecated in favor of native browser alerts

export interface ErrorDialogData {
  title: string;
  message: string;
  showRetry?: boolean;
  details?: string;
}

@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-dialog">
      <p>This component is deprecated. Use native browser alerts instead.</p>
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
  constructor() {
    // This component is deprecated - use native browser alerts instead
  }
}