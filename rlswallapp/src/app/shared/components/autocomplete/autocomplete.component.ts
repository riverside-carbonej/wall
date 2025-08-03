import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'mat-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  exportAs: 'matAutocomplete',
  template: `
    <div class="mat-autocomplete-panel" [class.mat-autocomplete-visible]="isOpen()">
      <div class="mat-autocomplete-options">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .mat-autocomplete-panel {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-small);
      box-shadow: var(--md-sys-elevation-2);
      max-height: 256px;
      overflow-y: auto;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    .mat-autocomplete-panel.mat-autocomplete-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .mat-autocomplete-options {
      padding: 8px 0;
    }
  `]
})
export class AutocompleteComponent {
  isOpen = input<boolean>(false);
  displayWith = input<(value: any) => string>();
  panelWidth = input<string | number>('auto');
  
  optionSelected = output<any>();
  opened = output<void>();
  closed = output<void>();
}

@Component({
  selector: 'mat-option',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-option" 
         [class.mat-option-selected]="selected()"
         [class.mat-option-disabled]="disabled()"
         (click)="handleClick()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mat-option {
      position: relative;
      cursor: pointer;
      outline: none;
      border: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      line-height: 48px;
      height: 48px;
      padding: 0 16px;
      text-align: left;
      text-decoration: none;
      color: var(--md-sys-color-on-surface);
      font-size: var(--md-sys-typescale-body-large-size);
      transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    .mat-option:hover:not(.mat-option-disabled) {
      background: var(--md-sys-color-surface-container-high);
    }

    .mat-option.mat-option-selected {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }

    .mat-option.mat-option-disabled {
      color: var(--md-sys-color-on-surface-variant);
      cursor: default;
      opacity: 0.6;
    }
  `]
})
export class OptionComponent {
  value = input<any>();
  disabled = input<boolean | undefined>(false);
  selected = input<boolean>(false);
  
  selectionChange = output<any>();

  handleClick() {
    if (!this.disabled()) {
      this.selectionChange.emit(this.value());
    }
  }
}