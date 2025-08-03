import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: '[matTooltip]',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      position: relative;
    }
    
    :host::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--md-sys-color-inverse-surface);
      color: var(--md-sys-color-inverse-on-surface);
      padding: 8px 12px;
      border-radius: var(--md-sys-shape-corner-small);
      font-size: var(--md-sys-typescale-body-small-size);
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      pointer-events: none;
      z-index: 1000;
      margin-bottom: 8px;
    }
    
    :host:hover::after {
      opacity: 1;
      visibility: visible;
    }
  `],
  host: {
    '[attr.data-tooltip]': 'matTooltip()'
  }
})
export class TooltipDirective {
  matTooltip = input<string>('');
}

@Component({
  selector: 'mat-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`
})
export class TooltipComponent {}

// For module compatibility
export const MatTooltipModule = TooltipDirective;