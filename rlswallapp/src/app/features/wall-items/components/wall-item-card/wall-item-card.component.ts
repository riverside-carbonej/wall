import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallItem, WallObjectType, WallItemImage } from '../../../../shared/models/wall.model';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ThemeService } from '../../../../shared/services/theme.service';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { WallItemImageComponent } from '../../../../shared/components/wall-item-image/wall-item-image.component';

@Component({
  selector: 'app-wall-item-card',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent, ThemedButtonComponent, WallItemImageComponent],
  template: `
    <div class="item-card" 
         [class.selected]="selected"
         [class.has-image]="hasImage"
         [class.selection-mode]="isSelectionMode"
         (click)="onClick($event)"
         (contextmenu)="onLongPress($event)"
         (touchstart)="onTouchStart($event)"
         (touchend)="onTouchEnd($event)">
      
      <!-- Background Image -->
      <div class="card-background">
        <app-wall-item-image
          [images]="item?.images || []"
          [primaryImageIndex]="item?.primaryImageIndex || 0"
          [preset]="preset"
          [uniqueId]="item?.id">
        </app-wall-item-image>
      </div>
      
      <!-- Content Overlay -->
      <div class="card-content">
        <!-- Icon removed - now shown as background placeholder -->
        
        <!-- Card Info -->
        <div class="card-info">
          <h3 class="card-title">{{ title }}</h3>
          @if (subtitle) {
            <p class="card-subtitle">{{ subtitle }}</p>
          }
          
          <!-- Metadata -->
          <div class="card-metadata">
            @for (meta of metadata; track meta.key) {
              <span class="metadata-item">
                <mat-icon [icon]="meta.icon || 'info'"></mat-icon>
                {{ meta.value }}
              </span>
            }
          </div>
        </div>
        
      </div>
      
      <!-- Selection Indicator -->
      @if (selectable) {
        <div class="selection-indicator" 
             [class.active]="selected"
             (click)="onSelectionClick($event)">
          <mat-icon [icon]="selected ? 'check_circle' : (isSelectionMode ? 'radio_button_unchecked' : 'check_circle_outline')"></mat-icon>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .item-card {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      background: var(--md-sys-color-surface-container);
      display: flex;
      flex-direction: column;
    }

    .item-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--md-sys-elevation-3);
    }

    .item-card.selected {
      outline: 3px solid var(--md-sys-color-primary);
      outline-offset: -3px;
    }

    /* Background */
    .card-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      transition: transform 0.3s ease;
    }

    .card-background app-wall-item-image {
      width: 100%;
      height: 100%;
      display: block;
    }

    .item-card:hover .card-background {
      transform: scale(1.05);
    }



    /* Content Overlay */
    .card-content {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0.1) 50%,
        rgba(0, 0, 0, 0.8) 100%
      );
    }

    .item-card.has-image .card-content {
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0.3) 70%,
        rgba(0, 0, 0, 0.9) 100%
      );
    }

    /* Background placeholder styling handled above */

    /* Card Info */
    .card-info {
      margin-top: auto;
      color: white;
    }

    .item-card:not(.has-image) .card-info {
      color: var(--md-sys-color-on-surface);
    }

    .card-title {
      margin: 0 0 4px 0;
      font-size: 1.125rem;
      font-weight: 500;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .card-subtitle {
      margin: 0 0 8px 0;
      font-size: 0.875rem;
      opacity: 0.9;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-metadata {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .metadata-item mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }


    /* Selection Indicator */
    .selection-indicator {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0;
      box-shadow: var(--md-sys-elevation-2);
    }

    .item-card:hover .selection-indicator {
      opacity: 1;
    }

    .selection-indicator:hover {
      background: white;
      transform: scale(1.1);
      box-shadow: var(--md-sys-elevation-3);
    }

    .selection-indicator.active {
      opacity: 1;
    }

    .item-card.selection-mode .selection-indicator {
      opacity: 0;
    }

    .item-card.selection-mode:hover .selection-indicator,
    .item-card.selection-mode .selection-indicator.active {
      opacity: 1;
    }

    .selection-indicator mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-primary);
    }

    .item-card.selection-mode {
      cursor: pointer;
    }


    /* Responsive */
    @media (max-width: 480px) {
      .card-title {
        font-size: 1rem;
      }

      .card-subtitle {
        font-size: 0.8125rem;
      }

      .card-content {
        padding: 12px;
      }
    }
  `]
})
export class WallItemCardComponent {
  @Input() item!: WallItem;
  @Input() preset: WallObjectType | null = null;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() metadata: Array<{key: string; value: string; icon?: string}> = [];
  @Input() selected = false;
  @Input() selectable = false;
  @Input() isSelectionMode = false;

  @Output() cardClick = new EventEmitter<WallItem>();
  @Output() selectionToggle = new EventEmitter<WallItem>();
  @Output() startSelectionMode = new EventEmitter<WallItem>();

  private themeService = inject(ThemeService);

  get primaryImage(): WallItemImage | null {
    // First check for item images
    if (this.item.images && this.item.images.length > 0) {
      const primaryIndex = this.item.primaryImageIndex || 0;
      return this.item.images[primaryIndex] || this.item.images[0];
    }
    
    // If no item images, check for preset default image
    if (this.preset?.defaultImage) {
      return {
        id: 'default',
        url: this.preset.defaultImage.url,
        fileName: 'default.jpg',
        altText: this.preset.defaultImage.altText || `Default ${this.preset.name} image`,
        uploadedAt: new Date(),
        size: 0,
        mimeType: 'image/jpeg'
      } as WallItemImage;
    }
    
    return null;
  }

  get hasImage(): boolean {
    return !!this.primaryImage;
  }

  getPresetColor(): string {
    // Use preset color if available
    if (this.preset?.color) return this.preset.color;
    
    // Get current theme to derive colors from wall theme
    const currentTheme = this.themeService.getCurrentThemeSync();
    
    // If we're in a wall context, use wall-themed colors
    if (currentTheme.isWallTheme && currentTheme.wallTheme) {
      const wallTheme = currentTheme.wallTheme;
      return wallTheme.primaryColor || '#6750A4';
    }
    
    // Fallback to Material primary color
    return '#6750A4';
  }

  get backgroundColor(): string {
    // Use preset color if available
    if (this.preset?.color) return this.preset.color;
    
    // Get current theme to derive colors from wall theme
    const currentTheme = this.themeService.getCurrentThemeSync();
    
    // If we're in a wall context, use wall-themed colors
    if (currentTheme.isWallTheme && currentTheme.wallTheme) {
      const wallTheme = currentTheme.wallTheme;
      
      // Generate colors based on wall theme colors
      const baseColors = [
        wallTheme.primaryColor,
        wallTheme.secondaryColor, 
        wallTheme.tertiaryColor || wallTheme.primaryColor,
        wallTheme.successColor || '#10b981',
        wallTheme.warningColor || '#f59e0b'
      ];
      
      // Create lighter tints of these colors for backgrounds
      const colors = baseColors.map(color => this.hexToRgbaBackground(color, 0.15));
      
      const hash = this.title.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      return colors[hash % colors.length];
    }
    
    // Fallback to default pastel colors if not in wall context
    const colors = [
      '#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF3E0',
      '#E0F2F1', '#FCE4EC', '#F1F8E9', '#FFF8E1'
    ];
    const hash = this.title.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  private hexToRgbaBackground(hex: string, alpha: number): string {
    // Convert hex to rgba with transparency for background use
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private longPressTimer?: ReturnType<typeof setTimeout>;
  private longPressDelay = 500; // 500ms for long press

  onClick(event: Event) {
    event.stopPropagation();
    
    if (this.isSelectionMode) {
      // In selection mode, clicking anywhere on card toggles selection
      this.selectionToggle.emit(this.item);
    } else {
      // Normal mode - navigate to item view
      this.cardClick.emit(this.item);
    }
  }

  onSelectionClick(event: Event) {
    event.stopPropagation();
    
    if (this.isSelectionMode) {
      // Already in selection mode, toggle this item
      this.selectionToggle.emit(this.item);
    } else {
      // Start selection mode
      this.startSelectionMode.emit(this.item);
    }
  }

  onLongPress(event: Event) {
    event.preventDefault();
    if (!this.isSelectionMode) {
      this.startSelectionMode.emit(this.item);
    }
  }

  onTouchStart(event: TouchEvent) {
    if (!this.isSelectionMode) {
      this.longPressTimer = setTimeout(() => {
        this.startSelectionMode.emit(this.item);
      }, this.longPressDelay);
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

}