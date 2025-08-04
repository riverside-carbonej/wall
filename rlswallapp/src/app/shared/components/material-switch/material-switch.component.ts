import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-material-switch',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaterialSwitchComponent),
      multi: true
    }
  ],
  template: `
    <div class="material-switch-container">
      <label class="switch-label" [class.disabled]="disabled">
        <input 
          type="checkbox" 
          class="switch-input"
          [checked]="value"
          [disabled]="disabled"
          (change)="onToggle($event)"
          [attr.aria-label]="ariaLabel"
        >
        <span class="switch-track">
          <span class="switch-thumb"></span>
        </span>
        <span class="switch-text" *ngIf="label">{{ label }}</span>
      </label>
      <div class="help-text" *ngIf="helpText">{{ helpText }}</div>
    </div>
  `,
  styles: [`
    .material-switch-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .switch-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      font-weight: var(--md-sys-typescale-body-medium-font-weight);
      color: var(--md-sys-color-on-surface);
      transition: color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .switch-label.disabled {
      cursor: not-allowed;
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.6;
    }

    .switch-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .switch-track {
      position: relative;
      width: 52px;
      height: 32px;
      background: var(--md-sys-color-surface-variant);
      border: 2px solid var(--md-sys-color-outline);
      border-radius: 16px;
      transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
      cursor: pointer;
      flex-shrink: 0;
    }

    .switch-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 24px;
      height: 24px;
      background: var(--md-sys-color-outline);
      border-radius: 50%;
      transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
    }

    .switch-input:checked + .switch-track {
      background: var(--md-sys-color-primary);
      border-color: var(--md-sys-color-primary);
    }

    .switch-input:checked + .switch-track .switch-thumb {
      transform: translateX(20px);
      background: var(--md-sys-color-on-primary);
    }

    .switch-input:focus + .switch-track {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    .switch-input:disabled + .switch-track {
      background: var(--md-sys-color-surface-variant);
      border-color: var(--md-sys-color-outline-variant);
      opacity: 0.4;
      cursor: not-allowed;
    }

    .switch-input:disabled + .switch-track .switch-thumb {
      background: var(--md-sys-color-outline-variant);
    }

    .switch-text {
      user-select: none;
      flex: 1;
    }

    .help-text {
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin-left: 64px; /* Align with switch text */
    }

    /* Hover states */
    .switch-label:hover:not(.disabled) .switch-track {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .switch-label:hover:not(.disabled) .switch-thumb {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.30);
    }

    /* Active states */
    .switch-label:active:not(.disabled) .switch-thumb {
      width: 28px;
    }

    .switch-input:checked + .switch-track .switch-label:active:not(.disabled) .switch-thumb {
      transform: translateX(16px);
    }

    /* Ripple effect on interaction */
    .switch-track::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--md-sys-color-primary);
      opacity: 0;
      transform: translate(-50%, -50%) scale(0);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      pointer-events: none;
    }

    .switch-input:focus + .switch-track::before,
    .switch-label:active:not(.disabled) .switch-track::before {
      opacity: 0.12;
      transform: translate(-50%, -50%) scale(1);
    }
  `]
})
export class MaterialSwitchComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() helpText?: string;
  @Input() disabled: boolean = false;
  @Input() ariaLabel?: string;
  
  @Output() change = new EventEmitter<boolean>();

  value: boolean = false;
  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  onToggle(event: Event): void {
    if (this.disabled) return;
    
    const target = event.target as HTMLInputElement;
    this.value = target.checked;
    this.onChange(this.value);
    this.onTouched();
    this.change.emit(this.value);
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.value = value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}