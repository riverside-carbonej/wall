import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { ImageUploadService, PendingImage } from '../../../../shared/services/image-upload.service';
import { Wall, WallObjectType, WallItem, WallItemImage } from '../../../../shared/models/wall.model';
import { PresetItemBasePageComponent, PageMode } from '../../components/preset-item-base-page/preset-item-base-page.component';

@Component({
  selector: 'app-preset-item-page',
  standalone: true,
  imports: [
    CommonModule,
    PresetItemBasePageComponent
  ],
  template: `
    <app-preset-item-base-page
      [wall]="currentWall"
      [preset]="currentPreset"
      [item]="currentItem"
      [itemForm]="itemForm"
      [mode]="currentMode"
      [isLoading]="isLoading"
      [isSaving]="isSaving"
      [attemptedSubmit]="attemptedSubmit"
      [images]="getAllImages()"
      [primaryImageIndex]="primaryImageIndex"
      (backClick)="goBack()"
      (addImage)="addImage()"
      (changeImage)="changeImage($event)"
      (removeImage)="removeImage($event)"
      (setPrimaryImage)="setPrimaryImage($event)"
      (save)="onSave()"
      (cancel)="onCancel()"
      (edit)="toggleEditMode()">
    </app-preset-item-base-page>
  `,
  styles: []
})
export class PresetItemPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  preset$!: Observable<WallObjectType | null>;
  item$!: Observable<WallItem | null>;
  
  // Properties for base page component
  currentWall: Wall | null = null;
  currentPreset: WallObjectType | null = null;
  currentItem: WallItem | null = null;
  currentMode: PageMode = 'view';
  itemForm!: FormGroup;
  isLoading = true;
  isSaving = false;
  attemptedSubmit = false;

  // Image gallery state
  images: WallItemImage[] = [];
  pendingImages: PendingImage[] = [];
  primaryImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private imageUploadService: ImageUploadService
  ) {}

  ngOnInit() {
    // Determine mode based on route
    this.currentMode = this.router.url.includes('/edit') ? 'edit' : 'view';

    // Get route parameters
    const routeParams$ = this.route.paramMap.pipe(
      map(params => ({
        wallId: params.get('wallId')!,
        presetId: params.get('presetId')!,
        itemId: params.get('itemId')!
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

    // Load item data
    this.item$ = routeParams$.pipe(
      switchMap(({ itemId }) => this.wallItemService.getWallItemById(itemId)),
      filter(item => item !== null),
      takeUntil(this.destroy$)
    ) as Observable<WallItem>;

    // Subscribe to all data streams
    combineLatest([this.wall$, this.preset$, this.item$]).subscribe(([wall, preset, item]) => {
      this.currentWall = wall;
      this.currentPreset = preset;
      this.currentItem = item;

      if (wall && preset && item) {
        this.initializeForm(preset, item);
        this.initializeImages(item);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(preset: WallObjectType, item: WallItem) {
    const formControls: any = {};
    
    preset.fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      const value = item.fieldData[field.id] || '';
      formControls[field.id] = [value, validators];
    });

    this.itemForm = this.fb.group(formControls);

    // If in view mode, disable the form
    if (this.currentMode === 'view') {
      this.itemForm.disable();
    }
  }

  private initializeImages(item: WallItem) {
    this.images = item.images || [];
    this.primaryImageIndex = item.primaryImageIndex || 0;
  }

  goBack() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items']);
  }

  // Toggle between view and edit modes
  toggleEditMode() {
    if (this.currentMode === 'view') {
      this.currentMode = 'edit';
      this.itemForm.enable();
    } else {
      this.currentMode = 'view';
      this.itemForm.disable();
      // Reset form to original values
      if (this.currentItem && this.currentPreset) {
        this.initializeForm(this.currentPreset, this.currentItem);
      }
    }
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
      this.images = this.images.filter((_, i) => i !== index);
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
    if (this.currentMode === 'edit') {
      this.toggleEditMode(); // Go back to view mode
    } else {
      this.goBack();
    }
  }

  async onSave() {
    this.attemptedSubmit = true;
    
    if (this.itemForm.invalid) {
      return;
    }

    this.isSaving = true;
    
    try {
      const wallId = this.route.snapshot.paramMap.get('wallId')!;
      const presetId = this.route.snapshot.paramMap.get('presetId')!;
      const itemId = this.route.snapshot.paramMap.get('itemId')!;
      
      // Upload pending images if any
      let allImages = [...this.images];
      if (this.pendingImages.length > 0) {
        const uploadedImages = await this.imageUploadService.uploadImages(
          this.pendingImages, 
          wallId, 
          presetId, 
          itemId
        ).toPromise();
        
        if (!uploadedImages) {
          throw new Error('Failed to upload images');
        }
        
        // Combine existing and newly uploaded images
        allImages = [...this.images, ...uploadedImages];
        
        // Clean up pending images
        this.pendingImages.forEach(pending => {
          this.imageUploadService.revokePreviewUrl(pending.preview);
        });
        this.pendingImages = [];
      }
      
      const updatedItem: Partial<WallItem> = {
        fieldData: this.itemForm.value,
        images: allImages,
        primaryImageIndex: this.primaryImageIndex,
        updatedAt: new Date()
      };

      await this.wallItemService.updateWallItem(itemId, updatedItem).toPromise();
      
      console.log('Item updated successfully');
      this.isSaving = false;
      this.attemptedSubmit = false;
      
      // Update local images array
      this.images = allImages;
      
      // Refresh the item data
      this.item$ = this.wallItemService.getWallItemById(itemId).pipe(
        filter(item => item !== null),
        takeUntil(this.destroy$)
      ) as Observable<WallItem>;
      
      this.item$.subscribe(item => {
        this.currentItem = item;
        if (this.currentPreset) {
          this.initializeForm(this.currentPreset, item!);
          this.initializeImages(item!);
        }
      });
      
      // Switch back to view mode
      this.currentMode = 'view';
      this.itemForm.disable();
      
    } catch (error) {
      console.error('Error updating item:', error);
      this.isSaving = false;
      // TODO: Show error message to user
    }
  }
}