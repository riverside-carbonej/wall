import { Component, Input, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormField, MatInput, MatLabel, MatHint, MatError } from '../material-stubs';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { TooltipDirective } from '../tooltip/tooltip.component';

export type FormFieldAppearance = 'fill' | 'outline';
export type FormFieldFloatLabel = 'always' | 'auto';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, MatFormField, MatInput, MatLabel, MatHint, MatError, MaterialIconComponent, TooltipDirective],
  template: `
    <mat-form-field 
      [appearance]="appearance"
      [floatLabel]="floatLabel"
      [class]="fieldClasses">
      
      <!-- Label -->
      @if (label) {
        <mat-label>
          {{ label }}
          @if (required) {
            <span class="required-indicator" aria-label="Required">*</span>
          }
        </mat-label>
      }
      
      <!-- Prefix Icon -->
      @if (prefixIcon) {
        <mat-icon matPrefix>{{ prefixIcon }}</mat-icon>
      }
      
      <!-- Form Control Content -->
      <ng-content></ng-content>
      
      <!-- Suffix Icon -->
      @if (suffixIcon) {
        <mat-icon matSuffix>{{ suffixIcon }}</mat-icon>
      }
      
      <!-- Hint Text -->
      @if (hint && !error) {
        <mat-hint class="body-small">{{ hint }}</mat-hint>
      }
      
      <!-- Character Counter -->
      @if (maxLength && !error) {
        <mat-hint align="end" class="body-small">
          {{ currentLength }}/{{ maxLength }}
        </mat-hint>
      }
      
      <!-- Error Messages -->
      @if (error) {
        <mat-error class="body-small">
          @if (errorIcon) {
            <mat-icon class="error-icon">{{ errorIcon }}</mat-icon>
          }
          {{ error }}
        </mat-error>
      }
      
      <!-- Custom Error Template -->
      @if (errorTemplate && error) {
        <mat-error>
          <ng-container *ngTemplateOutlet="errorTemplate"></ng-container>
        </mat-error>
      }
    </mat-form-field>
    
    <!-- Help Text Below Field -->
    @if (helpText && !error) {
      <div class="help-text body-small">
        @if (helpIcon) {
          <mat-icon class="help-icon">{{ helpIcon }}</mat-icon>
        }
        {{ helpText }}
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    mat-form-field {
      width: 100%;
      font-family: 'Google Sans', 'Roboto', sans-serif;
    }
    
    /* Field Variants */
    .field-compact {
      margin-bottom: var(--md-sys-spacing-2);
    }
    
    .field-comfortable {
      margin-bottom: var(--md-sys-spacing-4);
    }
    
    .field-spacious {
      margin-bottom: var(--md-sys-spacing-6);
    }
    
    /* Required Indicator */
    .required-indicator {
      color: var(--md-sys-color-error);
      margin-left: 2px;
      font-weight: 600;
    }
    
    /* Icon Styling */
    mat-icon[matPrefix],
    mat-icon[matSuffix] {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    .error-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: var(--md-sys-spacing-1);
      vertical-align: middle;
    }
    
    .help-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: var(--md-sys-spacing-1);
      vertical-align: top;
      color: var(--md-sys-color-on-surface-variant);
    }
    
    /* Help Text */
    .help-text {
      display: flex;
      align-items: flex-start;
      gap: var(--md-sys-spacing-1);
      margin-top: var(--md-sys-spacing-1);
      padding: 0 var(--md-sys-spacing-4);
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.4;
    }
    
    /* Material Form Field Customization */
    ::ng-deep mat-form-field {
      .mat-mdc-form-field-subscript-wrapper {
        margin-top: var(--md-sys-spacing-1);
      }
      
      .mat-mdc-form-field-hint-wrapper,
      .mat-mdc-form-field-error-wrapper {
        padding: 0 var(--md-sys-spacing-4);
      }
      
      .mdc-text-field--filled {
        background-color: var(--md-sys-color-surface-container);
        border-radius: var(--md-sys-shape-corner-extra-small) var(--md-sys-shape-corner-extra-small) 0 0;
      }
      
      .mdc-text-field--outlined {
        border-radius: var(--md-sys-shape-corner-extra-small);
      }
      
      .mdc-text-field--outlined .mdc-notched-outline__leading,
      .mdc-text-field--outlined .mdc-notched-outline__notch,
      .mdc-text-field--outlined .mdc-notched-outline__trailing {
        border-color: var(--md-sys-color-outline);
      }
      
      .mdc-text-field--outlined:hover .mdc-notched-outline__leading,
      .mdc-text-field--outlined:hover .mdc-notched-outline__notch,
      .mdc-text-field--outlined:hover .mdc-notched-outline__trailing {
        border-color: var(--md-sys-color-on-surface);
      }
      
      .mdc-text-field--focused .mdc-notched-outline__leading,
      .mdc-text-field--focused .mdc-notched-outline__notch,
      .mdc-text-field--focused .mdc-notched-outline__trailing {
        border-color: var(--md-sys-color-primary);
        border-width: 2px;
      }
      
      /* Label Styling */
      .mdc-floating-label {
        font-family: 'Google Sans', 'Roboto', sans-serif;
        font-size: var(--md-sys-typescale-body-large-size);
        color: var(--md-sys-color-on-surface-variant);
      }
      
      .mdc-floating-label--focused {
        color: var(--md-sys-color-primary);
      }
      
      /* Input Styling */
      .mdc-text-field__input {
        font-family: 'Google Sans', 'Roboto', sans-serif;
        font-size: var(--md-sys-typescale-body-large-size);
        color: var(--md-sys-color-on-surface);
        caret-color: var(--md-sys-color-primary);
      }
      
      .mdc-text-field__input::placeholder {
        color: var(--md-sys-color-on-surface-variant);
        opacity: 0.6;
      }
      
      /* Error States */
      .mat-form-field-invalid {
        .mdc-text-field--outlined .mdc-notched-outline__leading,
        .mdc-text-field--outlined .mdc-notched-outline__notch,
        .mdc-text-field--outlined .mdc-notched-outline__trailing {
          border-color: var(--md-sys-color-error);
        }
        
        .mdc-floating-label {
          color: var(--md-sys-color-error);
        }
        
        .mdc-text-field--filled {
          background-color: color-mix(in srgb, var(--md-sys-color-error) 8%, var(--md-sys-color-surface-container));
        }
      }
      
      /* Disabled States */
      .mat-form-field-disabled {
        .mdc-text-field--outlined .mdc-notched-outline__leading,
        .mdc-text-field--outlined .mdc-notched-outline__notch,
        .mdc-text-field--outlined .mdc-notched-outline__trailing {
          border-color: var(--md-sys-color-outline);
          opacity: 0.38;
        }
        
        .mdc-floating-label,
        .mdc-text-field__input {
          color: var(--md-sys-color-on-surface);
          opacity: 0.38;
        }
        
        .mdc-text-field--filled {
          background-color: var(--md-sys-color-surface-container);
          opacity: 0.38;
        }
      }
    }
    
    /* Mobile Optimizations */
    @media (max-width: 768px) {
      .help-text {
        padding: 0 var(--md-sys-spacing-3);
      }
      
      ::ng-deep mat-form-field {
        .mat-mdc-form-field-hint-wrapper,
        .mat-mdc-form-field-error-wrapper {
          padding: 0 var(--md-sys-spacing-3);
        }
      }
    }
    
    /* Touch Target Optimization */
    ::ng-deep mat-form-field {
      .mdc-text-field__input {
        min-height: 24px;
        padding: var(--md-sys-spacing-3) 0;
      }
    }
    
    /* Focus States */
    ::ng-deep mat-form-field.mat-focused {
      .mat-mdc-form-field-focus-overlay {
        opacity: 0;
      }
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      ::ng-deep mat-form-field {
        .mdc-floating-label {
          transition: none;
        }
        
        .mdc-line-ripple::before,
        .mdc-line-ripple::after {
          transition: none;
        }
      }
    }
    
    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      ::ng-deep mat-form-field {
        .mdc-text-field--outlined .mdc-notched-outline__leading,
        .mdc-text-field--outlined .mdc-notched-outline__notch,
        .mdc-text-field--outlined .mdc-notched-outline__trailing {
          border-width: 2px;
        }
      }
    }
  `]
})
export class FormFieldComponent {
  @Input() label?: string;
  @Input() required = false;
  @Input() appearance: FormFieldAppearance = 'outline';
  @Input() floatLabel: FormFieldFloatLabel = 'auto';
  
  // Icons
  @Input() prefixIcon?: string;
  @Input() suffixIcon?: string;
  @Input() prefixTooltip?: string;
  @Input() suffixTooltip?: string;
  @Input() errorIcon = 'error';
  @Input() helpIcon?: string;
  
  // Text Content
  @Input() hint?: string;
  @Input() helpText?: string;
  @Input() error?: string;
  
  // Character Counter
  @Input() maxLength?: number;
  @Input() currentLength = 0;
  
  // Layout
  @Input() spacing: 'compact' | 'comfortable' | 'spacious' = 'comfortable';
  
  // Custom Error Template
  @ContentChild('errorTemplate') errorTemplate?: TemplateRef<any>;
  
  get fieldClasses(): string {
    const classes = [`field-${this.spacing}`];
    return classes.join(' ');
  }
}