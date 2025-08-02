import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatProgressBarModule],
  template: `
    <div class="loading-state" [class]="containerClass">
      <div class="loading-content">
        @if (type === 'spinner') {
          <mat-spinner 
            [diameter]="spinnerSize"
            [color]="color">
          </mat-spinner>
        } @else if (type === 'bar') {
          <mat-progress-bar 
            mode="indeterminate"
            [color]="color">
          </mat-progress-bar>
        } @else {
          <mat-spinner 
            [diameter]="spinnerSize"
            [color]="color">
          </mat-spinner>
        }
        
        @if (message) {
          <p class="loading-message">{{ message }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--md-sys-spacing-6);
      min-height: 150px;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--md-sys-spacing-4);
      max-width: 300px;
      width: 100%;
    }

    .loading-message {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      text-align: center;
      line-height: 1.5;
    }

    /* Size variants */
    .small {
      min-height: 80px;
      padding: var(--md-sys-spacing-4);
    }

    .small .loading-content {
      gap: var(--md-sys-spacing-2);
    }

    .large {
      min-height: 200px;
      padding: var(--md-sys-spacing-8);
    }

    .large .loading-content {
      gap: var(--md-sys-spacing-6);
    }

    /* Layout variants */
    .inline {
      display: inline-flex;
      min-height: auto;
      padding: var(--md-sys-spacing-2);
    }

    .inline .loading-content {
      flex-direction: row;
      gap: var(--md-sys-spacing-2);
    }

    .fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      background-color: rgba(var(--md-sys-color-surface), 0.8);
      backdrop-filter: blur(4px);
    }

    /* Overlay variant */
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(var(--md-sys-color-surface), 0.9);
      backdrop-filter: blur(2px);
      z-index: 100;
    }
  `]
})
export class LoadingStateComponent {
  @Input() type: 'spinner' | 'bar' = 'spinner';
  @Input() message?: string;
  @Input() containerClass?: string;
  @Input() color: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() spinnerSize: number = 40;
}