import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { MatCheckbox, MatOption, MatSelect } from '../../../../shared/components/material-stubs';
import { WallObjectType, FieldDefinition } from '../../../../shared/models/wall.model';

export interface ObjectTypeBuilderConfig {
  mode: 'create' | 'edit';
  initialData?: Partial<WallObjectType>;
  wallId: string;
}

@Component({
  selector: 'app-object-type-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialIconComponent,
    MatCheckbox,
    MatOption,
    MatSelect
  ],
  template: `
    <div class="form-section-parent" [formGroup]="objectTypeForm">
      
      <!-- Object Details Section -->
      <div class="form-section">
        <h2>Object Details</h2>
        
        <div class="form-field">
          <label class="field-label">Object Name *</label>
          <div class="input-container">
            <mat-icon class="prefix-icon" [icon]="'label'"></mat-icon>
            <input 
              class="material-input" 
              formControlName="name" 
              placeholder="e.g., Veteran, Product, Event"
              required>
          </div>
        </div>
        
        <div class="form-field">
          <label class="field-label">Icon</label>
          <mat-select formControlName="icon" class="material-select" [displayValueFunction]="getIconDisplayValue" [showIcon]="true">
            @for (option of iconOptions; track option.value) {
              <mat-option [value]="option.value">
                <mat-icon class="option-icon" [icon]="option.value"></mat-icon>
                {{ option.label }}
              </mat-option>
            }
          </mat-select>
        </div>
        
        <div class="form-field">
          <label class="field-label">Description</label>
          <div class="input-container">
            <mat-icon class="prefix-icon" [icon]="'description'"></mat-icon>
            <textarea 
              class="material-textarea" 
              formControlName="description" 
              rows="2" 
              placeholder="Brief description of this object type"></textarea>
          </div>
          <div class="field-hint">Optional - what does this object represent?</div>
        </div>
      </div>

      <!-- Properties Section -->
      <div class="form-section properties-section">
        <div class="section-title-row">
          <h2>Object Properties</h2>
          <button 
            class="themed-button raised-button"
            type="button"
            (click)="addField()">
            <mat-icon style="margin-right: 8px; font-size: 18px; width: 18px; height: 18px;" [icon]="'add'"></mat-icon>
            Add Property
          </button>
        </div>
        <div class="section-divider"></div>
        
        @if (fieldsArray.length === 0) {
          <div class="empty-state">
            <mat-icon [icon]="'view_list'"></mat-icon>
            <p>Add properties to define what information each object will contain (name, date, location, etc.)</p>
          </div>
        } @else {
          <div class="properties-table" formArrayName="fields">
            <!-- Table Header -->
            <div class="table-header">
              <div class="header-cell name-column">Name</div>
              <div class="header-cell type-column">Type</div>
              <div class="header-cell required-column">Required</div>
              <div class="header-cell actions-column">Actions</div>
            </div>
            
            <!-- Table Rows -->
            @for (field of fieldsArray.controls; track $index) {
              <div class="table-row" [formGroupName]="$index">
                <div class="table-cell name-column">
                  <div class="property-name">
                    <mat-icon class="property-icon" [icon]="getFieldIcon(field.get('type')?.value)"></mat-icon>
                    <span class="property-title">{{ field.get('name')?.value || 'Untitled Property' }}</span>
                  </div>
                </div>
                
                <div class="table-cell type-column">
                  <span class="property-type">{{ getFieldTypeLabel(field.get('type')?.value) }}</span>
                </div>
                
                <div class="table-cell required-column">
                  @if (field.get('required')?.value) {
                    <div class="required-indicator">
                      <mat-icon class="required-icon" [icon]="'star'"></mat-icon>
                      <span class="required-text">Required</span>
                    </div>
                  } @else {
                    <span class="optional-text">Optional</span>
                  }
                </div>
                
                <div class="table-cell actions-column">
                  <div class="property-actions">
                    <button 
                      class="action-button"
                      type="button"
                      (click)="editField($index)"
                      title="Edit field">
                      <mat-icon [icon]="'edit'"></mat-icon>
                    </button>
                    <button 
                      class="action-button delete-action"
                      type="button"
                      (click)="removeField($index)"
                      title="Delete field">
                      <mat-icon [icon]="'delete'"></mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Action Bar -->
      <div class="action-bar" *ngIf="!showFieldEditor">
        @if (objectTypeForm.invalid) {
          <div class="form-warning">
            <mat-icon class="warning-icon" [icon]="'warning'"></mat-icon>
            <span>Please complete all required fields to save the object type</span>
          </div>
        }
        
        <div class="action-buttons">
          <button 
            class="themed-button stroked-button"
            type="button"
            (click)="onCancel()">
            Cancel
          </button>
          <button 
            class="themed-button raised-button"
            type="button"
            [disabled]="objectTypeForm.invalid"
            (click)="onSave()">
            Save Object Type
          </button>
        </div>
      </div>

      <!-- Property Editor Modal -->
      @if (showFieldEditor) {
        <div class="modal-backdrop" (click)="closeFieldEditor()">
          <div class="property-modal" (click)="$event.stopPropagation()">
            
            <div class="modal-header">
              <h2>{{ editingFieldIndex >= 0 ? 'Edit Property' : 'Add Property' }}</h2>
              <button 
                class="icon-button"
                type="button"
                (click)="closeFieldEditor()">
                <mat-icon [icon]="'close'"></mat-icon>
              </button>
            </div>
            
            <div class="modal-content">
              <form [formGroup]="fieldForm" class="property-form">
                <div class="form-field">
                  <label class="field-label">Property Name *</label>
                  <div class="input-container">
                    <mat-icon class="prefix-icon" [icon]="'label'"></mat-icon>
                    <input 
                      class="material-input" 
                      formControlName="name" 
                      placeholder="e.g., Full Name, Service Branch"
                      required>
                  </div>
                </div>

                <div class="form-field">
                  <label class="field-label">Property Type *</label>
                  <mat-select formControlName="type" class="material-select" [displayValueFunction]="getFieldTypeDisplayValue">
                    @for (option of fieldTypeOptions; track option.value) {
                      <mat-option [value]="option.value">
                        <mat-icon class="option-icon" [icon]="option.icon"></mat-icon>
                        {{ option.label }}
                      </mat-option>
                    }
                  </mat-select>
                </div>

                <div class="form-field">
                  <label class="field-label">Description</label>
                  <div class="input-container">
                    <mat-icon class="prefix-icon" [icon]="'description'"></mat-icon>
                    <textarea 
                      class="material-textarea" 
                      formControlName="description" 
                      rows="2" 
                      placeholder="What is this property for?"></textarea>
                  </div>
                  <div class="field-hint">Optional - provide context for this field</div>
                </div>

                <div class="form-field">
                  <label class="field-label">Placeholder Text</label>
                  <div class="input-container">
                    <mat-icon class="prefix-icon" [icon]="'edit'"></mat-icon>
                    <input 
                      class="material-input" 
                      formControlName="placeholder" 
                      placeholder="e.g., Enter full name">
                  </div>
                  <div class="field-hint">Optional - hint text shown in the input field</div>
                </div>

                <div class="checkbox-section">
                  <mat-checkbox formControlName="required">
                    Required field
                  </mat-checkbox>
                </div>
              </form>
            </div>

            <div class="modal-actions">
              <button 
                class="themed-button stroked-button"
                type="button"
                (click)="closeFieldEditor()">
                Cancel
              </button>
              <button 
                class="themed-button raised-button"
                type="button"
                [disabled]="fieldForm.invalid"
                (click)="saveField()">
                {{ editingFieldIndex >= 0 ? 'Update Property' : 'Add Property' }}
              </button>
            </div>
            
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-section-parent {
      display: flex;
      flex-direction: column;
      gap: 60px;
    }

    /* Form Sections */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .form-section:first-child {
      margin-top: 0;
    }

    .form-section h2 {
      margin: 0 0 4px 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }


    /* Material 3 Form Fields */
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 6px;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: flex-start;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      min-height: 56px;
      padding: 16px;
    }

    .input-container:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .input-container:focus-within {
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      padding: 15px; /* Adjust for thicker border */
    }

    .prefix-icon {
      color: var(--md-sys-color-on-surface-variant);
      margin-right: 12px;
      margin-top: 2px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .material-input,
    .material-textarea {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 1rem;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', 'Roboto', sans-serif;
      padding: 0;
      line-height: 1.5;
    }

    .material-input::placeholder,
    .material-textarea::placeholder {
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.5;
    }

    .material-textarea {
      resize: none;
      padding: 0;
      min-height: 48px;
      line-height: 1.5;
      vertical-align: top;
    }

    .material-select {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 1rem;
      color: var(--md-sys-color-on-surface);
      cursor: pointer;
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 4px;
    }

    .option-icon {
      margin-right: 12px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }


    /* Section Title Row */
    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .section-title-row h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .section-divider {
      height: 1px;
      background: var(--md-sys-color-outline-variant);
      margin-bottom: 12px;
    }


    .empty-state {
      text-align: center;
      padding: 32px 24px;
      color: var(--md-sys-color-on-surface-variant);
      background: var(--md-sys-color-surface-container-low);
      border-radius: var(--md-sys-shape-corner-medium);
      border: 1px dashed var(--md-sys-color-outline-variant);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.6;
      color: var(--md-sys-color-primary);
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.4;
      max-width: 280px;
      margin: 0 auto;
    }

    /* Table Styling */
    .properties-table {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-medium);
      border: 1px solid var(--md-sys-color-outline-variant);
      overflow: hidden;
      margin-top: 12px;
    }

    .table-header {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 16px;
      padding: 16px;
      background: var(--md-sys-color-surface-container);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .header-cell {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .table-row {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 16px;
      padding: 16px;
      min-height: 56px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
      align-items: center;
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .table-row:hover {
      background-color: var(--md-sys-color-surface-container);
    }

    .table-cell {
      display: flex;
      align-items: center;
    }

    /* Column-specific styling */
    .name-column {
      min-width: 200px;
    }

    .type-column {
      min-width: 120px;
      justify-content: flex-start;
    }

    .required-column {
      min-width: 100px;
      justify-content: flex-start;
    }

    .actions-column {
      min-width: 120px;
      justify-content: flex-start;
    }

    /* Property name styling */
    .property-name {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .property-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-on-surface-variant);
      flex-shrink: 0;
    }

    .property-title {
      font-size: 1rem;
      font-weight: 400;
      color: var(--md-sys-color-on-surface);
      line-height: 1.5;
    }

    /* Type styling */
    .property-type {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      background: var(--md-sys-color-surface-container-high);
      padding: 4px 12px;
      border-radius: var(--md-sys-shape-corner-small);
      font-weight: 500;
    }

    /* Required indicator styling */
    .required-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .required-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--md-sys-color-primary);
    }

    .required-text {
      font-size: 0.75rem;
      color: var(--md-sys-color-primary);
      font-weight: 500;
    }

    .optional-text {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.7;
    }

    /* Actions styling */
    .property-actions {
      display: flex;
      gap: 4px;
      opacity: 1;
    }

    .action-button {
      width: 40px;
      height: 40px;
      border: none;
      background: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .action-button:hover {
      background-color: var(--md-sys-color-surface-container-highest);
      color: var(--md-sys-color-primary);
    }

    .action-button.delete-action {
      color: var(--md-sys-color-on-surface-variant);
    }

    .action-button.delete-action:hover {
      background-color: color-mix(in srgb, var(--md-sys-color-error) 12%, transparent);
      color: var(--md-sys-color-error);
    }

    .action-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Action Bar */
    .action-bar {
    }

    .form-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      border-radius: var(--md-sys-shape-corner-small);
      margin-bottom: 16px;
      font-size: 0.875rem;
    }

    .warning-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-error);
      flex-shrink: 0;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    @media (max-width: 600px) {
      .action-buttons {
        flex-direction: column;
      }
    }

    /* Dialog */
    .dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .property-dialog {
      background: var(--md-sys-color-surface-container-high);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      max-width: 480px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .property-dialog mat-toolbar {
      min-height: 56px;
    }

    .spacer {
      flex: 1;
    }

    .dialog-form {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      overflow-y: auto;
    }

    .required-checkbox {
      margin-top: 8px;
    }

    mat-dialog-actions {
      padding: 16px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }

    /* Modal Styling - Proper Material 3 */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
      backdrop-filter: blur(2px);
    }

    .property-modal {
      background: var(--md-sys-color-surface-container-high);
      border-radius: var(--md-sys-shape-corner-large);
      box-shadow: var(--md-sys-elevation-5);
      max-width: 520px;
      width: 100%;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .property-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
    }

    .checkbox-section {
      margin-top: 8px;
      padding: 12px 0;
    }

    .checkbox-section mat-checkbox {
      font-size: 0.875rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 24px 24px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface-container);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .table-header {
        grid-template-columns: 1fr auto auto;
        gap: 12px;
        padding: 12px;
      }

      .table-row {
        grid-template-columns: 1fr auto auto;
        gap: 12px;
        padding: 12px;
      }

      .type-column {
        display: none;
      }

      .name-column {
        min-width: auto;
      }

      .property-name {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .property-type {
        font-size: 0.75rem;
        padding: 2px 8px;
        margin-top: 4px;
      }

      .property-title::after {
        content: " • " attr(data-type);
        font-size: 0.75rem;
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 400;
      }
    }

    @media (max-width: 600px) {
      .section-title-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .table-header {
        grid-template-columns: 1fr auto;
        gap: 8px;
        padding: 8px;
      }

      .table-row {
        grid-template-columns: 1fr auto;
        gap: 8px;
        padding: 12px 8px;
      }

      .required-column {
        display: none;
      }

      .property-actions {
        opacity: 1; /* Always visible on mobile */
      }

      .modal-backdrop {
        padding: 16px;
      }
      
      .property-modal {
        max-height: 90vh;
      }

      .modal-header {
        padding: 20px 20px 12px 20px;
      }

      .property-form {
        padding: 20px;
        gap: 16px;
      }

      .modal-actions {
        flex-direction: column;
        gap: 8px;
        padding: 16px 20px 20px 20px;
      }
    }

    /* Button Styles */
    .themed-button {
      border: none;
      cursor: pointer;
      font-family: 'Google Sans', sans-serif;
      font-weight: 500;
      text-transform: none;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      outline: none;
      position: relative;
      overflow: hidden;
      border-radius: 200px;
      height: 40px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      white-space: nowrap;
      min-width: 64px;
    }

    .themed-button:hover:not(:disabled) {
      box-shadow: var(--md-sys-elevation-1);
    }

    .themed-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    .themed-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .stroked-button {
      background-color: transparent;
      border: 1px solid var(--md-sys-color-outline);
      color: var(--md-sys-color-primary);
    }

    .stroked-button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
    }

    .raised-button {
      background-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      box-shadow: var(--md-sys-elevation-1);
    }

    .raised-button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
      box-shadow: var(--md-sys-elevation-2);
    }

    .raised-button:disabled {
      background-color: var(--md-sys-color-on-surface);
      color: var(--md-sys-color-surface);
      opacity: 0.38;
    }

    .icon-button {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      width: 40px;
      height: 40px;
    }

    .icon-button:hover {
      background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);
      color: var(--md-sys-color-on-surface);
    }

    .icon-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    .icon-button.delete-button {
      color: var(--md-sys-color-error);
    }

    .icon-button.delete-button:hover {
      background-color: color-mix(in srgb, var(--md-sys-color-error) 8%, transparent);
      color: var(--md-sys-color-error);
    }
  `]
})
export class ObjectTypeBuilderComponent implements OnInit {
  @Input() config!: ObjectTypeBuilderConfig;
  @Output() save = new EventEmitter<WallObjectType>();
  @Output() cancel = new EventEmitter<void>();

  objectTypeForm!: FormGroup;
  fieldForm!: FormGroup;
  showFieldEditor = false;
  editingFieldIndex = -1;

  iconOptions = [
    { value: 'person', label: 'Person' },
    { value: 'business', label: 'Business' },
    { value: 'event', label: 'Event' },
    { value: 'place', label: 'Place' },
    { value: 'military_tech', label: 'Military' },
    { value: 'school', label: 'Education' },
    { value: 'work', label: 'Work' },
    { value: 'star', label: 'Award' },
    { value: 'category', label: 'General' }
  ];


  fieldTypeOptions = [
    { value: 'text', label: 'Text', icon: 'text_fields' },
    { value: 'textarea', label: 'Long Text', icon: 'notes' },
    { value: 'number', label: 'Number', icon: 'numbers' },
    { value: 'date', label: 'Date', icon: 'calendar_today' },
    { value: 'email', label: 'Email', icon: 'email' },
    { value: 'url', label: 'Website URL', icon: 'link' },
    { value: 'color', label: 'Color', icon: 'palette' },
    { value: 'location', label: 'Map Location', icon: 'place' }
  ];

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {}

  // Display value functions for selects
  getIconDisplayValue = (value: string): string => {
    const option = this.iconOptions.find(opt => opt.value === value);
    return option?.label || 'Select icon';
  };

  getFieldTypeDisplayValue = (value: string): string => {
    const option = this.fieldTypeOptions.find(opt => opt.value === value);
    return option?.label || 'Select type';
  };

  ngOnInit(): void {
    this.initializeForms();
    if (this.config.initialData) {
      this.loadInitialData();
    }
  }

  get fieldsArray(): FormArray {
    return this.objectTypeForm.get('fields') as FormArray;
  }

  private initializeForms(): void {
    this.objectTypeForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      icon: ['category'],
      fields: this.fb.array([])
    });

    this.fieldForm = this.fb.group({
      name: ['', Validators.required],
      type: ['text', Validators.required],
      description: [''],
      placeholder: [''],
      required: [false]
    });
  }

  private loadInitialData(): void {
    const data = this.config.initialData!;
    this.objectTypeForm.patchValue({
      name: data.name,
      description: data.description,
      icon: data.icon
    });

    if (data.fields) {
      data.fields.forEach(field => {
        this.fieldsArray.push(this.createFieldFormGroup(field));
      });
    }
  }

  private createFieldFormGroup(field: FieldDefinition): FormGroup {
    return this.fb.group({
      id: [field.id || this.generateFieldId()],
      name: [field.name, Validators.required],
      type: [field.type],
      description: [field.description || ''],
      placeholder: [field.placeholder || ''],
      required: [field.required || false]
    });
  }

  getPropertyCardActions() {
    if (this.fieldsArray.length === 0) {
      return [];
    }
    return [
      {
        label: 'Add Property',
        icon: 'add',
        variant: 'stroked',
        color: 'primary',
        action: () => this.addField()
      }
    ];
  }

  addField(): void {
    this.fieldForm.reset({
      name: '',
      type: 'text',
      description: '',
      placeholder: '',
      required: false
    });
    this.editingFieldIndex = -1;
    this.showFieldEditor = true;
  }

  editField(index: number): void {
    const field = this.fieldsArray.at(index);
    this.fieldForm.patchValue(field.value);
    this.editingFieldIndex = index;
    this.showFieldEditor = true;
  }

  removeField(index: number): void {
    console.log('Removing field at index:', index);
    this.fieldsArray.removeAt(index);
    console.log('Fields array length after removal:', this.fieldsArray.length);
    this.cdr.detectChanges();
  }


  saveField(): void {
    if (this.fieldForm.invalid) {
      console.log('Field form is invalid:', this.fieldForm.errors);
      return;
    }

    const fieldData: FieldDefinition = {
      id: this.generateFieldId(),
      name: this.fieldForm.get('name')?.value || '',
      type: this.fieldForm.get('type')?.value || 'text',
      description: this.fieldForm.get('description')?.value || '',
      placeholder: this.fieldForm.get('placeholder')?.value || '',
      required: this.fieldForm.get('required')?.value || false
    };

    console.log('Creating field with data:', fieldData);

    if (this.editingFieldIndex >= 0) {
      // Edit existing field
      this.fieldsArray.at(this.editingFieldIndex).patchValue(fieldData);
      console.log('Updated existing field at index:', this.editingFieldIndex);
    } else {
      // Add new field
      const fieldFormGroup = this.createFieldFormGroup(fieldData);
      this.fieldsArray.push(fieldFormGroup);
      console.log('Added field to array. Current fields:', this.fieldsArray.controls.map(c => c.value));
      console.log('Fields array length:', this.fieldsArray.length);
    }

    // Force change detection
    this.cdr.detectChanges();
    
    this.closeFieldEditor();
  }

  closeFieldEditor(): void {
    this.showFieldEditor = false;
    this.editingFieldIndex = -1;
    this.fieldForm.reset();
  }

  getFieldIcon(type: string): string {
    const option = this.fieldTypeOptions.find(opt => opt.value === type);
    return option?.icon || 'text_fields';
  }

  getFieldTypeLabel(type: string): string {
    const option = this.fieldTypeOptions.find(opt => opt.value === type);
    return option?.label || 'Text';
  }

  private generateFieldId(): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onSave(): void {
    if (this.objectTypeForm.invalid) return;

    const objectType: WallObjectType = {
      id: this.config.initialData?.id || this.generateObjectTypeId(),
      ...this.objectTypeForm.value,
      createdAt: this.config.initialData?.createdAt || new Date(),
      updatedAt: new Date()
    };

    this.save.emit(objectType);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private generateObjectTypeId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}