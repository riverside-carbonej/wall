import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { Wall, WallObjectType, WallItem, WallItemImage } from '../../../../shared/models/wall.model';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { DynamicFieldRendererComponent } from '../../components/dynamic-field-renderer/dynamic-field-renderer.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';

@Component({
  selector: 'app-preset-item-add',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PageLayoutComponent,
    LoadingStateComponent,
    DynamicFieldRendererComponent,
    MaterialIconComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <div *ngIf="preset$ | async as preset">
        <app-page-layout
          [title]="'Add New ' + preset.name"
          [subtitle]="'Create a new ' + preset.name.toLowerCase() + ' entry'"
          [showBackButton]="true"
          [actions]="getPageActions()"
          (backClick)="goBack()">
          
          <!-- Loading State -->
          @if (isLoading) {
            <app-loading-state 
              message="Loading form...">
            </app-loading-state>
          }

          <!-- Add Item Form -->
          @if (!isLoading && itemForm) {
            <div class="add-item-container">
              
              <!-- Image Gallery Section -->
              <div class="form-section">
                <div class="section-header">
                  <h2>
                    <mat-icon [icon]="'photo_library'"></mat-icon>
                    Image Gallery
                  </h2>
                  <p class="section-description">Add images to showcase this {{ preset.name.toLowerCase() }}. The first image will be the primary image.</p>
                </div>
                
                <div class="image-gallery">
                  @if (images.length === 0) {
                    <div class="empty-gallery">
                      <mat-icon [icon]="'add_photo_alternate'"></mat-icon>
                      <p>No images added yet</p>
                      <button 
                        class="themed-button raised-button"
                        type="button"
                        (click)="addImage()">
                        <mat-icon [icon]="'add'"></mat-icon>
                        Add First Image
                      </button>
                    </div>
                  } @else {
                    <div class="images-grid">
                      @for (image of images; track $index) {
                        <div class="image-item" [class.primary]="$index === primaryImageIndex">
                          <div class="image-container">
                            <img [src]="image.url" [alt]="image.altText" />
                            @if ($index === primaryImageIndex) {
                              <div class="primary-badge">
                                <mat-icon [icon]="'star'"></mat-icon>
                                Primary
                              </div>
                            }
                            <div class="image-actions">
                              @if ($index !== primaryImageIndex) {
                                <button 
                                  class="action-button"
                                  type="button"
                                  (click)="setPrimaryImage($index)"
                                  title="Set as primary">
                                  <mat-icon [icon]="'star_border'"></mat-icon>
                                </button>
                              }
                              <button 
                                class="action-button delete-action"
                                type="button"
                                (click)="removeImage($index)"
                                title="Remove image">
                                <mat-icon [icon]="'delete'"></mat-icon>
                              </button>
                            </div>
                          </div>
                          <div class="image-details">
                            <input 
                              class="alt-text-input"
                              type="text"
                              [(ngModel)]="image.altText"
                              placeholder="Alt text (optional)"
                              maxlength="100">
                          </div>
                        </div>
                      }
                      
                      <div class="add-image-slot">
                        <button 
                          class="add-image-button"
                          type="button"
                          (click)="addImage()">
                          <mat-icon [icon]="'add'"></mat-icon>
                          Add Image
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Item Fields Section -->
              <div class="form-section">
                <div class="section-header">
                  <h2>
                    <mat-icon [icon]="preset.icon || 'description'"></mat-icon>
                    {{ preset.name }} Details
                  </h2>
                  <p class="section-description">Fill in the details for this {{ preset.name.toLowerCase() }}.</p>
                </div>
                
                <form [formGroup]="itemForm" class="item-form">
                  @for (field of preset.fields; track field.id) {
                    <div class="form-field">
                      <app-dynamic-field-renderer
                        [field]="field"
                        [formGroup]="itemForm">
                      </app-dynamic-field-renderer>
                    </div>
                  }
                </form>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                @if (itemForm.invalid && attemptedSubmit) {
                  <div class="form-warning">
                    <mat-icon [icon]="'warning'"></mat-icon>
                    <span>Please complete all required fields and add at least one image to save this item</span>
                  </div>
                }
                
                <div class="action-buttons">
                  <button 
                    class="themed-button stroked-button"
                    type="button"
                    (click)="onCancel()">
                    Cancel
                  </button>
                  <button 
                    class="themed-button raised-button"
                    type="button"
                    [disabled]="itemForm.invalid || images.length === 0 || isSaving"
                    (click)="onSave()">
                    @if (isSaving) {
                      <mat-icon [icon]="'hourglass_empty'"></mat-icon>
                      Saving...
                    } @else {
                      <mat-icon [icon]="'save'"></mat-icon>
                      Save {{ preset.name }}
                    }
                  </button>
                </div>
              </div>

            </div>
          }
          
        </app-page-layout>
      </div>
    </div>
  `,
  styles: [`
    .add-item-container {
      display: flex;
      flex-direction: column;
      gap: 40px;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Form Sections */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .section-header h2 mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: var(--md-sys-color-primary);
    }

    .section-description {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    /* Image Gallery Styles */
    .image-gallery {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      border: 2px dashed var(--md-sys-color-outline-variant);
      padding: 24px;
      min-height: 200px;
    }

    .empty-gallery {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      min-height: 150px;
    }

    .empty-gallery mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.6;
      color: var(--md-sys-color-primary);
    }

    .images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .image-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-medium);
      overflow: hidden;
      box-shadow: var(--md-sys-elevation-1);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .image-item.primary {
      border: 2px solid var(--md-sys-color-primary);
      box-shadow: var(--md-sys-elevation-2);
    }

    .image-container {
      position: relative;
      aspect-ratio: 4/3;
      overflow: hidden;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .primary-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      padding: 4px 8px;
      border-radius: var(--md-sys-shape-corner-small);
      font-size: 0.75rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .primary-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .image-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .image-item:hover .image-actions {
      opacity: 1;
    }

    .action-button {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .action-button:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: scale(1.1);
    }

    .action-button.delete-action {
      background: rgba(220, 38, 127, 0.9);
    }

    .action-button.delete-action:hover {
      background: rgba(220, 38, 127, 1);
    }

    .action-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .image-details {
      padding: 12px;
    }

    .alt-text-input {
      width: 100%;
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-small);
      padding: 8px 12px;
      font-size: 0.875rem;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }

    .alt-text-input:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      padding: 7px 11px;
    }

    .add-image-slot {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 4/3;
      border: 2px dashed var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container-low);
    }

    .add-image-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      border: none;
      background: none;
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      border-radius: var(--md-sys-shape-corner-medium);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .add-image-button:hover {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }

    .add-image-button mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    /* Item Form Styles */
    .item-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-field {
      width: 100%;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      padding-top: 24px;
    }

    .form-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      border-radius: var(--md-sys-shape-corner-small);
      font-size: 0.875rem;
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
      gap: 12px;
    }

    /* Button Styles */
    .themed-button {
      border: none;
      cursor: pointer;
      font-family: 'Google Sans', sans-serif;
      font-weight: 500;
      text-transform: none;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      outline: none;
      position: relative;
      overflow: hidden;
      border-radius: 200px;
      height: 48px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      white-space: nowrap;
      min-width: 64px;
    }

    .themed-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .stroked-button {
      background-color: transparent;
      border: 1px solid var(--md-sys-color-outline);
      color: var(--md-sys-color-primary);
    }

    .stroked-button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
    }

    .raised-button {
      background-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      box-shadow: var(--md-sys-elevation-1);
    }

    .raised-button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
      box-shadow: var(--md-sys-elevation-2);
    }

    .raised-button:disabled {
      background-color: var(--md-sys-color-on-surface);
      color: var(--md-sys-color-surface);
      opacity: 0.38;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .add-item-container {
        padding: 16px;
        gap: 32px;
      }

      .images-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }

      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class PresetItemAddComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  preset$!: Observable<WallObjectType | null>;
  itemForm!: FormGroup;
  isLoading = true;
  isSaving = false;
  attemptedSubmit = false;

  // Image gallery state
  images: WallItemImage[] = [];
  primaryImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private wallService: WallService,
    private wallItemService: WallItemService
  ) {}

  ngOnInit() {
    // Get route parameters
    const routeParams$ = this.route.paramMap.pipe(
      map(params => ({
        wallId: params.get('wallId')!,
        presetId: params.get('presetId')!
      }))
    );

    // Load wall data
    this.wall$ = routeParams$.pipe(
      switchMap(({ wallId }) => this.wallService.getWallById(wallId)),
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    // Load preset data from wall
    this.preset$ = combineLatest([this.wall$, routeParams$]).pipe(
      map(([wall, { presetId }]) => {
        if (!wall || !wall.objectTypes) return null;
        return wall.objectTypes.find(ot => ot.id === presetId) || null;
      }),
      takeUntil(this.destroy$)
    );

    // Initialize form when preset is loaded
    this.preset$.subscribe(preset => {
      if (preset) {
        this.initializeForm(preset);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(preset: WallObjectType) {
    const formControls: any = {};
    
    preset.fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      formControls[field.id] = ['', validators];
    });

    this.itemForm = this.fb.group(formControls);
  }

  goBack() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items']);
  }

  getPageActions(): PageAction[] {
    return [];
  }

  // Image Gallery Methods
  addImage() {
    // TODO: Implement file upload functionality
    // For now, add a placeholder image
    const newImage: WallItemImage = {
      id: 'placeholder_' + Date.now(),
      url: 'https://via.placeholder.com/400x300?text=Sample+Image',
      fileName: 'placeholder.jpg',
      size: 0,
      mimeType: 'image/jpeg',
      altText: '',
      uploadedAt: new Date()
    };
    
    this.images.push(newImage);
    
    // Set as primary if it's the first image
    if (this.images.length === 1) {
      this.primaryImageIndex = 0;
    }
  }

  removeImage(index: number) {
    this.images.splice(index, 1);
    
    // Adjust primary image index if needed
    if (this.primaryImageIndex >= this.images.length) {
      this.primaryImageIndex = Math.max(0, this.images.length - 1);
    } else if (this.primaryImageIndex > index) {
      this.primaryImageIndex--;
    }
  }

  setPrimaryImage(index: number) {
    this.primaryImageIndex = index;
  }

  // Form Actions
  onCancel() {
    this.goBack();
  }

  onSave() {
    this.attemptedSubmit = true;
    
    if (this.itemForm.invalid || this.images.length === 0) {
      return;
    }

    this.isSaving = true;
    
    const wallId = this.route.snapshot.paramMap.get('wallId')!;
    const presetId = this.route.snapshot.paramMap.get('presetId')!;
    
    const newItem: Partial<WallItem> = {
      wallId,
      objectTypeId: presetId,
      fieldData: this.itemForm.value,
      images: this.images,
      primaryImageIndex: this.primaryImageIndex,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.wallItemService.createWallItem(newItem as WallItem).subscribe({
      next: (createdItemId) => {
        console.log('Item created successfully:', createdItemId);
        this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', createdItemId]);
      },
      error: (error) => {
        console.error('Error creating item:', error);
        this.isSaving = false;
        // TODO: Show error message to user
      }
    });
  }
}