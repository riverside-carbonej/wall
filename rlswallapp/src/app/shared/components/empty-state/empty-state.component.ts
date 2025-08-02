import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface EmptyStateAction {
  label: string;
  icon?: string;
  primary?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state" [class]="containerClass">
      <div class="empty-state-content">
        @if (icon) {
          <mat-icon class="empty-icon" [class]="iconClass">{{ icon }}</mat-icon>
        }
        
        @if (title) {
          <h3 class="empty-title">{{ title }}</h3>
        }
        
        @if (message) {
          <p class="empty-message">{{ message }}</p>
        }
        
        @if (actions && actions.length > 0) {
          <div class="empty-actions">
            @for (action of actions; track action.label) {
              @if (action.primary) {
                <button 
                  mat-raised-button
                  color="primary"
                  (click)="action.action()">
                  @if (action.icon) {
                    <mat-icon>{{ action.icon }}</mat-icon>
                  }
                  {{ action.label }}
                </button>
              } @else {
                <button 
                  mat-button
                  (click)="action.action()">
                  @if (action.icon) {
                    <mat-icon>{{ action.icon }}</mat-icon>
                  }
                  {{ action.label }}
                </button>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--md-sys-spacing-8);
      text-align: center;
      min-height: 200px;
    }

    .empty-state-content {
      max-width: 400px;
      width: 100%;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: var(--md-sys-spacing-4);
    }

    .empty-title {
      font-family: var(--md-sys-typescale-headline-small-font-family);
      font-size: var(--md-sys-typescale-headline-small-font-size);
      font-weight: var(--md-sys-typescale-headline-small-font-weight);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 var(--md-sys-spacing-2) 0;
    }

    .empty-message {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0 0 var(--md-sys-spacing-6) 0;
      line-height: 1.5;
    }

    .empty-actions {
      display: flex;
      gap: var(--md-sys-spacing-3);
      justify-content: center;
      flex-wrap: wrap;
    }

    .empty-actions button {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
    }

    /* Variants */
    .centered {
      min-height: 300px;
    }

    .compact {
      min-height: 150px;
      padding: var(--md-sys-spacing-4);
    }

    .full-height {
      min-height: 60vh;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .empty-state {
        padding: var(--md-sys-spacing-4);
      }

      .empty-actions {
        flex-direction: column;
        align-items: center;
      }

      .empty-actions button {
        width: 100%;
        max-width: 200px;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title?: string;
  @Input() message?: string;
  @Input() actions?: EmptyStateAction[];
  @Input() containerClass?: string;
  @Input() iconClass?: string;
}