import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-field" [class.full-width]="class()?.includes('full-width')" [class.half-width]="class()?.includes('half-width')">
      @if (label()) {
        <label class="field-label">{{ label() }}</label>
      }
      
      @if (type() === 'select') {
        <select class="field-input" 
                [(ngModel)]="value" 
                [disabled]="disabled()"
                [required]="required()">
          <ng-content></ng-content>
        </select>
      } @else if (type() === 'textarea') {
        <textarea class="field-input" 
                  [(ngModel)]="value"
                  [placeholder]="placeholder()"
                  [disabled]="disabled()"
                  [required]="required()"
                  rows="3"></textarea>
      } @else {
        <input class="field-input" 
               [type]="type()"
               [(ngModel)]="value"
               [placeholder]="placeholder()"
               [disabled]="disabled()"
               [required]="required()"
               [min]="min()"
               [max]="max()" />
      }
      
      @if (error()) {
        <div class="field-error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .form-field {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
      width: 100%;
    }
    
    .form-field.half-width {
      width: 48%;
      display: inline-block;
      margin-right: 4%;
    }
    
    .form-field.full-width {
      width: 100%;
    }
    
    .field-label {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-on-surface-variant);
      font-weight: 500;
      margin-bottom: 8px;
      display: block;
    }
    
    .field-input {
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
    
    .field-input:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }
    
    .field-input:disabled {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    .field-error {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-error);
      margin-top: 4px;
    }
    
    select.field-input {
      cursor: pointer;
    }
    
    textarea.field-input {
      resize: vertical;
      min-height: 80px;
    }
  `]
})
export class AppFormFieldComponent {
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  error = input<string>('');
  class = input<string>('');
  min = input<string | number>();
  max = input<string | number>();
  
  value = model<any>('');
}