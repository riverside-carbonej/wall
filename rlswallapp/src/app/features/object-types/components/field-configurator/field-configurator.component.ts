import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
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
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatExpansionModule,
    MatSliderModule,
    MatDividerModule
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
                        <mat-form-field class="half-width">
                          <mat-label>Field Name</mat-label>
                          <input matInput formControlName="name" placeholder="Enter field name">
                          @if (fieldForm.get('name')?.hasError('required')) {
                            <mat-error>Field name is required</mat-error>
                          }
                        </mat-form-field>

                        <mat-form-field class="half-width">
                          <mat-label>Field Type</mat-label>
                          <mat-select formControlName="type" (selectionChange)="onTypeChange($event.value)">
                            @for (type of supportedFieldTypes; track type.value) {
                              <mat-option [value]="type.value">
                                <mat-icon>{{type.icon}}</mat-icon>
                                {{type.label}}
                              </mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                      </div>

                      <div class="form-row">
                        <mat-form-field class="full-width">
                          <mat-label>Description</mat-label>
                          <textarea matInput formControlName="description" rows="2"
                                   placeholder="Describe what this field is for..."></textarea>
                        </mat-form-field>
                      </div>

                      <div class="form-row">
                        <mat-form-field class="full-width">
                          <mat-label>Placeholder Text</mat-label>
                          <input matInput formControlName="placeholder" 
                                 placeholder="Enter placeholder text...">
                        </mat-form-field>
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
                              <mat-form-field class="half-width">
                                <mat-label>Minimum Length</mat-label>
                                <input matInput type="number" formControlName="minLength" min="0">
                              </mat-form-field>
                              <mat-form-field class="half-width">
                                <mat-label>Maximum Length</mat-label>
                                <input matInput type="number" formControlName="maxLength" min="1">
                              </mat-form-field>
                            </div>
                            <div class="form-row">
                              <mat-form-field class="full-width">
                                <mat-label>Pattern (Regular Expression)</mat-label>
                                <input matInput formControlName="pattern" 
                                       placeholder="e.g., ^[A-Za-z\s]+$ for letters and spaces only">
                                <mat-hint>Use regex to validate input format</mat-hint>
                              </mat-form-field>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('number') {
                        <div class="form-section">
                          <h3>Number Field Settings</h3>
                          <div formGroupName="validation">
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Minimum Value</mat-label>
                                <input matInput type="number" formControlName="min">
                              </mat-form-field>
                              <mat-form-field class="half-width">
                                <mat-label>Maximum Value</mat-label>
                                <input matInput type="number" formControlName="max">
                              </mat-form-field>
                            </div>
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Step</mat-label>
                                <input matInput type="number" formControlName="step" 
                                       placeholder="1" min="0.01">
                                <mat-hint>Increment/decrement amount</mat-hint>
                              </mat-form-field>
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
                              <mat-form-field class="full-width">
                                <mat-label>Options (one per line)</mat-label>
                                <textarea matInput [value]="getOptionsText()" 
                                         (input)="updateOptions($event)"
                                         rows="6" placeholder="Option 1&#10;Option 2&#10;Option 3"></textarea>
                                <mat-hint>Enter each option on a new line</mat-hint>
                              </mat-form-field>
                            </div>
                            <div class="form-row">
                              <div class="checkbox-group">
                                <mat-slide-toggle formControlName="allowCustom">
                                  Allow Custom Values
                                </mat-slide-toggle>
                              </div>
                            </div>
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Minimum Selections</mat-label>
                                <input matInput type="number" formControlName="minSelections" min="0">
                              </mat-form-field>
                              <mat-form-field class="half-width">
                                <mat-label>Maximum Selections</mat-label>
                                <input matInput type="number" formControlName="maxSelections" min="1">
                                <mat-hint>0 = unlimited</mat-hint>
                              </mat-form-field>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('file') {
                        <div class="form-section">
                          <h3>File Upload Settings</h3>
                          <div formGroupName="fileConfig">
                            <div class="form-row">
                              <mat-form-field class="full-width">
                                <mat-label>Allowed File Types</mat-label>
                                <mat-select formControlName="allowedTypes" multiple>
                                  @for (fileType of fileTypeOptions; track fileType.value) {
                                    <mat-option [value]="fileType.value">
                                      <mat-icon>{{fileType.icon}}</mat-icon>
                                      {{fileType.label}}
                                    </mat-option>
                                  }
                                </mat-select>
                                <mat-hint>Select which file types users can upload</mat-hint>
                              </mat-form-field>
                            </div>
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Maximum File Size (MB)</mat-label>
                                <input matInput type="number" formControlName="maxSize" 
                                       min="1" max="100" placeholder="10">
                              </mat-form-field>
                              <div class="half-width checkbox-group">
                                <mat-slide-toggle formControlName="multiple">
                                  Allow Multiple Files
                                </mat-slide-toggle>
                              </div>
                            </div>
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Maximum Files</mat-label>
                                <input matInput type="number" formControlName="maxFiles" 
                                       min="1" max="20" placeholder="5">
                                <mat-hint>Only applies when multiple files allowed</mat-hint>
                              </mat-form-field>
                            </div>
                          </div>
                        </div>
                      }

                      @case ('date') {
                        <div class="form-section">
                          <h3>Date Field Settings</h3>
                          <div formGroupName="dateConfig">
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Minimum Date</mat-label>
                                <input matInput type="date" formControlName="minDate">
                              </mat-form-field>
                              <mat-form-field class="half-width">
                                <mat-label>Maximum Date</mat-label>
                                <input matInput type="date" formControlName="maxDate">
                              </mat-form-field>
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
                              <mat-form-field class="half-width">
                                <mat-label>Maximum Length</mat-label>
                                <input matInput type="number" formControlName="maxLength" 
                                       min="100" placeholder="5000">
                                <mat-hint>Character limit for content</mat-hint>
                              </mat-form-field>
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
                          <mat-form-field class="half-width">
                            <mat-label>Display Order</mat-label>
                            <input matInput type="number" formControlName="displayOrder" 
                                   min="0" placeholder="0">
                            <mat-hint>Lower numbers appear first</mat-hint>
                          </mat-form-field>
                          <mat-form-field class="half-width">
                            <mat-label>Column Width</mat-label>
                            <mat-select formControlName="columnWidth">
                              <mat-option value="auto">Auto</mat-option>
                              <mat-option value="25%">Quarter (25%)</mat-option>
                              <mat-option value="33%">Third (33%)</mat-option>
                              <mat-option value="50%">Half (50%)</mat-option>
                              <mat-option value="66%">Two Thirds (66%)</mat-option>
                              <mat-option value="75%">Three Quarters (75%)</mat-option>
                              <mat-option value="100%">Full Width (100%)</mat-option>
                            </mat-select>
                          </mat-form-field>
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
                                              (change)="onConditionalChange($event.checked)">
                              Show field conditionally
                            </mat-slide-toggle>
                          </div>
                        </div>

                        @if (fieldForm.get('conditional')?.value) {
                          <div class="conditional-logic">
                            <div class="form-row">
                              <mat-form-field class="half-width">
                                <mat-label>Show when field</mat-label>
                                <mat-select formControlName="conditionalField">
                                  @for (field of availableFields; track field.id) {
                                    <mat-option [value]="field.id">{{field.name}}</mat-option>
                                  }
                                </mat-select>
                              </mat-form-field>
                              <mat-form-field class="half-width">
                                <mat-label>Has value</mat-label>
                                <input matInput formControlName="conditionalValue" 
                                       placeholder="Enter value...">
                              </mat-form-field>
                            </div>
                          </div>
                        }
                      </div>

                      @if (options.allowCustomValidation) {
                        <mat-divider></mat-divider>

                        <div class="form-section">
                          <h3>Custom Validation</h3>
                          
                          <div class="form-row">
                            <mat-form-field class="full-width">
                              <mat-label>Validation Function (JavaScript)</mat-label>
                              <textarea matInput formControlName="customValidation" 
                                       rows="4" placeholder="function validate(value) {&#10;  // Return true if valid, false if invalid&#10;  return value.length > 0;&#10;}">
                              </textarea>
                              <mat-hint>Write a JavaScript function that returns true for valid values</mat-hint>
                            </mat-form-field>
                          </div>

                          <div class="form-row">
                            <mat-form-field class="full-width">
                              <mat-label>Custom Error Message</mat-label>
                              <input matInput formControlName="customErrorMessage" 
                                     placeholder="Enter error message for validation failures...">
                            </mat-form-field>
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
                <button mat-button (click)="onReset()" [disabled]="!fieldForm.dirty">
                  <mat-icon>refresh</mat-icon>
                  Reset
                </button>
                <div class="action-spacer"></div>
                <button mat-button (click)="onCancel()">
                  Cancel
                </button>
                <button mat-raised-button color="primary" 
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