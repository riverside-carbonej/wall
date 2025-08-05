import { Component, Input, OnInit, inject } from '@angular/core';
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
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { MaterialTextInputComponent } from '../../../../shared/components/material-text-input/material-text-input.component';
import { MaterialSelectComponent, SelectOption } from '../../../../shared/components/material-select/material-select.component';
import { MaterialSwitchComponent } from '../../../../shared/components/material-switch/material-switch.component';

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
    MaterialSwitchComponent
  ],
  templateUrl: './dynamic-field-renderer.component.html',
  styleUrls: ['./dynamic-field-renderer.component.css']
})
export class DynamicFieldRendererComponent implements OnInit {
  @Input() field!: FieldDefinition;
  @Input() formGroup!: FormGroup;
  @Input() readonly = false;
  @Input() value: any;
  @Input() wall: Wall | null = null; // Add wall context for relationship fields

  private wallItemService = inject(WallItemService);

  get formControl(): FormControl {
    return this.formGroup?.get(this.field.id) as FormControl;
  }

  // For multiselect fields
  selectedOptions: string[] = [];
  
  // For relationship fields
  selectedRelationships: Array<{id: string; name: string; subtitle?: string}> = [];
  filteredRelationships: Array<{id: string; name: string; subtitle?: string}> = [];
  relationshipSearchTerm: string = '';
  showRelationshipSuggestions: boolean = false;
  allRelationshipItems: Array<{id: string; name: string; subtitle?: string}> = [];
  
  ngOnInit() {
    if (this.field.type === 'multiselect' && this.value) {
      this.selectedOptions = Array.isArray(this.value) ? this.value : [];
    }
    
    if (this.field.type === 'relationship') {
      this.loadRelationshipItems();
      
      // Initialize selected relationships from current value
      if (this.value) {
        // Handle both single and multiple relationship values
        const relationshipIds = Array.isArray(this.value) ? this.value : [this.value];
        
        // TODO: In real implementation, this would fetch the actual relationship objects
        // For now, create placeholder objects
        this.selectedRelationships = relationshipIds.map(id => ({
          id: String(id),
          name: `Item ${id}`,
          subtitle: 'Selected item'
        }));
      }
    }
  }

  // Helper methods for template
  isTextInput(): boolean {
    return ['text', 'email', 'url'].includes(this.field.type);
  }

  isTextarea(): boolean {
    return this.field.type === 'longtext' || this.field.type === 'richtext';
  }

  isNumber(): boolean {
    return this.field.type === 'number';
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
    if (!this.value) return '';
    
    if (this.field.type === 'date') {
      return new Date(this.value).toLocaleDateString();
    }
    
    if (this.field.type === 'daterange') {
      if (this.value && this.value.start && this.value.end) {
        const startDate = new Date(this.value.start).toLocaleDateString();
        const endDate = new Date(this.value.end).toLocaleDateString();
        return `${startDate} - ${endDate}`;
      }
      if (this.value && this.value.start) {
        return `From ${new Date(this.value.start).toLocaleDateString()}`;
      }
      return '';
    }
    
    if (this.field.type === 'numberrange') {
      if (this.value && typeof this.value === 'object') {
        const min = this.value.min !== undefined ? this.value.min : '';
        const max = this.value.max !== undefined ? this.value.max : '';
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
      return this.value ? 'Yes' : 'No';
    }
    
    if (this.field.type === 'multiselect') {
      return Array.isArray(this.value) ? this.value.join(', ') : '';
    }
    
    if (this.field.type === 'location') {
      if (this.value && this.value.lat && this.value.lng) {
        return `${this.value.lat.toFixed(6)}, ${this.value.lng.toFixed(6)}`;
      }
      return '';
    }
    
    return this.value.toString();
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
      case 'number':
        return 'numbers';
      case 'date':
        return 'event';
      case 'location':
        return 'place';
      case 'color':
        return 'palette';
      case 'file':
        return 'attach_file';
      case 'relationship':
        return 'link';
      case 'multiselect':
        return 'checklist';
      case 'boolean':
        return 'check_box';
      case 'longtext':
      case 'richtext':
        return 'notes';
      default:
        return '';
    }
  }

  getFileDisplayName(): string {
    if (!this.value) return '';
    
    if (this.value instanceof File) {
      return this.value.name;
    }
    
    if (Array.isArray(this.value)) {
      return `${this.value.length} file(s) selected`;
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
    if (!this.field.relationshipConfig) return 'items';
    
    // Get the target object type name - this would need to be passed from parent component
    // For now, return a generic name based on the field configuration
    const targetType = this.field.relationshipConfig.targetObjectTypeId;
    
    // Capitalize and make it user-friendly
    switch (targetType) {
      case 'branch': return 'Branches';
      case 'deployment': return 'Deployments';
      case 'award': return 'Awards';
      default: return 'Items';
    }
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
}