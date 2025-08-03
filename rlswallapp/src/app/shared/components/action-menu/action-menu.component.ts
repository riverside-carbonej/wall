import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { MatMenu, MatMenuItem, MatDivider } from '../material-stubs';
import { TooltipDirective } from '../tooltip/tooltip.component';

export interface ActionMenuItem {
  label: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
  destructive?: boolean;
  action: () => void;
}

export type ActionMenuTrigger = 'three-dots' | 'button' | 'custom';
export type ActionMenuPosition = 'below' | 'above' | 'before' | 'after';

@Component({
  selector: 'app-action-menu',
  standalone: true,
  imports: [CommonModule, ThemedButtonComponent, MaterialIconComponent, MatMenu, MatMenuItem, MatDivider, TooltipDirective],
  template: `
    @switch (trigger) {
      @case ('three-dots') {
        <button 
          class="trigger-button"
          [disabled]="disabled"
          [title]="tooltip"
          [attr.aria-label]="ariaLabel || 'More actions'"
          (click)="toggleMenu()">
          <mat-icon>more_vert</mat-icon>
        </button>
      }
      @case ('button') {
        <button 
          class="trigger-button"
          [disabled]="disabled"
          [title]="tooltip"
          [attr.aria-label]="ariaLabel"
          (click)="toggleMenu()">
          @if (buttonIcon) {
            <mat-icon>{{ buttonIcon }}</mat-icon>
          }
          {{ buttonText || 'Actions' }}
          <mat-icon class="dropdown-arrow">arrow_drop_down</mat-icon>
        </button>
      }
      @case ('custom') {
        <ng-content select="[slot=trigger]" (click)="toggleMenu()"></ng-content>
      }
    }
    
    @if (isMenuOpen) {
      <div class="mat-menu action-menu" [class]="menuClasses">
      
      @for (item of actions; track item.label) {
        @if (item.divider) {
          <mat-divider></mat-divider>
        }
        
        <button 
          class="mat-menu-item"
          [disabled]="item.disabled"
          [class]="getItemClasses(item)"
          (click)="onItemClick(item)">
          
          @if (item.icon) {
            <mat-icon [class]="getIconClasses(item)">{{ item.icon }}</mat-icon>
          }
          
          <span [class]="getTextClasses(item)">{{ item.label }}</span>
        </button>
      }
      
        @if (actions.length === 0) {
          <button class="mat-menu-item" disabled>
            <span class="no-actions-text">No actions available</span>
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    /* Trigger Button Styling */
    .trigger-button {
      min-width: 0;
    }
    
    .trigger-compact {
      width: 32px;
      height: 32px;
      min-height: 32px;
      line-height: 32px;
    }
    
    .trigger-comfortable {
      width: 40px;
      height: 40px;
      min-height: 40px;
      line-height: 40px;
    }
    
    .trigger-large {
      width: 48px;
      height: 48px;
      min-height: 48px;
      line-height: 48px;
    }
    
    /* Dropdown Arrow */
    .dropdown-arrow {
      margin-left: var(--md-sys-spacing-1);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    /* Menu Styling */
    .action-menu {
      font-family: 'Google Sans', 'Roboto', sans-serif;
    }
    
    ::ng-deep .action-menu .mat-mdc-menu-panel {
      min-width: 160px;
      max-width: 280px;
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-sys-elevation-3);
    }
    
    /* Menu Item Styling */
    .menu-item {
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: var(--md-sys-typescale-body-large-size);
      line-height: var(--md-sys-typescale-body-large-line-height);
      color: var(--md-sys-color-on-surface);
      padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
    }
    
    .menu-item:hover:not(:disabled) {
      background-color: var(--md-sys-color-surface-container-high);
    }
    
    .menu-item:focus {
      background-color: var(--md-sys-color-surface-container-high);
      outline: none;
    }
    
    .menu-item-destructive {
      color: var(--md-sys-color-error);
    }
    
    .menu-item-destructive:hover:not(:disabled) {
      background-color: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }
    
    /* Icon Styling */
    .menu-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-on-surface-variant);
      flex-shrink: 0;
    }
    
    .menu-icon-destructive {
      color: var(--md-sys-color-error);
    }
    
    .menu-item-destructive:hover:not(:disabled) .menu-icon-destructive {
      color: var(--md-sys-color-on-error-container);
    }
    
    /* Text Styling */
    .menu-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .menu-text-destructive {
      color: var(--md-sys-color-error);
    }
    
    .menu-item-destructive:hover:not(:disabled) .menu-text-destructive {
      color: var(--md-sys-color-on-error-container);
    }
    
    /* No Actions State */
    .no-actions-text {
      color: var(--md-sys-color-on-surface-variant);
      font-style: italic;
    }
    
    /* Divider */
    ::ng-deep .action-menu mat-divider {
      margin: var(--md-sys-spacing-1) 0;
      border-color: var(--md-sys-color-outline-variant);
    }
    
    /* Disabled State */
    .menu-item:disabled {
      color: var(--md-sys-color-on-surface);
      opacity: 0.38;
      cursor: not-allowed;
    }
    
    .menu-item:disabled .menu-icon {
      color: var(--md-sys-color-on-surface);
      opacity: 0.38;
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      ::ng-deep .action-menu .mat-mdc-menu-panel {
        min-width: 200px;
        max-width: calc(100vw - 32px);
      }
      
      .menu-item {
        min-height: 56px;
        padding: var(--md-sys-spacing-4);
      }
    }
    
    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      ::ng-deep .action-menu .mat-mdc-menu-panel {
        border: 1px solid var(--md-sys-color-outline);
      }
      
      .menu-item-destructive {
        border-left: 3px solid var(--md-sys-color-error);
        padding-left: calc(var(--md-sys-spacing-4) - 3px);
      }
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .menu-item {
        transition: none;
      }
    }
    
    /* Focus States */
    .trigger-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }
  `]
})
export class ActionMenuComponent {
  @Input() actions: ActionMenuItem[] = [];
  @Input() trigger: ActionMenuTrigger = 'three-dots';
  @Input() position: ActionMenuPosition = 'below';
  @Input() disabled = false;
  @Input() tooltip?: string;
  @Input() ariaLabel?: string;
  @Input() size: 'compact' | 'comfortable' | 'large' = 'comfortable';
  
  // Button trigger specific
  @Input() buttonText?: string;
  @Input() buttonIcon?: string;
  
  @Output() actionSelected = new EventEmitter<ActionMenuItem>();
  
  isMenuOpen = false;
  
  get triggerClasses(): string {
    const classes = ['trigger-button', `trigger-${this.size}`];
    return classes.join(' ');
  }
  
  get menuClasses(): string {
    return 'action-menu';
  }
  
  getXPosition(): 'before' | 'after' {
    return this.position === 'before' ? 'before' : 'after';
  }
  
  getYPosition(): 'above' | 'below' {
    return this.position === 'above' ? 'above' : 'below';
  }
  
  getItemClasses(item: ActionMenuItem): string {
    const classes = ['menu-item'];
    
    if (item.destructive) {
      classes.push('menu-item-destructive');
    }
    
    return classes.join(' ');
  }
  
  getIconClasses(item: ActionMenuItem): string {
    const classes = ['menu-icon'];
    
    if (item.destructive) {
      classes.push('menu-icon-destructive');
    }
    
    return classes.join(' ');
  }
  
  getTextClasses(item: ActionMenuItem): string {
    const classes = ['menu-text'];
    
    if (item.destructive) {
      classes.push('menu-text-destructive');
    }
    
    return classes.join(' ');
  }
  
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
  
  onItemClick(item: ActionMenuItem): void {
    if (!item.disabled) {
      this.actionSelected.emit(item);
      item.action();
      this.isMenuOpen = false; // Close menu after action
    }
  }
}