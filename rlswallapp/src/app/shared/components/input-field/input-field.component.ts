import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'mat-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mat-form-field" [class.mat-form-field-invalid]="hasError()">
      @if (label()) {
        <label class="mat-form-field-label">{{ label() }}</label>
      }
      <div class="mat-form-field-infix">
        <input 
          class="mat-input-element"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [required]="required()"
          [(ngModel)]="value"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()" />
      </div>
      @if (hasError() && errorMessage()) {
        <div class="mat-form-field-subscript-wrapper">
          <div class="mat-error">{{ errorMessage() }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .mat-form-field {
      display: inline-flex;
      flex-direction: column;
      position: relative;
      text-align: left;
      width: 100%;
      margin-bottom: 16px;
    }

    .mat-form-field-label {
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-body-small-size);
      font-weight: var(--md-sys-typescale-body-small-weight);
      margin-bottom: 8px;
      display: block;
    }

    .mat-form-field-infix {
      display: block;
      position: relative;
      flex: auto;
      min-width: 0;
      width: 180px;
    }

    .mat-input-element {
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      padding: 16px;
      font-family: inherit;
      font-size: var(--md-sys-typescale-body-large-size);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      width: 100%;
      box-sizing: border-box;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    .mat-input-element:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }

    .mat-input-element:disabled {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      cursor: not-allowed;
      opacity: 0.6;
    }

    .mat-form-field-invalid .mat-input-element {
      border-color: var(--md-sys-color-error);
    }

    .mat-form-field-invalid .mat-input-element:focus {
      border-color: var(--md-sys-color-error);
      box-shadow: 0 0 0 1px var(--md-sys-color-error);
    }

    .mat-form-field-subscript-wrapper {
      margin-top: 4px;
      min-height: 16px;
    }

    .mat-error {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-error);
    }
  `]
})
export class FormFieldComponent {
  label = input<string>();
  placeholder = input<string>('');
  type = input<string>('text');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  errorMessage = input<string>();
  appearance = input<string>('outline');
  subscriptSizing = input<string>('fixed');
  
  value = model<string>('');
  valueChange = output<string>();
  inputEvent = output<Event>();
  blur = output<void>();
  focus = output<void>();

  hasError() {
    return !!this.errorMessage();
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.valueChange.emit(target.value);
    this.inputEvent.emit(event);
  }

  onBlur() {
    this.blur.emit();
  }

  onFocus() {
    this.focus.emit();
  }
}