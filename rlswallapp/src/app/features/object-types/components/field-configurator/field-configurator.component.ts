import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions, MatCardSubtitle,
  MatCheckbox, MatSlideToggle, MatSlider, MatChipListbox, MatChipOption,
  MatTabGroup, MatTab, MatExpansionPanel, MatExpansionPanelHeader, MatPanelTitle,
  MatError
} from '../../../../shared/components/material-stubs';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { FormFieldComponent } from '../../../../shared/components/input-field/input-field.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { OptionComponent } from '../../../../shared/components/autocomplete/autocomplete.component';
import { DividerComponent } from '../../../../shared/components/divider/divider.component';
import { AppFormFieldComponent } from '../../../../shared/components/app-form-field/app-form-field.component';
import { FieldDefinition } from '../../../../shared/models/wall.model';

export interface FieldValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'custom';
  value?: any;
  message?: string;
  customValidator?: (value: any) => boolean;
}

export interface FieldConfigurationOptions {
  showAdvanced?: boolean;
  allowCustomValidation?: boolean;
  supportedTypes?: string[];
}

@Component({
  selector: 'app-field-configurator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions, MatCardSubtitle,
    MatCheckbox, MatSlideToggle, MatSlider, MatChipListbox, MatChipOption,
    MatTabGroup, MatTab, MatExpansionPanel, MatExpansionPanelHeader, MatPanelTitle,
    MatError, ThemedButtonComponent, MaterialIconComponent, FormFieldComponent, 
    SelectComponent, DividerComponent, OptionComponent, AppFormFieldComponent
  ],
  template: `
    <div class="field-configurator">
      @if (fieldForm) {
        <form [formGroup]="fieldForm">
          <mat-card class="config-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>{{getFieldTypeIcon()}}</mat-icon>
                Field Configuration
              </mat-card-title>
              <mat-card-subtitle>
                {{getFieldTypeDescription()}}
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <mat-tab-group [(selectedIndex)]="selectedTab">
                <!-- Basic Configuration -->
                <mat-tab label="Basic">
                  <div class="tab-content">
                    <div class="form-section">
                      <h3>Basic Information</h3>
                      
                      <div class="form-row">
                        <app-form-field 
                          class="half-width"
                          label="Field Name"
                          [required]="true"
                          [error]="fieldForm.get('name')?.hasError('required') ? 'Field name is required' : ''">
                          <input matInput formControlName="name" placeholder="Enter field name">
                        </app-form-field>

                        <app-form-field class="half-width" label="Field Type">
                          <mat-select formControlName="type" (selectionChange)="onTypeChange($event.value)">
                            @for (type of filteredSupportedFieldTypes; track type.value) {
                              <mat-option [value]="type.value">
                                <mat-icon>{{type.icon}}</mat-icon>
                                {{type.label}}
                              </mat-option>
                            }
                          </mat-select>
                        </app-form-field>
                      </div>

                      <div class="form-row">
                        <app-form-field class="full-width" label="Description">
                          <textarea matInput formControlName="description" rows="2"
                                   placeholder="Describe what this field is for..."></textarea>
                        </app-form-field>
                      </div>

                      <div class="form-row">
                        <app-form-field class="full-width" label="Placeholder Text">
                          <input matInput formControlName="placeholder" 
                                 placeholder="Enter placeholder text...">
                        </app-form-field>
                      </div>

                      <div class="form-row">
                        <div class="checkbox-group">
                          <mat-slide-toggle formControlName="required">
                            Required Field
                          </mat-slide-toggle>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-tab>

                <!-- Type-Specific Configuration -->
                <mat-tab label="Type Settings" [disabled]="!hasTypeSpecificConfig()">
                  <div class="tab-content">
                    @switch (fieldForm.get('type')?.value) {
                      @case ('text') {
                        <div class="form-section">
                          <h3>Text Field Settings</h3>
                          <div formGroupName="validation">
                            <div class="form-row">
                              <app-form-field class="half-width" label="Minimum Length">
                                <input matInput type="number" formControlName="minLength" min="0">
                              </app-form-field>
                              <app-form-field class="half-width" label="Maximum Length">
                                <input matInput type="number" formControlName="maxLength" min="1">
                              </app-form-field>
                            </div>
                            <div class="form-row">
                              <app-form-field 
                                class="full-width" 
                                label="Pattern (Regular Expression)"
                                hint="Use regex to validate input format">
                                <input matInput formControlName="pattern" 
                                       placeholder="e.g., ^[A-Za-z\s]+$ for letters and spaces only">
                              </app-form-field>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('number') {
                        <div class="form-section">
                          <h3>Number Field Settings</h3>
                          <div formGroupName="validation">
                            <div class="form-row">
                              <app-form-field class="half-width" label="Minimum Value">
                                <input matInput type="number" formControlName="min">
                              </app-form-field>
                              <app-form-field class="half-width" label="Maximum Value">
                                <input matInput type="number" formControlName="max">
                              </app-form-field>
                            </div>
                            <div class="form-row">
                              <app-form-field 
                                class="half-width" 
                                label="Step"
                                hint="Increment/decrement amount">
                                <input matInput type="number" formControlName="step" 
                                       placeholder="1" min="0.01">
                              </app-form-field>
                              <div class="half-width checkbox-group">
                                <mat-slide-toggle formControlName="allowDecimals">
                                  Allow Decimal Values
                                </mat-slide-toggle>
                              </div>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('multiselect') {
                        <div class="form-section">
                          <h3>Multiple Choice Settings</h3>
                          <div formGroupName="multiselectConfig">
                            <div class="form-row">
                              <app-form-field 
                                class="full-width" 
                                label="Options (one per line)"
                                hint="Enter each option on a new line">
                                <textarea matInput [value]="getOptionsText()" 
                                         (input)="updateOptions($event)"
                                         rows="6" placeholder="Option 1&#10;Option 2&#10;Option 3"></textarea>
                              </app-form-field>
                            </div>
                            <div class="form-row">
                              <div class="checkbox-group">
                                <mat-slide-toggle formControlName="allowCustom">
                                  Allow Custom Values
                                </mat-slide-toggle>
                              </div>
                            </div>
                            <div class="form-row">
                              <app-form-field class="half-width" label="Minimum Selections">
                                <input matInput type="number" formControlName="minSelections" min="0">
                              </app-form-field>
                              <app-form-field 
                                class="half-width" 
                                label="Maximum Selections"
                                hint="0 = unlimited">
                                <input matInput type="number" formControlName="maxSelections" min="1">
                              </app-form-field>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('file') {
                        <div class="form-section">
                          <h3>File Upload Settings</h3>
                          <div formGroupName="fileConfig">
                            <div class="form-row">
                              <app-form-field 
                                class="full-width" 
                                label="Allowed File Types"
                                hint="Select which file types users can upload">
                                <mat-select formControlName="allowedTypes" multiple>
                                  @for (fileType of fileTypeOptions; track fileType.value) {
                                    <mat-option [value]="fileType.value">
                                      <mat-icon>{{fileType.icon}}</mat-icon>
                                      {{fileType.label}}
                                    </mat-option>
                                  }
                                </mat-select>
                              </app-form-field>
                            </div>
                            <div class="form-row">
                              <app-form-field class="half-width" label="Maximum File Size (MB)">
                                <input matInput type="number" formControlName="maxSize" 
                                       min="1" max="100" placeholder="10">
                              </app-form-field>
                              <div class="half-width checkbox-group">
                                <mat-slide-toggle formControlName="multiple">
                                  Allow Multiple Files
                                </mat-slide-toggle>
                              </div>
                            </div>
                            <div class="form-row">
                              <app-form-field 
                                class="half-width" 
                                label="Maximum Files"
                                hint="Only applies when multiple files allowed">
                                <input matInput type="number" formControlName="maxFiles" 
                                       min="1" max="20" placeholder="5">
                              </app-form-field>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('date') {
                        <div class="form-section">
                          <h3>Date Field Settings</h3>
                          <div formGroupName="dateConfig">
                            <div class="form-row">
                              <app-form-field class="half-width" label="Minimum Date">
                                <input matInput type="date" formControlName="minDate">
                              </app-form-field>
                              <app-form-field class="half-width" label="Maximum Date">
                                <input matInput type="date" formControlName="maxDate">
                              </app-form-field>
                            </div>
                            <div class="form-row">
                              <div class="checkbox-group">
                                <mat-slide-toggle formControlName="includeTime">
                                  Include Time Selection
                                </mat-slide-toggle>
                              </div>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('richtext') {
                        <div class="form-section">
                          <h3>Rich Text Editor Settings</h3>
                          <div formGroupName="richtextConfig">
                            <div class="form-row">
                              <div class="checkbox-group">
                                <mat-slide-toggle formControlName="allowImages">
                                  Allow Image Uploads
                                </mat-slide-toggle>
                              </div>
                            </div>
                            <div class="form-row">
                              <div class="checkbox-group">
                                <mat-slide-toggle formControlName="allowLinks">
                                  Allow External Links
                                </mat-slide-toggle>
                              </div>
                            </div>
                            <div class="form-row">
                              <app-form-field 
                                class="half-width" 
                                label="Maximum Length"
                                hint="Character limit for content">
                                <input matInput type="number" formControlName="maxLength" 
                                       min="100" placeholder="5000">
                              </app-form-field>
                            </div>
                          </div>
                        </div>
                      }
                    }
                  </div>
                </mat-tab>

                <!-- Advanced Configuration -->
                @if (options.showAdvanced) {
                  <mat-tab label="Advanced">
                    <div class="tab-content">
                      <div class="form-section">
                        <h3>Display Options</h3>
                        
                        <div class="form-row">
                          <app-form-field 
                            class="half-width" 
                            label="Display Order"
                            hint="Lower numbers appear first">
                            <input matInput type="number" formControlName="displayOrder" 
                                   min="0" placeholder="0">
                          </app-form-field>
                          <app-form-field class="half-width" label="Column Width">
                            <mat-select formControlName="columnWidth">
                              <mat-option value="auto">Auto</mat-option>
                              <mat-option value="25%">Quarter (25%)</mat-option>
                              <mat-option value="33%">Third (33%)</mat-option>
                              <mat-option value="50%">Half (50%)</mat-option>
                              <mat-option value="66%">Two Thirds (66%)</mat-option>
                              <mat-option value="75%">Three Quarters (75%)</mat-option>
                              <mat-option value="100%">Full Width (100%)</mat-option>
                            </mat-select>
                          </app-form-field>
                        </div>

                        <div class="form-row">
                          <div class="checkbox-group">
                            <mat-slide-toggle formControlName="showInCard">
                              Show in Item Cards
                            </mat-slide-toggle>
                          </div>
                        </div>

                        <div class="form-row">
                          <div class="checkbox-group">
                            <mat-slide-toggle formControlName="showInList">
                              Show in List View
                            </mat-slide-toggle>
                          </div>
                        </div>

                        <div class="form-row">
                          <div class="checkbox-group">
                            <mat-slide-toggle formControlName="searchable">
                              Include in Search
                            </mat-slide-toggle>
                          </div>
                        </div>
                      </div>

                      <mat-divider></mat-divider>

                      <div class="form-section">
                        <h3>Conditional Logic</h3>
                        
                        <div class="form-row">
                          <div class="checkbox-group">
                            <mat-slide-toggle formControlName="conditional" 
                                              (change)="onConditionalChange($event)">
                              Show field conditionally
                            </mat-slide-toggle>
                          </div>
                        </div>

                        @if (fieldForm.get('conditional')?.value) {
                          <div class="conditional-logic">
                            <div class="form-row">
                              <app-form-field class="half-width" label="Show when field">
                                <mat-select formControlName="conditionalField">
                                  @for (field of availableFields; track field.id) {
                                    <mat-option [value]="field.id">{{field.name}}</mat-option>
                                  }
                                </mat-select>
                              </app-form-field>
                              <app-form-field class="half-width" label="Has value">
                                <input matInput formControlName="conditionalValue" 
                                       placeholder="Enter value...">
                              </app-form-field>
                            </div>
                          </div>
                        }
                      </div>

                      @if (options.allowCustomValidation) {
                        <mat-divider></mat-divider>

                        <div class="form-section">
                          <h3>Custom Validation</h3>
                          
                          <div class="form-row">
                            <app-form-field 
                              class="full-width" 
                              label="Validation Function (JavaScript)"
                              hint="Write a JavaScript function that returns true for valid values">
                              <textarea matInput formControlName="customValidation" 
                                       rows="4" placeholder="function validate(value) {&#10;  // Return true if valid, false if invalid&#10;  return value.length > 0;&#10;}">
                              </textarea>
                            </app-form-field>
                          </div>

                          <div class="form-row">
                            <app-form-field class="full-width" label="Custom Error Message">
                              <input matInput formControlName="customErrorMessage" 
                                     placeholder="Enter error message for validation failures...">
                            </app-form-field>
                          </div>
                        </div>
                      }
                    </div>
                  </mat-tab>
                }
              </mat-tab-group>
            </mat-card-content>

            <mat-card-actions>
              <div class="actions-container">
                <button type="button" class="btn btn-outline" (click)="onReset()" [disabled]="!fieldForm.dirty">
                  <mat-icon>refresh</mat-icon>
                  Reset
                </button>
                <div class="action-spacer"></div>
                <button type="button" class="btn btn-outline" (click)="onCancel()">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary" 
                        (click)="onSave()" [disabled]="!fieldForm.valid">
                  <mat-icon>save</mat-icon>
                  Save Configuration
                </button>
              </div>
            </mat-card-actions>
          </mat-card>
        </form>
      }
    </div>
  `,
  styleUrl: './field-configurator.component.scss'
})
export class FieldConfiguratorComponent implements OnInit, OnChanges {
  @Input() field!: FieldDefinition;
  @Input() availableFields: FieldDefinition[] = [];
  @Input() options: FieldConfigurationOptions = {
    showAdvanced: true,
    allowCustomValidation: false,
    supportedTypes: []
  };

  @Output() save = new EventEmitter<FieldDefinition>();
  @Output() cancel = new EventEmitter<void>();

  fieldForm!: FormGroup;
  selectedTab = 0;

  supportedFieldTypes = [
    { value: 'text', label: 'Text', icon: 'text_fields' },
    { value: 'longtext', label: 'Long Text', icon: 'notes' },
    { value: 'richtext', label: 'Rich Text', icon: 'format_bold' },
    { value: 'number', label: 'Number', icon: 'numbers' },
    { value: 'date', label: 'Date', icon: 'calendar_today' },
    { value: 'email', label: 'Email', icon: 'email' },
    { value: 'url', label: 'URL', icon: 'link' },
    { value: 'boolean', label: 'Yes/No', icon: 'check_box' },
    { value: 'multiselect', label: 'Multiple Choice', icon: 'checklist' },
    { value: 'file', label: 'File Upload', icon: 'attach_file' },
    { value: 'color', label: 'Color', icon: 'palette' },
    { value: 'location', label: 'Location', icon: 'place' }
  ];

  fileTypeOptions = [
    { value: 'image/*', label: 'Images', icon: 'image' },
    { value: '.pdf', label: 'PDF Documents', icon: 'picture_as_pdf' },
    { value: '.doc,.docx', label: 'Word Documents', icon: 'description' },
    { value: '.xls,.xlsx', label: 'Excel Spreadsheets', icon: 'table_chart' },
    { value: '.txt', label: 'Text Files', icon: 'text_snippet' },
    { value: 'video/*', label: 'Videos', icon: 'video_file' },
    { value: 'audio/*', label: 'Audio Files', icon: 'audio_file' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(): void {
    if (this.fieldForm && this.field) {
      this.loadFieldData();
    }
  }

  private initializeForm(): void {
    this.fieldForm = this.fb.group({
      id: [this.field?.id || this.generateFieldId()],
      name: [this.field?.name || '', Validators.required],
      type: [this.field?.type || 'text'],
      description: [this.field?.description || ''],
      placeholder: [this.field?.placeholder || ''],
      required: [this.field?.required || false],
      validation: this.fb.group({
        minLength: [null],
        maxLength: [null],
        pattern: [''],
        min: [null],
        max: [null],
        step: [1],
        allowDecimals: [true]
      }),
      multiselectConfig: this.fb.group({
        options: [[]],
        allowCustom: [false],
        minSelections: [0],
        maxSelections: [0]
      }),
      fileConfig: this.fb.group({
        allowedTypes: [[]],
        maxSize: [10],
        multiple: [false],
        maxFiles: [5]
      }),
      dateConfig: this.fb.group({
        minDate: [''],
        maxDate: [''],
        includeTime: [false]
      }),
      richtextConfig: this.fb.group({
        allowImages: [true],
        allowLinks: [true],
        maxLength: [5000]
      }),
      // Advanced options
      displayOrder: [0],
      columnWidth: ['auto'],
      showInCard: [true],
      showInList: [true],
      searchable: [true],
      conditional: [false],
      conditionalField: [''],
      conditionalValue: [''],
      customValidation: [''],
      customErrorMessage: ['']
    });

    this.loadFieldData();
  }

  private loadFieldData(): void {
    if (!this.field || !this.fieldForm) return;

    this.fieldForm.patchValue({
      id: this.field.id,
      name: this.field.name,
      type: this.field.type,
      description: this.field.description,
      placeholder: this.field.placeholder,
      required: this.field.required,
      validation: this.field.validation || {},
      multiselectConfig: this.field.multiselectConfig || {},
      fileConfig: this.field.fileConfig || {}
    });
  }

  get filteredSupportedFieldTypes() {
    if (this.options.supportedTypes && this.options.supportedTypes.length > 0) {
      return this.supportedFieldTypes.filter(type => 
        this.options.supportedTypes!.includes(type.value)
      );
    }
    return this.supportedFieldTypes;
  }

  hasTypeSpecificConfig(): boolean {
    const type = this.fieldForm?.get('type')?.value;
    return ['text', 'number', 'multiselect', 'file', 'date', 'richtext'].includes(type);
  }

  getFieldTypeIcon(): string {
    const type = this.fieldForm?.get('type')?.value;
    const typeOption = this.supportedFieldTypes.find(opt => opt.value === type);
    return typeOption?.icon || 'text_fields';
  }

  getFieldTypeDescription(): string {
    const type = this.fieldForm?.get('type')?.value;
    const descriptions: { [key: string]: string } = {
      'text': 'Single line text input for short text values',
      'longtext': 'Multi-line text area for longer content',
      'richtext': 'Rich text editor with formatting options',
      'number': 'Numeric input with validation options',
      'date': 'Date picker with range validation',
      'email': 'Email address with built-in validation',
      'url': 'Web address with link validation',
      'boolean': 'True/false checkbox input',
      'multiselect': 'Multiple choice selection from predefined options',
      'file': 'File upload with type and size restrictions',
      'color': 'Color picker for hex color values',
      'location': 'Geographic location with map integration'
    };
    return descriptions[type] || 'Configure field settings and validation';
  }

  onTypeChange(newType: string): void {
    // Reset type-specific configurations when type changes
    this.fieldForm.get('validation')?.reset();
    this.fieldForm.get('multiselectConfig')?.reset({ options: [], allowCustom: false });
    this.fieldForm.get('fileConfig')?.reset({ allowedTypes: [], maxSize: 10, multiple: false });
    this.fieldForm.get('dateConfig')?.reset();
    this.fieldForm.get('richtextConfig')?.reset({ allowImages: true, allowLinks: true, maxLength: 5000 });
  }

  getOptionsText(): string {
    const options = this.fieldForm.get('multiselectConfig.options')?.value || [];
    return Array.isArray(options) ? options.join('\n') : '';
  }

  updateOptions(event: any): void {
    const text = event.target.value;
    const options = text.split('\n').filter((option: string) => option.trim());
    this.fieldForm.get('multiselectConfig.options')?.setValue(options);
  }

  onConditionalChange(enabled: boolean): void {
    if (!enabled) {
      this.fieldForm.get('conditionalField')?.setValue('');
      this.fieldForm.get('conditionalValue')?.setValue('');
    }
  }

  private generateFieldId(): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onReset(): void {
    this.loadFieldData();
    this.fieldForm.markAsPristine();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    if (!this.fieldForm.valid) return;

    const formValue = this.fieldForm.value;
    const updatedField: FieldDefinition = {
      id: formValue.id,
      name: formValue.name,
      type: formValue.type,
      description: formValue.description,
      placeholder: formValue.placeholder,
      required: formValue.required,
      validation: formValue.validation,
      multiselectConfig: formValue.multiselectConfig,
      fileConfig: formValue.fileConfig
    };

    // Clean up empty configurations
    if (!this.hasTypeSpecificConfig()) {
      delete updatedField.validation;
      delete updatedField.multiselectConfig;
      delete updatedField.fileConfig;
    }

    this.save.emit(updatedField);
  }
}