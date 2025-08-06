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

  // For multiselect fields
  selectedOptions: string[] = [];
  
  // For relationship fields
  selectedRelationships: Array<{id: string; name: string; subtitle?: string}> = [];
  filteredRelationships: Array<{id: string; name: string; subtitle?: string}> = [];
  relationshipSearchTerm: string = '';
  showRelationshipSuggestions: boolean = false;
  allRelationshipItems: Array<{id: string; name: string; subtitle?: string}> = [];
  
  // For entity fields
  selectedEntities: Array<{id: string; name: string; subtitle?: string}> = [];
  filteredEntities: Array<{id: string; name: string; subtitle?: string}> = [];
  entitySearchTerm: string = '';
  showEntitySuggestions: boolean = false;
  allEntityItems: Array<{id: string; name: string; subtitle?: string}> = [];
  
  ngOnInit() {
    console.log('DynamicFieldRenderer ngOnInit:', {
      fieldId: this.field?.id,
      fieldName: this.field?.name,
      fieldType: this.field?.type,
      hasFormGroup: !!this.formGroup,
      formGroupControls: this.formGroup ? Object.keys(this.formGroup.controls) : [],
      readonly: this.readonly
    });
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
      console.log('initializeFieldData early return:', {
        hasFormControl: !!this.formControl,
        hasField: !!this.field,
        fieldId: this.field?.id,
        fieldType: this.field?.type
      });
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
    
    if (this.field.type === 'multiselect' && initialValue) {
      this.selectedOptions = Array.isArray(initialValue) ? initialValue : [];
    }
    
    if (this.field.type === 'relationship') {
      this.loadRelationshipItems();
      
      // Initialize selected relationships from current value
      if (initialValue) {
        // Handle both single and multiple relationship values
        const relationshipIds = Array.isArray(initialValue) ? initialValue : [initialValue];
        
        // TODO: In real implementation, this would fetch the actual relationship objects
        // For now, create placeholder objects
        this.selectedRelationships = relationshipIds.map(id => ({
          id: String(id),
          name: `Item ${id}`,
          subtitle: 'Selected item'
        }));
      }
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

  // Helper methods for template
  isTextInput(): boolean {
    return ['text', 'email', 'url'].includes(this.field.type);
  }

  isTextarea(): boolean {
    const isTextareaType = this.field.type === 'longtext' || this.field.type === 'richtext';
    if (isTextareaType && !this.readonly) {
      console.log('Textarea field detected:', {
        fieldId: this.field.id,
        fieldName: this.field.name,
        fieldType: this.field.type,
        hasFormControl: !!this.formControl,
        formControlValue: this.formControl?.value,
        formControlDisabled: this.formControl?.disabled
      });
    }
    return isTextareaType;
  }

  isNumber(): boolean {
    const isNumberType = this.field.type === 'number';
    if (isNumberType && !this.readonly) {
      console.log('Number field detected:', {
        fieldId: this.field.id,
        fieldName: this.field.name,
        fieldType: this.field.type,
        hasFormControl: !!this.formControl,
        formControlValue: this.formControl?.value,
        formControlDisabled: this.formControl?.disabled
      });
    }
    return isNumberType;
  }

  isDate(): boolean {
    return this.field.type === 'date';
  }

  isDateRange(): boolean {
    return this.field.type === 'daterange';
  }

  isNumberRange(): boolean {
    return this.field.type === 'numberrange';
  }

  isBoolean(): boolean {
    return this.field.type === 'boolean';
  }

  isColor(): boolean {
    return this.field.type === 'color';
  }

  isMultiselect(): boolean {
    return this.field.type === 'multiselect';
  }

  isFile(): boolean {
    return this.field.type === 'file';
  }

  isLocation(): boolean {
    return this.field.type === 'location';
  }

  isRelationship(): boolean {
    return this.field.type === 'relationship';
  }
  
  isEntity(): boolean {
    return this.field.type === 'entity';
  }

  getInputType(): string {
    switch (this.field.type) {
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      case 'color':
        return 'color';
      default:
        return 'text';
    }
  }

  getTextInputType(): 'text' | 'email' | 'url' | 'password' | 'number' | 'textarea' {
    switch (this.field.type) {
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  }

  getDisplayValue(): string {
    // Get value from form control instead of input property
    const value = this.formControl?.value || this.value;
    if (!value) return '';
    
    if (this.field.type === 'date') {
      return new Date(value).toLocaleDateString();
    }
    
    if (this.field.type === 'daterange') {
      if (value && value.start && value.end) {
        const startDate = new Date(value.start).toLocaleDateString();
        const endDate = new Date(value.end).toLocaleDateString();
        return `${startDate} - ${endDate}`;
      }
      if (value && value.start) {
        return `From ${new Date(value.start).toLocaleDateString()}`;
      }
      return '';
    }
    
    if (this.field.type === 'numberrange') {
      if (value && typeof value === 'object') {
        const min = value.min !== undefined ? value.min : '';
        const max = value.max !== undefined ? value.max : '';
        if (min && max) {
          return `${min} - ${max}`;
        }
        if (min) {
          return `From ${min}`;
        }
        if (max) {
          return `Up to ${max}`;
        }
      }
      return '';
    }
    
    if (this.field.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (this.field.type === 'multiselect') {
      return Array.isArray(value) ? value.join(', ') : '';
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
      // For other objects, return empty string instead of [object Object]
      return '';
    }
    
    return value.toString();
  }

  // Multiselect handlers
  onMultiselectChange(option: string, checked: boolean) {
    if (checked) {
      if (!this.selectedOptions.includes(option)) {
        this.selectedOptions.push(option);
      }
    } else {
      this.selectedOptions = this.selectedOptions.filter(o => o !== option);
    }
    
    this.formControl?.setValue([...this.selectedOptions]);
  }

  isOptionSelected(option: string): boolean {
    return this.selectedOptions.includes(option);
  }

  // File upload handler
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (this.field.fileConfig?.multiple) {
        this.formControl?.setValue(Array.from(input.files));
      } else {
        this.formControl?.setValue(input.files[0]);
      }
    }
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

  // Template helper methods
  getFieldIcon(): string {
    switch (this.field.type) {
      case 'email':
        return 'email';
      case 'url':
        return 'link';
      case 'location':
        return 'place';
      case 'color':
        return 'palette';
      case 'file':
        return 'attach_file';
      case 'date':
        return 'event';
      case 'daterange':
        return 'date_range';
      case 'relationship':
        return 'link';
      case 'multiselect':
        return 'checklist';
      case 'boolean':
        return 'check_box';
      default:
        return '';
    }
  }

  getFileDisplayName(): string {
    const value = this.formControl?.value || this.value;
    if (!value) return '';
    
    if (value instanceof File) {
      return value.name;
    }
    
    if (Array.isArray(value)) {
      return `${value.length} file(s) selected`;
    }
    
    return 'File selected';
  }

  addCustomOption(option: string) {
    if (option && option.trim() && !this.selectedOptions.includes(option.trim())) {
      this.selectedOptions.push(option.trim());
      this.formControl?.setValue([...this.selectedOptions]);
    }
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

  // Helper method to get select options for multiselect and other select-based fields
  getSelectOptions(): SelectOption[] {
    if (this.field.multiselectConfig?.options) {
      return this.field.multiselectConfig.options.map(option => ({
        value: option,
        label: option
      }));
    }
    return [];
  }

  // Date range handlers
  onDateRangeStartChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = this.formControl?.value || {};
    this.formControl?.setValue({
      ...currentValue,
      start: input.value
    });
  }

  onDateRangeEndChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = this.formControl?.value || {};
    this.formControl?.setValue({
      ...currentValue,
      end: input.value
    });
  }

  // Number range handlers
  onNumberRangeMinChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = this.formControl?.value || {};
    this.formControl?.setValue({
      ...currentValue,
      min: input.value ? parseFloat(input.value) : undefined
    });
  }

  onNumberRangeMaxChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = this.formControl?.value || {};
    this.formControl?.setValue({
      ...currentValue,
      max: input.value ? parseFloat(input.value) : undefined
    });
  }

  // Relationship field methods
  getRelationshipTypeName(): string {
    if (!this.field.relationshipConfig || !this.wall) return 'Items';
    
    // Find the actual object type from the wall
    const targetType = this.wall.objectTypes?.find(
      ot => ot.id === this.field.relationshipConfig!.targetObjectTypeId
    );
    
    if (targetType) {
      return this.nlpService.getPlural(targetType.name);
    }
    
    // Fallback to pluralizing the ID
    return this.nlpService.getPlural(this.field.relationshipConfig.targetObjectTypeId);
  }

  onRelationshipSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.relationshipSearchTerm = input.value;
    this.updateFilteredRelationships();
    this.showRelationshipSuggestions = true;
  }

  private updateFilteredRelationships() {
    if (!this.relationshipSearchTerm.trim()) {
      this.filteredRelationships = this.allRelationshipItems.filter(item => 
        !this.selectedRelationships.some(selected => selected.id === item.id)
      );
      return;
    }

    const searchTerm = this.relationshipSearchTerm.toLowerCase();
    this.filteredRelationships = this.allRelationshipItems.filter(item => 
      !this.selectedRelationships.some(selected => selected.id === item.id) &&
      (item.name.toLowerCase().includes(searchTerm) || 
       (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm)))
    );
  }

  selectRelationship(item: {id: string; name: string; subtitle?: string}) {
    if (!this.field.relationshipConfig?.allowMultiple) {
      this.selectedRelationships = [item];
    } else {
      if (!this.selectedRelationships.some(selected => selected.id === item.id)) {
        this.selectedRelationships.push(item);
      }
    }
    
    this.updateFormControlValue();
    this.relationshipSearchTerm = '';
    this.showRelationshipSuggestions = false;
    this.updateFilteredRelationships();
  }

  removeRelationship(item: {id: string; name: string; subtitle?: string}) {
    this.selectedRelationships = this.selectedRelationships.filter(
      selected => selected.id !== item.id
    );
    this.updateFormControlValue();
    this.updateFilteredRelationships();
  }

  private updateFormControlValue() {
    if (!this.field.relationshipConfig?.allowMultiple) {
      this.formControl?.setValue(this.selectedRelationships[0]?.id || null);
    } else {
      this.formControl?.setValue(this.selectedRelationships.map(item => item.id));
    }
  }

  hideRelationshipSuggestions() {
    setTimeout(() => {
      this.showRelationshipSuggestions = false;
    }, 200);
  }

  private loadRelationshipItems() {
    if (!this.field.relationshipConfig || !this.wall) return;
    
    const targetObjectTypeId = this.field.relationshipConfig.targetObjectTypeId;
    if (!targetObjectTypeId) return;

    // Find the target object type definition to get display field names
    const targetObjectType = this.wall.objectTypes?.find(ot => ot.id === targetObjectTypeId);
    if (!targetObjectType) return;

    // Get items of the target object type from the same wall
    this.wallItemService.getWallItemsByObjectType(this.wall.id!, targetObjectTypeId).subscribe(items => {
      this.allRelationshipItems = items.map(item => {
        // Use the primary display field or fall back to first text field
        const primaryField = targetObjectType.displaySettings?.primaryField;
        const secondaryField = targetObjectType.displaySettings?.secondaryField;
        
        let name = 'Untitled';
        let subtitle = '';

        if (primaryField && item.fieldData[primaryField]) {
          name = String(item.fieldData[primaryField]);
        } else {
          // Find first non-empty text field
          const firstTextField = Object.keys(item.fieldData).find(key => 
            typeof item.fieldData[key] === 'string' && 
            String(item.fieldData[key]).trim()
          );
          if (firstTextField) {
            name = String(item.fieldData[firstTextField]);
          }
        }

        if (secondaryField && item.fieldData[secondaryField]) {
          subtitle = String(item.fieldData[secondaryField]);
        }

        return {
          id: item.id!,
          name: name,
          subtitle: subtitle
        };
      });
      
      this.updateFilteredRelationships();
    });
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
  
  onEntitySearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.entitySearchTerm = input.value;
    this.updateFilteredEntities();
    this.showEntitySuggestions = true;
  }
  
  private updateFilteredEntities() {
    if (!this.entitySearchTerm.trim()) {
      // Show first 10 items when no search term
      this.filteredEntities = this.allEntityItems
        .filter(item => !this.selectedEntities.some(selected => selected.id === item.id))
        .slice(0, 10);
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
    if (!this.field.entityConfig || !this.wall) return;
    
    const targetObjectTypeId = this.field.entityConfig.targetObjectTypeId;
    if (!targetObjectTypeId) return;

    // Find the target object type definition to get display field names
    const targetObjectType = this.wall.objectTypes?.find(ot => ot.id === targetObjectTypeId);
    if (!targetObjectType) return;

    // Get items of the target object type from the same wall
    this.wallItemService.getWallItemsByObjectType(this.wall.id!, targetObjectTypeId).subscribe(items => {
      console.log(`Loaded ${items.length} items for entity field ${this.field.name} (type: ${targetObjectTypeId})`);
      
      this.allEntityItems = items.map(item => {
        // Use the primary display field or fall back to first text field
        const primaryField = targetObjectType.displaySettings?.primaryField;
        const secondaryField = targetObjectType.displaySettings?.secondaryField;
        
        let name = 'Untitled';
        let subtitle = '';

        if (primaryField && item.fieldData[primaryField]) {
          name = String(item.fieldData[primaryField]);
        } else {
          // Find first non-empty text field
          const firstTextField = targetObjectType.fields.find(f => 
            f.type === 'text' && item.fieldData[f.id]
          );
          if (firstTextField && item.fieldData[firstTextField.id]) {
            name = String(item.fieldData[firstTextField.id]);
          }
        }

        if (secondaryField && item.fieldData[secondaryField]) {
          subtitle = String(item.fieldData[secondaryField]);
        }

        return {
          id: item.id!,
          name: name,
          subtitle: subtitle
        };
      });
      
      this.updateFilteredEntities();
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
            name = String(item.fieldData[primaryField]);
          }

          if (secondaryField && item.fieldData[secondaryField]) {
            subtitle = String(item.fieldData[secondaryField]);
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
}