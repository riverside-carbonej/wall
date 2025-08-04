import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallItemImage, WallObjectType } from '../../models/wall.model';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

@Component({
  selector: 'app-wall-item-image',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent],
  template: `
    <div class="wall-item-image" [class.has-image]="displayImage" [style.--fallback-color]="fallbackColor">
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
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.6;
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

  displayImage: WallItemImage | null = null;

  ngOnInit() {
    this.updateDisplayImage();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['images'] || changes['primaryImageIndex'] || changes['preset']) {
      this.updateDisplayImage();
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
}