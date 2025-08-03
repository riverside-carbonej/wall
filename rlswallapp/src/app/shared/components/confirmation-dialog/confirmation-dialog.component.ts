import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// Note: This component is deprecated in favor of native browser confirmations

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
  icon?: string;
  iconColor?: 'primary' | 'warn' | 'accent' | 'default';
  details?: string;
  destructive?: boolean;
  showCancel?: boolean;
  width?: string;
}

export interface ConfirmationDialogResult {
  confirmed: boolean;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-container">
      <p>This component is deprecated. Use native browser confirmations instead.</p>
    </div>
  `,
  styles: [`
    .dialog-container {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      min-width: 280px;
      max-width: 560px;
    }
    
    /* Header */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: var(--md-sys-spacing-4);
      padding: var(--md-sys-spacing-6);
      padding-bottom: var(--md-sys-spacing-4);
      position: relative;
    }
    
    .dialog-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: var(--md-sys-spacing-1);
    }
    
    .dialog-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .icon-default {
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface-variant);
    }
    
    .icon-primary {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }
    
    .icon-warn {
      background-color: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }
    
    .icon-accent {
      background-color: var(--md-sys-color-tertiary-container);
      color: var(--md-sys-color-on-tertiary-container);
    }
    
    .dialog-title {
      flex: 1;
      margin: 0;
      color: var(--md-sys-color-on-surface);
      line-height: 1.3;
    }
    
    .close-button {
      position: absolute;
      top: var(--md-sys-spacing-2);
      right: var(--md-sys-spacing-2);
      width: 40px;
      height: 40px;
      color: var(--md-sys-color-on-surface-variant);
    }
    
    .close-button:hover {
      background-color: var(--md-sys-color-surface-container);
    }
    
    /* Content */
    .dialog-content {
      padding: 0 var(--md-sys-spacing-6);
      padding-bottom: var(--md-sys-spacing-4);
      max-height: 400px;
      overflow-y: auto;
    }
    
    .dialog-message {
      margin: 0;
      color: var(--md-sys-color-on-surface);
      line-height: 1.5;
    }
    
    .dialog-details {
      margin-top: var(--md-sys-spacing-4);
      padding: var(--md-sys-spacing-4);
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-small);
      border-left: 4px solid var(--md-sys-color-outline);
    }
    
    .dialog-details p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.4;
    }
    
    /* Actions */
    .dialog-actions {
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-6) var(--md-sys-spacing-6);
      gap: var(--md-sys-spacing-3);
      justify-content: flex-end;
    }
    
    .cancel-button,
    .confirm-button {
      min-width: 88px;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .dialog-container {
        min-width: 260px;
        max-width: calc(100vw - 32px);
      }
      
      .dialog-header {
        padding: var(--md-sys-spacing-4);
        padding-bottom: var(--md-sys-spacing-3);
        gap: var(--md-sys-spacing-3);
      }
      
      .dialog-content {
        padding: 0 var(--md-sys-spacing-4);
        padding-bottom: var(--md-sys-spacing-3);
      }
      
      .dialog-actions {
        padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4) var(--md-sys-spacing-4);
        flex-direction: column;
      }
      
      .cancel-button,
      .confirm-button {
        width: 100%;
        order: 1;
      }
      
      .confirm-button {
        order: 0;
      }
      
      .dialog-icon {
        width: 40px;
        height: 40px;
      }
      
      .dialog-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      .close-button {
        top: var(--md-sys-spacing-1);
        right: var(--md-sys-spacing-1);
        width: 36px;
        height: 36px;
      }
    }
    
    /* Focus States */
    .confirm-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }
    
    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .dialog-details {
        border-width: 2px;
      }
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .dialog-container {
        /* Remove any animations if they were added */
      }
    }
    
    /* Custom Material Dialog Overrides */
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: var(--md-sys-shape-corner-large) !important;
      background-color: var(--md-sys-color-surface-container-high) !important;
      color: var(--md-sys-color-on-surface) !important;
      box-shadow: var(--md-sys-elevation-3) !important;
    }
    
    ::ng-deep .mat-mdc-dialog-title {
      font-family: 'Google Sans', 'Roboto', sans-serif !important;
    }
    
    ::ng-deep .mat-mdc-dialog-content {
      font-family: 'Google Sans', 'Roboto', sans-serif !important;
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor() {
    // This component is deprecated - use native browser confirmations instead
  }
}