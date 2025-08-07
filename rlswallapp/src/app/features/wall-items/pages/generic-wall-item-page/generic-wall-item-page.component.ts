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
import { AuthService } from '../../../../core/services/auth.service';
import { WallPermissionsService } from '../../../../core/services/wall-permissions.service';
import { ItemImageGalleryComponent } from '../../components/item-image-gallery/item-image-gallery.component';
import { DynamicFieldRendererComponent } from '../../components/dynamic-field-renderer/dynamic-field-renderer.component';
import { EntityAssociationManagerComponent } from '../../components/entity-association-manager/entity-association-manager.component';
import { DeleteButtonComponent } from '../../components/delete-button/delete-button.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageAction } from '../../../../shared/components/page-layout/page-layout.component';

import { Wall, WallItem, WallObjectType, FieldDefinition, WallItemImage } from '../../../../shared/models/wall.model';
import { ErrorDialogComponent } from '../../../../shared/components/error-dialog/error-dialog.component';
import { FormStateService, FormState } from '../../../../shared/services/form-state.service';
import { NlpService } from '../../../../shared/services/nlp.service';
import { WallItemsGridComponent } from '../../components/wall-items-grid/wall-items-grid.component';

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
    EntityAssociationManagerComponent,
    DeleteButtonComponent,
    LoadingStateComponent,
    WallItemsGridComponent
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
  private wallSubscription$ = new Subject<void>();
  
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
  
  // Stable arrays for template to prevent change detection issues
  entityFieldsArray: FieldDefinition[] = [];
  relatedObjectTypesArray: { objectType: WallObjectType; fieldName: string }[] = [];
  
  // Form state management
  formState$!: Observable<FormState>;
  private initialFormData: any = {};
  
  // Computed page actions that will react to state changes
  pageActions = computed(() => this.computePageActions());
  
  // Wall permissions signal - initialize to false for security
  canEditWall = signal(false);
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private imageUploadService: ImageUploadService,
    private authService: AuthService,
    private wallPermissionsService: WallPermissionsService,
    private fb: FormBuilder,
    private formStateService: FormStateService,
    private cdr: ChangeDetectorRef,
    private nlpService: NlpService
  ) {}
  
  ngOnInit() {
    console.log('🚀 GenericWallItemPage initialized');
    this.initializeFromRoute();
    this.setupForm();
  }
  
  ngOnDestroy() {
    this.wallSubscription$.next();
    this.wallSubscription$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupImagePreviews();
    this.formStateService.unregisterForm('generic-wall-item-form');
    // Clear arrays
    this.entityFieldsArray = [];
    this.relatedObjectTypesArray = [];
  }

  private computePageActions(): PageAction[] {
    // Access reactive state to ensure change detection
    const hasChanges = this.hasImageChanges();
    const actions: PageAction[] = [];
    
    // CRITICAL: Only show actions if wall is loaded to prevent premature display
    if (!this.wall) {
      return actions;
    }
    
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
    
    // Load wall data and item data - use public method if not authenticated
    const currentUser = this.authService.currentUser;
    this.wall$ = currentUser 
      ? this.wallService.getWallById(this.wallId)
      : this.wallService.getWallByIdPublic(this.wallId);
    
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
    console.log('🔄 loadExistingItem called', {
      timestamp: new Date().toISOString(),
      itemId: this.itemId,
      stackTrace: new Error().stack
    });
    
    this.isLoading = true;
    
    // Clear caches and arrays when loading item
    this._entityFieldsCache = null;
    this._entityFieldsCacheKey = null;
    this._relatedObjectTypesCache = null;
    this._relatedObjectTypesCacheKey = null;
    this.entityFieldsArray = [];
    this.relatedObjectTypesArray = [];
    
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
    console.log('📦 loadObjectType called', {
      timestamp: new Date().toISOString(),
      objectTypeId,
      currentObjectType: this.objectType?.id,
      stackTrace: new Error().stack
    });
    
    // Clear entity fields cache when loading new object type
    this._entityFieldsCache = null;
    this._entityFieldsCacheKey = null;
    
    // Cancel any previous wall subscription to prevent duplicates
    this.wallSubscription$.next();
    
    this.wall$.pipe(
      takeUntil(this.wallSubscription$),
      takeUntil(this.destroy$)
    ).subscribe(wall => {
      if (wall) {
        this.wall = wall; // Store wall reference for related items
        
        // Check wall edit permissions
        this.wallPermissionsService.canEditWall(wall).pipe(
          takeUntil(this.destroy$)
        ).subscribe(canEdit => {
          this.canEditWall.set(canEdit);
        });
        
        // Ensure we get a fresh object type reference to avoid stale data
        const newObjectType = wall.objectTypes.find(ot => ot.id === objectTypeId) || null;
        
        // CRITICAL LOGGING: Check if fields are already duplicated in the source data
        if (newObjectType) {
          const fieldIds = newObjectType.fields.map(f => f.id);
          const fieldNames = newObjectType.fields.map(f => f.name);
          const duplicateIds = fieldIds.filter((id, idx) => fieldIds.indexOf(id) !== idx);
          const duplicateNames = fieldNames.filter((name, idx) => fieldNames.indexOf(name) !== idx);
          
          console.log('🚨 FIELD ANALYSIS IN loadObjectType:', {
            timestamp: new Date().toISOString(),
            objectTypeId: newObjectType.id,
            totalFields: newObjectType.fields.length,
            uniqueFieldIds: new Set(fieldIds).size,
            uniqueFieldNames: new Set(fieldNames).size,
            duplicateIds: duplicateIds.length > 0 ? duplicateIds : 'none',
            duplicateNames: duplicateNames.length > 0 ? duplicateNames : 'none',
            allFields: newObjectType.fields.map((f, idx) => ({
              index: idx,
              id: f.id,
              name: f.name,
              type: f.type
            }))
          });
          
          // If we find duplicates, trace where they came from
          if (duplicateNames.length > 0) {
            console.error('❌ DUPLICATES FOUND IN SOURCE DATA!', {
              wall: wall,
              objectTypes: wall.objectTypes,
              problematicObjectType: newObjectType
            });
          }
        }
        
        // Log if objectType is changing
        if (this.objectType !== newObjectType) {
          console.log('🔄 ObjectType changing:', {
            from: this.objectType?.id,
            to: newObjectType?.id,
            oldFieldCount: this.objectType?.fields?.length,
            newFieldCount: newObjectType?.fields?.length
          });
        }
        
        this.objectType = newObjectType;
        
        // Update stable arrays for template ONLY when objectType changes
        if (this.objectType) {
          // Update entity fields array
          this.entityFieldsArray = this.objectType.fields.filter(field => field.type === 'entity');
          console.log('📋 Updated entityFieldsArray:', this.entityFieldsArray.map(f => f.name));
          
          // Update related object types array
          this.updateRelatedObjectTypesArray();
          
          console.log('🎯 Loaded ObjectType:', {
            name: this.objectType.name,
            id: this.objectType.id,
            totalFields: this.objectType.fields.length,
            entityFieldsCount: this.entityFieldsArray.length,
            fieldTypes: this.objectType.fields.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type,
              entityConfig: f.entityConfig
            }))
          });
        } else {
          this.entityFieldsArray = [];
          this.relatedObjectTypesArray = [];
        }
        
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
    
    console.log('🔧 Setting up dynamic form for', this.objectType.name);
    console.log('📊 Current wallItem fieldData:', this.wallItem.fieldData);
    
    // Unregister existing form state if it exists
    this.formStateService.unregisterForm('generic-wall-item-form');
    
    const formControls: { [key: string]: any } = {};
    
    // Create form controls for each field definition
    this.objectType.fields.forEach(field => {
      const validators = this.getValidatorsForField(field);
      const currentValue = this.wallItem.fieldData[field.id] || this.getDefaultValueForField(field);
      
      if (field.type === 'entity') {
        console.log(`🔗 Entity field "${field.name}" (${field.id}): value =`, currentValue);
      }
      
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
    console.log('🔄 Toggling edit mode from', this.editing, 'to', !this.editing);
    
    if (!this.editing) {
      // Entering edit mode - reinitialize form to ensure all fields are properly set up
      console.log('📝 Entering edit mode, reinitializing form');
      this.editing = true;
      
      // Reinitialize the form with current values
      if (this.objectType && this.wallItem) {
        this.setupDynamicForm();
        // Force change detection to ensure dynamic field renderers update
        this.cdr.detectChanges();
      }
    } else {
      // Exiting edit mode
      console.log('👁️ Exiting edit mode');
      this.editing = false;
      
      // Reset form to original values if not saved
      if (this.objectType && this.wallItem) {
        this.syncItemToForm();
      }
    }
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
        // For edit mode: navigate to refresh the page completely
        // This avoids any potential rendering issues from reloading in place
        this.editing = false;
        
        // Navigate to the same page to force a full reload
        this.router.navigate(['/walls', this.wallId, 'items', savedItemId], {
          queryParams: { refresh: Date.now() }
        }).then(() => {
          // Remove the refresh query param after navigation
          this.router.navigate([], {
            queryParams: {},
            queryParamsHandling: 'merge'
          });
        });
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
    // Only allow editing if we have the wall loaded and permissions confirmed
    if (!this.wall) {
      return false;
    }
    
    return this.canEditWall();
  }
  
  canDelete(): boolean {
    return this.canEdit() && !this.isNewItem;
  }
  
  canSave(): boolean {
    // Check if form state allows saving OR if there are image changes OR if form is dirty
    const formState = this.formStateService.getFormState('generic-wall-item-form');
    const formCanSave = formState?.canSave ?? false;
    const formIsDirty = this.itemForm?.dirty ?? false;
    const formIsValid = this.itemForm?.valid ?? true;
    
    const result = (formCanSave || this.hasImageChanges() || (formIsDirty && formIsValid));
    
    console.log('🔍 canSave check:', {
      formCanSave,
      hasImageChanges: this.hasImageChanges(),
      formIsDirty,
      formIsValid,
      result
    });
    
    return result;
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
    
    const basicFields = this.objectType.fields.filter(field => 
      field.type === 'text' || 
      field.type === 'longtext' || 
      field.type === 'email' || 
      field.type === 'url' ||
      field.type === 'number' ||
      field.type === 'date'
    );
    
    console.log('📋 getBasicFields:', basicFields.map(f => ({ id: f.id, name: f.name, type: f.type })));
    return basicFields;
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
      field.type !== 'location' &&
      field.type !== 'entity' // Exclude entity fields from custom fields
    );
  }
  
  private _entityFieldsCache: FieldDefinition[] | null = null;
  private _entityFieldsCacheKey: string | null = null;
  
  private _getEntityFieldsCallCount = 0;
  
  getEntityFields(): FieldDefinition[] {
    this._getEntityFieldsCallCount++;
    const callNumber = this._getEntityFieldsCallCount;
    
    if (!this.objectType) {
      console.log(`📞 getEntityFields call #${callNumber}: No objectType, returning []`);
      return [];
    }
    
    // Use cached result if object type hasn't changed
    const cacheKey = `${this.objectType.id}-${this.objectType.fields.length}`;
    if (this._entityFieldsCacheKey === cacheKey && this._entityFieldsCache) {
      console.log(`📞 getEntityFields call #${callNumber} using cache:`, {
        cacheKey,
        cachedCount: this._entityFieldsCache.length,
        cachedFields: this._entityFieldsCache.map(f => f.name)
      });
      return this._entityFieldsCache;
    }
    
    // Create a defensive copy to avoid mutations
    const entityFields = [...this.objectType.fields].filter(field => field.type === 'entity');
    
    // Check for duplicates in the original array
    const allFieldIds = this.objectType.fields.map(f => f.id);
    const duplicateIds = allFieldIds.filter((id, index) => allFieldIds.indexOf(id) !== index);
    
    // Check for duplicates in entity fields
    const entityFieldIds = entityFields.map(f => f.id);
    const entityFieldNames = entityFields.map(f => f.name);
    const entityDuplicates = entityFieldIds.filter((id, index) => entityFieldIds.indexOf(id) !== index);
    const entityNameDuplicates = entityFieldNames.filter((name, index) => entityFieldNames.indexOf(name) !== index);
    
    console.log(`📞 getEntityFields call #${callNumber} RECALCULATING:`, {
      timestamp: new Date().toISOString(),
      objectType: this.objectType.name,
      objectTypeId: this.objectType.id,
      totalFields: this.objectType.fields.length,
      allFields: this.objectType.fields.map(f => ({ id: f.id, name: f.name, type: f.type })),
      entityFields: entityFields.map(f => ({ id: f.id, name: f.name, type: f.type })),
      duplicateIdsInAllFields: duplicateIds.length > 0 ? duplicateIds : 'none',
      duplicateIdsInEntityFields: entityDuplicates.length > 0 ? entityDuplicates : 'none',
      stackTrace: new Error().stack
    });
    
    // Cache the result
    this._entityFieldsCache = entityFields;
    this._entityFieldsCacheKey = cacheKey;
    
    return entityFields;
  }
  
  getTargetObjectType(field: FieldDefinition): WallObjectType | null {
    if (!field.entityConfig || !this.wall) return null;
    
    const targetId = field.entityConfig.targetObjectTypeId;
    
    // First try exact ID match
    let targetType = this.wall.objectTypes?.find(ot => ot.id === targetId);
    
    // If not found, try name match (case-insensitive)
    if (!targetType) {
      targetType = this.wall.objectTypes?.find(ot => 
        ot.name.toLowerCase() === targetId.toLowerCase()
      );
    }
    
    return targetType || null;
  }
  
  onAssociationsChanged(fieldId: string, associationIds: string[]) {
    // Update the form control and field data
    const formControl = this.itemForm.get(fieldId);
    if (formControl) {
      const value = !this.objectType?.fields.find(f => f.id === fieldId)?.entityConfig?.allowMultiple
        ? (associationIds[0] || null)
        : associationIds;
      
      formControl.setValue(value);
      formControl.markAsDirty();
      formControl.markAsTouched();
      this.itemForm.markAsDirty();
      
      // Update wallItem fieldData
      this.wallItem.fieldData[fieldId] = value;
      
      // Trigger change detection
      this.cdr.detectChanges();
    }
  }

  // Related items methods
  private updateRelatedObjectTypesArray() {
    if (!this.wall || !this.objectType) {
      this.relatedObjectTypesArray = [];
      return;
    }
    
    const relatedTypes: { objectType: WallObjectType; fieldName: string }[] = [];
    const addedTypes = new Set<string>();
    
    this.wall.objectTypes?.forEach((otherObjectType: WallObjectType) => {
      if (otherObjectType.id === this.objectType?.id) return;
      
      otherObjectType.fields.forEach((field: FieldDefinition) => {
        if (field.type === 'entity' && 
            field.entityConfig?.targetObjectTypeId === this.objectType?.id &&
            !addedTypes.has(otherObjectType.id)) {
          relatedTypes.push({ 
            objectType: otherObjectType, 
            fieldName: field.name 
          });
          addedTypes.add(otherObjectType.id);
        }
      });
    });
    
    this.relatedObjectTypesArray = relatedTypes;
    console.log('📋 Updated relatedObjectTypesArray:', relatedTypes.map(rt => rt.objectType.name));
  }
  
  hasRelatedItems(): boolean {
    return this.relatedObjectTypesArray.length > 0;
  }

  private _relatedObjectTypesCache: { objectType: WallObjectType; fieldName: string }[] | null = null;
  private _relatedObjectTypesCacheKey: string | null = null;
  
  getRelatedObjectTypes(): { objectType: WallObjectType; fieldName: string }[] {
    if (!this.wall) return [];
    
    // Use cached result if wall and object type haven't changed
    const cacheKey = `${this.wall.id}-${this.objectType?.id}-${this.wall.objectTypes?.length}`;
    if (this._relatedObjectTypesCacheKey === cacheKey && this._relatedObjectTypesCache) {
      return this._relatedObjectTypesCache;
    }
    
    const relatedTypes: { objectType: WallObjectType; fieldName: string }[] = [];
    const addedTypes = new Set<string>(); // Prevent duplicates
    
    this.wall.objectTypes?.forEach((otherObjectType: WallObjectType) => {
      if (otherObjectType.id === this.objectType?.id) return; // Skip self
      
      // ONLY INCOMING: Find object types that have entity fields pointing TO this object type
      // (OUTGOING relationships are handled by entity field tabs, not here)
      otherObjectType.fields.forEach((field: FieldDefinition) => {
        if (field.type === 'entity' && 
            field.entityConfig?.targetObjectTypeId === this.objectType?.id &&
            !addedTypes.has(otherObjectType.id)) {
          relatedTypes.push({ 
            objectType: otherObjectType, 
            fieldName: field.name 
          });
          addedTypes.add(otherObjectType.id);
        }
      });
    });
    
    console.log('📋 getRelatedObjectTypes (incoming only):', relatedTypes.map(rt => rt.objectType.name));
    
    // Cache the result
    this._relatedObjectTypesCache = relatedTypes;
    this._relatedObjectTypesCacheKey = cacheKey;
    
    return relatedTypes;
  }

  async loadRelatedItems() {
    if (!this.itemId || !this.wall) return;
    
    this.loadingRelatedItems = true;
    this.relatedItems = {};
    
    try {
      const relatedTypes = this.getRelatedObjectTypes();
      const allItems = await firstValueFrom(
        this.wallItemService.getWallItems(this.wallId)
      );
      
      for (const { objectType, fieldName } of relatedTypes) {
        const relatedItemsForType: WallItem[] = [];
        
        // ONLY INCOMING: Find items of this object type that reference the current item
        // (Outgoing relationships are handled by entity field tabs)
        const incomingItems = allItems.filter(item => {
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
        
        if (incomingItems.length > 0) {
          this.relatedItems[objectType.id] = incomingItems;
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

  getTabLabelForEntityType(objectType: WallObjectType): string {
    return this.nlpService.getDisplayPlural(objectType.name);
  }

}