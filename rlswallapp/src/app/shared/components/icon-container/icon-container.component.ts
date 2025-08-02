import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-icon-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="icon-container" 
         [class]="containerClass"
         [style.background-color]="backgroundColor"
         [style.color]="iconColor">
      <mat-icon [class]="iconClass">{{ icon }}</mat-icon>
    </div>
  `,
  styles: [`
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--md-sys-shape-corner-medium);
      background-color: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .icon-container mat-icon {
      color: inherit;
    }

    /* Size variants */
    .small {
      width: 32px;
      height: 32px;
      border-radius: var(--md-sys-shape-corner-small);
    }

    .small mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .medium {
      width: 40px;
      height: 40px;
    }

    .medium mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .large {
      width: 48px;
      height: 48px;
    }

    .large mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .extra-large {
      width: 64px;
      height: 64px;
      border-radius: var(--md-sys-shape-corner-large);
    }

    .extra-large mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    /* Shape variants */
    .round {
      border-radius: 50%;
    }

    .square {
      border-radius: var(--md-sys-shape-corner-small);
    }

    .rounded-square {
      border-radius: var(--md-sys-shape-corner-medium);
    }

    /* Color variants */
    .primary {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }

    .secondary {
      background-color: var(--md-sys-color-secondary-container);
      color: var(--md-sys-color-on-secondary-container);
    }

    .tertiary {
      background-color: var(--md-sys-color-tertiary-container);
      color: var(--md-sys-color-on-tertiary-container);
    }

    .surface {
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
    }

    .error {
      background-color: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }

    /* Interactive states */
    .clickable {
      cursor: pointer;
    }

    .clickable:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .clickable:active {
      transform: scale(0.95);
    }

    /* Shadow variants */
    .shadow-none {
      box-shadow: none;
    }

    .shadow-medium {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .shadow-large {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class IconContainerComponent {
  @Input() icon!: string;
  @Input() containerClass?: string;
  @Input() iconClass?: string;
  @Input() backgroundColor?: string;
  @Input() iconColor?: string;
}