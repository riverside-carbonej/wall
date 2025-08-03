import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { WallObjectType, FieldDefinition } from '../../../../shared/models/wall.model';
import { ObjectTypeService } from '../../../walls/services/object-type.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface ObjectTypeBuilderConfig {
  mode: 'create' | 'edit' | 'template';
  initialData?: Partial<WallObjectType>;
  wallId: string;
  templateId?: string;
}

@Component({
  selector: 'app-object-type-builder',
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
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatExpansionModule,
    MatSlideToggleModule,
    DragDropModule
  ],
  template: `
    <div class="object-type-builder">
      <mat-card class="builder-header">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{config.mode === 'create' ? 'add' : 'edit'}}</mat-icon>
            {{getBuilderTitle()}}
          </mat-card-title>
          <mat-card-subtitle>
            {{getBuilderSubtitle()}}
          </mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <form [formGroup]="objectTypeForm" class="builder-form">
        <!-- Basic Information -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              Basic Information
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field class="full-width">
                <mat-label>Object Type Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g., Veteran, Product, Event">
                <mat-icon matSuffix>label</mat-icon>
                @if (objectTypeForm.get('name')?.hasError('required')) {
                  <mat-error>Name is required</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3" 
                         placeholder="Describe what this object type represents..."></textarea>
                <mat-icon matSuffix>description</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field class="half-width">
                <mat-label>Icon</mat-label>
                <mat-select formControlName="icon">
                  @for (iconOption of iconOptions; track iconOption.value) {
                    <mat-option [value]="iconOption.value">
                      <mat-icon>{{iconOption.value}}</mat-icon>
                      {{iconOption.label}}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field class="half-width">
                <mat-label>Color</mat-label>
                <mat-select formControlName="color">
                  @for (colorOption of colorOptions; track colorOption.value) {
                    <mat-option [value]="colorOption.value">
                      <div class="color-option">
                        <div class="color-swatch" [style.background-color]="colorOption.value"></div>
                        {{colorOption.label}}
                      </div>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Field Builder -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>view_list</mat-icon>
              Fields ({{fieldsArray.length}})
            </mat-card-title>
            <div class="header-actions">
              <button mat-raised-button color="primary" type="button" 
                      (click)="addField()" 
                      [disabled]="!canAddField">
                <mat-icon>add</mat-icon>
                Add Field
              </button>
              <button mat-icon-button [matMenuTriggerFor]="fieldTemplatesMenu" 
                      matTooltip="Add from template">
                <mat-icon>library_add</mat-icon>
              </button>
              <mat-menu #fieldTemplatesMenu="matMenu">
                @for (template of fieldTemplates; track template.id) {
                  <button mat-menu-item (click)="addFieldFromTemplate(template)">
                    <mat-icon>{{template.icon}}</mat-icon>
                    <span>{{template.name}}</span>
                  </button>
                }
              </mat-menu>
            </div>
          </mat-card-header>

          <mat-card-content>
            @if (fieldsArray.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">view_list</mat-icon>
                <h3>No fields yet</h3>
                <p>Add fields to define what data this object type can store.</p>
                <button mat-raised-button color="primary" (click)="addField()">
                  <mat-icon>add</mat-icon>
                  Add Your First Field
                </button>
              </div>
            } @else {
              <div cdkDropList (cdkDropListDropped)="onFieldReorder($event)" 
                   class="fields-list">
                @for (field of fieldsArray.controls; track field; let i = $index) {
                  <div class="field-item" cdkDrag>
                    <div class="field-drag-handle" cdkDragHandle>
                      <mat-icon>drag_indicator</mat-icon>
                    </div>
                    
                    <mat-expansion-panel [expanded]="expandedFieldIndex === i" 
                                       (opened)="expandedFieldIndex = i"
                                       (closed)="expandedFieldIndex = -1">
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          <mat-icon class="field-type-icon">{{getFieldTypeIcon(field.get('type')?.value)}}</mat-icon>
                          {{field.get('name')?.value || 'Untitled Field'}}
                        </mat-panel-title>
                        <mat-panel-description>
                          {{getFieldTypeLabel(field.get('type')?.value)}}
                          @if (field.get('required')?.value) {
                            <mat-chip class="required-chip">Required</mat-chip>
                          }
                        </mat-panel-description>
                      </mat-expansion-panel-header>

                      <div class="field-editor" [formGroup]="$any(field)">
                        <div class="form-row">
                          <mat-form-field class="half-width">
                            <mat-label>Field Name</mat-label>
                            <input matInput formControlName="name" placeholder="Enter field name">
                            @if (field.get('name')?.hasError('required')) {
                              <mat-error>Field name is required</mat-error>
                            }
                          </mat-form-field>

                          <mat-form-field class="half-width">
                            <mat-label>Field Type</mat-label>
                            <mat-select formControlName="type" (selectionChange)="onFieldTypeChange(i, $event.value)">
                              @for (typeOption of fieldTypeOptions; track typeOption.value) {
                                <mat-option [value]="typeOption.value">
                                  <mat-icon>{{typeOption.icon}}</mat-icon>
                                  {{typeOption.label}}
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
                          <mat-form-field class="half-width">
                            <mat-label>Placeholder Text</mat-label>
                            <input matInput formControlName="placeholder" 
                                   placeholder="Enter placeholder text...">
                          </mat-form-field>

                          <div class="half-width field-options">
                            <mat-slide-toggle formControlName="required">
                              Required Field
                            </mat-slide-toggle>
                          </div>
                        </div>

                        <!-- Type-specific configuration -->
                        @if (field.get('type')?.value === 'multiselect') {
                          <div class="type-specific-config">
                            <h4>Multiple Choice Options</h4>
                            <div formGroupName="multiselectConfig">
                              <mat-form-field class="full-width">
                                <mat-label>Options (one per line)</mat-label>
                                <textarea matInput [value]="getMultiselectOptionsText($any(field))" 
                                         (input)="updateMultiselectOptions($any(field), $event)"
                                         rows="4" placeholder="Option 1&#10;Option 2&#10;Option 3"></textarea>
                              </mat-form-field>
                              <mat-slide-toggle formControlName="allowCustom">
                                Allow custom values
                              </mat-slide-toggle>
                            </div>
                          </div>
                        }

                        @if (field.get('type')?.value === 'file') {
                          <div class="type-specific-config">
                            <h4>File Configuration</h4>
                            <div formGroupName="fileConfig">
                              <mat-form-field class="full-width">
                                <mat-label>Allowed File Types</mat-label>
                                <mat-select formControlName="allowedTypes" multiple>
                                  @for (fileType of fileTypeOptions; track fileType.value) {
                                    <mat-option [value]="fileType.value">{{fileType.label}}</mat-option>
                                  }
                                </mat-select>
                              </mat-form-field>
                              <div class="form-row">
                                <mat-form-field class="half-width">
                                  <mat-label>Max File Size (MB)</mat-label>
                                  <input matInput type="number" formControlName="maxSize" min="1" max="100">
                                </mat-form-field>
                                <div class="half-width field-options">
                                  <mat-slide-toggle formControlName="multiple">
                                    Allow multiple files
                                  </mat-slide-toggle>
                                </div>
                              </div>
                            </div>
                          </div>
                        }

                        <div class="field-actions">
                          <button mat-button color="warn" type="button" 
                                  (click)="removeField(i)"
                                  [disabled]="fieldsArray.length === 1">
                            <mat-icon>delete</mat-icon>
                            Remove Field
                          </button>
                          <button mat-button type="button" (click)="duplicateField(i)">
                            <mat-icon>content_copy</mat-icon>
                            Duplicate
                          </button>
                        </div>
                      </div>
                    </mat-expansion-panel>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Display Settings -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>display_settings</mat-icon>
              Display Settings
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div formGroupName="displaySettings">
              <div class="form-row">
                <mat-form-field class="third-width">
                  <mat-label>Card Layout</mat-label>
                  <mat-select formControlName="cardLayout">
                    <mat-option value="compact">Compact</mat-option>
                    <mat-option value="detailed">Detailed</mat-option>
                    <mat-option value="timeline">Timeline</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field class="third-width">
                  <mat-label>Primary Field</mat-label>
                  <mat-select formControlName="primaryField">
                    @for (field of fieldsArray.controls; track field) {
                      <mat-option [value]="field.get('id')?.value">
                        {{field.get('name')?.value}}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field class="third-width">
                  <mat-label>Secondary Field</mat-label>
                  <mat-select formControlName="secondaryField">
                    <mat-option value="">None</mat-option>
                    @for (field of fieldsArray.controls; track field) {
                      <mat-option [value]="field.get('id')?.value">
                        {{field.get('name')?.value}}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-row">
                <div class="full-width field-options">
                  <mat-slide-toggle formControlName="showOnMap">
                    Show items on map
                  </mat-slide-toggle>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Actions -->
        <div class="builder-actions">
          <button mat-button type="button" (click)="onCancel()">
            Cancel
          </button>
          <button mat-button type="button" (click)="saveAsDraft()" 
                  [disabled]="!objectTypeForm.valid">
            <mat-icon>save</mat-icon>
            Save as Draft
          </button>
          <button mat-raised-button color="primary" type="button" 
                  (click)="onSave()" [disabled]="!objectTypeForm.valid || isSaving">
            <mat-icon>{{config.mode === 'create' ? 'add' : 'save'}}</mat-icon>
            {{config.mode === 'create' ? 'Create Object Type' : 'Save Changes'}}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrl: './object-type-builder.component.scss'
})
export class ObjectTypeBuilderComponent implements OnInit {
  @Input() config!: ObjectTypeBuilderConfig;
  @Output() save = new EventEmitter<WallObjectType>();
  @Output() cancel = new EventEmitter<void>();

  objectTypeForm!: FormGroup;
  expandedFieldIndex = -1;
  isSaving = false;

  iconOptions = [
    { value: 'person', label: 'Person' },
    { value: 'business', label: 'Business' },
    { value: 'event', label: 'Event' },
    { value: 'place', label: 'Place' },
    { value: 'article', label: 'Article' },
    { value: 'photo', label: 'Photo' },
    { value: 'military_tech', label: 'Military' },
    { value: 'school', label: 'Education' },
    { value: 'work', label: 'Work' },
    { value: 'category', label: 'Category' },
    { value: 'description', label: 'Document' },
    { value: 'star', label: 'Award' },
    { value: 'flag', label: 'Flag' },
    { value: 'public', label: 'Public' },
    { value: 'groups', label: 'Group' }
  ];

  colorOptions = [
    { value: '#6366f1', label: 'Indigo' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Red' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#84cc16', label: 'Lime' },
    { value: '#6b7280', label: 'Gray' },
    { value: '#059669', label: 'Teal' }
  ];

  fieldTypeOptions = [
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
    { value: 'image/*', label: 'Images' },
    { value: '.pdf', label: 'PDF Documents' },
    { value: '.doc,.docx', label: 'Word Documents' },
    { value: '.xls,.xlsx', label: 'Excel Spreadsheets' },
    { value: '.txt', label: 'Text Files' },
    { value: 'video/*', label: 'Videos' },
    { value: 'audio/*', label: 'Audio Files' }
  ];

  fieldTemplates = [
    { id: 'name', name: 'Full Name', icon: 'person', type: 'text', required: true },
    { id: 'email', name: 'Email Address', icon: 'email', type: 'email', required: false },
    { id: 'phone', name: 'Phone Number', icon: 'phone', type: 'text', required: false },
    { id: 'date', name: 'Date', icon: 'calendar_today', type: 'date', required: false },
    { id: 'description', name: 'Description', icon: 'notes', type: 'longtext', required: false },
    { id: 'photo', name: 'Photo', icon: 'photo', type: 'file', required: false }
  ];

  constructor(
    private fb: FormBuilder,
    private objectTypeService: ObjectTypeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  get fieldsArray(): FormArray {
    return this.objectTypeForm.get('fields') as FormArray;
  }

  get canAddField(): boolean {
    // For now, allow all authenticated users to add fields
    // TODO: Implement proper permission checking
    return true;
  }

  private initializeForm(): void {
    this.objectTypeForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      icon: ['category'],
      color: ['#6366f1'],
      fields: this.fb.array([]),
      displaySettings: this.fb.group({
        cardLayout: ['detailed'],
        showOnMap: [false],
        primaryField: [''],
        secondaryField: ['']
      }),
      isActive: [true],
      sortOrder: [0]
    });

    // Load initial data if editing
    if (this.config.initialData) {
      this.loadInitialData();
    } else {
      // Add default first field for new object types
      this.addField();
    }
  }

  private loadInitialData(): void {
    const data = this.config.initialData!;
    this.objectTypeForm.patchValue({
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      displaySettings: data.displaySettings,
      isActive: data.isActive,
      sortOrder: data.sortOrder
    });

    // Load fields
    if (data.fields) {
      data.fields.forEach(field => {
        this.fieldsArray.push(this.createFieldFormGroup(field));
      });
    }
  }

  private createFieldFormGroup(field?: Partial<FieldDefinition>): FormGroup {
    const fieldGroup = this.fb.group({
      id: [field?.id || this.generateFieldId()],
      name: [field?.name || '', Validators.required],
      type: [field?.type || 'text'],
      required: [field?.required || false],
      placeholder: [field?.placeholder || ''],
      description: [field?.description || ''],
      multiselectConfig: this.fb.group({
        options: [field?.multiselectConfig?.options || []],
        allowCustom: [field?.multiselectConfig?.allowCustom || false]
      }),
      fileConfig: this.fb.group({
        allowedTypes: [field?.fileConfig?.allowedTypes || []],
        maxSize: [field?.fileConfig?.maxSize || 10],
        multiple: [field?.fileConfig?.multiple || false]
      })
    });

    return fieldGroup;
  }

  addField(): void {
    const newField = this.createFieldFormGroup();
    this.fieldsArray.push(newField);
    this.expandedFieldIndex = this.fieldsArray.length - 1;
  }

  addFieldFromTemplate(template: any): void {
    const fieldData: Partial<FieldDefinition> = {
      name: template.name,
      type: template.type,
      required: template.required,
      placeholder: `Enter ${template.name.toLowerCase()}...`
    };

    if (template.type === 'file' && template.id === 'photo') {
      fieldData.fileConfig = {
        allowedTypes: ['image/*'],
        maxSize: 5,
        multiple: false
      };
    }

    const newField = this.createFieldFormGroup(fieldData);
    this.fieldsArray.push(newField);
    this.expandedFieldIndex = this.fieldsArray.length - 1;
  }

  removeField(index: number): void {
    this.fieldsArray.removeAt(index);
    if (this.expandedFieldIndex === index) {
      this.expandedFieldIndex = -1;
    } else if (this.expandedFieldIndex > index) {
      this.expandedFieldIndex--;
    }
  }

  duplicateField(index: number): void {
    const fieldToDuplicate = this.fieldsArray.at(index).value;
    const duplicatedField = {
      ...fieldToDuplicate,
      id: this.generateFieldId(),
      name: `${fieldToDuplicate.name} Copy`
    };
    
    const newFieldGroup = this.createFieldFormGroup(duplicatedField);
    this.fieldsArray.insert(index + 1, newFieldGroup);
    this.expandedFieldIndex = index + 1;
  }

  onFieldReorder(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.fieldsArray.controls, event.previousIndex, event.currentIndex);
    this.fieldsArray.updateValueAndValidity();
  }

  onFieldTypeChange(fieldIndex: number, newType: string): void {
    const field = this.fieldsArray.at(fieldIndex);
    
    // Reset type-specific configurations when type changes
    if (newType !== 'multiselect') {
      field.get('multiselectConfig')?.reset({ options: [], allowCustom: false });
    }
    if (newType !== 'file') {
      field.get('fileConfig')?.reset({ allowedTypes: [], maxSize: 10, multiple: false });
    }
  }

  getMultiselectOptionsText(field: FormGroup): string {
    const options = field.get('multiselectConfig.options')?.value || [];
    return options.join('\n');
  }

  updateMultiselectOptions(field: FormGroup, event: any): void {
    const text = event.target.value;
    const options = text.split('\n').filter((option: string) => option.trim());
    field.get('multiselectConfig.options')?.setValue(options);
  }

  getFieldTypeIcon(type: string): string {
    const option = this.fieldTypeOptions.find(opt => opt.value === type);
    return option?.icon || 'text_fields';
  }

  getFieldTypeLabel(type: string): string {
    const option = this.fieldTypeOptions.find(opt => opt.value === type);
    return option?.label || 'Text';
  }

  getBuilderTitle(): string {
    switch (this.config.mode) {
      case 'create': return 'Create New Object Type';
      case 'edit': return 'Edit Object Type';
      case 'template': return 'Create from Template';
      default: return 'Object Type Builder';
    }
  }

  getBuilderSubtitle(): string {
    switch (this.config.mode) {
      case 'create': return 'Define a new type of content for your wall';
      case 'edit': return 'Modify the structure and settings';
      case 'template': return 'Customize the template to fit your needs';
      default: return '';
    }
  }

  private generateFieldId(): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveAsDraft(): Promise<void> {
    // TODO: Implement draft saving functionality
    console.log('Save as draft:', this.objectTypeForm.value);
  }

  async onSave(): Promise<void> {
    if (!this.objectTypeForm.valid) return;

    this.isSaving = true;
    try {
      const formValue = this.objectTypeForm.value;
      const objectTypeData: WallObjectType = {
        id: this.config.initialData?.id || '', // Will be set by parent
        wallId: this.config.wallId,
        name: formValue.name,
        description: formValue.description,
        icon: formValue.icon,
        color: formValue.color,
        fields: formValue.fields,
        relationships: [], // TODO: Add relationship support
        displaySettings: formValue.displaySettings,
        isActive: formValue.isActive,
        sortOrder: formValue.sortOrder,
        createdAt: this.config.initialData?.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Emit the object type data to parent component for saving
      this.save.emit(objectTypeData);
    } catch (error) {
      console.error('Error preparing object type data:', error);
      // TODO: Show error message to user
    } finally {
      this.isSaving = false;
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}