import { Component, input, output, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

export type ButtonVariant = 'raised' | 'flat' | 'stroked' | 'icon' | 'basic';
export type ButtonColor = 'primary' | 'accent' | 'warn' | undefined;

@Component({
  selector: 'app-themed-button',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <button 
      [style]="buttonStyles()"
      [disabled]="disabled()"
      (click)="handleClick()"
      type="button">
      
      @if (icon()) {
        <mat-icon [style]="iconStyles()" [icon]="icon()"></mat-icon>
      }
      
      @if (label()) {
        <span [style]="textStyles()">{{ label() }}</span>
      }
      
      <ng-content></ng-content>
      
      @if (badge()) {
        <div [style]="badgeStyles()">{{ badge() }}</div>
      }
    </button>
  `,
  styles: [`
    button {
      border: none;
      cursor: pointer;
      font-family: 'Google Sans', sans-serif;
      font-weight: 500;
      text-transform: none;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      outline: none;
      position: relative;
      overflow: hidden;
    }

    button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--md-sys-color-primary) 15%, transparent) !important;
    }

    button:hover:not(:disabled) mat-icon,
    button:hover:not(:disabled) span {
      color: var(--md-sys-color-primary) !important;
    }

    button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    mat-icon {
      transition: color 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    span {
      transition: color 200ms cubic-bezier(0.2, 0, 0, 1);
    }
  `]
})
export class ThemedButtonComponent {
  // Inputs
  variant = input<ButtonVariant>('basic');
  color = input<ButtonColor>('primary');
  disabled = input<boolean>(false);
  icon = input<string>();
  label = input<string>();
  selected = input<boolean>(false);
  badge = input<string | number>();
  
  // Layout inputs
  fullWidth = input<boolean>(false);
  height = input<string>('40px');
  justifyContent = input<'flex-start' | 'center' | 'space-between'>('center');
  customPadding = input<string>('16px 24px');
  pill = input<boolean>(false);
  compact = input<boolean>(false);
  
  // Output
  buttonClick = output<void>();

  // Computed styles using signals
  buttonStyles = computed(() => {
    const isSelected = this.selected();
    const variant = this.variant();
    
    let styles: any = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: this.justifyContent(),
      gap: '12px',
      whiteSpace: 'nowrap',
      borderRadius: '200px',
      padding: this.customPadding(),
      height: this.height(),
      width: this.fullWidth() ? '100%' : 'auto',
      fontSize: this.compact() ? '12px' : '14px',
      fontWeight: '500'
    };

    // Handle pill and compact variants
    if (this.pill()) {
      styles.borderRadius = '200px';
      styles.padding = this.compact() ? '8px 16px' : '16px 24px';
    }
    
    if (this.compact()) {
      styles.height = '36px';
      styles.padding = '8px 16px';
    }

    // Get color variables based on color input
    const colorPrefix = this.getColorPrefix();
    
    // Base variant styling
    if (variant === 'basic') {
      if (isSelected) {
        // Selected state
        styles.backgroundColor = `color-mix(in srgb, var(${colorPrefix}) 30%, transparent)`;
        styles.color = `var(${colorPrefix})`;
        styles.fontWeight = '500';
      } else {
        // Normal state
        styles.backgroundColor = 'transparent';
        styles.color = `var(${colorPrefix})`;
      }
    } else if (variant === 'raised' || variant === 'flat') {
      styles.backgroundColor = `var(${colorPrefix})`;
      styles.color = `var(${this.getOnColorPrefix()})`;
    } else if (variant === 'stroked') {
      styles.backgroundColor = 'transparent';
      styles.color = `var(${colorPrefix})`;
      styles.border = `1px solid var(${colorPrefix})`;
    } else if (variant === 'icon') {
      styles.backgroundColor = 'transparent';
      styles.color = 'var(--md-sys-color-on-surface)';
      styles.borderRadius = '50%';
      styles.padding = '12px';
      styles.minWidth = '48px';
      styles.height = '48px';
      styles.width = '48px';
    }

    return styles;
  });

  // Helper methods for color management
  getColorPrefix(): string {
    const color = this.color();
    switch (color) {
      case 'primary':
        return '--md-sys-color-primary';
      case 'accent':
        return '--md-sys-color-secondary';
      case 'warn':
        return '--md-sys-color-error';
      default:
        return '--md-sys-color-primary';
    }
  }

  getOnColorPrefix(): string {
    const color = this.color();
    switch (color) {
      case 'primary':
        return '--md-sys-color-on-primary';
      case 'accent':
        return '--md-sys-color-on-secondary';
      case 'warn':
        return '--md-sys-color-on-error';
      default:
        return '--md-sys-color-on-primary';
    }
  }

  iconStyles = computed(() => {
    const isSelected = this.selected();
    const variant = this.variant();
    const colorPrefix = this.getColorPrefix();
    
    let styles: any = {
      fontSize: '20px',
      width: '20px',
      height: '20px',
      flexShrink: '0'
    };

    if (variant === 'basic') {
      if (isSelected) {
        styles.color = `var(${colorPrefix})`;
      } else {
        styles.color = `var(${colorPrefix})`;
      }
    } else {
      styles.color = 'inherit';
    }

    return styles;
  });

  textStyles = computed(() => {
    const isSelected = this.selected();
    const variant = this.variant();
    const colorPrefix = this.getColorPrefix();
    
    let styles: any = {};

    if (variant === 'basic') {
      if (isSelected) {
        styles.color = `var(${colorPrefix})`;
      } else {
        styles.color = `var(${colorPrefix})`;
      }
    } else {
      styles.color = 'inherit';
    }

    return styles;
  });

  badgeStyles = computed(() => {
    const isSelected = this.selected();
    
    return {
      background: isSelected 
        ? 'var(--md-sys-color-on-primary-container)' 
        : 'var(--md-sys-color-primary)',
      color: isSelected 
        ? 'var(--md-sys-color-primary-container)' 
        : 'var(--md-sys-color-on-primary)',
      borderRadius: '20px',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: '500',
      minWidth: '20px',
      textAlign: 'center',
      marginLeft: 'auto'
    };
  });

  handleClick(): void {
    if (!this.disabled()) {
      this.buttonClick.emit();
    }
  }
}