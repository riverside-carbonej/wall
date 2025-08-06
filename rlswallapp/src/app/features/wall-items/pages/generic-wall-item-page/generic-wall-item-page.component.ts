import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions } from '../../../../shared/components/material-stubs';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { MatExpansionPanel, MatExpansionPanelHeader, MatPanelTitle, MatAccordion, MatTabGroup, MatTab } from '../../../../shared/components/material-stubs';
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
import { FormStateService, FormState } from '../../../../shared/services/form-state.service';

@Component({
  selector: 'app-generic-wall-item-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions,
    ThemedButtonComponent,
    MaterialIconComponent,
    MatExpansionPanel, MatExpansionPanelHeader, MatPanelTitle, MatAccordion, MatTabGroup, MatTab,
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
  wall: Wall | null = null; // Store wall reference for related items
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
  hasImageChanges = signal(false); // Using signal for reactivity
  
  // Location management
  showLocationPicker = false;
  
  // Accordion state
  currentPanelIndex = 0;
  
  // Tab state
  selectedTabIndex = 0;
  
  // Related items (reverse entity lookups)
  relatedItems: { [objectTypeId: string]: WallItem[] } = {};
  loadingRelatedItems = false;
  
  // Form state management
  formState$!: Observable<FormState>;
  private initialFormData: any = {};
  
  // Computed page actions that will react to state changes
  pageActions = computed(() => this.computePageActions());
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private imageUploadService: ImageUploadService,
    private fb: FormBuilder,
    private formStateService: FormStateService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    this.initializeFromRoute();
    this.setupForm();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupImagePreviews();
    this.formStateService.unregisterForm('generic-wall-item-form');
  }

  private computePageActions(): PageAction[] {
    // Access reactive state to ensure change detection
    const hasChanges = this.hasImageChanges();
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
          disabled: !this.canSave(),
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
        this.wall = wall; // Store wall reference for related items
        this.objectType = wall.objectTypes.find(ot => ot.id === objectTypeId) || null;
        this.setupDynamicForm();
        // Load related items if this is an existing item
        if (!this.isNewItem) {
          this.loadRelatedItems();
        }
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
    
    // Set initial form data for change detection
    this.initialFormData = this.itemForm.value;
    
    // Register form with FormStateService
    this.formState$ = this.formStateService.registerForm('generic-wall-item-form', {
      form: this.itemForm,
      initialData: this.initialFormData
    });
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
      let value = this.wallItem.fieldData[field.id] || this.getDefaultValueForField(field);
      
      // Convert Date objects to ISO string for date fields
      if (field.type === 'date' && value instanceof Date) {
        value = value.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      formValues[field.id] = value;
    });
    
    this.itemForm.patchValue(formValues, { emitEvent: false });
  }
  
  private syncFormToItem() {
    if (!this.objectType) return;
    
    this.objectType.fields.forEach(field => {
      let formValue = this.itemForm.get(field.id)?.value;
      if (formValue !== undefined) {
        // Convert date strings to Date objects for date fields
        if (field.type === 'date' && formValue && typeof formValue === 'string') {
          formValue = new Date(formValue);
        }
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
  
  getItemDisplayName(item: WallItem): string {
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
      
      // Mark form as dirty when images are selected
      this.hasImageChanges.set(true);
      this.markFormAsDirty();
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
    // When "Add Images" is clicked in the gallery, trigger file input
    this.imageInput.nativeElement.click();
    // Note: markFormAsDirty will be called in onImageSelected when files are chosen
  }
  
  onImageEdited(event: WallItemImage, item: WallItem) {
    // Handle image editing - update the image in the wallItem
    if (!item.images) return;
    
    const imageIndex = item.images.findIndex(img => img.id === event.id);
    if (imageIndex >= 0) {
      item.images[imageIndex] = event;
    }
    this.hasImageChanges.set(true);
    this.markFormAsDirty();
  }
  
  onImageDeleted(event: WallItemImage, item: WallItem) {
    // Handle image deletion - remove the image from wallItem
    if (!item.images) return;
    
    item.images = item.images.filter(img => img.id !== event.id);
    this.hasImageChanges.set(true);
    this.markFormAsDirty();
  }
  
  onPrimaryImageChanged(event: WallItemImage, item: WallItem) {
    // Handle primary image change - update isPrimary flag
    if (!item.images) return;
    
    item.images.forEach(img => {
      img.isPrimary = img.id === event.id;
    });
    this.hasImageChanges.set(true);
    this.markFormAsDirty();
  }
  
  private markFormAsDirty() {
    // Mark the form as dirty even if no form fields changed
    if (this.itemForm) {
      this.itemForm.markAsDirty();
      // Force change detection to update the UI
      this.cdr.markForCheck();
      // Also trigger immediate change detection
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }
  
  async onSaveItem() {
    // Check if we can save
    if (!this.canSave()) {
      this.markFormGroupTouched(this.itemForm);
      this.showValidationSnackBar();
      return;
    }
    
    this.formStateService.setSavingState('generic-wall-item-form', true);
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
      
      // Success! 
      this.formStateService.setSavingState('generic-wall-item-form', false);
      this.hasImageChanges.set(false); // Reset image changes flag
      
      if (this.isNewItem) {
        // For create mode: navigate to the created item page
        this.editing = false; // Exit edit mode
        this.router.navigate(['/walls', this.wallId, 'items', savedItemId]);
      } else {
        // For edit mode: stay on the same page and update FormStateService with new initial data
        this.initialFormData = this.itemForm.value;
        this.formStateService.updateInitialData('generic-wall-item-form', this.initialFormData);
      }
      
    } catch (error) {
      console.error('Error saving item:', error);
      this.formStateService.setSavingState('generic-wall-item-form', false);
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
  
  canSave(): boolean {
    // Check if form state allows saving OR if there are image changes
    const formState = this.formStateService.getFormState('generic-wall-item-form');
    const formCanSave = formState?.canSave ?? false;
    return formCanSave || this.hasImageChanges();
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

  // Related items methods
  hasRelatedItems(): boolean {
    return this.getRelatedObjectTypes().length > 0;
  }

  getRelatedObjectTypes(): { objectType: WallObjectType; fieldName: string }[] {
    if (!this.wall) return [];
    
    const relatedTypes: { objectType: WallObjectType; fieldName: string }[] = [];
    
    // Find all object types that have entity fields pointing to this object type
    this.wall.objectTypes?.forEach((otherObjectType: WallObjectType) => {
      if (otherObjectType.id === this.objectType?.id) return; // Skip self
      
      otherObjectType.fields.forEach((field: FieldDefinition) => {
        if (field.type === 'entity' && 
            field.entityConfig?.targetObjectTypeId === this.objectType?.id) {
          relatedTypes.push({ 
            objectType: otherObjectType, 
            fieldName: field.name 
          });
        }
      });
    });
    
    return relatedTypes;
  }

  async loadRelatedItems() {
    if (!this.itemId || !this.wall) return;
    
    this.loadingRelatedItems = true;
    this.relatedItems = {};
    
    try {
      const relatedTypes = this.getRelatedObjectTypes();
      
      for (const { objectType, fieldName } of relatedTypes) {
        // Find all items of this object type that reference the current item
        const allItems = await firstValueFrom(
          this.wallItemService.getWallItems(this.wallId)
        );
        
        const relatedItemsForType = allItems.filter(item => {
          if (item.objectTypeId !== objectType.id) return false;
          
          // Check if this item's entity fields contain reference to current item
          const entityFields = objectType.fields.filter(f => f.type === 'entity');
          
          return entityFields.some(field => {
            const fieldValue = item.fieldData[field.id];
            if (Array.isArray(fieldValue)) {
              return fieldValue.includes(this.itemId);
            }
            return fieldValue === this.itemId;
          });
        });
        
        if (relatedItemsForType.length > 0) {
          this.relatedItems[objectType.id] = relatedItemsForType;
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
    this.router.navigate(['/walls', this.wallId, 'preset', item.objectTypeId, 'items', item.id]);
  }

  getItemSummary(item: WallItem): string {
    // Get first few non-empty field values for summary
    const fieldData = item.fieldData || {};
    const values = Object.values(fieldData)
      .filter(value => value && typeof value === 'string' && value.trim())
      .slice(0, 2) as string[];
    
    return values.join(' • ') || 'No additional details';
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