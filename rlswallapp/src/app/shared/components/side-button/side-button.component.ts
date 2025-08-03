import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';

@Component({
  selector: 'app-side-button',
  standalone: true,
  imports: [CommonModule, ThemedButtonComponent],
  template: `
    <app-themed-button
      variant="basic"
      [fullWidth]="true"
      height="4em"
      justifyContent="flex-start"
      customPadding="0 2em"
      [icon]="icon()"
      [label]="title()"
      [selected]="selected()"
      [disabled]="disabled()"
      [badge]="badge()"
      class="side-button-themed"
      (buttonClick)="handleClick()">
    </app-themed-button>
  `,
  styles: [`
    :host {
      display: block;
      border-radius: 200px;
      overflow: hidden;
      margin: 0.125em 0;
      width: 100%;
    }

    .side-button-themed {
      width: 100%;
      display: block;
    }

    .side-button-themed ::ng-deep button {
      width: 100% !important;
    }

    /* Responsive behavior for mobile */
    @media (max-width: 800px) {
      .side-button-themed ::ng-deep button {
        height: 5em !important;
        justify-content: center !important;
        text-align: center !important;
        font-size: 16px !important;
      }
    }
  `]
})
export class SideButtonComponent {
  title = input<string>('');
  icon = input<string>('');
  selected = input<boolean>(false);
  disabled = input<boolean>(false);
  badge = input<string | number>();
  
  buttonClick = output<void>();

  handleClick() {
    this.buttonClick.emit();
  }
}