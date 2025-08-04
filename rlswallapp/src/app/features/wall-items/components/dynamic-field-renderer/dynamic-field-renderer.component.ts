import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatFormField, MatInput, MatLabel, MatError } from '../../../../shared/components/material-stubs';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { MatCheckbox } from '../../../../shared/components/material-stubs';
import { MatChipListbox, MatChipOption } from '../../../../shared/components/material-stubs';
import { MatDatepicker, MatDatepickerToggle } from '../../../../shared/components/material-stubs';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { FieldDefinition } from '../../../../shared/models/wall.model';
import { LocationPickerComponent } from '../../../maps/components/location-picker/location-picker.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { MaterialTextInputComponent } from '../../../../shared/components/material-text-input/material-text-input.component';
import { MaterialSelectComponent, SelectOption } from '../../../../shared/components/material-select/material-select.component';

@Component({
  selector: 'app-dynamic-field-renderer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    MaterialSelectComponent
  ],
  templateUrl: './dynamic-field-renderer.component.html',
  styleUrls: ['./dynamic-field-renderer.component.css']
})
export class DynamicFieldRendererComponent implements OnInit {
  @Input() field!: FieldDefinition;
  @Input() formGroup!: FormGroup;
  @Input() readonly = false;
  @Input() value: any;

  get formControl(): FormControl {
    return this.formGroup?.get(this.field.id) as FormControl;
  }

  // For multiselect fields
  selectedOptions: string[] = [];
  
  ngOnInit() {
    if (this.field.type === 'multiselect' && this.value) {
      this.selectedOptions = Array.isArray(this.value) ? this.value : [];
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
}