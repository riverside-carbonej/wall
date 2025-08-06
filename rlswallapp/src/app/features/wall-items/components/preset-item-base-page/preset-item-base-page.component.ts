import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

import { Wall, WallObjectType, WallItem, WallItemImage, FieldDefinition } from '../../../../shared/models/wall.model';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { DynamicFieldRendererComponent } from '../dynamic-field-renderer/dynamic-field-renderer.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { WallItemImageComponent } from '../../../../shared/components/wall-item-image/wall-item-image.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { ThemeService } from '../../../../shared/services/theme.service';
import { WallItemService } from '../../services/wall-item.service';
import { MatTabGroup, MatTab } from '../../../../shared/components/material-stubs';
import { WallItemsGridComponent } from '../wall-items-grid/wall-items-grid.component';
import { NlpService } from '../../../../shared/services/nlp.service';

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
    ImageGalleryComponent,
    MatTabGroup,
    MatTab,
    WallItemsGridComponent
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
                  <!-- Tab Groups -->
                  <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="item-tabs">
                    
                    <!-- Details Tab -->
                    <mat-tab label="Details">
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
                    </mat-tab>
                    
                    <!-- Individual tabs for each related entity type -->
                    @if (mode === 'view' && item && hasRelatedItems()) {
                      @for (relatedType of relatedTypes; track relatedType.objectType.id; let i = $index) {
                        <mat-tab [label]="getTabLabelForEntityType(relatedType.objectType, i)">
                          <div class="related-items-section">
                            @if (loadingRelatedItems) {
                              <app-loading-state 
                                type="spinner" 
                                message="Loading {{ relatedType.objectType.name.toLowerCase() }}..."
                                [spinnerSize]="40">
                              </app-loading-state>
                            } @else {
                              @if (getRelatedItemsForType(relatedType.objectType.id).length > 0) {
                                <app-wall-items-grid
                                  [items]="getRelatedItemsForType(relatedType.objectType.id)"
                                  [preset]="relatedType.objectType"
                                  [viewMode]="'grid'"
                                  [isSelectionMode]="false"
                                  [selectedItems]="[]"
                                  (viewItem)="navigateToRelatedItem($event)"
                                  (editItem)="navigateToRelatedItem($event)">
                                </app-wall-items-grid>
                              } @else {
                                <div class="no-related-items">
                                  <mat-icon [style.color]="relatedType.objectType.color">{{ relatedType.objectType.icon || 'circle' }}</mat-icon>
                                  <p>No {{ relatedType.objectType.name.toLowerCase() }} are linked to this {{ preset?.name?.toLowerCase() || 'item' }}.</p>
                                </div>
                              }
                              
                            }
                          </div>
                        </mat-tab>
                      }
                    }
                    
                  </mat-tab-group>
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

    /* Tab Styles */
    .item-tabs {
      margin-top: 16px;
    }

    .item-tabs .mat-mdc-tab-body-content {
      padding-top: 16px;
    }

    /* Related Items Tab Styles */
    .related-items-section {
      padding: 24px 0;
    }

    .related-type-section {
      margin-bottom: 32px;
    }

    .related-type-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .related-type-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .related-type-title .item-count {
      color: var(--md-sys-color-on-surface-variant);
      font-weight: 400;
      font-size: 14px;
    }

    /* Grid component handles its own styling */

    .no-related-items,
    .no-relationships {
      text-align: center;
      padding: 32px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .no-relationships {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .no-relationships mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--md-sys-color-outline);
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
export class PresetItemBasePageComponent implements OnInit, OnDestroy, OnChanges {
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
  
  // Tab state
  selectedTabIndex = 0;
  
  // Related items (reverse entity lookups)
  relatedItems: { [objectTypeId: string]: WallItem[] } = {};
  loadingRelatedItems = false;
  private cachedRelatedTypes: { objectType: WallObjectType; fieldName: string }[] | null = null;
  
  // Public property for template binding
  relatedTypes: { objectType: WallObjectType; fieldName: string }[] = [];
  
  private destroy$ = new Subject<void>();
  private themeService = inject(ThemeService);
  private wallItemService = inject(WallItemService);
  private router = inject(Router);
  private nlpService = inject(NlpService);

  @Output() backClick = new EventEmitter<void>();
  @Output() addImage = new EventEmitter<void>();
  @Output() changeImage = new EventEmitter<number>();
  @Output() removeImage = new EventEmitter<number>();
  @Output() setPrimaryImage = new EventEmitter<number>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();

  ngOnInit() {
    // Initial check for related items
    this.checkAndLoadRelatedItems();
    // Initialize related types
    this.updateRelatedTypes();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check if relevant inputs have changed
    if (changes['mode'] || changes['item'] || changes['wall'] || changes['preset']) {
      // Invalidate cache when inputs change
      this.cachedRelatedTypes = null;
      this.checkAndLoadRelatedItems();
      // Update related types
      this.updateRelatedTypes();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAndLoadRelatedItems() {
    // Load related items if this is an existing item in view mode and we have all required data
    if (this.mode === 'view' && this.item && this.wall && this.preset) {
      console.log('🔍 PresetItemBasePageComponent - Loading related items for:', {
        itemId: this.item.id,
        presetName: this.preset.name,
        presetId: this.preset.id,
        wallObjectTypes: this.wall.objectTypes?.map(ot => ({ id: ot.id, name: ot.name, fields: ot.fields?.map(f => ({ name: f.name, type: f.type, target: f.entityConfig?.targetObjectTypeId })) }))
      });
      
      // Update related types property 
      this.updateRelatedTypes();
      console.log('🔗 Found related types:', this.relatedTypes.map(rt => ({ name: rt.objectType.name, fieldName: rt.fieldName, id: rt.objectType.id })));
      console.log('🔍 Total related types count:', this.relatedTypes.length);
      
      // Debug: Show all entity fields to understand why no relationships are found
      // Debug logging removed - relationships working correctly
      
      this.loadRelatedItems();
    } else {
      console.log('❌ PresetItemBasePageComponent - Cannot load related items:', {
        mode: this.mode,
        hasItem: !!this.item,
        hasWall: !!this.wall,
        hasPreset: !!this.preset,
        shouldLoad: this.mode === 'view' && this.item && this.wall && this.preset
      });
    }
  }

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
      return this.formatFieldValue(this.item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(this.item.fieldData).find(key => 
      typeof this.item!.fieldData[key] === 'string' && this.item!.fieldData[key].trim()
    );
    
    return firstTextField ? this.formatFieldValue(this.item.fieldData[firstTextField]) : 'Untitled Item';
  }

  private formatFieldValue(value: any): string {
    if (!value) return '';
    
    // Handle location objects
    if (value && typeof value === 'object') {
      if (value.address) {
        return value.address;
      } else if (value.lat && value.lng) {
        return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
      } else if (Array.isArray(value)) {
        return value.join(', ');
      } else {
        return '';
      }
    }
    
    return String(value);
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

  // Related items methods
  hasRelatedItems(): boolean {
    return this.relatedTypes.length > 0;
  }

  private updateRelatedTypes() {
    console.log('🔄 Updating relatedTypes property');
    const types = this.getRelatedObjectTypes();
    this.relatedTypes = types;
    console.log('✅ relatedTypes property updated with', types.length, 'types');
  }
  
  getRelatedObjectTypes(): { objectType: WallObjectType; fieldName: string }[] {
    console.log('🔵 getRelatedObjectTypes() called');
    
    // Return cached result if available
    if (this.cachedRelatedTypes !== null) {
      console.log('📦 Returning cached result:', this.cachedRelatedTypes.length, 'types');
      return this.cachedRelatedTypes;
    }
    
    if (!this.wall || !this.preset) {
      console.log('❌ No wall or preset');
      return [];
    }
    
    console.log(`📊 Current preset: ${this.preset.name} (${this.preset.id})`);
    console.log(`📊 Total object types in wall: ${this.wall.objectTypes?.length}`);
    
    const relatedTypesMap = new Map<string, { objectType: WallObjectType; fieldNames: string[] }>();
    
    this.wall.objectTypes?.forEach((otherObjectType: WallObjectType) => {
      if (otherObjectType.id === this.preset?.id) {
        console.log(`⏭️ Skipping self: ${otherObjectType.name}`);
        return; // Skip self
      }
      
      let foundRelationship = false;
      const fieldNames: string[] = [];
      
      // INCOMING: Find object types that have entity fields pointing TO this object type
      otherObjectType.fields.forEach((field: FieldDefinition) => {
        if (field.type === 'entity') {
          const targetId = field.entityConfig?.targetObjectTypeId;
          const isTargetingThis = 
            targetId === this.preset?.id ||
            targetId === this.preset?.name?.toLowerCase();
          
          if (isTargetingThis) {
            console.log(`📥 INCOMING: ${otherObjectType.name}.${field.name} → ${this.preset?.name}`);
            foundRelationship = true;
            fieldNames.push(field.name);
          }
        }
      });
      
      // OUTGOING: Find object types that this object type points TO
      if (this.preset) {
        this.preset.fields.forEach((field: FieldDefinition) => {
          if (field.type === 'entity') {
            const targetId = field.entityConfig?.targetObjectTypeId;
            console.log(`   Checking field: ${field.name}, type: ${field.type}, target: ${targetId}`);
            
            const isTargetingOther = 
              targetId === otherObjectType.id ||
              targetId === otherObjectType.name?.toLowerCase();
            
            if (isTargetingOther) {
              console.log(`📤 OUTGOING: ${this.preset?.name}.${field.name} → ${otherObjectType.name}`);
              foundRelationship = true;
              fieldNames.push(field.name);
            }
          }
        });
      }
      
      // Add to map only once per object type, combining field names
      if (foundRelationship) {
        const existing = relatedTypesMap.get(otherObjectType.id);
        if (existing) {
          console.log(`⚠️ DUPLICATE FOUND: ${otherObjectType.name} already in map!`);
          console.log(`   Existing fields: ${existing.fieldNames.join(', ')}`);
          console.log(`   New fields: ${fieldNames.join(', ')}`);
          existing.fieldNames.push(...fieldNames);
        } else {
          console.log(`✅ Adding to map: ${otherObjectType.name} (${otherObjectType.id})`);
          relatedTypesMap.set(otherObjectType.id, {
            objectType: otherObjectType,
            fieldNames: [...new Set(fieldNames)] // Remove duplicate field names
          });
        }
      }
    });
    
    console.log(`📊 Map size: ${relatedTypesMap.size}`);
    console.log('📊 Map contents:');
    relatedTypesMap.forEach((value, key) => {
      console.log(`   - ${key}: ${value.objectType.name} (fields: ${value.fieldNames.join(', ')})`);
    });
    
    // Convert map to array with single field name (first one found)
    const relatedTypes = Array.from(relatedTypesMap.values()).map(item => ({
      objectType: item.objectType,
      fieldName: item.fieldNames[0] // Just use first field name for display
    }));
    
    console.log(`🏁 Final array length: ${relatedTypes.length}`);
    
    // Check for duplicate IDs!
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];
    
    relatedTypes.forEach((rt, index) => {
      console.log(`   [${index}] ${rt.objectType.name} (${rt.objectType.id})`);
      
      if (seenIds.has(rt.objectType.id)) {
        console.error(`🚨 DUPLICATE ID DETECTED: ${rt.objectType.id} is used by multiple items!`);
        duplicateIds.push(rt.objectType.id);
      }
      seenIds.add(rt.objectType.id);
    });
    
    if (duplicateIds.length > 0) {
      console.error('🚨🚨🚨 CRITICAL: Duplicate IDs found in related types!', duplicateIds);
      console.error('This will cause Angular to create duplicate tabs!');
    }
    
    // Cache the result before returning
    this.cachedRelatedTypes = relatedTypes;
    console.log('💾 Result cached');
    
    return relatedTypes;
  }

  async loadRelatedItems() {
    if (!this.item?.id || !this.wall) return;
    
    this.loadingRelatedItems = true;
    this.relatedItems = {};
    
    try {
      // Use the stable relatedTypes property instead of calling the method
      const allItems = await firstValueFrom(
        this.wallItemService.getWallItems(this.wall.id!)
      );
      
      for (const { objectType, fieldName } of this.relatedTypes) {
        const relatedItemsForType: WallItem[] = [];
        
        // INCOMING: Find items of this object type that reference the current item
        const incomingItems = allItems.filter(item => {
          if (item.objectTypeId !== objectType.id) return false;
          
          // Check if this item's entity fields contain reference to current item
          const entityFields = objectType.fields.filter(f => f.type === 'entity');
          
          return entityFields.some(field => {
            const fieldValue = item.fieldData[field.id];
            if (Array.isArray(fieldValue)) {
              return fieldValue.includes(this.item!.id);
            }
            return fieldValue === this.item!.id;
          });
        });
        
        // OUTGOING: Find items of this object type that the current item references
        const outgoingItems = allItems.filter(item => {
          if (item.objectTypeId !== objectType.id) return false;
          
          // Check if the current item's entity fields contain reference to this item
          if (this.preset) {
            const currentItemEntityFields = this.preset.fields.filter(f => f.type === 'entity');
            
            return currentItemEntityFields.some(field => {
              const fieldValue = this.item!.fieldData[field.id];
              if (Array.isArray(fieldValue)) {
                return fieldValue.includes(item.id);
              }
              return fieldValue === item.id;
            });
          }
          return false;
        });
        
        // Combine both directions and remove duplicates
        const combinedItems = [...incomingItems, ...outgoingItems];
        const uniqueItems = combinedItems.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        if (uniqueItems.length > 0) {
          this.relatedItems[objectType.id] = uniqueItems;
        }
      }
    } catch (error) {
      console.error('Error loading related items:', error);
    } finally {
      this.loadingRelatedItems = false;
    }
  }

  getRelatedItemsForType(objectTypeId: string): WallItem[] {
    return this.relatedItems[objectTypeId] || [];
  }

  navigateToRelatedItem(item: WallItem) {
    this.router.navigate(['/walls', this.wall?.id, 'preset', item.objectTypeId, 'items', item.id]);
  }

  getItemDisplayName(item: WallItem): string {
    if (!this.wall) return 'Item';
    
    // Find the object type for this item
    const objectType = this.wall.objectTypes?.find(ot => ot.id === item.objectTypeId);
    if (!objectType) return 'Item';
    
    // Try to get display name from primary field
    const primaryField = objectType.displaySettings?.primaryField;
    if (primaryField && item.fieldData[primaryField]) {
      return item.fieldData[primaryField];
    }
    
    // Fall back to first text field
    for (const field of objectType.fields) {
      if ((field.type === 'text' || field.type === 'longtext') && item.fieldData[field.id]) {
        return item.fieldData[field.id];
      }
    }
    
    return objectType.name;
  }

  getItemSummary(item: WallItem): string {
    // Get first few non-empty field values for summary
    const fieldData = item.fieldData || {};
    const values = Object.values(fieldData)
      .filter(value => value && typeof value === 'string' && value.trim())
      .slice(0, 2) as string[];
    
    return values.join(' • ') || 'No additional details';
  }

  getTabLabelForEntityType(objectType: WallObjectType, index?: number): string {
    const label = this.nlpService.getDisplayPlural(objectType.name);
    console.log(`🏷️ Tab label requested - Index: ${index}, Type: ${objectType.name} (${objectType.id}), Label: ${label}`);
    return label;
  }
}