import { Component, input, output, model, signal, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MaterialIconComponent } from './material-icon/material-icon.component';

// Card Components
@Component({
  selector: 'mat-card',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-sys-elevation-1);
      padding: 24px;
      margin: 16px 0;
    }
  `]
})
export class MatCard {}

@Component({
  selector: 'mat-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card-header"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }
  `]
})
export class MatCardHeader {}

@Component({
  selector: 'mat-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `<h2 class="mat-card-title"><ng-content></ng-content></h2>`,
  styles: [`
    .mat-card-title {
      font-size: var(--md-sys-typescale-headline-small-size);
      margin: 0;
      color: var(--md-sys-color-on-surface);
    }
  `]
})
export class MatCardTitle {}

@Component({
  selector: 'mat-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card-content"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card-content {
      color: var(--md-sys-color-on-surface-variant);
    }
  `]
})
export class MatCardContent {}

@Component({
  selector: 'mat-card-actions',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card-actions"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
  `]
})
export class MatCardActions {
  align = input<string>('start');
}

// Checkbox
@Component({
  selector: 'mat-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: MatCheckbox,
      multi: true
    }
  ],
  template: `
    <label class="mat-checkbox">
      <input type="checkbox" 
             [checked]="getCheckedState()" 
             [disabled]="disabled()"
             (change)="onCheck($event)">
      <span class="checkmark"></span>
      <span class="label"><ng-content></ng-content></span>
    </label>
  `,
  styles: [`
    .mat-checkbox {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface);
    }
    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: var(--md-sys-color-primary);
    }
  `]
})
export class MatCheckbox implements ControlValueAccessor {
  checked = input<boolean>(false);
  disabled = input<boolean>(false);
  change = output<boolean>();

  private internalChecked = signal<boolean>(false);
  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  getCheckedState(): boolean {
    // Use external checked input if provided, otherwise use internal state
    return this.checked() !== undefined ? this.checked() : this.internalChecked();
  }

  onCheck(event: any) {
    const value = event.target.checked;
    this.internalChecked.set(value);
    this.change.emit(value);
    this.onChange(value);
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.internalChecked.set(value || false);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state if needed
  }
}

// Slide Toggle
@Component({
  selector: 'mat-slide-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label class="mat-slide-toggle">
      <input type="checkbox" 
             [checked]="checked()" 
             [disabled]="disabled()"
             (change)="onToggle($event)">
      <span class="slider"></span>
      <span class="label"><ng-content></ng-content></span>
    </label>
  `,
  styles: [`
    .mat-slide-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface);
    }
    input[type="checkbox"] {
      width: 40px;
      height: 20px;
      appearance: none;
      background: var(--md-sys-color-surface-variant);
      border-radius: 10px;
      position: relative;
      cursor: pointer;
    }
    input[type="checkbox"]:checked {
      background: var(--md-sys-color-primary);
    }
  `]
})
export class MatSlideToggle {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);
  change = output<boolean>();

  onToggle(event: any) {
    this.checked.set(event.target.checked);
    this.change.emit(event.target.checked);
  }
}

// Slider
@Component({
  selector: 'mat-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mat-slider">
      <input type="range" 
             [min]="min()" 
             [max]="max()" 
             [step]="step()"
             [value]="value()" 
             [disabled]="disabled()"
             (input)="onSlide($event)">
    </div>
  `,
  styles: [`
    .mat-slider input[type="range"] {
      width: 100%;
      height: 20px;
      accent-color: var(--md-sys-color-primary);
    }
  `]
})
export class MatSlider {
  min = input<number>(0);
  max = input<number>(100);
  step = input<number>(1);
  value = model<number>(0);
  disabled = input<boolean>(false);
  change = output<number>();

  onSlide(event: any) {
    const val = Number(event.target.value);
    this.value.set(val);
    this.change.emit(val);
  }
}

// Chips
@Component({
  selector: 'mat-chip-listbox',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-chip-listbox"><ng-content></ng-content></div>`,
  styles: [`
    .mat-chip-listbox {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `]
})
export class MatChipListbox {}

@Component({
  selector: 'mat-chip-option',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-chip-option" [class.selected]="selected()" (click)="toggle()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mat-chip-option {
      padding: 8px 16px;
      border-radius: 16px;
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      transition: all 200ms;
    }
    .mat-chip-option.selected {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }
  `]
})
export class MatChipOption {
  selected = model<boolean>(false);
  selectionChange = output<boolean>();

  toggle() {
    this.selected.set(!this.selected());
    this.selectionChange.emit(this.selected());
  }
}

// Tabs
@Component({
  selector: 'mat-tab-group',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-tab-group"><ng-content></ng-content></div>`,
  styles: [`
    .mat-tab-group {
      display: block;
    }
  `]
})
export class MatTabGroup {
  selectedIndex = model<number>(0);
}

@Component({
  selector: 'mat-tab',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-tab"><ng-content></ng-content></div>`,
  styles: [`
    .mat-tab {
      padding: 16px;
    }
  `]
})
export class MatTab {
  label = input<string>('');
  disabled = input<boolean>(false);
}

// Expansion Panel
@Component({
  selector: 'mat-expansion-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-expansion-panel">
      <div class="mat-expansion-panel-header" (click)="toggle()">
        <ng-content select="mat-expansion-panel-header"></ng-content>
      </div>
      @if (expanded()) {
        <div class="mat-expansion-panel-content">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styles: [`
    .mat-expansion-panel {
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-small);
      margin: 8px 0;
    }
    .mat-expansion-panel-header {
      padding: 16px;
      cursor: pointer;
      background: var(--md-sys-color-surface-container);
    }
    .mat-expansion-panel-content {
      padding: 16px;
    }
  `]
})
export class MatExpansionPanel {
  expanded = model<boolean>(false);

  toggle() {
    this.expanded.set(!this.expanded());
  }
}

@Component({
  selector: 'mat-expansion-panel-header',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`
})
export class MatExpansionPanelHeader {}

@Component({
  selector: 'mat-panel-title',
  standalone: true,
  imports: [CommonModule],
  template: `<h4 class="mat-panel-title"><ng-content></ng-content></h4>`,
  styles: [`
    .mat-panel-title {
      margin: 0;
      font-size: var(--md-sys-typescale-title-medium-size);
      color: var(--md-sys-color-on-surface);
    }
  `]
})
export class MatPanelTitle {}

@Component({
  selector: 'mat-panel-description',
  standalone: true,
  imports: [CommonModule],
  template: `<p class="mat-panel-description"><ng-content></ng-content></p>`,
  styles: [`
    .mat-panel-description {
      margin: 0;
      font-size: var(--md-sys-typescale-body-medium-size);
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.8;
    }
  `]
})
export class MatPanelDescription {}

// Label Component
@Component({
  selector: 'mat-label',
  standalone: true,
  imports: [CommonModule],
  template: `<label class="mat-label"><ng-content></ng-content></label>`,
  styles: [`
    .mat-label {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-on-surface-variant);
      font-weight: 500;
      display: block;
      margin-bottom: 8px;
    }
  `]
})
export class MatLabel {}

// Spinner Component  
@Component({
  selector: 'mat-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-spinner" [style.width.px]="diameter()" [style.height.px]="diameter()"></div>`,
  styles: [`
    .mat-spinner {
      border: 4px solid var(--md-sys-color-primary);
      border-top: 4px solid transparent;
      border-radius: 50%;
      animation: spin 2s linear infinite;
      display: inline-block;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class MatSpinner {
  diameter = input<number>(40);
  color = input<string>('primary');
}

// Option Group
@Component({
  selector: 'mat-optgroup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-optgroup">
      <div class="mat-optgroup-label">{{ label() }}</div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mat-optgroup-label {
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant);
      padding: 8px 16px;
      font-size: var(--md-sys-typescale-body-small-size);
    }
  `]
})
export class MatOptgroup {
  label = input<string>('');
}

// Error Component
@Component({
  selector: 'mat-error',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-error"><ng-content></ng-content></div>`,
  styles: [`
    .mat-error {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-error);
      margin-top: 4px;
    }
  `]
})
export class MatError {}

// Card Subtitle
@Component({
  selector: 'mat-card-subtitle',
  standalone: true,
  imports: [CommonModule],
  template: `<p class="mat-card-subtitle"><ng-content></ng-content></p>`,
  styles: [`
    .mat-card-subtitle {
      font-size: var(--md-sys-typescale-body-medium-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0 0 16px 0;
    }
  `]
})
export class MatCardSubtitle {}

// Module exports for compatibility
export const MatCardModule = MatCard;
export const MatCheckboxModule = MatCheckbox;
export const MatSlideToggleModule = MatSlideToggle;
export const MatSliderModule = MatSlider;
export const MatChipsModule = MatChipListbox;
export const MatTabsModule = MatTabGroup;
export const MatExpansionModule = MatExpansionPanel;

// Progress Bar Component
@Component({
  selector: 'mat-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-progress-bar">
      <div class="mat-progress-bar-fill"></div>
    </div>
  `,
  styles: [`
    .mat-progress-bar {
      display: block;
      height: 4px;
      overflow: hidden;
      position: relative;
      transition: opacity 250ms linear;
      width: 100%;
      background: var(--md-sys-color-surface-variant);
      border-radius: 2px;
    }
    .mat-progress-bar-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: var(--md-sys-color-primary);
      animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
      border-radius: 2px;
    }
    @keyframes indeterminate {
      0% { left: -35%; right: 100%; }
      60% { left: 100%; right: -90%; }
      100% { left: 100%; right: -90%; }
    }
  `]
})
export class MatProgressBar {
  mode = input<string>('indeterminate');
  color = input<string>('primary');
}

// Form Field Component
@Component({
  selector: 'mat-form-field',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mat-form-field"><ng-content></ng-content></div>',
  styles: [`.mat-form-field { display: block; margin-bottom: 16px; position: relative; }`]
})
export class MatFormField {
  appearance = input<string>('outline');
  floatLabel = input<string>('auto');
}

// Hint Component
@Component({
  selector: 'mat-hint',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mat-hint"><ng-content></ng-content></div>',
  styles: [`
    .mat-hint {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 4px;
    }
  `]
})
export class MatHint {
  align = input<string>('start');
}


// Divider Component  
@Component({
  selector: 'mat-divider',
  standalone: true,
  imports: [CommonModule],
  template: '<hr class="mat-divider">',
  styles: [`
    .mat-divider {
      border: none;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      margin: 16px 0;
    }
  `]
})
export class MatDivider {}

// Menu Components (they were added via previous edits but somehow missing)
@Component({
  selector: 'mat-menu',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mat-menu"><ng-content></ng-content></div>',
  styles: [`.mat-menu { background: var(--md-sys-color-surface-container); border-radius: var(--md-sys-shape-corner-small); box-shadow: var(--md-sys-elevation-2); padding: 8px 0; }`]
})
export class MatMenu {}

@Component({
  selector: 'mat-menu-item',
  standalone: true,
  imports: [CommonModule],
  template: '<button class="mat-menu-item"><ng-content></ng-content></button>',
  styles: [`.mat-menu-item { width: 100%; padding: 12px 16px; border: none; background: none; color: var(--md-sys-color-on-surface); cursor: pointer; text-align: left; } .mat-menu-item:hover { background: var(--md-sys-color-surface-container-hover); }`]
})
export class MatMenuItem {}

// Material 3 Datepicker Components
@Component({
  selector: 'mat-datepicker',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="mat-datepicker-panel">
        <div class="mat-datepicker-content">
          <input type="date" 
                 [value]="selectedDate()" 
                 (change)="onDateChange($event)"
                 class="native-date-input">
        </div>
      </div>
    }
  `,
  styles: [`
    .mat-datepicker-panel {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 1000;
      background: var(--md-sys-color-surface-container-high);
      border-radius: var(--md-sys-shape-corner-large);
      box-shadow: var(--md-sys-elevation-3);
      padding: var(--md-sys-spacing-4);
      min-width: 280px;
    }
    .native-date-input {
      width: 100%;
      padding: var(--md-sys-spacing-3);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
    }
  `]
})
export class MatDatepicker {
  selectedDate = model<string>('');
  isOpen = model<boolean>(false);
  
  onDateChange(event: any) {
    this.selectedDate.set(event.target.value);
  }
  
  open() {
    this.isOpen.set(true);
  }
  
  close() {
    this.isOpen.set(false);
  }
}

@Component({
  selector: 'mat-datepicker-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="mat-datepicker-toggle" (click)="toggle()" type="button">
      <svg class="calendar-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
      </svg>
    </button>
  `,
  styles: [`
    .mat-datepicker-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--md-sys-spacing-2);
      border-radius: var(--md-sys-shape-corner-small);
      color: var(--md-sys-color-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: var(--md-sys-touch-target-min);
      min-height: var(--md-sys-touch-target-min);
    }
    .mat-datepicker-toggle:hover {
      background: var(--md-sys-color-surface-container);
    }
    .calendar-icon {
      width: 20px;
      height: 20px;
    }
  `]
})
export class MatDatepickerToggle {
  for = input<MatDatepicker | null>(null);
  
  toggle() {
    const datepicker = this.for();
    if (datepicker) {
      if (datepicker.isOpen()) {
        datepicker.close();
      } else {
        datepicker.open();
      }
    }
  }
}

// Material 3 Accordion Component
@Component({
  selector: 'mat-accordion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-accordion">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mat-accordion {
      display: block;
      border-radius: var(--md-sys-shape-corner-medium);
      border: 1px solid var(--md-sys-color-outline-variant);
      overflow: hidden;
    }
    .mat-accordion > ::ng-deep mat-expansion-panel:not(:first-child) {
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }
  `]
})
export class MatAccordion {
  multi = input<boolean | string>(false);
  
  get allowMultiple(): boolean {
    const multi = this.multi();
    return multi === true || multi === 'true';
  }
}

// Material 3 Option Component
@Component({
  selector: 'mat-option',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-option" 
         [class.selected]="isSelected()" 
         [class.disabled]="disabled()"
         (click)="select()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mat-option {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      min-height: 48px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
      font-size: 1rem;
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }
    .mat-option:hover:not(.disabled) {
      background-color: var(--md-sys-color-surface-container);
    }
    .mat-option.selected {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }
    .mat-option.disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }
  `]
})
export class MatOption {
  value = input<any>(null);
  disabled = input<boolean>(false);
  selectionChange = output<any>();

  constructor(private elementRef: ElementRef) {}

  isSelected(): boolean {
    // For simplicity, we'll implement selection checking later
    return false;
  }

  select() {
    console.log('Option clicked, value:', this.value());
    if (!this.disabled()) {
      // Find the parent select component by traversing up the DOM
      let element = this.elementRef.nativeElement.parentElement;
      while (element) {
        if (element.classList && element.classList.contains('mat-select')) {
          break;
        }
        element = element.parentElement;
      }
      
      if (element) {
        // Dispatch a custom event that the select component can listen for
        const customEvent = new CustomEvent('optionSelected', {
          detail: this.value(),
          bubbles: true
        });
        element.dispatchEvent(customEvent);
      }
      
      this.selectionChange.emit(this.value());
    }
  }
}

// Material 3 Select Component
@Component({
  selector: 'mat-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: MatSelect,
      multi: true
    }
  ],
  template: `
    <div class="mat-select" 
         [class.disabled]="disabled()" 
         [class.open]="isOpen()"
         (click)="toggle()"
         (keydown.enter)="toggle()"
         (keydown.space)="toggle()"
         (optionSelected)="onCustomOptionSelected($event)"
         tabindex="0">
      <div class="mat-select-value">
        @if (selectedValue()) {
          <div class="selected-content">
            @if (showIcon()) {
              <mat-icon class="selected-icon" [icon]="selectedValue()"></mat-icon>
            }
            <span>{{ getDisplayValue() }}</span>
          </div>
        } @else {
          <span class="placeholder">{{ placeholder() || 'Choose an option' }}</span>
        }
      </div>
      <div class="mat-select-arrow" [class.rotated]="isOpen()">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
      @if (isOpen()) {
        <div class="mat-select-panel" (click)="$event.stopPropagation()">
          <ng-content></ng-content>
        </div>  
      }
    </div>
  `,
  styles: [`
    .mat-select {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      cursor: pointer;
      min-height: 56px;
      font-family: 'Google Sans', sans-serif;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }
    .mat-select:hover:not(.disabled) {
      border-color: var(--md-sys-color-on-surface);
    }
    .mat-select.open {
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      padding: 15px;
    }
    .mat-select.disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }
    .mat-select-value {
      flex: 1;
      font-size: 1rem;
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
    .mat-select-arrow {
      margin-left: 12px;
      transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
      color: var(--md-sys-color-on-surface-variant);
    }
    .mat-select-arrow.rotated {
      transform: rotate(180deg);
    }
    .mat-select-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--md-sys-color-surface-container-high);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-small);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 250px;
      overflow-y: auto;
      margin-top: 4px;
      backdrop-filter: none;
      opacity: 1;
    }
  `]
})
export class MatSelect implements ControlValueAccessor {
  selectedValue = signal<any>(null);
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  isOpen = signal<boolean>(false);
  multiple = input<boolean>(false);
  selectionChange = output<any>();
  displayValueFunction = input<((value: any) => string) | null>(null);
  showIcon = input<boolean>(false);
  
  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Only close if clicking outside the select
    const target = event.target as Element;
    if (!target.closest('.mat-select')) {
      this.isOpen.set(false);
    }
  }

  toggle() {
    console.log('Toggle called, disabled:', this.disabled(), 'current isOpen:', this.isOpen());
    if (!this.disabled()) {
      const newState = !this.isOpen();
      this.isOpen.set(newState);
      console.log('New isOpen state:', newState);
    }
  }

  onCustomOptionSelected(event: Event) {
    console.log('Custom option selected event:', event);
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      this.selectOption(customEvent.detail);
    }
  }

  selectOption(value: any) {
    console.log('Option selected:', value);
    this.selectedValue.set(value);
    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit(value);
    this.isOpen.set(false);
  }

  getDisplayValue(): string {
    const value = this.selectedValue();
    
    // Use custom display function if provided
    const displayFn = this.displayValueFunction();
    if (displayFn) {
      return displayFn(value);
    }
    
    // Default display logic
    if (typeof value === 'object' && value?.label) {
      return value.label;
    }
    if (typeof value === 'string') {
      return value;
    }
    return value?.toString() || '';
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.selectedValue.set(value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state
  }
}

// Material 3 Chip Component
@Component({
  selector: 'mat-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-chip" 
         [class.selected]="selected()" 
         [class.disabled]="disabled()">
      <ng-content></ng-content>
      @if (removable()) {
        <button class="chip-remove" (click)="remove()" type="button">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
          </svg>
        </button>  
      }
    </div>
  `,
  styles: [`
    .mat-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-3);
      border-radius: var(--md-sys-shape-corner-small);
      background-color: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      font-family: 'Google Sans', sans-serif;
      font-size: var(--md-sys-typescale-label-large-size);
      font-weight: var(--md-sys-typescale-label-large-weight);
      border: 1px solid var(--md-sys-color-outline);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      cursor: default;
    }
    .mat-chip.selected {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      border-color: var(--md-sys-color-primary);
    }
    .mat-chip.disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }
    .chip-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      padding: 2px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chip-remove:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  `]
})
export class MatChip {
  selected = model<boolean>(false);
  disabled = input<boolean>(false);
  removable = input<boolean>(false);
  removed = output<void>();

  remove() {
    if (!this.disabled()) {
      this.removed.emit();
    }
  }
}