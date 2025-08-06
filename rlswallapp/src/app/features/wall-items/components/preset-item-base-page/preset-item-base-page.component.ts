import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';

import { Wall, WallObjectType, WallItem, WallItemImage } from '../../../../shared/models/wall.model';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { DynamicFieldRendererComponent } from '../dynamic-field-renderer/dynamic-field-renderer.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { WallItemImageComponent } from '../../../../shared/components/wall-item-image/wall-item-image.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { ThemeService } from '../../../../shared/services/theme.service';

export type PageMode = 'create' | 'view' | 'edit';

@Component({
  selector: 'app-preset-item-base-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PageLayoutComponent,
    LoadingStateComponent,
    DynamicFieldRendererComponent,
    MaterialIconComponent,
    ThemedButtonComponent,
    WallItemImageComponent,
    ImageGalleryComponent
  ],
  template: `
    <div *ngIf="wall && preset">
      <app-page-layout
        [title]="getPageTitle()"
        [subtitle]="getPageSubtitle()"
        [showBackButton]="true"
        [actions]="getPageActions()"
        (backClick)="onBackClick()">
        
        <!-- Loading State -->
        @if (isLoading) {
          <app-loading-state 
            [message]="getLoadingMessage()">
          </app-loading-state>
        }

        <!-- Page Content -->
        @if (!isLoading && itemForm) {
          <div class="item-layout">
            
            <!-- Image Section (Left Side) -->
            <div class="image-section">
              <div class="image-gallery-container">
                @if (images.length === 0) {
                  <div class="empty-image-state">
                    <app-wall-item-image
                      [images]="[]"
                      [preset]="preset"
                      [objectFit]="'cover'"
                      [uniqueId]="item?.id || preset?.id">
                    </app-wall-item-image>
                    @if (mode !== 'view') {
                      <div class="add-image-overlay">
                        <app-themed-button 
                          variant="raised"
                          [icon]="'add'"
                          label="Add Image"
                          (buttonClick)="onAddImage()">
                        </app-themed-button>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="primary-image-container">
                    <div class="primary-image" [class.view-mode]="mode === 'view'">
                      <app-wall-item-image
                        [images]="images"
                        [primaryImageIndex]="primaryImageIndex"
                        [preset]="preset"
                        [objectFit]="'cover'"
                          [uniqueId]="item?.id || preset?.id">
                      </app-wall-item-image>
                      @if (mode !== 'view') {
                        <div class="image-overlay">
                          <div class="image-actions">
                            <button 
                              class="overlay-button"
                              type="button"
                              (click)="onOpenGallery()"
                              title="View gallery">
                              <mat-icon [icon]="'photo_library'"></mat-icon>
                              Gallery
                            </button>
                            <button 
                              class="overlay-button"
                              type="button"
                              (click)="onChangeImage(primaryImageIndex)"
                              title="Change image">
                              <mat-icon [icon]="'edit'"></mat-icon>
                              Change
                            </button>
                            <button 
                              class="overlay-button delete-button"
                              type="button"
                              (click)="onRemoveImage(primaryImageIndex)"
                              title="Remove image">
                              <mat-icon [icon]="'delete'"></mat-icon>
                              Remove
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                    
                    @if (images.length > 1) {
                      <div class="thumbnail-gallery">
                        <div class="gallery-header">
                          <h4>All Images</h4>
                          <app-themed-button
                            variant="basic"
                            [icon]="'photo_library'"
                            label="View Gallery"
                            (buttonClick)="onOpenGallery()">
                          </app-themed-button>
                        </div>
                        <div class="thumbnails-grid">
                          @for (image of images; track $index) {
                            <div class="thumbnail" 
                                 [class.active]="$index === primaryImageIndex"
                                 (click)="onSetPrimaryImage($index)">
                              <img [src]="image.url" [alt]="image.altText" />
                              @if (mode !== 'view') {
                                <button 
                                  class="thumbnail-delete"
                                  type="button"
                                  (click)="onRemoveImage($index); $event.stopPropagation()"
                                  title="Remove">
                                  <mat-icon [icon]="'close'"></mat-icon>
                                </button>
                              }
                            </div>
                          }
                          @if (mode !== 'view') {
                            <div class="add-thumbnail" (click)="onAddImage()">
                              <mat-icon [icon]="'add'"></mat-icon>
                            </div>
                          }
                        </div>
                      </div>
                    } @else if (images.length === 1) {
                      <div class="single-image-actions">
                        <app-themed-button
                          variant="basic"
                          [icon]="'photo_library'"
                          label="View Gallery"
                          (buttonClick)="onOpenGallery()">
                        </app-themed-button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Form Section (Right Side) -->
            <div class="form-section">
              <div class="form-container">
                <div class="form-header">
                  <h2>
                    <mat-icon [icon]="preset.icon || 'description'"></mat-icon>
                    {{ getCapitalizedPresetName() }} Details
                  </h2>
                </div>
                
                @if (itemForm && preset && preset.fields) {
                  <form [formGroup]="itemForm" class="item-form" [class.view-mode]="mode === 'view'">
                    @for (field of preset.fields; track field.id) {
                      <div class="form-field">
                        <app-dynamic-field-renderer
                          [field]="field"
                          [formGroup]="itemForm"
                          [readonly]="mode === 'view'"
                          [wall]="wall">
                        </app-dynamic-field-renderer>
                      </div>
                    }
                  </form>
                }

                <!-- Form Actions (only shown in edit/create modes) -->
                @if (mode !== 'view') {
                  <div class="form-actions">
                    @if (itemForm.invalid && attemptedSubmit) {
                      <div class="form-warning">
                        <mat-icon [icon]="'warning'"></mat-icon>
                        <span>Please complete all required fields</span>
                      </div>
                    }
                    
                    <div class="action-buttons">
                      <app-themed-button 
                        variant="stroked"
                        label="Cancel"
                        (buttonClick)="onCancel()">
                      </app-themed-button>
                      <app-themed-button 
                        variant="raised"
                        [icon]="isSaving ? 'hourglass_empty' : 'save'"
                        [label]="getSaveButtonText()"
                        [disabled]="!canSave || isSaving"
                        (buttonClick)="onSave()">
                      </app-themed-button>
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>
        }
        
      </app-page-layout>

      <!-- Image Gallery Modal -->
      @if (showGallery) {
        <app-image-gallery
          [images]="images"
          [primaryImageIndex]="primaryImageIndex"
          [preset]="preset"
          [readonly]="mode === 'view'"
          (close)="onCloseGallery()"
          (addImages)="onAddImage()"
          (changeImage)="onChangeImage($event)"
          (removeImage)="onRemoveImage($event)"
          (setPrimary)="onSetPrimaryImage($event)">
        </app-image-gallery>
      }
    </div>
  `,
  styles: [`
    /* Main Layout - Responsive Grid */
    .item-layout {
      display: grid;
      grid-template-columns: minmax(300px, 1fr) 2fr;
      gap: 2rem;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      min-height: calc(100vh - 200px);
    }

    /* Image Section (Left Side) */
    .image-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .image-gallery-container {
      background: var(--md-sys-color-surface-container);
      border-radius: 20px;
      padding: 24px;
      box-shadow: var(--md-sys-elevation-1);
      min-height: 500px;
    }

    /* Empty Image State */
    .empty-image-state {
      position: relative;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-image-state app-wall-item-image {
      width: 100%;
      height: 100%;
      min-height: 400px;
    }

    .add-image-overlay {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
    }

    /* Primary Image Container */
    .primary-image-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      height: 100%;
    }

    .primary-image {
      position: relative;
      width: 100%;
      height: min(500px, 40vh);
      max-height: min(600px, 80vh);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: var(--md-sys-elevation-2);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .primary-image:hover:not(.view-mode) {
      transform: scale(1.02);
      box-shadow: var(--md-sys-elevation-3);
    }

    .primary-image app-wall-item-image {
      width: 100%;
      height: 100%;
    }

    /* Image Overlay for Edit Actions */
    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .primary-image:hover .image-overlay {
      opacity: 1;
    }

    .image-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }

    .overlay-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 200px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--md-sys-elevation-2);
      font-size: 0.875rem;
      white-space: nowrap;
      min-width: 0;
      flex-shrink: 0;
    }

    .overlay-button:hover {
      background: var(--md-sys-color-surface-container-high);
      transform: translateY(-2px);
      box-shadow: var(--md-sys-elevation-3);
    }

    .overlay-button.delete-button {
      background: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
      border-color: var(--md-sys-color-error);
    }

    .overlay-button.delete-button:hover {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }

    .overlay-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Thumbnail Gallery */
    .thumbnail-gallery {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gallery-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .gallery-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .single-image-actions {
      display: flex;
      justify-content: center;
      padding: 12px 0;
    }

    .thumbnails-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 8px;
    }

    .thumbnail {
      position: relative;
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .thumbnail.active {
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
    }

    .thumbnail:hover {
      transform: scale(1.05);
    }

    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumbnail-delete {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: none;
      background: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .thumbnail:hover .thumbnail-delete {
      opacity: 1;
    }

    .thumbnail-delete mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .add-thumbnail {
      aspect-ratio: 1;
      border: 2px dashed var(--md-sys-color-outline-variant);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.2s ease;
    }

    .add-thumbnail:hover {
      border-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
    }

    .add-thumbnail mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    /* Form Section (Right Side) */
    .form-section {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .form-container {
      background: var(--md-sys-color-surface-container);
      border-radius: 20px;
      padding: 32px;
      box-shadow: var(--md-sys-elevation-1);
      display: flex;
      flex-direction: column;
      gap: 24px;
      height: fit-content;
    }

    .form-header {
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      padding-bottom: 16px;
    }

    .form-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .form-header h2 mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--md-sys-color-primary);
    }

    /* Item Form Styles */
    .item-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Reduce spacing for view mode */
    .item-form.view-mode {
      gap: 0px;
    }

    /* Remove margins from form fields in view mode */
    .item-form.view-mode .form-field {
      margin-bottom: 0 !important;
    }

    /* Reduce spacing in dynamic field renderer for view mode */
    .item-form.view-mode .form-field app-dynamic-field-renderer {
      margin-bottom: 0 !important;
    }

    .item-form.view-mode app-dynamic-field-renderer .dynamic-field-renderer {
      margin-bottom: 0 !important;
    }

    /* Compact readonly fields in view mode */
    .item-form.view-mode .readonly-field {
      padding: 4px 12px;
      margin-bottom: 0 !important;
    }

    .item-form.view-mode .readonly-field .field-label {
      margin-bottom: 2px;
      font-size: 11px;
      text-align: left;
      justify-content: flex-start;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      padding-top: 24px;
      margin-top: auto;
    }

    .form-warning {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      border-radius: 16px;
      font-size: 0.875rem;
      border-left: 4px solid var(--md-sys-color-error);
    }

    .form-warning mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-error);
      flex-shrink: 0;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
    }

    /* Responsive Design */
    @media (max-width: 1400px) {
      .item-layout {
        max-width: 1400px;
        gap: 2rem;
      }
    }

    @media (max-width: 1200px) {
      .item-layout {
        grid-template-columns: minmax(280px, 400px) 1fr;
        gap: 1.5rem;
        max-width: 1200px;
      }

      .primary-image {
        height: min(400px, 35vh);
        max-height: min(500px, 70vh);
      }
    }

    @media (max-width: 900px) {
      .item-layout {
        grid-template-columns: 1fr;
        gap: 2rem;
        padding: 16px;
      }

      .image-section {
        order: 1;
      }

      .form-section {
        order: 2;
      }

      .primary-image {
        height: min(350px, 40vh);
        max-height: 500px;
      }

      .item-form {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .form-field {
        grid-column: 1 / -1 !important;
      }

      .action-buttons {
        flex-direction: column;
        gap: 12px;
      }
    }

    @media (max-width: 600px) {
      .item-layout {
        padding: 12px;
        gap: 1.5rem;
      }

      .image-gallery-container,
      .form-container {
        padding: 20px;
      }

      .primary-image {
        height: min(300px, 35vh);
        max-height: 400px;
      }

      .thumbnails-grid {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
      }
    }

    /* Animation */
    .primary-image,
    .thumbnail,
    .overlay-button {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Focus States for Accessibility */
    .thumbnail:focus,
    .add-thumbnail:focus,
    .overlay-button:focus {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .image-gallery-container,
      .form-container {
        border: 2px solid var(--md-sys-color-outline);
      }

      .thumbnail {
        border-width: 3px;
      }
    }
  `]
})
export class PresetItemBasePageComponent {
  @Input() wall: Wall | null = null;
  @Input() preset: WallObjectType | null = null;
  @Input() item: WallItem | null = null;
  @Input() itemForm!: FormGroup;
  @Input() mode: PageMode = 'create';
  @Input() isLoading = false;
  @Input() isSaving = false;
  @Input() attemptedSubmit = false;
  @Input() images: WallItemImage[] = [];
  @Input() primaryImageIndex = 0;
  @Input() canSave = true;

  // Gallery state
  showGallery = false;
  
  private themeService = inject(ThemeService);

  @Output() backClick = new EventEmitter<void>();
  @Output() addImage = new EventEmitter<void>();
  @Output() changeImage = new EventEmitter<number>();
  @Output() removeImage = new EventEmitter<number>();
  @Output() setPrimaryImage = new EventEmitter<number>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();

  getPageTitle(): string {
    if (!this.preset) return '';
    
    switch (this.mode) {
      case 'create':
        return `Add New ${this.preset.name}`;
      case 'edit':
        return `Edit ${this.preset.name}`;
      case 'view':
        return this.getItemTitle();
      default:
        return this.preset.name;
    }
  }

  getPageSubtitle(): string {
    if (!this.preset) return '';
    
    switch (this.mode) {
      case 'create':
        return `Create a new ${this.preset.name.toLowerCase()} entry`;
      case 'edit':
        return `Modify this ${this.preset.name.toLowerCase()} entry`;
      case 'view':
        return `View ${this.preset.name.toLowerCase()} details`;
      default:
        return '';
    }
  }

  getLoadingMessage(): string {
    switch (this.mode) {
      case 'create':
        return 'Loading form...';
      case 'edit':
        return 'Loading item for editing...';
      case 'view':
        return 'Loading item details...';
      default:
        return 'Loading...';
    }
  }

  getSaveButtonText(): string {
    if (this.isSaving) {
      return this.mode === 'create' ? 'Creating...' : 'Saving...';
    }
    return this.mode === 'create' ? `Create ${this.preset?.name}` : `Save ${this.preset?.name}`;
  }

  getItemTitle(): string {
    if (!this.preset || !this.item) return 'Item';
    
    const primaryField = this.preset.displaySettings?.primaryField;
    if (primaryField && this.item.fieldData[primaryField]) {
      return String(this.item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(this.item.fieldData).find(key => 
      typeof this.item!.fieldData[key] === 'string' && this.item!.fieldData[key].trim()
    );
    
    return firstTextField ? String(this.item.fieldData[firstTextField]) : 'Untitled Item';
  }

  getCapitalizedPresetName(): string {
    if (!this.preset?.name) return '';
    return this.preset.name.charAt(0).toUpperCase() + this.preset.name.slice(1);
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

  getPageActions(): PageAction[] {
    if (this.mode === 'view') {
      return [
        {
          label: 'Edit',
          icon: 'edit',
          variant: 'raised',
          color: 'primary',
          action: () => this.onEdit()
        }
      ];
    }
    return [];
  }

  onBackClick() {
    this.backClick.emit();
  }

  onAddImage() {
    this.addImage.emit();
  }

  onChangeImage(index: number) {
    this.changeImage.emit(index);
  }

  onRemoveImage(index: number) {
    this.removeImage.emit(index);
  }

  onSetPrimaryImage(index: number) {
    this.setPrimaryImage.emit(index);
  }

  onSave() {
    this.save.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  onEdit() {
    this.edit.emit();
  }

  onOpenGallery() {
    this.showGallery = true;
  }

  onCloseGallery() {
    this.showGallery = false;
  }
}