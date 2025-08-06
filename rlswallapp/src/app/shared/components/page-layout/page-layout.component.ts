import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';

export interface PageAction {
  label: string;
  icon?: string;
  variant?: 'raised' | 'flat' | 'stroked' | 'icon';
  color?: 'primary' | 'accent' | 'warn';
  disabled?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-page-layout',
  standalone: true,
  imports: [CommonModule, ThemedButtonComponent],
  template: `
    <div class="page-layout">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          @if (showBackButton) {
            <app-themed-button
              variant="icon"
              icon="arrow_back"
              (buttonClick)="onBackClick()"
              class="back-button">
            </app-themed-button>
          }
          
          <div class="header-info">
            <h1 class="page-title">{{ title }}</h1>
            @if (subtitle) {
              <p class="page-subtitle">{{ subtitle }}</p>
            }
          </div>
          
          @if (actions && actions.length > 0) {
            <div class="header-actions">
              @for (action of actions; track action.label) {
                <app-themed-button
                  [variant]="action.variant || 'raised'"
                  [color]="action.color || 'primary'"
                  [icon]="action.icon"
                  [disabled]="action.disabled || false"
                  [pill]="true"
                  [label]="action.label"
                  [height]="'48px'"
                  class="header-action-button"
                  (buttonClick)="action.action()">
                </app-themed-button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Page Content -->
      <div class="page-content" [class]="contentClass">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .page-layout {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: var(--page-max-width, 1200px);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    /* Header */
    .page-header {
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 80px;
    }

    .back-button {
      flex-shrink: 0;
    }

    .header-info {
      flex: 1;
      margin-left: 16px;
    }

    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 400;
      color: var(--md-sys-color-on-background);
      font-family: 'Google Sans', sans-serif;
    }

    .page-subtitle {
      margin: 8px 0 0 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
      align-items: center;
    }

    /* Content */
    .page-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      box-sizing: border-box;
    }

    .page-content.grid {
      display: grid;
      gap: 24px;
    }

    .page-content.centered {
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .page-layout {
        padding: 16px;
        gap: 24px;
      }
      
      .page-title {
        font-size: 24px;
        text-align: left;
      }
      
      .header-actions {
        justify-content: center;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 600px) {
      .header-content {
        gap: 8px;
      }
      
      .header-info {
        margin-left: 12px;
      }
      
      .page-title {
        font-size: 22px;
      }
      
      .header-actions {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .page-layout {
        padding: 12px;
      }
      
      .header-content {
        gap: 8px;
      }
      
      .header-info {
        margin-left: 8px;
      }
      
      .page-title {
        font-size: 20px;
      }
      
      .header-actions {
        display: none;
      }
    }
  `]
})
export class PageLayoutComponent {
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() showBackButton = true;
  @Input() actions?: PageAction[];
  @Input() contentClass?: string;
  
  @Output() backClick = new EventEmitter<void>();

  onBackClick(): void {
    this.backClick.emit();
  }
}