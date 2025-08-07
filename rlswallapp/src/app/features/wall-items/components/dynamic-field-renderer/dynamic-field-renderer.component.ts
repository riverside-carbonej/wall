import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatFormField, MatInput, MatLabel, MatError } from '../../../../shared/components/material-stubs';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { MatCheckbox } from '../../../../shared/components/material-stubs';
import { MatChipListbox, MatChipOption } from '../../../../shared/components/material-stubs';
import { MatDatepicker, MatDatepickerToggle } from '../../../../shared/components/material-stubs';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { FieldDefinition, Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { LocationPickerComponent } from '../../../maps/components/location-picker/location-picker.component';
import { WallItemService } from '../../services/wall-item.service';
import { NlpService } from '../../../../shared/services/nlp.service';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { MaterialTextInputComponent } from '../../../../shared/components/material-text-input/material-text-input.component';
import { MaterialSelectComponent, SelectOption } from '../../../../shared/components/material-select/material-select.component';
import { MaterialSwitchComponent } from '../../../../shared/components/material-switch/material-switch.component';
import { MaterialDatePickerComponent } from '../../../../shared/components/material-date-picker/material-date-picker.component';

@Component({
  selector: 'app-dynamic-field-renderer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormField, MatInput, MatLabel, MatError,
    SelectComponent,
    MatCheckbox,
    MatChipListbox, MatChipOption,
    MatDatepicker, MatDatepickerToggle,
    MaterialIconComponent,
    ThemedButtonComponent,
    LocationPickerComponent,
    FormFieldComponent,
    MaterialTextInputComponent,
    MaterialSelectComponent,
    MaterialSwitchComponent,
    MaterialDatePickerComponent
  ],
  templateUrl: './dynamic-field-renderer.component.html',
  styleUrls: ['./dynamic-field-renderer.component.css']
})
export class DynamicFieldRendererComponent implements OnInit, OnChanges {
  @Input() field!: FieldDefinition;
  @Input() formGroup!: FormGroup;
  @Input() readonly = false;
  @Input() value: any;
  @Input() wall: Wall | null = null; // Add wall context for relationship fields

  private wallItemService = inject(WallItemService);
  private nlpService = inject(NlpService);

  get formControl(): FormControl {
    const control = this.formGroup?.get(this.field.id) as FormControl;
    if (!control && this.formGroup && this.field) {
      console.warn(`Form control not found for field: ${this.field.id} (${this.field.name})`);
      console.log('Available controls:', Object.keys(this.formGroup.controls));
    }
    return control;
  }

  
  // For entity fields
  selectedEntities: Array<{id: string; name: string; subtitle?: string}> = [];
  filteredEntities: Array<{id: string; name: string; subtitle?: string}> = [];
  entitySearchTerm: string = '';
  showEntitySuggestions: boolean = false;
  allEntityItems: Array<{id: string; name: string; subtitle?: string}> = [];
  isLoadingEntities: boolean = false;
  
  ngOnInit() {
    this.initializeFieldData();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-initialize field data when inputs change (like readonly mode or formGroup)
    if (changes['formGroup'] || changes['readonly'] || changes['value'] || changes['wall']) {
      console.log('🔄 DynamicFieldRenderer ngOnChanges - field:', this.field?.name, 'changes:', Object.keys(changes));
      
      // Log the actual changes for debugging
      if (changes['value']) {
        console.log('  📦 Value changed:', {
          previous: changes['value'].previousValue,
          current: changes['value'].currentValue,
          isFirstChange: changes['value'].isFirstChange()
        });
      }
      if (changes['readonly']) {
        console.log('  👁️ Readonly changed:', {
          previous: changes['readonly'].previousValue,
          current: changes['readonly'].currentValue
        });
      }
      
      // Use setTimeout to ensure the form control is properly initialized
      setTimeout(() => {
        this.initializeFieldData();
      }, 0);
    }
  }

  private initializeFieldData() {
    // Ensure we have a valid form control before proceeding
    if (!this.formControl || !this.field) {
      console.warn('⚠️ DynamicFieldRenderer - missing formControl or field', {
        hasFormControl: !!this.formControl,
        hasField: !!this.field,
        fieldId: this.field?.id
      });
      return;
    }
    
    // Get initial value from form control or input property
    let initialValue = this.formControl.value !== null && this.formControl.value !== undefined 
      ? this.formControl.value 
      : this.value;
    
    console.log('📊 DynamicFieldRenderer initializeFieldData:', {
      field: this.field.name,
      fieldId: this.field.id,
      type: this.field.type,
      initialValue,
      formControlValue: this.formControl.value,
      inputValue: this.value,
      readonly: this.readonly,
      hasWall: !!this.wall
    });
    
    // Convert Date objects to ISO string format for date inputs
    if (this.field.type === 'date' && initialValue instanceof Date) {
      const isoString = initialValue.toISOString().split('T')[0]; // YYYY-MM-DD format
      this.formControl.setValue(isoString, { emitEvent: false });
      initialValue = isoString;
    }
    
    
    if (this.field.type === 'entity') {
      console.log('🔗 Initializing entity field:', this.field.name, 'value:', initialValue);
      
      // Check if we need to reload entities
      const currentIds = this.selectedEntities.map(e => e.id);
      const newIds = initialValue ? (Array.isArray(initialValue) ? initialValue : [initialValue]) : [];
      const needsReload = JSON.stringify(currentIds.sort()) !== JSON.stringify(newIds.sort());
      
      console.log('🔍 Entity reload check:', {
        currentIds,
        newIds,
        needsReload,
        readonly: this.readonly
      });
      
      // Always load available entity items
      this.loadEntityItems();
      
      // Only reload selected entities if they've changed or we don't have them yet
      if (needsReload || this.selectedEntities.length === 0) {
        // Clear and reload
        this.selectedEntities = [];
        
        if (initialValue) {
          // Handle both single and multiple entity values
          const entityIds = Array.isArray(initialValue) ? initialValue : [initialValue];
          console.log('📌 Loading selected entities:', entityIds);
          
          // Load the actual entity names
          this.loadSelectedEntities(entityIds);
        } else {
          console.log('⚠️ No initial value for entity field');
        }
      } else {
        console.log('✅ Keeping existing selected entities:', this.selectedEntities.length);
      }
    }
  }

  // Helper methods for template - the 6 field types you use
  isText(): boolean {
    return this.field.type === 'text';
  }

  isDate(): boolean {
    return this.field.type === 'date';
  }

  isColor(): boolean {
    return this.field.type === 'color';
  }

  isLocation(): boolean {
    return this.field.type === 'location';
  }
  
  isEntity(): boolean {
    return this.field.type === 'entity';
  }

  isBoolean(): boolean {
    return this.field.type === 'boolean';
  }


  getDisplayValue(): string {
    // Get value from form control instead of input property
    const value = this.formControl?.value || this.value;
    if (!value) return '';
    
    if (this.field.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    if (this.field.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (this.field.type === 'entity') {
      // For entity fields, show the entity names instead of IDs
      if (Array.isArray(value)) {
        // Multiple entity selection
        const names = value.map(id => {
          const entity = this.selectedEntities.find(e => e.id === id);
          // Show loading only if we're actually loading
          return entity ? entity.name : (this.isLoadingEntities ? 'Loading...' : `Entity ${id}`);
        });
        return names.join(', ');
      } else {
        // Single entity selection
        const entity = this.selectedEntities.find(e => e.id === value);
        // Show loading only if we're actually loading
        if (entity) {
          return entity.name;
        } else if (this.isLoadingEntities && value) {
          return 'Loading...';
        } else if (value) {
          // Try loading if we haven't loaded yet
          console.log('📍 Triggering entity load from getDisplayValue for:', value);
          this.loadSelectedEntities([value]);
          return 'Loading...';
        }
        return '';
      }
    }
    
    if (this.field.type === 'location') {
      if (value && typeof value === 'object') {
        if (value.address) {
          return value.address;
        }
        if (value.lat && value.lng) {
          return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
        }
      }
      return '';
    }
    
    // Handle other complex objects safely
    if (value && typeof value === 'object') {
      // If it's a complex object, try to find a meaningful display value
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      // Handle location objects even when field type isn't 'location'
      if (value.address) {
        return value.address;
      }
      if (value.lat && value.lng) {
        return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
      }
      // For other objects, return empty string instead of [object Object]
      return '';
    }
    
    return value.toString();
  }


  // Validation helper
  getErrorMessage(): string {
    if (!this.formControl) return 'Invalid field';
    
    if (this.formControl.hasError('required')) {
      return `${this.field.name} is required`;
    }
    
    if (this.formControl.hasError('minlength')) {
      const minLength = this.formControl.getError('minlength').requiredLength;
      return `${this.field.name} must be at least ${minLength} characters`;
    }
    
    if (this.formControl.hasError('maxlength')) {
      const maxLength = this.formControl.getError('maxlength').requiredLength;
      return `${this.field.name} must be no more than ${maxLength} characters`;
    }
    
    if (this.formControl.hasError('pattern')) {
      return `${this.field.name} format is invalid`;
    }
    
    if (this.formControl.hasError('email')) {
      return 'Please enter a valid email address';
    }
    
    if (this.formControl.hasError('url')) {
      return 'Please enter a valid URL';
    }
    
    return 'Invalid value';
  }


  // Location handlers
  onLocationSelected(result: any) {
    if (result && result.coordinates) {
      this.formControl?.setValue(result.coordinates);
    }
  }

  onLocationCleared() {
    this.formControl?.setValue(null);
  }

  onDateSelected(date: Date) {
    if (date && !isNaN(date.getTime())) {
      // Convert to ISO string format for the form
      const isoString = date.toISOString().split('T')[0];
      this.formControl?.setValue(isoString);
    } else {
      // Clear date was selected
      this.formControl?.setValue(null);
    }
  }

  
  // Entity field methods
  getEntityTypeName(): string {
    if (!this.field.entityConfig || !this.wall) return 'Items';
    
    // Find the actual object type from the wall
    const targetType = this.wall.objectTypes?.find(
      ot => ot.id === this.field.entityConfig!.targetObjectTypeId
    );
    
    if (targetType) {
      return this.nlpService.getPlural(targetType.name);
    }
    
    // Fallback to pluralizing the ID
    return this.nlpService.getPlural(this.field.entityConfig.targetObjectTypeId);
  }
  
  onEntityFocus() {
    this.showEntitySuggestions = true;
    this.updateFilteredEntities();
    this.positionEntityDropdown();
  }

  onEntitySearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.entitySearchTerm = input.value;
    this.updateFilteredEntities();
    this.showEntitySuggestions = true;
    this.positionEntityDropdown();
  }
  
  private updateFilteredEntities() {
    if (!this.entitySearchTerm.trim()) {
      // Show first 5 items when no search term
      this.filteredEntities = this.allEntityItems
        .filter(item => !this.selectedEntities.some(selected => selected.id === item.id))
        .slice(0, 5);
      return;
    }

    const searchTerm = this.entitySearchTerm.toLowerCase();
    this.filteredEntities = this.allEntityItems.filter(item => 
      !this.selectedEntities.some(selected => selected.id === item.id) &&
      (item.name.toLowerCase().includes(searchTerm) || 
       (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm)))
    );
  }
  
  selectEntity(item: {id: string; name: string; subtitle?: string}) {
    if (!this.field.entityConfig?.allowMultiple) {
      this.selectedEntities = [item];
    } else {
      if (!this.selectedEntities.some(selected => selected.id === item.id)) {
        this.selectedEntities.push(item);
      }
    }
    
    this.updateEntityFormControlValue();
    this.entitySearchTerm = '';
    this.showEntitySuggestions = false;
    this.updateFilteredEntities();
  }
  
  removeEntity(item: {id: string; name: string; subtitle?: string}) {
    this.selectedEntities = this.selectedEntities.filter(
      selected => selected.id !== item.id
    );
    this.updateEntityFormControlValue();
    this.updateFilteredEntities();
  }
  
  private updateEntityFormControlValue() {
    const newValue = !this.field.entityConfig?.allowMultiple 
      ? (this.selectedEntities[0]?.id || null)
      : this.selectedEntities.map(item => item.id);
    
    console.log('📝 Updating entity form control value:', {
      field: this.field.name,
      newValue,
      selectedEntities: this.selectedEntities.map(e => ({ id: e.id, name: e.name })),
      readonly: this.readonly
    });
    
    if (this.formControl && !this.readonly) {
      // Set value with emitEvent: true to trigger form state changes
      this.formControl.setValue(newValue);
      // Mark as dirty and touched to enable save button
      this.formControl.markAsDirty();
      this.formControl.markAsTouched();
      
      // Also mark the parent form as dirty
      if (this.formGroup) {
        this.formGroup.markAsDirty();
      }
      
      console.log('✅ Form control updated and marked dirty');
    } else if (this.formControl && this.readonly) {
      // In readonly mode, update without emitting events
      this.formControl.setValue(newValue, { emitEvent: false });
    }
  }
  
  hideEntitySuggestions() {
    setTimeout(() => {
      this.showEntitySuggestions = false;
    }, 200);
  }

  private positionEntityDropdown() {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const searchInput = document.querySelector('.entity-search:focus') as HTMLInputElement;
      const dropdown = document.querySelector('.entity-suggestions') as HTMLElement;
      
      if (searchInput && dropdown) {
        const rect = searchInput.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = Math.min(300, dropdown.scrollHeight);
        
        // Position the dropdown
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;
        
        // Check if there's enough space below
        if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
          // Position below the input
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.bottom = 'auto';
        } else {
          // Position above the input
          dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
          dropdown.style.top = 'auto';
        }
      }
    }, 0);
  }
  
  private loadEntityItems() {
    if (!this.field.entityConfig || !this.wall) {
      return;
    }
    
    const targetObjectTypeId = this.field.entityConfig.targetObjectTypeId;
    if (!targetObjectTypeId) {
      return;
    }

    // Find the target object type definition to get display field names
    let targetObjectType = this.wall.objectTypes?.find(ot => ot.id === targetObjectTypeId);
    
    // Fallback: try to find by name if ID doesn't match
    if (!targetObjectType) {
      targetObjectType = this.wall.objectTypes?.find(ot => 
        ot.name.toLowerCase() === targetObjectTypeId.toLowerCase()
      );
      
      if (!targetObjectType) {
        console.warn('⚠️ Cannot load entity items - target object type not found:', targetObjectTypeId);
        return;
      } else {
        console.log('📎 Found object type by name fallback for loading:', targetObjectType.name, targetObjectType.id);
      }
    }

    this.loadEntityItemsForType(targetObjectType);
  }

  private loadEntityItemsForType(targetObjectType: any) {
    // Get items of the target object type from the same wall
    this.wallItemService.getWallItemsByObjectType(this.wall!.id!, targetObjectType.id).subscribe({
      next: (items) => {
        this.allEntityItems = items.map(item => {
          // Use the primary display field or fall back to first text field
          const primaryField = targetObjectType.displaySettings?.primaryField;
          const secondaryField = targetObjectType.displaySettings?.secondaryField;
          
          let name = 'Untitled';
          let subtitle = '';

          if (primaryField && item.fieldData[primaryField]) {
            name = this.formatFieldValue(item.fieldData[primaryField]);
          } else {
            // Find first non-empty text field
            const firstTextField = targetObjectType.fields.find((f: any) => 
              f.type === 'text' && item.fieldData[f.id]
            );
            if (firstTextField && item.fieldData[firstTextField.id]) {
              name = this.formatFieldValue(item.fieldData[firstTextField.id]);
            }
          }

          if (secondaryField && item.fieldData[secondaryField]) {
            subtitle = this.formatFieldValue(item.fieldData[secondaryField]);
          }

          return {
            id: item.id!,
            name: name,
            subtitle: subtitle
          };
        });
        
        this.updateFilteredEntities();
      },
      error: (error) => {
        console.error('Error loading entity items:', error);
      }
    });
  }
  
  private loadSelectedEntities(entityIds: string[]) {
    if (!this.field.entityConfig || !this.wall) {
      console.warn('⚠️ Cannot load selected entities - missing config or wall');
      return;
    }
    
    const targetObjectTypeId = this.field.entityConfig.targetObjectTypeId;
    if (!targetObjectTypeId) {
      console.warn('⚠️ No target object type ID');
      return;
    }

    // Find the target object type definition
    let targetObjectType = this.wall.objectTypes?.find(ot => ot.id === targetObjectTypeId);
    
    // Fallback: try to find by name if ID doesn't match
    if (!targetObjectType) {
      targetObjectType = this.wall.objectTypes?.find(ot => 
        ot.name.toLowerCase() === targetObjectTypeId.toLowerCase()
      );
      
      if (!targetObjectType) {
        console.warn('⚠️ Target object type not found by ID or name:', targetObjectTypeId);
        return;
      } else {
        console.log('📎 Found object type by name fallback:', targetObjectType.name, targetObjectType.id);
      }
    }

    console.log('🔍 Loading selected entities for:', targetObjectType.name, 'IDs:', entityIds);
    
    // Set loading state
    this.isLoadingEntities = true;

    // Track how many entities we're waiting for
    let pendingLoads = entityIds.length;
    
    if (pendingLoads === 0) {
      this.isLoadingEntities = false;
      return;
    }

    // Load each selected entity
    entityIds.forEach(entityId => {
      console.log('📡 Fetching entity:', entityId);
      this.wallItemService.getWallItemById(entityId).subscribe({
        next: (item) => {
          if (item) {
            const primaryField = targetObjectType.displaySettings?.primaryField;
            const secondaryField = targetObjectType.displaySettings?.secondaryField;
            
            let name = 'Untitled';
            let subtitle = '';

            if (primaryField && item.fieldData[primaryField]) {
              name = this.formatFieldValue(item.fieldData[primaryField]);
            } else {
              // Fallback to first text field if no primary field
              const firstTextField = targetObjectType.fields.find((f: any) => 
                f.type === 'text' && item.fieldData[f.id]
              );
              if (firstTextField && item.fieldData[firstTextField.id]) {
                name = this.formatFieldValue(item.fieldData[firstTextField.id]);
              }
            }

            if (secondaryField && item.fieldData[secondaryField]) {
              subtitle = this.formatFieldValue(item.fieldData[secondaryField]);
            }

            // Only add if not already in the list
            if (!this.selectedEntities.some(e => e.id === entityId)) {
              const entity = {
                id: entityId,
                name: name,
                subtitle: subtitle
              };
              this.selectedEntities.push(entity);
              console.log('✅ Added entity to selected:', entity);
            } else {
              console.log('⚠️ Entity already in selected list:', entityId);
            }
          } else {
            console.warn('⚠️ Entity not found:', entityId);
          }
          
          // Check if all entities are loaded
          pendingLoads--;
          if (pendingLoads === 0) {
            this.isLoadingEntities = false;
            console.log('✅ All entities loaded');
          }
        },
        error: (error) => {
          console.error('❌ Error loading entity:', entityId, error);
          pendingLoads--;
          if (pendingLoads === 0) {
            this.isLoadingEntities = false;
          }
        }
      });
    });
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
}