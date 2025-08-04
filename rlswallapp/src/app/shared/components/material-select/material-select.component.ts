import { Component, Input, Output, EventEmitter, forwardRef, HostListener, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

export interface SelectOption {
  value: any;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-material-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialIconComponent],
  template: `
    <div class="form-field">
      <label class="field-label">
        {{ label }}
        @if (required) {
          <span class="required-indicator">*</span>
        }
      </label>
      <div class="select-container" 
           [class.disabled]="disabled" 
           [class.open]="isOpen()"
           [class.error]="error"
           (click)="toggle()"
           (keydown.enter)="toggle()"
           (keydown.space)="toggle()"
           tabindex="0">
        <div class="select-value">
          @if (formControl?.value) {
            <div class="selected-content">
              @if (getSelectedOption()?.icon) {
                <mat-icon class="selected-icon" [icon]="getSelectedOption()!.icon!"></mat-icon>
              }
              <span>{{ getSelectedOption()?.label || formControl?.value }}</span>
            </div>
          } @else {
            <span class="placeholder">{{ placeholder || 'Choose an option' }}</span>
          }
        </div>
        <div class="select-arrow" [class.rotated]="isOpen()">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
        @if (isOpen()) {
          <div class="select-panel" (click)="$event.stopPropagation()">
            @for (option of options; track option.value) {
              <div class="select-option" 
                   [class.selected]="formControl?.value === option.value"
                   [class.disabled]="option.disabled"
                   (click)="selectOption(option)">
                @if (option.icon) {
                  <mat-icon class="option-icon" [icon]="option.icon"></mat-icon>
                }
                <span>{{ option.label }}</span>
              </div>
            }
          </div>  
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

    .select-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-extra-small);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      cursor: pointer;
      min-height: 24px;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .select-container:hover:not(.disabled) {
      border-color: var(--md-sys-color-on-surface);
    }

    .select-container:focus-within,
    .select-container.open {
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
      padding: 15px;
    }

    .select-container.disabled {
      background: var(--md-sys-color-surface-variant);
      border-color: var(--md-sys-color-outline-variant);
      opacity: 0.38;
      cursor: not-allowed;
    }

    .select-container.error {
      border-color: var(--md-sys-color-error);
    }

    .select-container.error:focus-within,
    .select-container.error.open {
      border-color: var(--md-sys-color-error);
      box-shadow: 0 0 0 1px var(--md-sys-color-error);
    }

    .select-value {
      flex: 1;
      font-size: var(--md-sys-typescale-body-large-size);
      font-family: var(--md-sys-typescale-body-large-font-family-name);
      line-height: 1.5;
    }

    .selected-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .selected-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-primary);
    }

    .placeholder {
      color: var(--md-sys-color-on-surface-variant);
    }

    .select-arrow {
      margin-left: 12px;
      transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
      color: var(--md-sys-color-on-surface-variant);
    }

    .select-arrow.rotated {
      transform: rotate(180deg);
    }

    .select-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--md-sys-color-surface-container-high);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-extra-small);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 250px;
      overflow-y: auto;
      margin-top: 4px;
    }

    .select-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface);
      transition: background-color 0.2s ease;
    }

    .select-option:hover:not(.disabled) {
      background: var(--md-sys-color-surface-container);
    }

    .select-option.selected {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }

    .select-option.disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .option-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .select-option.selected .option-icon {
      color: var(--md-sys-color-on-primary-container);
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
  `]
})
export class MaterialSelectComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() hint = '';
  @Input() error = '';
  @Input() options: SelectOption[] = [];
  @Input() formControl?: FormControl;

  isOpen = signal<boolean>(false);

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as Element;
    if (!target.closest('.select-container')) {
      this.isOpen.set(false);
    }
  }

  toggle() {
    if (!this.disabled) {
      this.isOpen.set(!this.isOpen());
    }
  }

  selectOption(option: SelectOption) {
    if (!option.disabled && this.formControl) {
      this.formControl.setValue(option.value);
      this.formControl.markAsTouched();
      this.isOpen.set(false);
    }
  }

  getSelectedOption(): SelectOption | undefined {
    return this.options.find(option => option.value === this.formControl?.value);
  }
}