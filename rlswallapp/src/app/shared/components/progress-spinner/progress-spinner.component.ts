import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mat-progress-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-progress-spinner" [style.width.px]="diameter()" [style.height.px]="diameter()">
      <svg class="mat-progress-spinner-svg" 
           [attr.width]="diameter()" 
           [attr.height]="diameter()" 
           viewBox="0 0 100 100">
        <circle class="mat-progress-spinner-circle"
                cx="50" 
                cy="50" 
                [attr.r]="radius()"
                fill="none"
                [style.stroke-width.px]="strokeWidth()"
                stroke-miterlimit="20">
        </circle>
      </svg>
    </div>
  `,
  styles: [`
    .mat-progress-spinner {
      display: block;
      position: relative;
      overflow: hidden;
    }

    .mat-progress-spinner-svg {
      position: absolute;
      transform: rotate(-90deg);
      top: 0;
      left: 0;
      transform-origin: center;
      overflow: visible;
    }

    .mat-progress-spinner-circle {
      stroke: var(--md-sys-color-primary);
      animation: mat-progress-spinner-stroke-rotate-100 4s ease-in-out infinite;
      stroke-dasharray: 1, 200;
      stroke-dashoffset: 0;
      stroke-linecap: round;
    }

    @keyframes mat-progress-spinner-stroke-rotate-100 {
      0% {
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 89, 200;
        stroke-dashoffset: -35px;
      }
      100% {
        stroke-dasharray: 89, 200;
        stroke-dashoffset: -124px;
      }
    }

    .mat-progress-spinner {
      animation: mat-progress-spinner-linear-rotate 2s linear infinite;
    }

    @keyframes mat-progress-spinner-linear-rotate {
      0% {
        transform: rotate(0);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `]
})
export class ProgressSpinnerComponent {
  diameter = input<number>(40);
  strokeWidth = input<number>(4);
  
  radius() {
    return (this.diameter() - this.strokeWidth()) / 2;
  }
}