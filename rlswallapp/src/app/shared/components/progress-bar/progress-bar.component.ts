import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mat-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-progress-bar" [class.indeterminate]="mode() === 'indeterminate'">
      <div class="mat-progress-bar-background"></div>
      @if (mode() === 'determinate') {
        <div class="mat-progress-bar-fill" [style.width.%]="value()"></div>
      } @else {
        <div class="mat-progress-bar-fill indeterminate"></div>
      }
    </div>
  `,
  styles: [`
    .mat-progress-bar {
      display: block;
      height: 4px;
      overflow: hidden;
      position: relative;
      background: var(--md-sys-color-surface-variant);
      border-radius: 2px;
      width: 100%;
    }

    .mat-progress-bar-background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: var(--md-sys-color-surface-variant);
    }

    .mat-progress-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      background: var(--md-sys-color-primary);
      border-radius: 2px;
      transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .mat-progress-bar-fill.indeterminate {
      width: 100%;
      animation: mat-progress-bar-primary-indeterminate-translate 2s infinite linear;
      left: -145.166611%;
    }

    @keyframes mat-progress-bar-primary-indeterminate-translate {
      0% {
        transform: translateX(0);
      }
      20% {
        animation-timing-function: cubic-bezier(0.5, 0, 0.701732, 0.495819);
        transform: translateX(0);
      }
      59.15% {
        animation-timing-function: cubic-bezier(0.302435, 0.381352, 0.55, 0.956352);
        transform: translateX(83.67142%);
      }
      100% {
        transform: translateX(200.611057%);
      }
    }
  `]
})
export class ProgressBarComponent {
  mode = input<'determinate' | 'indeterminate'>('indeterminate');
  value = input<number>(0);
}