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
  
  ngOnInit() {
    this.initializeFieldData();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-initialize field data when inputs change (like readonly mode or formGroup)
    if (changes['formGroup'] || changes['readonly'] || changes['value']) {
      // Use setTimeout to ensure the form control is properly initialized
      setTimeout(() => {
        this.initializeFieldData();
      }, 0);
    }
  }

  private initializeFieldData() {
    // Ensure we have a valid form control before proceeding
    if (!this.formControl || !this.field) {
      return;
    }
    
    // Get initial value from form control or input property
    let initialValue = this.formControl.value !== null && this.formControl.value !== undefined 
      ? this.formControl.value 
      : this.value;
    
    // Convert Date objects to ISO string format for date inputs
    if (this.field.type === 'date' && initialValue instanceof Date) {
      const isoString = initialValue.toISOString().split('T')[0]; // YYYY-MM-DD format
      this.formControl.setValue(isoString, { emitEvent: false });
      initialValue = isoString;
    }
    
    
    if (this.field.type === 'entity') {
      this.loadEntityItems();
      
      // Initialize selected entities from current value
      if (initialValue) {
        // Handle both single and multiple entity values
        const entityIds = Array.isArray(initialValue) ? initialValue : [initialValue];
        
        // Load the actual entity names
        this.loadSelectedEntities(entityIds);
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
          return entity ? entity.name : id;
        });
        return names.join(', ');
      } else {
        // Single entity selection
        const entity = this.selectedEntities.find(e => e.id === value);
        return entity ? entity.name : value;
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
  }

  onEntitySearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.entitySearchTerm = input.value;
    this.updateFilteredEntities();
    this.showEntitySuggestions = true;
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
    if (!this.field.entityConfig?.allowMultiple) {
      this.formControl?.setValue(this.selectedEntities[0]?.id || null);
    } else {
      this.formControl?.setValue(this.selectedEntities.map(item => item.id));
    }
  }
  
  hideEntitySuggestions() {
    setTimeout(() => {
      this.showEntitySuggestions = false;
    }, 200);
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
    const targetObjectType = this.wall.objectTypes?.find(ot => ot.id === targetObjectTypeId);
    
    if (!targetObjectType) {
      // Try to find by name as fallback
      const targetByName = this.wall.objectTypes?.find(ot => 
        ot.name.toLowerCase() === targetObjectTypeId.toLowerCase()
      );
      if (targetByName) {
        this.loadEntityItemsForType(targetByName);
        return;
      }
      return;
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
    if (!this.field.entityConfig || !this.wall) return;
    
    const targetObjectTypeId = this.field.entityConfig.targetObjectTypeId;
    if (!targetObjectTypeId) return;

    // Find the target object type definition
    const targetObjectType = this.wall.objectTypes?.find(ot => ot.id === targetObjectTypeId);
    if (!targetObjectType) return;

    // Load each selected entity
    entityIds.forEach(entityId => {
      this.wallItemService.getWallItemById(entityId).subscribe(item => {
        if (item) {
          const primaryField = targetObjectType.displaySettings?.primaryField;
          const secondaryField = targetObjectType.displaySettings?.secondaryField;
          
          let name = 'Untitled';
          let subtitle = '';

          if (primaryField && item.fieldData[primaryField]) {
            name = this.formatFieldValue(item.fieldData[primaryField]);
          }

          if (secondaryField && item.fieldData[secondaryField]) {
            subtitle = this.formatFieldValue(item.fieldData[secondaryField]);
          }

          // Only add if not already in the list
          if (!this.selectedEntities.some(e => e.id === entityId)) {
            this.selectedEntities.push({
              id: entityId,
              name: name,
              subtitle: subtitle
            });
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