import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { ImageUploadService, PendingImage } from '../../../../shared/services/image-upload.service';
import { Wall, WallObjectType, WallItem, WallItemImage } from '../../../../shared/models/wall.model';
import { PresetItemBasePageComponent } from '../../components/preset-item-base-page/preset-item-base-page.component';
import { FormStateService, FormState } from '../../../../shared/services/form-state.service';

@Component({
  selector: 'app-preset-item-add',
  standalone: true,
  imports: [
    CommonModule,
    PresetItemBasePageComponent
  ],
  template: `
    <app-preset-item-base-page
      [wall]="currentWall"
      [preset]="currentPreset"
      [itemForm]="itemForm"
      [mode]="'create'"
      [isLoading]="isLoading"
      [isSaving]="isSaving"
      [attemptedSubmit]="attemptedSubmit"
      [images]="getAllImages()"
      [primaryImageIndex]="primaryImageIndex"
      [canSave]="(formState$ | async)?.canSave ?? false"
      (backClick)="goBack()"
      (addImage)="addImage()"
      (changeImage)="changeImage($event)"
      (removeImage)="removeImage($event)"
      (setPrimaryImage)="setPrimaryImage($event)"
      (save)="onSave()"
      (cancel)="onCancel()">
    </app-preset-item-base-page>
  `,
  styles: []
})
export class PresetItemAddComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  preset$!: Observable<WallObjectType | null>;
  
  // Properties for base page component
  currentWall: Wall | null = null;
  currentPreset: WallObjectType | null = null;
  itemForm!: FormGroup;
  isLoading = true;
  isSaving = false;
  attemptedSubmit = false;

  // Image gallery state
  images: WallItemImage[] = [];
  pendingImages: PendingImage[] = [];
  primaryImageIndex = 0;

  // Form state management
  formState$!: Observable<FormState>;
  private initialFormData: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private imageUploadService: ImageUploadService,
    private formStateService: FormStateService,
    private cdr: ChangeDetectorRef
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

    // Subscribe to wall and preset data for the base page component
    this.wall$.subscribe(wall => {
      this.currentWall = wall;
    });

    this.preset$.subscribe(preset => {
      this.currentPreset = preset;
      if (preset) {
        this.initializeForm(preset);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.formStateService.unregisterForm('preset-item-add-form');
  }

  private initializeForm(preset: WallObjectType) {
    const formControls: any = {};
    
    preset.fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      formControls[field.id] = ['', validators];
    });

    this.itemForm = this.fb.group(formControls);
    
    // Set initial form data (empty for create mode)
    this.initialFormData = this.itemForm.value;
    
    // Register form with FormStateService
    this.formState$ = this.formStateService.registerForm('preset-item-add-form', {
      form: this.itemForm,
      initialData: this.initialFormData
    });
  }

  goBack() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items']);
  }


  // Helper method to combine uploaded and pending images for display
  getAllImages(): WallItemImage[] {
    const pendingAsImages: WallItemImage[] = this.pendingImages.map(pending => ({
      id: pending.id,
      url: pending.preview,
      fileName: pending.file.name,
      size: pending.file.size,
      mimeType: pending.file.type,
      altText: pending.altText || '',
      uploadedAt: new Date(),
      isPending: true // Custom flag for UI
    } as any));

    return [...this.images, ...pendingAsImages];
  }

  // Image Gallery Methods
  async addImage() {
    try {
      const files = await this.imageUploadService.openFilePicker();
      if (!files || files.length === 0) return;

      const processed = this.imageUploadService.processSelectedFiles(files);
      
      if (processed.errors.length > 0) {
        // TODO: Show error messages to user
        console.error('File validation errors:', processed.errors);
        return;
      }

      // Add to pending images
      this.pendingImages.push(...processed.valid);
      
      // Set as primary if it's the first image
      const allImages = this.getAllImages();
      if (allImages.length === processed.valid.length) {
        this.primaryImageIndex = 0;
      }
    } catch (error) {
      console.error('Error selecting files:', error);
    }
  }

  async changeImage(index: number) {
    try {
      const files = await this.imageUploadService.openFilePicker(false); // Single file
      if (!files || files.length === 0) return;

      const processed = this.imageUploadService.processSelectedFiles(files);
      
      if (processed.errors.length > 0) {
        console.error('File validation errors:', processed.errors);
        return;
      }

      if (processed.valid.length === 0) return;

      const allImages = this.getAllImages();
      const newImage = processed.valid[0];

      // Clean up old preview if it was a pending image
      if (index >= this.images.length) {
        const pendingIndex = index - this.images.length;
        if (pendingIndex >= 0 && pendingIndex < this.pendingImages.length) {
          this.imageUploadService.revokePreviewUrl(this.pendingImages[pendingIndex].preview);
          this.pendingImages[pendingIndex] = newImage;
        }
      } else {
        // Replace uploaded image with pending one (will be handled on save)
        // For now, add as new pending and mark old for removal
        this.pendingImages.push(newImage);
        // TODO: Mark the old image for deletion
      }
    } catch (error) {
      console.error('Error changing image:', error);
    }
  }

  removeImage(index: number) {
    const allImages = this.getAllImages();
    
    if (index >= this.images.length) {
      // Removing a pending image
      const pendingIndex = index - this.images.length;
      if (pendingIndex >= 0 && pendingIndex < this.pendingImages.length) {
        // Clean up preview URL
        this.imageUploadService.revokePreviewUrl(this.pendingImages[pendingIndex].preview);
        this.pendingImages.splice(pendingIndex, 1);
      }
    } else {
      // Removing an uploaded image
      this.images.splice(index, 1);
    }
    
    // Adjust primary image index if needed
    const newAllImages = this.getAllImages();
    if (this.primaryImageIndex >= newAllImages.length) {
      this.primaryImageIndex = Math.max(0, newAllImages.length - 1);
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

  async onSave() {
    this.attemptedSubmit = true;
    
    const formState = this.formStateService.getFormState('preset-item-add-form');
    if (!formState?.canSave) {
      return;
    }

    this.formStateService.setSavingState('preset-item-add-form', true);
    this.isSaving = true;
    
    try {
      const wallId = this.route.snapshot.paramMap.get('wallId')!;
      const presetId = this.route.snapshot.paramMap.get('presetId')!;
      
      // First create the item to get an ID
      const newItem: Partial<WallItem> = {
        wallId,
        objectTypeId: presetId,
        fieldData: this.itemForm.value,
        images: this.images, // Start with existing images
        primaryImageIndex: this.primaryImageIndex,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create the item first
      const createdItemId = await this.wallItemService.createWallItem(newItem as WallItem).toPromise();
      if (!createdItemId) {
        throw new Error('Failed to create item');
      }
      
      // Upload pending images if any
      if (this.pendingImages.length > 0) {
        const uploadedImages = await this.imageUploadService.uploadImages(
          this.pendingImages, 
          wallId, 
          presetId, 
          createdItemId
        ).toPromise();
        
        if (!uploadedImages) {
          throw new Error('Failed to upload images');
        }
        
        // Combine existing and newly uploaded images
        const allImages = [...this.images, ...uploadedImages];
        
        // Update the item with all images
        const updatedItem: Partial<WallItem> = {
          images: allImages,
          primaryImageIndex: this.primaryImageIndex,
          updatedAt: new Date()
        };
        
        await this.wallItemService.updateWallItem(createdItemId, updatedItem).toPromise();
        
        // Clean up pending images
        this.pendingImages.forEach(pending => {
          this.imageUploadService.revokePreviewUrl(pending.preview);
        });
        this.pendingImages = [];
      }

      console.log('Item created successfully:', createdItemId);
      this.formStateService.setSavingState('preset-item-add-form', false);
      this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', createdItemId]);
      
    } catch (error) {
      console.error('Error creating item:', error);
      this.formStateService.setSavingState('preset-item-add-form', false);
      this.isSaving = false;
      // TODO: Show error message to user
    }
  }
}