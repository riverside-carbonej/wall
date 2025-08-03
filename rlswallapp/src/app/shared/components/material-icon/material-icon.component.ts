import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mat-icon',
  standalone: true,
  imports: [CommonModule],
  template: `{{ icon() }}`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: 'Material Symbols Outlined', 'Material Icons', monospace;
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
      -moz-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      -webkit-font-feature-settings: 'liga';
      font-feature-settings: 'liga';
      width: 1em;
      height: 1em;
      color: inherit;
      user-select: none;
      flex-shrink: 0;
    }
  `]
})
export class MaterialIconComponent {
  icon = input<string | undefined>();
}