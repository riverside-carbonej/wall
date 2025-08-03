import { Component, input, output, model, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'mat-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mat-select-trigger" (click)="toggle()">
      <span class="mat-select-value">
        @if (value()) {
          <span class="mat-select-value-text">{{ getDisplayValue() }}</span>
        } @else {
          <span class="mat-select-placeholder">{{ placeholder() }}</span>
        }
      </span>
      <div class="mat-select-arrow-wrapper">
        <div class="mat-select-arrow"></div>
      </div>
    </div>
    
    @if (isOpen()) {
      <div class="mat-select-panel" (click)="$event.stopPropagation()">
        <ng-content></ng-content>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    .mat-select-trigger {
      display: flex;
      align-items: center;
      cursor: pointer;
      min-height: 56px;
      padding: 0 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface);
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    .mat-select-trigger:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .mat-select-trigger:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }

    .mat-select-value {
      flex: 1;
      font-size: var(--md-sys-typescale-body-large-size);
      color: var(--md-sys-color-on-surface);
    }

    .mat-select-placeholder {
      color: var(--md-sys-color-on-surface-variant);
    }

    .mat-select-arrow-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .mat-select-arrow {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid var(--md-sys-color-on-surface-variant);
      transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    .mat-select-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--md-sys-color-surface-container);
      border: 1px solid var(--md-sys-color-outline-variant);  
      border-radius: var(--md-sys-shape-corner-small);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 256px;
      overflow-y: auto;
      z-index: 1000;
      margin-top: 4px;
    }
  `]
})
export class SelectComponent {
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  multiple = input<boolean | string>(false);
  
  value = model<any>();
  selectionChange = output<any>();
  
  isOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close dropdown when clicking outside
    this.isOpen.set(false);
  }

  toggle() {
    if (!this.disabled()) {
      this.isOpen.set(!this.isOpen());
    }
  }

  selectOption(option: any) {
    this.value.set(option);
    this.selectionChange.emit(option);
    this.isOpen.set(false);
  }

  getDisplayValue(): string {
    const val = this.value();
    if (val && typeof val === 'object' && val.name) {
      return val.name;
    }
    return val?.toString() || '';
  }
}

// For module compatibility
export const MatSelectModule = SelectComponent;