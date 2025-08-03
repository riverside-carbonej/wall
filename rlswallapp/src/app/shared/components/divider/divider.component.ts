import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mat-divider',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-divider" [class.vertical]="vertical()"></div>`,
  styles: [`
    .mat-divider {
      border-top: 1px solid var(--md-sys-color-outline-variant);
      margin: 0;
      width: 100%;
      height: 0;
    }
    
    .mat-divider.vertical {
      border-top: none;
      border-left: 1px solid var(--md-sys-color-outline-variant);
      width: 0;
      height: 100%;
      margin: 0 8px;
    }
  `]
})
export class DividerComponent {
  vertical = input<boolean>(false);
}