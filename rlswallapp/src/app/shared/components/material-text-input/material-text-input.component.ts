import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

@Component({
  selector: 'app-material-text-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaterialTextInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-field">
      <label class="field-label">
        {{ label }}
        @if (required) {
          <span class="required-indicator">*</span>
        }
      </label>
      <div class="input-container" [class.error]="error" [class.disabled]="disabled">
        @if (prefixIcon) {
          <mat-icon class="prefix-icon" [icon]="prefixIcon"></mat-icon>
        }
        <input 
          [class]="inputType === 'textarea' ? 'material-textarea' : 'material-input'"
          [type]="inputType === 'textarea' ? 'text' : inputType"
          [placeholder]="placeholder || ''"
          [required]="required"
          [disabled]="disabled"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onTouched()"
          (focus)="onFocus()"
          #inputElement>
        @if (suffixIcon) {
          <mat-icon class="suffix-icon" [icon]="suffixIcon"></mat-icon>
        }
      </div>
      @if (hint) {
        <div class="field-hint">{{ hint }}</div>
      }
      @if (error) {
        <div class="field-error">
          <mat-icon [icon]="'error'"></mat-icon>
          {{ error }}
        </div>
      }
    </div>
  `,
  styles: [`
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
      width: 100%;
    }

    .field-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .required-indicator {
      color: var(--md-sys-color-error);
      font-weight: bold;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-extra-small);
      background: var(--md-sys-color-surface);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .input-container:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .input-container:focus-within {
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }

    .input-container.disabled {
      background: var(--md-sys-color-surface-variant);
      border-color: var(--md-sys-color-outline-variant);
      opacity: 0.38;
    }

    .input-container.error {
      border-color: var(--md-sys-color-error);
    }

    .input-container.error:focus-within {
      border-color: var(--md-sys-color-error);
      box-shadow: 0 0 0 1px var(--md-sys-color-error);
    }

    .prefix-icon {
      padding: 12px 0 12px 16px;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .suffix-icon {
      padding: 12px 16px 12px 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .material-input,
    .material-textarea {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      padding: 16px;
      font-size: var(--md-sys-typescale-body-large-size);
      font-family: var(--md-sys-typescale-body-large-font-family-name);
      color: var(--md-sys-color-on-surface);
      caret-color: var(--md-sys-color-primary);
      min-height: 24px;
      line-height: 1.5;
      vertical-align: top;
    }

    .material-textarea {
      resize: vertical;
      min-height: 48px;
    }

    .material-input::placeholder,
    .material-textarea::placeholder {
      color: var(--md-sys-color-on-surface-variant);
      opacity: 1;
    }

    .material-input:disabled,
    .material-textarea:disabled {
      color: var(--md-sys-color-on-surface);
      opacity: 0.38;
      cursor: not-allowed;
    }

    .field-hint {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 12px;
      margin-top: 4px;
    }

    .field-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--md-sys-color-error);
      font-size: 12px;
      margin-top: 4px;
    }

    .field-error mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Error state styling */
    .input-container.error {
      border-color: var(--md-sys-color-error);
    }

    .input-container.error:focus-within {
      border-color: var(--md-sys-color-error);
      box-shadow: 0 0 0 1px var(--md-sys-color-error);
    }
  `]
})
export class MaterialTextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() prefixIcon = '';
  @Input() suffixIcon = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() inputType: 'text' | 'email' | 'url' | 'password' | 'number' | 'textarea' = 'text';

  value = '';
  
  onChange = (value: string) => {};
  onTouched = () => {};

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onFocus() {
    // Can be used for focus handling if needed
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}