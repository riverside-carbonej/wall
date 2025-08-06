import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallItemImage, WallObjectType } from '../../models/wall.model';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-wall-item-image',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent],
  template: `
    <div class="wall-item-image" [class.has-image]="displayImage" [style.--fallback-color]="fallbackColor || generatedFallbackColor">
      @if (displayImage) {
        <img 
          [src]="displayImage.url" 
          [alt]="displayImage.altText || 'Wall item image'"
          [class.cover]="objectFit === 'cover'"
          [class.contain]="objectFit === 'contain'">
      } @else {
        <div class="image-placeholder">
          <mat-icon [icon]="preset?.icon || 'description'"></mat-icon>
          @if (showTitle && preset?.name) {
            <span class="preset-name">{{ preset?.name }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .wall-item-image {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: var(--md-sys-shape-corner-medium, 12px);
      overflow: hidden;
      background: var(--fallback-color, var(--md-sys-color-surface-container));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wall-item-image img {
      width: 100%;
      height: 100%;
      transition: transform 0.3s ease;
    }

    .wall-item-image img.cover {
      object-fit: cover;
    }

    .wall-item-image img.contain {
      object-fit: contain;
    }

    .image-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      height: 100%;
    }

    .image-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.6;
      color: rgba(255, 255, 255, 0.8);
    }

    /* Larger icon for bigger containers (like item pages) */
    @container (min-width: 350px) and (min-height: 300px) {
      .image-placeholder mat-icon {
        font-size: 120px;
        width: 120px;
        height: 120px;
      }
    }

    /* Fallback for browsers without container queries */
    @media (min-width: 768px) {
      .wall-item-image {
        container-type: size;
      }
      
      .wall-item-image .image-placeholder mat-icon {
        font-size: max(64px, min(120px, 12vw));
        width: max(64px, min(120px, 12vw));
        height: max(64px, min(120px, 12vw));
      }
    }

    .preset-name {
      font-size: 14px;
      font-weight: 500;
      opacity: 0.8;
    }

    /* Hover effects */
    .wall-item-image:hover img {
      transform: scale(1.02);
    }

    /* Responsive sizing */
    @media (max-width: 768px) {
      .image-placeholder mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
      
      .preset-name {
        font-size: 12px;
      }
    }
  `]
})
export class WallItemImageComponent implements OnInit, OnChanges {
  @Input() images: WallItemImage[] = [];
  @Input() primaryImageIndex: number = 0;
  @Input() preset: WallObjectType | null = null;
  @Input() objectFit: 'cover' | 'contain' = 'cover';
  @Input() showTitle: boolean = false;
  @Input() fallbackColor?: string;
  @Input() uniqueId?: string; // Optional unique ID for consistent randomness

  private themeService = inject(ThemeService);
  displayImage: WallItemImage | null = null;
  generatedFallbackColor?: string;

  ngOnInit() {
    this.updateDisplayImage();
    this.generateRandomAccentColor();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['images'] || changes['primaryImageIndex'] || changes['preset']) {
      this.updateDisplayImage();
    }
    if (changes['uniqueId'] && !this.fallbackColor) {
      this.generateRandomAccentColor();
    }
  }

  private updateDisplayImage() {
    // Priority 1: If only one image, use it as primary
    if (this.images.length === 1) {
      this.displayImage = this.images[0];
      return;
    }

    // Priority 2: If multiple images and user selected primary, use that
    if (this.images.length > 1 && this.primaryImageIndex >= 0 && this.primaryImageIndex < this.images.length) {
      this.displayImage = this.images[this.primaryImageIndex];
      return;
    }

    // Priority 3: If multiple images but no valid primary index, use first image
    if (this.images.length > 0) {
      this.displayImage = this.images[0];
      return;
    }

    // Priority 4: Try default image from preset configuration
    if (this.preset?.defaultImage) {
      this.displayImage = {
        id: 'default',
        url: this.preset.defaultImage.url,
        fileName: 'default.jpg',
        altText: this.preset.defaultImage.altText || `Default ${this.preset.name} image`,
        isPrimary: true,
        uploadedAt: new Date(),
        size: 0,
        mimeType: 'image/jpeg'
      };
      return;
    }

    // Priority 5: No image available - will show placeholder with card color
    this.displayImage = null;
  }

  private generateRandomAccentColor() {
    // Skip if a fallback color is already provided
    if (this.fallbackColor) {
      return;
    }

    // Get the current theme
    const currentTheme = this.themeService.getCurrentThemeSync();
    
    // Use the accent color from the wall theme if available, otherwise use primary color
    let baseColor = '#6750A4'; // Default Material You primary color
    
    if (currentTheme.isWallTheme && currentTheme.wallTheme) {
      // Prefer accent color, fall back to primary
      baseColor = currentTheme.wallTheme.accentColor || currentTheme.wallTheme.primaryColor;
    }

    // Generate a random transparency between 0.08 and 0.20 for subtle variation
    const minOpacity = 0.08;
    const maxOpacity = 0.20;
    
    // Use uniqueId as seed for consistent randomness per item
    let randomValue = Math.random();
    if (this.uniqueId) {
      // Simple hash function to generate consistent random value from uniqueId
      let hash = 0;
      for (let i = 0; i < this.uniqueId.length; i++) {
        hash = ((hash << 5) - hash) + this.uniqueId.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      randomValue = Math.abs(hash) / 2147483647; // Normalize to 0-1
    }
    
    const opacity = minOpacity + (randomValue * (maxOpacity - minOpacity));
    
    // Convert hex to rgba with the random opacity
    this.generatedFallbackColor = this.hexToRgba(baseColor, opacity);
  }

  private hexToRgba(hex: string, alpha: number): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}