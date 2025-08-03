import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions } from '../material-stubs';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu/action-menu.component';

export type CardVariant = 'elevated' | 'filled' | 'outlined';
export type CardLayout = 'vertical' | 'horizontal' | 'grid';
export type CardSize = 'small' | 'medium' | 'large';

export interface CardAction {
  label: string;
  icon?: string;
  primary?: boolean;
  disabled?: boolean;
  action: () => void;
}

export interface CardMenuItem extends ActionMenuItem {}

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [
    CommonModule, 
    MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions,
    MaterialIconComponent,
    ThemedButtonComponent,
    ActionMenuComponent
  ],
  template: `
    <mat-card 
      [class]="cardClasses"
      [attr.tabindex]="clickable ? 0 : null"
      [attr.role]="clickable ? 'button' : null"
      [attr.aria-label]="clickable ? ariaLabel : null"
      (click)="handleCardClick()"
      (keydown.enter)="handleCardClick()"
      (keydown.space)="handleCardClick()">
      
      <!-- Card Header -->
      @if (showHeader) {
        <mat-card-header [class.header-with-menu]="menuItems?.length">
          @if (avatar) {
            <img mat-card-avatar [src]="avatar" [alt]="avatarAlt || 'Avatar'" />
          } @else if (avatarIcon) {
            <div mat-card-avatar class="avatar-icon">
              <mat-icon [icon]="avatarIcon"></mat-icon>
            </div>
          }
          
          <div class="header-content">
            @if (title) {
              <mat-card-title class="title-medium">{{ title }}</mat-card-title>
            }
            @if (subtitle) {
              <mat-card-subtitle class="body-medium">{{ subtitle }}</mat-card-subtitle>
            }
          </div>
          
          @if (menuItems?.length) {
            <app-action-menu
              [actions]="menuItems || []"
              trigger="three-dots"
              size="comfortable"
              class="header-menu-trigger">
            </app-action-menu>
          }
        </mat-card-header>
      }
      
      <!-- Card Media -->
      @if (imageUrl || imageSlot) {
        <div class="card-media" [class]="mediaClasses">
          @if (imageUrl) {
            <img 
              [src]="imageUrl" 
              [alt]="imageAlt || 'Card image'"
              [class.clickable-image]="clickable" />
          }
          @if (imageSlot) {
            <ng-content select="[slot=media]"></ng-content>
          }
          
          <!-- Media overlay content -->
          @if (mediaOverlay) {
            <div class="media-overlay">
              <ng-content select="[slot=media-overlay]"></ng-content>
            </div>
          }
        </div>
      }
      
      <!-- Card Content -->
      @if (showContent) {
        <mat-card-content class="card-content">
          @if (description) {
            <p class="body-medium description">{{ description }}</p>
          }
          
          <!-- Metadata badges -->
          @if (metadata?.length) {
            <div class="metadata-row">
              @for (meta of metadata; track meta.key) {
                <div class="metadata-item">
                  @if (meta.icon) {
                    <mat-icon class="metadata-icon">{{ meta.icon }}</mat-icon>
                  }
                  <span class="label-small">{{ meta.value }}</span>
                </div>
              }
            </div>
          }
          
          <!-- Custom content slot -->
          <ng-content></ng-content>
        </mat-card-content>
      }
      
      <!-- Card Actions -->
      @if (actions?.length || hasActionSlot) {
        <mat-card-actions [align]="actionsAlign" class="card-actions">
          @for (action of actions; track action.label) {
            <app-themed-button
              [variant]="action.primary ? 'flat' : 'stroked'"
              [disabled]="action.disabled || false"
              [icon]="action.icon"
              (buttonClick)="action.action()">
              {{ action.label }}
            </app-themed-button>
          }
          
          <!-- Custom actions slot -->
          <ng-content select="[slot=actions]"></ng-content>
        </mat-card-actions>
      }
    </mat-card>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    mat-card {
      border-radius: var(--md-sys-shape-corner-medium);
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      position: relative;
      overflow: hidden;
      font-family: 'Google Sans', 'Roboto', sans-serif;
    }
    
    /* Card Variants */
    .card-elevated {
      background-color: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      box-shadow: var(--md-sys-elevation-1);
    }
    
    .card-filled {
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      box-shadow: none;
    }
    
    .card-outlined {
      background-color: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border: 1px solid var(--md-sys-color-outline);
      box-shadow: none;
    }
    
    /* Card Sizes */
    .card-small {
      max-width: 320px;
    }
    
    .card-medium {
      max-width: 480px;
    }
    
    .card-large {
      max-width: 640px;
    }
    
    /* Layout Variants */
    .layout-horizontal {
      display: flex;
      flex-direction: row;
      align-items: stretch;
    }
    
    .layout-horizontal .card-media {
      flex: 0 0 40%;
      max-width: 200px;
    }
    
    .layout-horizontal mat-card-content {
      flex: 1;
      padding: var(--md-sys-spacing-4);
    }
    
    .layout-grid {
      aspect-ratio: 1;
      height: fit-content;
    }
    
    /* Clickable Cards */
    .clickable {
      cursor: pointer;
      user-select: none;
    }
    
    .clickable:hover {
      box-shadow: var(--md-sys-elevation-2);
      transform: translateY(-1px);
    }
    
    .clickable:active {
      transform: translateY(0);
      box-shadow: var(--md-sys-elevation-1);
    }
    
    .clickable:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }
    
    /* Header */
    mat-card-header {
      padding: var(--md-sys-spacing-3);
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
      position: relative;
    }
    
    .header-with-menu {
      position: relative;
    }
    
    .header-content {
      flex: 1;
      min-width: 0;
      padding-left: var(--md-sys-spacing-3);
    }
    
    .header-menu-trigger {
      margin-left: auto;
      flex-shrink: 0;
    }
    
    mat-card-title {
      margin: 0;
      font-size: var(--md-sys-typescale-title-medium-size);
      line-height: var(--md-sys-typescale-title-medium-line-height);
      font-weight: var(--md-sys-typescale-title-medium-weight);
      color: var(--md-sys-color-on-surface);
    }
    
    mat-card-subtitle {
      margin: var(--md-sys-spacing-1) 0 0 0;
      font-size: var(--md-sys-typescale-body-medium-size);
      line-height: var(--md-sys-typescale-body-medium-line-height);
      color: var(--md-sys-color-on-surface-variant);
    }
    
    .avatar-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .avatar-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    
    /* Media */
    .card-media {
      position: relative;
      overflow: hidden;
    }
    
    .media-aspect-16-9 {
      aspect-ratio: 16 / 9;
    }
    
    .media-aspect-4-3 {
      aspect-ratio: 4 / 3;
    }
    
    .media-aspect-square {
      aspect-ratio: 1;
    }
    
    .card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    .clickable-image {
      transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
    }
    
    .clickable:hover .clickable-image {
      transform: scale(1.05);
    }
    
    .media-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.7) 0%,
        rgba(0, 0, 0, 0.3) 50%,
        transparent 100%
      );
      color: white;
      padding: var(--md-sys-spacing-4);
    }
    
    /* Content */
    .card-content {
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-3);
    }
    
    .description {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.5;
    }
    
    .metadata-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--md-sys-spacing-3);
      margin-top: var(--md-sys-spacing-3);
    }
    
    .metadata-item {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-1);
      color: var(--md-sys-color-on-surface-variant);
    }
    
    .metadata-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    /* Actions */
    .card-actions {
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-3) var(--md-sys-spacing-3);
      gap: var(--md-sys-spacing-2);
    }
    
    .card-actions app-themed-button {
      min-height: 48px;
      padding: 12px 24px;
      font-size: 16px;
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .layout-horizontal {
        flex-direction: column;
      }
      
      .layout-horizontal .card-media {
        flex: none;
        max-width: none;
      }
      
      mat-card-header {
        padding: var(--md-sys-spacing-3);
      }
      
      .card-content {
        padding: var(--md-sys-spacing-3);
      }
      
      .card-actions {
        padding: var(--md-sys-spacing-2) var(--md-sys-spacing-3) var(--md-sys-spacing-3);
      }
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      mat-card,
      .clickable-image {
        transition: none;
      }
      
      .clickable:hover {
        transform: none;
      }
    }
  `]
})
export class CardComponent {
  @Input() variant: CardVariant = 'elevated';
  @Input() layout: CardLayout = 'vertical';
  @Input() size: CardSize = 'medium';
  @Input() clickable = false;
  @Input() ariaLabel?: string;
  
  // Header
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() avatar?: string;
  @Input() avatarAlt?: string;
  @Input() avatarIcon?: string;
  
  // Media
  @Input() imageUrl?: string;
  @Input() imageAlt?: string;
  @Input() imageSlot = false;
  @Input() mediaOverlay = false;
  @Input() mediaAspect: 'auto' | '16-9' | '4-3' | 'square' = 'auto';
  
  // Content
  @Input() description?: string;
  @Input() metadata?: Array<{key: string; value: string; icon?: string}>;
  
  // Actions
  @Input() actions?: CardAction[];
  @Input() actionsAlign: 'start' | 'end' = 'start';
  @Input() hasActionSlot = false;
  @Input() menuItems?: CardMenuItem[];
  
  @Output() cardClick = new EventEmitter<void>();
  
  get cardClasses(): string {
    const classes = [
      `card-${this.variant}`,
      `card-${this.size}`,
      `layout-${this.layout}`
    ];
    
    if (this.clickable) {
      classes.push('clickable');
    }
    
    return classes.join(' ');
  }
  
  get mediaClasses(): string {
    const classes = [];
    
    if (this.mediaAspect !== 'auto') {
      classes.push(`media-aspect-${this.mediaAspect}`);
    }
    
    return classes.join(' ');
  }
  
  get showHeader(): boolean {
    return !!(this.title || this.subtitle || this.avatar || this.avatarIcon || this.menuItems?.length);
  }
  
  get showContent(): boolean {
    return !!(this.description || this.metadata?.length || this.hasContent());
  }
  
  private hasContent(): boolean {
    // In a real implementation, you might check if ng-content has content
    // For now, we'll assume there might be content
    return true;
  }
  
  handleCardClick(): void {
    if (this.clickable) {
      this.cardClick.emit();
    }
  }
}