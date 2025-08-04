import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
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
      [images]="images"
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
  primaryImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private wallService: WallService,
    private wallItemService: WallItemService
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
    
    this.images = [...this.images, newImage];
    
    // Set as primary if it's the first image
    if (this.images.length === 1) {
      this.primaryImageIndex = 0;
    }
  }

  changeImage(index: number) {
    // TODO: Implement file upload functionality to replace existing image
    // For now, replace with a new placeholder image
    const replacementImage: WallItemImage = {
      id: 'replacement_' + Date.now(),
      url: 'https://via.placeholder.com/400x300?text=Changed+Image',
      fileName: 'changed.jpg',
      size: 0,
      mimeType: 'image/jpeg',
      altText: '',
      uploadedAt: new Date()
    };
    
    if (index >= 0 && index < this.images.length) {
      this.images = [...this.images];
      this.images[index] = replacementImage;
    }
  }

  removeImage(index: number) {
    this.images = this.images.filter((_, i) => i !== index);
    
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
    if (this.currentMode === 'edit') {
      this.toggleEditMode(); // Go back to view mode
    } else {
      this.goBack();
    }
  }

  onSave() {
    this.attemptedSubmit = true;
    
    if (this.itemForm.invalid || this.images.length === 0) {
      return;
    }

    this.isSaving = true;
    
    const wallId = this.route.snapshot.paramMap.get('wallId')!;
    const itemId = this.route.snapshot.paramMap.get('itemId')!;
    
    const updatedItem: Partial<WallItem> = {
      fieldData: this.itemForm.value,
      images: this.images,
      primaryImageIndex: this.primaryImageIndex,
      updatedAt: new Date()
    };

    this.wallItemService.updateWallItem(itemId, updatedItem).subscribe({
      next: () => {
        console.log('Item updated successfully');
        this.isSaving = false;
        this.attemptedSubmit = false;
        
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
      },
      error: (error) => {
        console.error('Error updating item:', error);
        this.isSaving = false;
        // TODO: Show error message to user
      }
    });
  }
}