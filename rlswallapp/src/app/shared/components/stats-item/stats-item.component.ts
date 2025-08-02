import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stats-item',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="stat-item" [class]="containerClass">
      @if (icon) {
        <mat-icon class="stat-icon" [class]="iconClass">{{ icon }}</mat-icon>
      }
      <span class="stat-text" [class]="textClass">{{ text }}</span>
    </div>
  `,
  styles: [`
    .stat-item {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
      font-family: var(--md-sys-typescale-body-small-font-family);
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .stat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: inherit;
    }

    .stat-text {
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Variants */
    .large .stat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .large .stat-text {
      font-size: var(--md-sys-typescale-body-medium-font-size);
    }

    .primary {
      color: var(--md-sys-color-primary);
    }

    .secondary {
      color: var(--md-sys-color-secondary);
    }

    .compact {
      gap: var(--md-sys-spacing-1);
      font-size: var(--md-sys-typescale-label-small-font-size);
    }

    .compact .stat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class StatsItemComponent {
  @Input() icon?: string;
  @Input() text!: string;
  @Input() containerClass?: string;
  @Input() iconClass?: string;
  @Input() textClass?: string;
}