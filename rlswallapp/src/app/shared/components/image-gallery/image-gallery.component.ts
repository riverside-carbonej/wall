import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallItemImage, WallObjectType } from '../../models/wall.model';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { WallItemImageComponent } from '../wall-item-image/wall-item-image.component';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MaterialIconComponent,
    ThemedButtonComponent,
    WallItemImageComponent
  ],
  template: `
    <div class="gallery-overlay" (click)="onBackdropClick($event)">
      <div class="gallery-container" (click)="$event.stopPropagation()">
        
        <!-- Gallery Header -->
        <div class="gallery-header">
          <div class="gallery-title">
            <mat-icon [icon]="'photo_library'"></mat-icon>
            <h2>Image Gallery</h2>
            <span class="image-count">({{ images.length }} {{ images.length === 1 ? 'image' : 'images' }})</span>
          </div>
          <app-themed-button
            variant="basic"
            [icon]="'close'"
            label="Close"
            (buttonClick)="onClose()">
          </app-themed-button>
        </div>

        <!-- Main Image Display -->
        <div class="main-image-section">
          @if (images.length > 0) {
            <div class="main-image-container">
              <app-wall-item-image
                [images]="[images[currentImageIndex]]"
                [primaryImageIndex]="0"
                [preset]="preset"
                [objectFit]="'contain'"
                [uniqueId]="images[currentImageIndex]?.id">
              </app-wall-item-image>
              
              <!-- Navigation Arrows -->
              @if (images.length > 1) {
                <button 
                  class="nav-button nav-prev"
                  (click)="previousImage()"
                  [disabled]="currentImageIndex === 0"
                  title="Previous image">
                  <mat-icon [icon]="'chevron_left'"></mat-icon>
                </button>
                <button 
                  class="nav-button nav-next"
                  (click)="nextImage()"
                  [disabled]="currentImageIndex === images.length - 1"
                  title="Next image">
                  <mat-icon [icon]="'chevron_right'"></mat-icon>
                </button>
              }

              <!-- Image Counter -->
              @if (images.length > 1) {
                <div class="image-counter">
                  {{ currentImageIndex + 1 }} / {{ images.length }}
                </div>
              }
              
              <!-- Action Buttons -->
              @if (!readonly) {
                <div class="image-actions">
                  <app-themed-button
                    variant="raised"
                    [icon]="'edit'"
                    label="Change"
                    (buttonClick)="onChangeImage(currentImageIndex)">
                  </app-themed-button>
                  <app-themed-button
                    variant="raised"
                    [icon]="'star'"
                    [label]="currentImageIndex === primaryImageIndex ? 'Primary' : 'Set Primary'"
                    [disabled]="currentImageIndex === primaryImageIndex"
                    (buttonClick)="onSetPrimary(currentImageIndex)">
                  </app-themed-button>
                  <app-themed-button
                    variant="raised"
                    [icon]="'delete'"
                    label="Remove"
                    (buttonClick)="onRemoveImage(currentImageIndex)">
                  </app-themed-button>
                </div>
              }
            </div>
          } @else {
            <div class="empty-gallery">
              <mat-icon [icon]="'photo_library'"></mat-icon>
              <h3>No Images</h3>
              <p>This item doesn't have any images yet.</p>
              @if (!readonly) {
                <app-themed-button
                  variant="raised"
                  [icon]="'add_photo_alternate'"
                  label="Add Images"
                  (buttonClick)="onAddImages()">
                </app-themed-button>
              }
            </div>
          }
        </div>

        <!-- Thumbnail Strip -->
        @if (images.length > 1) {
          <div class="thumbnail-strip">
            <div class="thumbnails-container">
              @for (image of images; track image.id) {
                <div 
                  class="thumbnail"
                  [class.active]="$index === currentImageIndex"
                  [class.primary]="$index === primaryImageIndex"
                  (click)="selectImage($index)">
                  <app-wall-item-image
                    [images]="[image]"
                    [primaryImageIndex]="0"
                    [preset]="preset"
                    [objectFit]="'cover'"
                    [uniqueId]="image.id">
                  </app-wall-item-image>
                  @if ($index === primaryImageIndex) {
                    <div class="primary-badge">
                      <mat-icon [icon]="'star'"></mat-icon>
                    </div>
                  }
                </div>
              }
              
              @if (!readonly) {
                <div class="add-thumbnail" (click)="onAddImages()">
                  <mat-icon [icon]="'add'"></mat-icon>
                  <span>Add</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Gallery Footer Actions -->
        @if (!readonly && images.length > 0) {
          <div class="gallery-footer">
            <app-themed-button
              variant="raised"
              [icon]="'add_photo_alternate'"
              label="Add More Images"
              (buttonClick)="onAddImages()">
            </app-themed-button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .gallery-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .gallery-container {
      background: var(--md-sys-color-surface);
      border-radius: 20px;
      max-width: 90vw;
      max-height: 90vh;
      width: 1200px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--md-sys-elevation-5);
      overflow: hidden;
      position: relative;
    }

    /* Header */
    .gallery-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .gallery-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .gallery-title h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .gallery-title mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: var(--md-sys-color-primary);
    }

    .image-count {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 0.875rem;
    }

    /* Main Image Section */
    .main-image-section {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0; /* Allow shrinking */
      position: relative;
      overflow: hidden;
    }

    .main-image-container {
      position: relative;
      width: 100%;
      height: 100%;
      max-height: calc(100% - 40px); /* Leave space for margins */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }

    .main-image-container app-wall-item-image {
      width: 100%;
      height: 100%;
    }

    /* Navigation */
    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--md-sys-elevation-2);
    }

    .nav-button:hover:not(:disabled) {
      background: var(--md-sys-color-surface-container-high);
      box-shadow: var(--md-sys-elevation-3);
    }

    .nav-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .nav-prev {
      left: 20px;
    }

    .nav-next {
      right: 20px;
    }

    .nav-button mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: var(--md-sys-color-on-surface);
    }

    /* Image Counter */
    .image-counter {
      position: absolute;
      top: 20px;
      right: 20px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: var(--md-sys-elevation-2);
    }

    /* Image Actions */
    .image-actions {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
    }

    /* Empty State */
    .empty-gallery {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 60px;
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
    }

    .empty-gallery mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.6;
    }

    .empty-gallery h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .empty-gallery p {
      margin: 0;
      opacity: 0.8;
    }

    /* Thumbnail Strip */
    .thumbnail-strip {
      padding: 20px 24px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      flex-shrink: 0; /* Prevent shrinking */
      height: 120px; /* Fixed height */
      box-sizing: border-box;
    }

    .thumbnails-container {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding: 4px;
      height: 100%;
      align-items: center;
    }

    .thumbnail {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      flex-shrink: 0;
    }

    .thumbnail:hover {
      transform: scale(1.05);
    }

    .thumbnail.active {
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
    }

    .thumbnail.primary {
      border-color: var(--md-sys-color-tertiary);
    }

    .primary-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--md-sys-color-tertiary);
      color: var(--md-sys-color-on-tertiary);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .primary-badge mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .add-thumbnail {
      width: 80px;
      height: 80px;
      border: 2px dashed var(--md-sys-color-outline-variant);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.2s ease;
      flex-shrink: 0;
      gap: 4px;
    }

    .add-thumbnail:hover {
      border-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
    }

    .add-thumbnail mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .add-thumbnail span {
      font-size: 10px;
      font-weight: 500;
    }

    /* Gallery Footer */
    .gallery-footer {
      padding: 20px 24px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      justify-content: center;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .gallery-container {
        width: 95vw;
        height: 95vh;
      }

      .nav-button {
        width: 40px;
        height: 40px;
      }

      .nav-prev {
        left: 10px;
      }

      .nav-next {
        right: 10px;
      }

      .image-actions {
        flex-direction: column;
        align-items: center;
      }

      .thumbnails-container {
        gap: 8px;
      }

      .thumbnail {
        width: 60px;
        height: 60px;
      }

      .add-thumbnail {
        width: 60px;
        height: 60px;
      }
    }

    /* Keyboard Navigation */
    .gallery-container:focus {
      outline: none;
    }
  `]
})
export class ImageGalleryComponent implements OnInit, OnDestroy {
  @Input() images: WallItemImage[] = [];
  @Input() primaryImageIndex: number = 0;
  @Input() preset: WallObjectType | null = null;
  @Input() readonly: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() addImages = new EventEmitter<void>();
  @Output() changeImage = new EventEmitter<number>();
  @Output() removeImage = new EventEmitter<number>();
  @Output() setPrimary = new EventEmitter<number>();

  currentImageIndex: number = 0;

  ngOnInit() {
    // Start with primary image if available
    this.currentImageIndex = Math.max(0, Math.min(this.primaryImageIndex, this.images.length - 1));
    
    // Add keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        this.onClose();
        break;
      case 'ArrowLeft':
        this.previousImage();
        break;
      case 'ArrowRight':
        this.nextImage();
        break;
    }
  };

  selectImage(index: number) {
    this.currentImageIndex = index;
  }

  previousImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  nextImage() {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
  }

  onAddImages() {
    this.addImages.emit();
  }

  onChangeImage(index: number) {
    this.changeImage.emit(index);
  }

  onRemoveImage(index: number) {
    this.removeImage.emit(index);
    
    // Adjust current index if needed
    if (this.currentImageIndex >= this.images.length - 1) {
      this.currentImageIndex = Math.max(0, this.images.length - 2);
    }
  }

  onSetPrimary(index: number) {
    this.setPrimary.emit(index);
  }
}