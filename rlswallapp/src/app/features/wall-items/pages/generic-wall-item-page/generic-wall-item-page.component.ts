import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions } from '../../../../shared/components/material-stubs';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { MatExpansionPanel, MatExpansionPanelHeader, MatPanelTitle, MatAccordion } from '../../../../shared/components/material-stubs';
import { MatFormField, MatLabel, MatError } from '../../../../shared/components/material-stubs';
import { ProgressSpinnerComponent } from '../../../../shared/components/progress-spinner/progress-spinner.component';
// Dialog functionality simplified to use native confirmations
// Note: Using dialog instead of snackbar for now due to import issues
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { ItemImageGalleryComponent } from '../../components/item-image-gallery/item-image-gallery.component';
import { DynamicFieldRendererComponent } from '../../components/dynamic-field-renderer/dynamic-field-renderer.component';
import { DeleteButtonComponent } from '../../components/delete-button/delete-button.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';

import { Wall, WallItem, WallObjectType, FieldDefinition, WallItemImage } from '../../../../shared/models/wall.model';
import { ErrorDialogComponent } from '../../../../shared/components/error-dialog/error-dialog.component';

@Component({
  selector: 'app-generic-wall-item-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions,
    ThemedButtonComponent,
    MaterialIconComponent,
    MatExpansionPanel, MatExpansionPanelHeader, MatPanelTitle, MatAccordion,
    MatFormField, MatLabel, MatError,
    ProgressSpinnerComponent,
    ItemImageGalleryComponent,
    DynamicFieldRendererComponent,
    DeleteButtonComponent,
    LoadingStateComponent,
    PageLayoutComponent
  ],
  templateUrl: './generic-wall-item-page.component.html',
  styleUrls: ['./generic-wall-item-page.component.css']
})
export class GenericWallItemPageComponent implements OnInit, OnDestroy {
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  @Input() editing = false;
  @Input() title = '';
  @Input() isNewItem = false;

  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  wallItem: WallItem = this.createNewWallItem();
  objectType: WallObjectType | null = null;
  
  itemForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  
  wallId!: string;
  itemId?: string;
  objectTypeId?: string;
  
  // Image management
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  
  // Location management
  showLocationPicker = false;
  
  // Accordion state
  currentPanelIndex = 0;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private imageUploadService: ImageUploadService,
    private fb: FormBuilder
  ) {}
  
  ngOnInit() {
    this.initializeFromRoute();
    this.setupForm();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupImagePreviews();
  }

  getPageActions(): PageAction[] {
    const actions: PageAction[] = [];
    
    if (this.canEdit()) {
      if (!this.editing && !this.isNewItem) {
        actions.push({
          label: 'Edit',
          icon: 'edit',
          variant: 'raised',
          color: 'primary',
          action: () => this.onToggleEditMode()
        });
      }
      
      if (this.editing) {
        actions.push({
          label: this.isNewItem ? 'Add Item' : 'Save Changes',
          icon: this.isSaving ? 'hourglass_empty' : 'save',
          variant: 'raised',
          color: 'primary',
          disabled: this.isSaving || this.itemForm?.invalid,
          action: () => this.onSaveItem()
        });
      }
      
      if (this.canDelete() && !this.editing) {
        actions.push({
          label: 'Delete',
          icon: 'delete',
          variant: 'stroked',
          color: 'warn',
          action: () => this.onDeleteItem()
        });
      }
    }
    
    return actions;
  }

  onBackClick(): void {
    this.router.navigate(['/walls', this.wallId]);
  }
  
  private initializeFromRoute() {
    this.wallId = this.route.snapshot.paramMap.get('wallId')!;
    this.itemId = this.route.snapshot.paramMap.get('itemId') || undefined;
    // Get objectType from query params for new items, or from route params for existing items
    this.objectTypeId = this.route.snapshot.queryParamMap.get('objectType') || 
                      this.route.snapshot.paramMap.get('objectTypeId') || 
                      undefined;
    
    if (!this.wallId) {
      this.router.navigate(['/walls']);
      return;
    }
    
    // Load wall data and item data
    this.wall$ = this.wallService.getWallById(this.wallId);
    
    if (this.itemId) {
      // Existing item - load it
      this.isNewItem = false;
      this.loadExistingItem();
    } else if (this.objectTypeId) {
      // New item with specific object type
      this.isNewItem = true;
      this.editing = true; // Start in edit mode for new items
      this.loadObjectTypeForNewItem();
    } else {
      // New item - need to select object type
      this.redirectToObjectTypeSelection();
    }
  }
  
  private loadExistingItem() {
    this.isLoading = true;
    
    this.wallItemService.getWallItemById(this.itemId!).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (item) => {
        if (item) {
          this.wallItem = item;
          this.loadObjectType(item.objectTypeId);
          this.title = this.getItemDisplayName(item);
        } else {
          this.router.navigate(['/walls', this.wallId]);
        }
        this.isLoading = false;
      },
      error: () => {
        this.router.navigate(['/walls', this.wallId]);
        this.isLoading = false;
      }
    });
  }
  
  private loadObjectTypeForNewItem() {
    this.wall$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(wall => {
      if (wall) {
        this.objectType = wall.objectTypes.find(ot => ot.id === this.objectTypeId) || null;
        if (this.objectType) {
          this.wallItem.objectTypeId = this.objectTypeId!;
          this.setupDynamicForm();
        } else {
          this.redirectToObjectTypeSelection();
        }
      }
    });
  }
  
  private loadObjectType(objectTypeId: string) {
    this.wall$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(wall => {
      if (wall) {
        this.objectType = wall.objectTypes.find(ot => ot.id === objectTypeId) || null;
        this.setupDynamicForm();
      }
    });
  }
  
  private redirectToObjectTypeSelection() {
    // Redirect to object type selection page
    this.router.navigate(['/walls', this.wallId, 'items', 'select-type']);
  }
  
  private setupForm() {
    this.itemForm = this.fb.group({
      // Basic form will be extended dynamically
    });
  }
  
  private setupDynamicForm() {
    if (!this.objectType) return;
    
    const formControls: { [key: string]: any } = {};
    
    // Create form controls for each field definition
    this.objectType.fields.forEach(field => {
      const validators = this.getValidatorsForField(field);
      const currentValue = this.wallItem.fieldData[field.id] || this.getDefaultValueForField(field);
      
      formControls[field.id] = [currentValue, validators];
    });
    
    this.itemForm = this.fb.group(formControls);
    
    // Sync existing data to form
    this.syncItemToForm();
  }
  
  private getValidatorsForField(field: FieldDefinition): any[] {
    const validators = [];
    
    if (field.required) {
      validators.push(Validators.required);
    }
    
    if (field.validation) {
      if (field.validation.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }
      if (field.validation.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }
      if (field.validation.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }
    }
    
    return validators;
  }
  
  private getDefaultValueForField(field: FieldDefinition): any {
    switch (field.type) {
      case 'text':
      case 'longtext':
      case 'email':
      case 'url':
      case 'richtext':
        return '';
      case 'number':
        return null;
      case 'date':
        return null;
      case 'boolean':
        return false;
      case 'multiselect':
        return [];
      case 'location':
        return null;
      case 'color':
        return '#000000';
      default:
        return null;
    }
  }
  
  private syncItemToForm() {
    if (!this.objectType) return;
    
    const formValues: { [key: string]: any } = {};
    
    this.objectType.fields.forEach(field => {
      formValues[field.id] = this.wallItem.fieldData[field.id] || this.getDefaultValueForField(field);
    });
    
    this.itemForm.patchValue(formValues, { emitEvent: false });
  }
  
  private syncFormToItem() {
    if (!this.objectType) return;
    
    this.objectType.fields.forEach(field => {
      const formValue = this.itemForm.get(field.id)?.value;
      if (formValue !== undefined) {
        this.wallItem.fieldData[field.id] = formValue;
      }
    });
  }
  
  private createNewWallItem(): WallItem {
    return {
      id: '',
      wallId: '',
      objectTypeId: '',
      fieldData: {},
      images: [],
      coordinates: undefined,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: '',
      updatedBy: ''
    };
  }
  
  private getItemDisplayName(item: WallItem): string {
    if (!this.objectType) return 'Item';
    
    // Try to get display name from primary field
    const primaryField = this.objectType.displaySettings?.primaryField;
    if (primaryField && item.fieldData[primaryField]) {
      return item.fieldData[primaryField];
    }
    
    // Fall back to first text field
    for (const field of this.objectType.fields) {
      if ((field.type === 'text' || field.type === 'longtext') && item.fieldData[field.id]) {
        return item.fieldData[field.id];
      }
    }
    
    return this.objectType.name;
  }
  
  // Event handlers
  onToggleEditMode() {
    this.editing = !this.editing;
  }
  
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.selectedImages.push(...files);
      
      // Create preview URLs
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        this.imagePreviewUrls.push(url);
      });
    }
  }
  
  onLocationSelected(result: any) {
    // This method is now handled by the dynamic field renderer
    // but keeping for backward compatibility
    this.wallItem.coordinates = result.coordinates;
    const locationField = this.objectType?.fields.find(f => f.type === 'location');
    if (locationField) {
      this.itemForm.get(locationField.id)?.setValue(result.coordinates);
    }
  }
  
  onImageAdded(item: WallItem) {
    this.imageInput.nativeElement.click();
  }
  
  onImageEdited(event: any, item: WallItem) {
    // Handle image editing
  }
  
  onImageDeleted(event: any, item: WallItem) {
    // Handle image deletion
  }
  
  onPrimaryImageChanged(event: any, item: WallItem) {
    // Handle primary image change
  }
  
  async onSaveItem() {
    // Validate form first
    if (this.itemForm.invalid) {
      this.markFormGroupTouched(this.itemForm);
      this.showValidationSnackBar();
      return;
    }
    
    this.isSaving = true;
    
    try {
      // Sync form data to item
      this.syncFormToItem();
      
      // Set metadata
      this.wallItem.wallId = this.wallId;
      this.wallItem.updatedAt = new Date();
      
      let savedItemId: string;
      
      if (this.isNewItem) {
        // Creating new item
        this.wallItem.createdAt = new Date();
        const { id, ...itemWithoutId } = this.wallItem;
        savedItemId = await firstValueFrom(this.wallItemService.createWallItem(itemWithoutId));
        this.wallItem.id = savedItemId;
      } else {
        // Updating existing item
        await firstValueFrom(this.wallItemService.updateWallItem(this.wallItem.id, this.wallItem));
        savedItemId = this.wallItem.id;
      }
      
      // Upload images if any (after successful save)
      if (this.selectedImages.length > 0) {
        await this.uploadImages(savedItemId);
      }
      
      // Success! Navigate to the saved item (veteran app pattern)
      this.editing = false; // Exit edit mode
      this.router.navigate(['/walls', this.wallId, 'items', savedItemId]);
      
      // Success - no need for notification since we're navigating away
      
    } catch (error) {
      console.error('Error saving item:', error);
      this.handleSaveError(error);
    } finally {
      this.isSaving = false;
    }
  }
  
  private async uploadImages(itemId: string) {
    const uploadPromises = this.selectedImages.map(file => 
      firstValueFrom(this.imageUploadService.uploadImage(file, this.wallId, itemId))
    );
    
    await Promise.all(uploadPromises);
  }
  
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
  
  private showValidationSnackBar() {
    // Simple alert for validation errors
    alert('Please check all required fields and correct any errors before saving.');
  }

  private handleSaveError(error: any) {
    const errorMessage = this.getErrorMessage(error);
    const errorDetails = this.getErrorDetails(error);
    
    // Show error using native alert
    alert(`${this.isNewItem ? 'Failed to Create Item' : 'Failed to Save Changes'}\n\n${errorMessage}\n\nDetails: ${errorDetails}`);
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return this.isNewItem 
      ? 'An unexpected error occurred while creating the item. Please try again.'
      : 'An unexpected error occurred while saving changes. Please try again.';
  }

  private getErrorDetails(error: any): string {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return error?.toString() || 'No additional details available';
    }
  }
  
  private cleanupImagePreviews() {
    this.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    this.imagePreviewUrls = [];
  }
  
  // Utility methods for template
  hasLocationField(): boolean {
    return this.objectType?.fields.some(f => f.type === 'location') ?? false;
  }
  
  getLocationField(): FieldDefinition | undefined {
    return this.objectType?.fields.find(f => f.type === 'location');
  }
  
  canEdit(): boolean {
    // TODO: Implement permission checking
    return true;
  }
  
  canDelete(): boolean {
    // TODO: Implement permission checking
    return !this.isNewItem;
  }
  
  async onDeleteItem() {
    if (!this.itemId) return;
    
    try {
      await firstValueFrom(this.wallItemService.deleteWallItem(this.itemId));
      
      // Success! Navigate back to wall view
      this.router.navigate(['/walls', this.wallId]);
      
    } catch (error) {
      console.error('Error deleting item:', error);
      this.handleDeleteError(error);
    }
  }

  private handleDeleteError(error: any) {
    const errorMessage = this.getErrorMessage(error);
    const errorDetails = this.getErrorDetails(error);
    
    // Show error using native alert
    alert(`Failed to Delete Item\n\n${errorMessage}\n\nDetails: ${errorDetails}`);
  }
  
  // Template helper methods
  getBasicFields(): FieldDefinition[] {
    if (!this.objectType) return [];
    
    return this.objectType.fields.filter(field => 
      field.type === 'text' || 
      field.type === 'longtext' || 
      field.type === 'email' || 
      field.type === 'url' ||
      field.type === 'number' ||
      field.type === 'date'
    );
  }

  getLocationFields(): FieldDefinition[] {
    if (!this.objectType) return [];
    
    return this.objectType.fields.filter(field => field.type === 'location');
  }
  
  // Helper method to safely get form control as FormControl
  getFormControl(fieldId: string) {
    return this.itemForm.get(fieldId) as any;
  }
  
  getCustomFields(): FieldDefinition[] {
    if (!this.objectType) return [];
    
    return this.objectType.fields.filter(field => 
      field.type !== 'text' && 
      field.type !== 'longtext' && 
      field.type !== 'email' && 
      field.type !== 'url' &&
      field.type !== 'number' &&
      field.type !== 'date' &&
      field.type !== 'location'
    );
  }

  // Navigation methods (onBackClick already defined above)

  onCancelEdit() {
    if (this.isNewItem) {
      // For new items, go back to wall
      this.onBackClick();
    } else {
      // For existing items, exit edit mode
      this.editing = false;
      // Reset form to original values
      this.setupForm();
    }
  }

  onItemDeleted() {
    // Navigate back to wall after successful deletion
    this.router.navigate(['/walls', this.wallId]);
  }
}