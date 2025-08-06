import { Component, Input, Output, EventEmitter, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallItemImage } from '../../../../shared/models/wall.model';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-item-image-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-gallery" *ngIf="images.length > 0">
      <!-- Primary Image Display -->
      <div class="primary-image-container" *ngIf="primaryImage">
        <img 
          [src]="primaryImage.url" 
          [alt]="primaryImage.altText || 'Primary image'"
          class="primary-image"
          (click)="openLightbox(primaryImage)"
          loading="lazy">
        <div class="image-overlay" *ngIf="showControls">
          <button 
            class="btn-icon image-action"
            (click)="setPrimaryImage(primaryImage)"
            [disabled]="primaryImage.isPrimary"
            [title]="'Set as primary image'">
            <span class="material-icons md-18">star</span>
          </button>
          <button 
            class="btn-icon image-action"
            (click)="editImage(primaryImage)"
            [title]="'Edit image details'">
            <span class="material-icons md-18">edit</span>
          </button>
          <button 
            class="btn-icon image-action delete-action"
            (click)="deleteImage(primaryImage)"
            [title]="'Delete image'">
            <span class="material-icons md-18">delete</span>
          </button>
        </div>
        <div class="image-caption" *ngIf="primaryImage.caption">
          {{ primaryImage.caption }}
        </div>
      </div>

      <!-- Gallery Thumbnails -->
      <div class="thumbnail-gallery" *ngIf="galleryImages.length > 0">
        <div class="thumbnail-container" *ngFor="let image of galleryImages; trackBy: trackByImageId">
          <img 
            [src]="image.url" 
            [alt]="image.altText || 'Gallery image'"
            class="thumbnail-image"
            [class.primary]="image.isPrimary"
            (click)="openLightbox(image)"
            loading="lazy">
          <div class="thumbnail-overlay" *ngIf="showControls">
            <button 
              class="btn-icon thumbnail-action"
              (click)="setPrimaryImage(image)"
              [class.active]="image.isPrimary"
              [title]="image.isPrimary ? 'Primary image' : 'Set as primary'">
              <span class="material-icons md-16">{{ image.isPrimary ? 'star' : 'star_border' }}</span>
            </button>
            <button 
              class="btn-icon thumbnail-action"
              (click)="editImage(image)"
              [title]="'Edit image'">
              <span class="material-icons md-16">edit</span>
            </button>
            <button 
              class="btn-icon thumbnail-action delete-action"
              (click)="deleteImage(image)"
              [title]="'Delete image'">
              <span class="material-icons md-16">delete</span>
            </button>
          </div>
          <div class="image-badge" *ngIf="image.isPrimary">
            <span class="material-icons md-12">star</span>
          </div>
        </div>
      </div>

      <!-- Add Image Button -->
      <div class="add-image-container" *ngIf="showControls">
        <button 
          class="add-image-button btn-outline touch-target interactive"
          (click)="addImage()"
          [title]="'Add new image'">
          <span class="material-icons md-20">add_photo_alternate</span>
          <span>Add Image</span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-gallery" *ngIf="images.length === 0 && showControls">
      <div class="empty-icon">
        <span class="material-icons md-48">photo_library</span>
      </div>
      <h4>No images yet</h4>
      <p>Add images to showcase this item</p>
      <button 
        class="btn-primary touch-target interactive"
        (click)="addImage()">
        <span class="material-icons md-20">add_photo_alternate</span>
        Add First Image
      </button>
    </div>

    <!-- Lightbox Modal -->
    <div class="lightbox-overlay" *ngIf="selectedImage()" (click)="closeLightbox()">
      <div class="lightbox-container" (click)="$event.stopPropagation()">
        <button 
          class="lightbox-close btn-icon"
          (click)="closeLightbox()"
          [title]="'Close'">
          <span class="material-icons md-24">close</span>
        </button>
        
        <img 
          [src]="selectedImage()?.url" 
          [alt]="selectedImage()?.altText || 'Full size image'"
          class="lightbox-image">
        
        <div class="lightbox-info" *ngIf="selectedImage()?.caption">
          <p>{{ selectedImage()?.caption }}</p>
        </div>
        
        <!-- Navigation arrows if multiple images -->
        <button 
          *ngIf="images.length > 1"
          class="lightbox-nav prev-button btn-icon"
          (click)="previousImage()"
          [title]="'Previous image'">
          <span class="material-icons md-24">chevron_left</span>
        </button>
        <button 
          *ngIf="images.length > 1"
          class="lightbox-nav next-button btn-icon"
          (click)="nextImage()"
          [title]="'Next image'">
          <span class="material-icons md-24">chevron_right</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .image-gallery {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-lg);
    }

    /* Primary Image */
    .primary-image-container {
      position: relative;
      border-radius: var(--md-sys-shape-corner-large);
      overflow: hidden;
      background: var(--md-sys-color-surface-variant);
      box-shadow: var(--md-sys-elevation-level2);
    }

    .primary-image {
      width: 100%;
      height: auto;
      max-height: 400px;
      object-fit: cover;
      cursor: pointer;
      transition: transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .primary-image:hover {
      transform: scale(1.02);
    }

    .image-overlay {
      position: absolute;
      top: var(--md-sys-spacing-sm);
      right: var(--md-sys-spacing-sm);
      display: flex;
      gap: var(--md-sys-spacing-xs);
      opacity: 0;
      transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .primary-image-container:hover .image-overlay {
      opacity: 1;
    }

    .image-action {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      backdrop-filter: blur(4px);
    }

    .image-action.delete-action:hover {
      background: var(--md-sys-color-error);
    }

    .image-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      color: white;
      padding: var(--md-sys-spacing-lg) var(--md-sys-spacing-md) var(--md-sys-spacing-md);
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
    }

    /* Thumbnail Gallery */
    .thumbnail-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--md-sys-spacing-md);
    }

    .thumbnail-container {
      position: relative;
      aspect-ratio: 1;
      border-radius: var(--md-sys-shape-corner-medium);
      overflow: hidden;
      background: var(--md-sys-color-surface-variant);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
      transition: all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .thumbnail-image:hover {
      transform: scale(1.05);
    }

    .thumbnail-image.primary {
      border: 2px solid var(--md-sys-color-primary);
    }

    .thumbnail-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--md-sys-spacing-xs);
      opacity: 0;
      transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .thumbnail-container:hover .thumbnail-overlay {
      opacity: 1;
    }

    .thumbnail-action {
      background: rgba(255, 255, 255, 0.9);
      color: var(--md-sys-color-on-surface);
      width: 32px;
      height: 32px;
    }

    .thumbnail-action.active {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
    }

    .thumbnail-action.delete-action:hover {
      background: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
    }

    .image-badge {
      position: absolute;
      top: var(--md-sys-spacing-xs);
      left: var(--md-sys-spacing-xs);
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border-radius: var(--md-sys-shape-corner-full);
      padding: var(--md-sys-spacing-xs);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Add Image */
    .add-image-container {
      display: flex;
      justify-content: center;
    }

    .add-image-button {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
    }

    /* Empty State */
    .empty-gallery {
      text-align: center;
      padding: var(--md-sys-spacing-xxl);
      background: var(--md-sys-color-surface-container-lowest);
      border-radius: var(--md-sys-shape-corner-large);
      border: 2px dashed var(--md-sys-color-outline-variant);
    }

    .empty-icon {
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: var(--md-sys-spacing-lg);
    }

    .empty-gallery h4 {
      margin: 0 0 var(--md-sys-spacing-sm) 0;
      font-family: var(--md-sys-typescale-headline-small-font-family);
      font-size: var(--md-sys-typescale-headline-small-font-size);
      color: var(--md-sys-color-on-surface);
    }

    .empty-gallery p {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Lightbox */
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }

    .lightbox-container {
      position: relative;
      max-width: 90vw;
      max-height: calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      margin: var(--md-sys-spacing-lg);
    }

    .lightbox-close {
      position: fixed;
      top: var(--md-sys-spacing-lg);
      right: var(--md-sys-spacing-lg);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      z-index: 2001;
      backdrop-filter: blur(4px);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.2);
      transition: all 0.2s ease;
    }
    
    .lightbox-close:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .lightbox-image {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: var(--md-sys-shape-corner-medium);
    }

    .lightbox-info {
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: var(--md-sys-spacing-md);
      border-radius: 0 0 var(--md-sys-shape-corner-medium) var(--md-sys-shape-corner-medium);
    }

    .lightbox-info p {
      margin: 0;
      text-align: center;
    }

    .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      backdrop-filter: blur(4px);
    }

    .prev-button {
      left: var(--md-sys-spacing-lg);
    }

    .next-button {
      right: var(--md-sys-spacing-lg);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 768px) {
      .thumbnail-gallery {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: var(--md-sys-spacing-sm);
      }

      .primary-image {
        max-height: 250px;
      }

      .lightbox-container {
        max-width: 95vw;
        max-height: 95vh;
      }

      .lightbox-nav {
        width: 48px;
        height: 48px;
      }
    }
  `]
})
export class ItemImageGalleryComponent {
  @Input() images: WallItemImage[] = [];
  @Input() showControls: boolean = true;
  @Input() maxImages: number = 10;

  @Output() imageAdded = new EventEmitter<void>();
  @Output() imageEdited = new EventEmitter<WallItemImage>();
  @Output() imageDeleted = new EventEmitter<WallItemImage>();
  @Output() primaryImageChanged = new EventEmitter<WallItemImage>();

  selectedImage = signal<WallItemImage | null>(null);

  get primaryImage(): WallItemImage | undefined {
    return this.images.find(img => img.isPrimary) || this.images[0];
  }

  get galleryImages(): WallItemImage[] {
    return this.images;
  }

  addImage(): void {
    this.imageAdded.emit();
  }

  editImage(image: WallItemImage): void {
    this.imageEdited.emit(image);
  }

  private confirmationDialog = inject(ConfirmationDialogService);

  deleteImage(image: WallItemImage): void {
    this.confirmationDialog.confirmDelete('this image').subscribe(confirmed => {
      if (confirmed) {
        this.imageDeleted.emit(image);
      }
    });
  }

  setPrimaryImage(image: WallItemImage): void {
    if (!image.isPrimary) {
      this.primaryImageChanged.emit(image);
    }
  }

  openLightbox(image: WallItemImage): void {
    this.selectedImage.set(image);
  }

  closeLightbox(): void {
    this.selectedImage.set(null);
  }

  previousImage(): void {
    const currentIndex = this.images.findIndex(img => img.id === this.selectedImage()?.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : this.images.length - 1;
    this.selectedImage.set(this.images[previousIndex]);
  }

  nextImage(): void {
    const currentIndex = this.images.findIndex(img => img.id === this.selectedImage()?.id);
    const nextIndex = currentIndex < this.images.length - 1 ? currentIndex + 1 : 0;
    this.selectedImage.set(this.images[nextIndex]);
  }

  trackByImageId(index: number, image: WallItemImage): string {
    return image.id;
  }

  // Keyboard support for lightbox
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.selectedImage()) return;

    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowLeft':
        if (this.images.length > 1) {
          this.previousImage();
        }
        break;
      case 'ArrowRight':
        if (this.images.length > 1) {
          this.nextImage();
        }
        break;
    }
  }
}