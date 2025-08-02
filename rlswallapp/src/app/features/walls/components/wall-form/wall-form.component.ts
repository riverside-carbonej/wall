import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { WallService } from '../../services/wall.service';
import { Wall, FieldDefinition, DEFAULT_THEMES, WallTheme } from '../../../../shared/models/wall.model';
import { WallPermissionsService } from '../../../../core/services/wall-permissions.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-wall-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="wall-form-container">
      <header class="form-header">
        <h1>{{ isEditMode ? 'Edit Wall' : 'Create New Wall' }}</h1>
        <div class="header-actions">
          <button type="button" routerLink="/walls" class="cancel-button">Cancel</button>
          <button type="submit" (click)="onSubmit()" [disabled]="wallForm.invalid || isSaving" class="save-button">
            {{ isSaving ? 'Saving...' : 'Save Wall' }}
          </button>
        </div>
      </header>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          type="button" 
          *ngFor="let tab of tabs; let i = index"
          class="tab-button"
          [class.active]="activeTab === i"
          (click)="setActiveTab(i)"
        >
          {{ tab.label }}
        </button>
      </div>

      <form [formGroup]="wallForm" class="wall-form">
        <!-- Basic Information Tab -->
        <section class="tab-content" *ngIf="activeTab === 0">
          <div class="form-group">
            <label for="name">Wall Name *</label>
            <input 
              id="name" 
              type="text" 
              formControlName="name" 
              placeholder="Enter wall name"
              class="form-input"
            >
            <div class="error-message" *ngIf="wallForm.get('name')?.invalid && wallForm.get('name')?.touched">
              Wall name is required
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              formControlName="description" 
              placeholder="Optional description"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </section>

        <!-- Theme Selection Tab -->
        <section class="tab-content" *ngIf="activeTab === 1">
          <div class="theme-grid">
            <div 
              *ngFor="let theme of availableThemes" 
              class="theme-option"
              [class.selected]="selectedTheme.id === theme.id"
              (click)="selectTheme(theme)"
            >
              <div class="theme-preview" [style.background-color]="theme.backgroundColor">
                <div class="theme-header" [style.color]="theme.textColor">
                  <h4>{{ theme.name }}</h4>
                </div>
                <div class="theme-sample-card" 
                     [style.background-color]="theme.secondaryColor"
                     [style.color]="theme.textColor">
                  Sample Card
                </div>
              </div>
              <div class="theme-name">{{ theme.name }}</div>
            </div>
          </div>
        </section>

        <!-- Fields Tab -->
        <section class="tab-content" *ngIf="activeTab === 2">
          <div class="section-header">
            <button type="button" (click)="addField()" class="add-field-button">
              + Add Field
            </button>
          </div>

          <div formArrayName="fields" class="fields-container">
            <!-- Table Header -->
            <div class="fields-header">
              <div class="field-col-name">Field Name</div>
              <div class="field-col-type">Type</div>
              <div class="field-col-required">Required</div>
              <div class="field-col-placeholder">Placeholder</div>
              <div class="field-col-actions">Actions</div>
            </div>
            
            <!-- Field Rows -->
            <div 
              *ngFor="let fieldGroup of fieldsFormArray.controls; let i = index" 
              [formGroupName]="i" 
              class="field-row"
              (click)="editField(i)"
            >
              <div class="field-col-name">
                <span class="field-name-text">{{ fieldGroup.get('name')?.value || 'Untitled Field' }}</span>
              </div>
              <div class="field-col-type">
                <span class="field-type-text">{{ getFieldTypeLabel(fieldGroup.get('type')?.value) }}</span>
              </div>
              <div class="field-col-required">
                <span class="field-required-text" *ngIf="fieldGroup.get('required')?.value">Yes</span>
                <span class="field-optional-text" *ngIf="!fieldGroup.get('required')?.value">No</span>
              </div>
              <div class="field-col-placeholder">
                <span class="field-placeholder-text">{{ fieldGroup.get('placeholder')?.value || '—' }}</span>
              </div>
              <div class="field-col-actions">
                <button type="button" (click)="editField(i); $event.stopPropagation()" class="action-button edit-button" [attr.aria-label]="'Edit field ' + (i + 1)">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button type="button" (click)="removeField(i); $event.stopPropagation()" class="action-button delete-button" [attr.aria-label]="'Remove field ' + (i + 1)">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12 19,6.41Z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="empty-fields" *ngIf="fieldsFormArray.length === 0">
              <div class="empty-icon">📝</div>
              <p>No fields defined yet</p>
              <button type="button" (click)="addField()" class="add-first-field-button">
                Add Your First Field
              </button>
            </div>
          </div>
        </section>

        <!-- Permissions Tab -->
        <section class="tab-content" *ngIf="activeTab === 3">
          <div class="permissions-section">
            <h3>Who can edit this wall?</h3>
            <p class="section-description">Control who has permission to make changes to this wall.</p>
            
            <div class="permission-option">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="allowDepartmentEdit">
                  Allow department members to edit
                </label>
                <p class="help-text">Members of your department will be able to edit this wall</p>
              </div>
            </div>
            
            <div class="permission-option">
              <h4>Individual Editors</h4>
              <p class="help-text">Add specific people who can edit this wall</p>
              <div class="editors-list">
                <p class="coming-soon">✨ Individual editor management coming soon</p>
                <p class="help-text">For now, use department access or contact an administrator</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Publishing Tab -->
        <section class="tab-content" *ngIf="activeTab === 4">
          <div class="publishing-section">
            <h3>Publishing Options</h3>
            <p class="section-description">Control how and when this wall is visible to others.</p>
            
            <div class="publishing-status">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isPublished">
                  Publish this wall
                </label>
                <p class="help-text">Make this wall visible to others</p>
              </div>
            </div>
            
            <div class="visibility-options" *ngIf="wallForm.get('isPublished')?.value">
              <h4>Who can view this wall?</h4>
              
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" 
                         name="visibility" 
                         [value]="true"
                         [checked]="wallForm.get('requiresLogin')?.value === true"
                         (change)="setVisibility(true)">
                  <span class="radio-custom"></span>
                  <div class="radio-content">
                    <strong>👥 Riverside Users Only</strong>
                    <p>Only staff and students with Riverside Google accounts can view</p>
                  </div>
                </label>
                
                <label class="radio-label">
                  <input type="radio" 
                         name="visibility" 
                         [value]="false"
                         [checked]="wallForm.get('requiresLogin')?.value === false"
                         (change)="setVisibility(false)">
                  <span class="radio-custom"></span>
                  <div class="radio-content">
                    <strong>🌐 Public Access</strong>
                    <p>Anyone with the link can view (including parents and community)</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="publishing-preview" *ngIf="wallForm.get('isPublished')?.value">
              <h4>Share Link</h4>
              <div class="share-link-preview">
                <code>{{ getPreviewShareLink() }}</code>
                <button type="button" class="copy-button" (click)="copyShareLink()" title="Copy link">
                  📋
                </button>
              </div>
            </div>
            
            <div class="draft-info" *ngIf="!wallForm.get('isPublished')?.value">
              <div class="info-card">
                <span class="info-icon">🔒</span>
                <div>
                  <strong>Draft Mode</strong>
                  <p>Only you and editors can see this wall. Publish when ready to share.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>

      <!-- Field Edit Modal -->
      <div class="modal-overlay" *ngIf="editingFieldIndex !== null" (click)="closeEditModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Field {{ (editingFieldIndex !== null ? editingFieldIndex : 0) + 1 }}</h3>
            <button type="button" (click)="closeEditModal()" class="modal-close-button">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12 19,6.41Z"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-content" *ngIf="editingFieldIndex !== null" [formGroup]="getEditingFieldGroup()">
            <div class="form-group">
              <label>Field Name</label>
              <input 
                type="text" 
                formControlName="name" 
                placeholder="e.g. Full Name, Email Address, Phone Number"
                class="form-input"
              >
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Type</label>
                <select formControlName="type" class="form-select">
                  <option value="text">Short Text</option>
                  <option value="longtext">Long Text</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div class="form-group">
                <label>Field Options</label>
                <div class="checkbox-group-modal">
                  <label class="toggle-label">
                    <input type="checkbox" formControlName="required" class="toggle-input">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">Required</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Placeholder Text</label>
              <input 
                type="text" 
                formControlName="placeholder" 
                placeholder="Help text that appears in the field"
                class="form-input"
              >
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" (click)="closeEditModal()" class="cancel-button">Cancel</button>
            <button type="button" (click)="saveFieldEdit()" class="save-button">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wall-form-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 32px 24px;
      background: var(--md-sys-color-background);
      min-height: 100vh;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }

    .form-header h1 {
      margin: 0;
      color: var(--md-sys-color-on-background);
      font-size: 28px;
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .cancel-button {
      /* Material 3 Outlined Button */
      padding: 16px 24px;
      border: 1px solid var(--md-sys-color-outline);
      background: transparent;
      color: var(--md-sys-color-primary);
      border-radius: 24px;
      text-decoration: none;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.1px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .cancel-button:hover {
      background: var(--md-sys-color-primary-container);
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .cancel-button:focus {
      outline: none;
      background: var(--md-sys-color-primary-container);
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 3px var(--md-sys-color-primary-container);
    }

    .save-button {
      /* Material 3 Filled Button */
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      padding: 16px 24px;
      border: none;
      border-radius: 24px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.1px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: 40px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .save-button:hover:not(:disabled) {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
    }

    .save-button:focus:not(:disabled) {
      outline: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 0 0 3px var(--md-sys-color-primary-container);
    }

    .save-button:disabled {
      background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
      color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    /* Tab Navigation */
    .tab-navigation {
      display: flex;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      margin-bottom: 32px;
      background: var(--md-sys-color-surface);
    }

    .tab-button {
      background: transparent;
      border: none;
      padding: 16px 24px;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      border-bottom: 3px solid transparent;
      position: relative;
    }

    .tab-button:hover {
      background: var(--md-sys-color-surface-container-low);
      color: var(--md-sys-color-on-surface);
    }

    .tab-button.active {
      color: var(--md-sys-color-primary);
      border-bottom-color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
    }

    .tab-button:focus {
      outline: none;
      background: var(--md-sys-color-surface-container);
      box-shadow: inset 0 0 0 2px var(--md-sys-color-primary-container);
    }

    .wall-form {
      min-height: 400px;
    }

    .tab-content {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from { 
        opacity: 0;
        transform: translateY(8px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .section-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface);
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      letter-spacing: 0.1px;
    }

    .field-form .form-group label {
      color: var(--md-sys-color-on-surface-variant);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .form-input, .form-textarea, .form-select {
      /* Material 3 Outlined Text Field */
      width: 100%;
      padding: 16px 20px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 16px;
      font-size: 16px;
      line-height: 24px;
      font-family: 'Google Sans', sans-serif;
      font-weight: 400;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: 56px;
      box-sizing: border-box;
    }

    .form-input:hover, .form-textarea:hover, .form-select:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      box-shadow: 0 0 0 3px var(--md-sys-color-primary-container);
      /* Adjust padding to account for thicker border */
      padding: 15px 19px;
    }

    .form-textarea {
      min-height: 120px;
      resize: vertical;
      padding-top: 16px;
      padding-bottom: 16px;
    }

    .form-textarea:focus {
      padding-top: 15px;
      padding-bottom: 15px;
    }

    .form-select {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 16px center;
      background-repeat: no-repeat;
      background-size: 16px;
      padding-right: 48px;
      appearance: none;
      cursor: pointer;
    }

    .form-select:focus {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d4af37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
      padding-right: 47px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .checkbox-group {
      margin-bottom: 0;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: normal;
      color: var(--md-sys-color-on-surface);
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      accent-color: var(--md-sys-color-primary);
    }

    .error-message {
      color: #d32f2f;
      font-size: 12px;
      margin-top: 4px;
      font-family: 'Google Sans', sans-serif;
    }

    /* Theme Selection */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .theme-option {
      /* Material 3 Selectable Card */
      border: 2px solid var(--md-sys-color-outline);
      border-radius: 20px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      background: var(--md-sys-color-surface-container-low);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .theme-option:hover {
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 12px 4px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .theme-option.selected {
      border-color: var(--md-sys-color-primary);
      border-width: 3px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 12px 4px rgba(0, 0, 0, 0.15);
      background: var(--md-sys-color-primary-container);
    }

    .theme-option:focus {
      outline: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 12px 4px rgba(0, 0, 0, 0.15), 0 0 0 3px var(--md-sys-color-primary-container);
    }

    .theme-preview {
      padding: 16px;
      height: 100px;
      position: relative;
    }

    .theme-header h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
    }

    .theme-sample-card {
      padding: 8px;
      border-radius: 4px;
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
    }

    .theme-name {
      padding: 12px;
      background: var(--md-sys-color-surface-variant);
      text-align: center;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
    }

    /* Field Definition */
    .add-field-button {
      /* Material 3 Filled Tonal Button */
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      border: none;
      padding: 12px 20px;
      border-radius: 24px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.1px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 40px;
    }

    .add-field-button:hover {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--md-sys-color-primary-container) 92%, var(--md-sys-color-on-primary-container) 8%);
    }

    .add-field-button:focus {
      outline: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 0 0 3px var(--md-sys-color-primary-container);
    }

    .fields-container {
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 8px;
      overflow: hidden;
      background: var(--md-sys-color-surface);
    }

    .field-definition {
      /* Material 3 Surface Container High */
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 20px;
      padding: 20px;
      background: var(--md-sys-color-surface-container);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .field-definition:hover {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .field-number {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      width: 32px;
      height: 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .remove-field-button {
      /* Material 3 Icon Button */
      background: transparent;
      color: var(--md-sys-color-error);
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      position: relative;
    }

    .remove-field-button:hover {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      transform: scale(1.05);
    }

    .remove-field-button:focus {
      outline: none;
      background: var(--md-sys-color-error-container);
      box-shadow: 0 0 0 3px var(--md-sys-color-error-container);
    }

    .remove-field-button:active {
      transform: scale(0.95);
    }

    .field-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Primary field name - most important */
    .field-primary {
      margin-bottom: 4px;
    }

    .field-primary .form-group label {
      font-size: 16px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      text-transform: none;
      letter-spacing: 0.15px;
      margin-bottom: 8px;
    }

    /* Config row - type and required toggle */
    .field-config-row {
      display: flex;
      gap: 24px;
      align-items: end;
      padding: 16px 0;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .field-type-group {
      flex: 1;
      margin-bottom: 0;
    }

    /* Material 3 Toggle Switch */
    .field-required-toggle {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .toggle-input {
      display: none;
    }

    .toggle-slider {
      position: relative;
      width: 52px;
      height: 32px;
      background: var(--md-sys-color-surface-variant);
      border: 2px solid var(--md-sys-color-outline);
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      cursor: pointer;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      left: 4px;
      top: 4px;
      background: var(--md-sys-color-outline);
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .toggle-input:checked + .toggle-slider {
      background: var(--md-sys-color-primary);
      border-color: var(--md-sys-color-primary);
    }

    .toggle-input:checked + .toggle-slider::before {
      transform: translateX(20px);
      background: var(--md-sys-color-on-primary);
    }

    .toggle-text {
      user-select: none;
    }

    /* Secondary options */
    .field-secondary {
      margin-top: 4px;
    }

    .field-secondary .form-group label {
      font-size: 14px;
      font-weight: 400;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: none;
      letter-spacing: 0.1px;
    }

    .field-form .form-group {
      margin-bottom: 0;
    }

    .empty-fields {
      text-align: center;
      padding: 48px 16px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-fields p {
      margin: 0 0 24px 0;
      color: var(--md-sys-color-on-surface-variant);
      font-family: 'Google Sans', sans-serif;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .wall-form-container {
        padding: 24px 16px;
      }

      .form-section {
        padding: 20px;
        border-radius: 16px;
      }

      .field-definition {
        padding: 16px;
        border-radius: 16px;
      }

      .field-config-row {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .field-required-toggle {
        justify-content: center;
        padding: 12px 0;
      }

      .header-actions {
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }

      .cancel-button,
      .save-button {
        width: 100%;
        justify-content: center;
      }

      .theme-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .wall-form-container {
        padding: 16px 12px;
      }

      .form-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .form-header h1 {
        font-size: 24px;
        text-align: center;
      }
    }

    .add-first-field-button {
      /* Material 3 Filled Button */
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      padding: 16px 32px;
      border-radius: 24px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.1px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .add-first-field-button:hover {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
    }

    @media (max-width: 768px) {
      .wall-form-container {
        padding: 1rem;
      }

      .form-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .header-actions {
        justify-content: stretch;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .theme-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Google Drive Style Table Layout */
    .fields-header {
      display: grid;
      grid-template-columns: 1fr 120px 80px 1fr 100px;
      gap: 16px;
      padding: 8px 12px;
      background: var(--md-sys-color-surface-variant);
      border-radius: 8px 8px 0 0;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      font-size: 12px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Google Sans', sans-serif;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 120px 80px 1fr 100px;
      gap: 16px;
      padding: 12px;
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      cursor: pointer;
      transition: background-color 0.2s ease;
      align-items: center;
      min-height: 48px;
    }

    .field-row:hover {
      background: var(--md-sys-color-surface-container-low);
    }

    .field-row:last-child {
      border-radius: 0 0 8px 8px;
    }


    .field-col-name {
      display: flex;
      align-items: center;
    }

    .field-name-text {
      color: var(--md-sys-color-on-surface);
      font-size: 14px;
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .field-col-type {
      display: flex;
      align-items: center;
    }

    .field-type-text {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
    }

    .field-col-required {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .field-required-text {
      color: var(--md-sys-color-error);
      font-size: 13px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .field-optional-text {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
    }

    .field-col-placeholder {
      display: flex;
      align-items: center;
    }

    .field-placeholder-text {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-weight: 400;
      font-family: 'Google Sans', sans-serif;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .field-col-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    .action-button {
      background: transparent;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: var(--md-sys-color-on-surface-variant);
    }

    .action-button:hover {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
    }

    .action-button:focus {
      outline: none;
      background: var(--md-sys-color-surface-container);
      box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
    }

    .delete-button:hover {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }

    .delete-button:focus {
      background: var(--md-sys-color-error-container);
      box-shadow: 0 0 0 2px var(--md-sys-color-error-container);
    }

    /* Modal Overlay and Container */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
      animation: fadeIn 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .modal-container {
      background: var(--md-sys-color-surface-container-high);
      border-radius: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
      animation: slideUp 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px 16px 28px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .modal-header h3 {
      margin: 0;
      color: var(--md-sys-color-on-surface);
      font-size: 20px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .modal-close-button {
      background: transparent;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      color: var(--md-sys-color-on-surface-variant);
    }

    .modal-close-button:hover {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface);
      transform: scale(1.1);
    }

    .modal-close-button:focus {
      outline: none;
      background: var(--md-sys-color-surface-variant);
      box-shadow: 0 0 0 3px var(--md-sys-color-primary-container);
    }

    .modal-content {
      padding: 24px 28px;
      max-height: 50vh;
      overflow-y: auto;
    }

    .modal-content .form-group {
      margin-bottom: 20px;
    }

    .modal-content .form-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface);
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
    }

    .checkbox-group-modal {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 28px 24px 28px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }

    .modal-actions .cancel-button {
      background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      border: 1px solid var(--md-sys-color-outline);
      padding: 12px 20px;
      border-radius: 20px;
      font-size: 14px;
      min-height: 40px;
    }

    .modal-actions .save-button {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      padding: 12px 20px;
      border-radius: 20px;
      font-size: 14px;
      min-height: 40px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Responsive modal */
    @media (max-width: 768px) {
      .modal-overlay {
        padding: 16px;
      }

      .modal-container {
        max-height: 90vh;
        border-radius: 20px;
      }

      .modal-header {
        padding: 20px 24px 16px 24px;
      }

      .modal-content {
        padding: 20px 24px;
      }

      .modal-actions {
        padding: 16px 24px 20px 24px;
        flex-direction: column;
      }

      .modal-actions .cancel-button,
      .modal-actions .save-button {
        width: 100%;
        justify-content: center;
      }

      .field-summary {
        flex-direction: column;
        gap: 12px;
      }

      .field-actions {
        align-self: flex-end;
      }

      .field-details {
        justify-content: flex-start;
      }

      /* Mobile responsive table */
      .fields-header {
        grid-template-columns: 1fr 80px 60px 1fr 80px;
        gap: 8px;
        padding: 8px;
        font-size: 11px;
      }

      .field-row {
        grid-template-columns: 1fr 80px 60px 1fr 80px;
        gap: 8px;
        padding: 10px 8px;
        min-height: 44px;
      }

      .field-name-text {
        font-size: 13px;
      }

      .field-type-text,
      .field-required-text,
      .field-optional-text,
      .field-placeholder-text {
        font-size: 12px;
      }

      .action-button {
        width: 28px;
        height: 28px;
      }

      /* Mobile tab navigation */
      .tab-navigation {
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .tab-navigation::-webkit-scrollbar {
        display: none;
      }

      .tab-button {
        padding: 12px 16px;
        font-size: 13px;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: 80px;
      }
    }

    /* New Permissions and Publishing Styles */
    .permissions-section,
    .publishing-section {
      max-width: 600px;
    }

    .permissions-section h3,
    .publishing-section h3 {
      margin: 0 0 8px 0;
      color: var(--md-sys-color-on-surface);
      font-size: 20px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .section-description {
      margin: 0 0 24px 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
    }

    .permission-option,
    .publishing-status {
      margin-bottom: 24px;
      padding: 20px;
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      background: var(--md-sys-color-surface-container-low);
    }

    .permission-option h4,
    .publishing-section h4 {
      margin: 0 0 8px 0;
      color: var(--md-sys-color-on-surface);
      font-size: 16px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .help-text {
      margin: 8px 0 0 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-family: 'Google Sans', sans-serif;
      line-height: 1.4;
    }

    .editors-list {
      margin-top: 16px;
    }

    .coming-soon {
      color: var(--md-sys-color-primary);
      font-style: italic;
      margin: 0 0 8px 0;
    }

    .visibility-options {
      margin-top: 24px;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    .radio-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 2px solid var(--md-sys-color-outline-variant);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      background: var(--md-sys-color-surface);
    }

    .radio-label:hover {
      border-color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
    }

    .radio-label input[type="radio"] {
      display: none;
    }

    .radio-label input[type="radio"]:checked + .radio-custom {
      border-color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary);
    }

    .radio-label input[type="radio"]:checked + .radio-custom::after {
      opacity: 1;
      transform: scale(1);
    }

    .radio-label:has(input[type="radio"]:checked) {
      border-color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
    }

    .radio-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--md-sys-color-outline);
      border-radius: 50%;
      position: relative;
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .radio-custom::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--md-sys-color-on-primary);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .radio-content {
      flex: 1;
    }

    .radio-content strong {
      display: block;
      margin-bottom: 4px;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
    }

    .radio-content p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-family: 'Google Sans', sans-serif;
      line-height: 1.4;
    }

    .publishing-preview {
      margin-top: 24px;
    }

    .share-link-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--md-sys-color-surface-variant);
      border-radius: 8px;
      margin-top: 8px;
    }

    .share-link-preview code {
      flex: 1;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      color: var(--md-sys-color-on-surface);
      background: none;
      padding: 0;
      word-break: break-all;
    }

    .copy-button {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      font-size: 14px;
    }

    .copy-button:hover {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      transform: scale(1.1);
    }

    .info-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: var(--md-sys-color-surface-container);
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline-variant);
    }

    .info-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .info-card strong {
      display: block;
      margin-bottom: 4px;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
    }

    .info-card p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 13px;
      font-family: 'Google Sans', sans-serif;
      line-height: 1.4;
    }
  `]
})
export class WallFormComponent implements OnInit {
  wallForm!: FormGroup;
  isEditMode = false;
  isSaving = false;
  wallId?: string;
  availableThemes = DEFAULT_THEMES;
  selectedTheme: WallTheme = DEFAULT_THEMES[0];
  editingFieldIndex: number | null = null;
  activeTab = 0;
  tabs = [
    { label: 'Basic Info' },
    { label: 'Theme' },
    { label: 'Fields' },
    { label: 'Permissions' },
    { label: 'Publishing' }
  ];

  constructor(
    private fb: FormBuilder,
    private wallService: WallService,
    private router: Router,
    private route: ActivatedRoute,
    private wallPermissions: WallPermissionsService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.wallId;

    if (this.isEditMode && this.wallId) {
      this.loadWall(this.wallId);
    } else {
      // Check for template parameter
      const template = this.route.snapshot.queryParamMap.get('template');
      if (template) {
        this.loadTemplate(template);
      }
    }
  }

  private initializeForm(): void {
    this.wallForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      fields: this.fb.array([]),
      
      // Permission controls
      allowDepartmentEdit: [false],
      editors: this.fb.array([]),
      
      // Publishing controls
      isPublished: [false],
      requiresLogin: [true], // Default to login-required
      
      // Legacy field for backward compatibility
      isPublic: [false]
    });
  }

  get fieldsFormArray(): FormArray {
    return this.wallForm.get('fields') as FormArray;
  }

  private loadTemplate(templateType: string): void {
    const templates = {
      alumni: {
        name: 'Alumni Directory',
        description: 'Track alumni information and achievements',
        fields: [
          { name: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
          { name: 'Graduation Year', type: 'number', required: true, placeholder: 'YYYY' },
          { name: 'Degree/Program', type: 'text', required: true, placeholder: 'e.g., Bachelor of Science' },
          { name: 'Current Position', type: 'text', required: false, placeholder: 'Job title' },
          { name: 'Company/Organization', type: 'text', required: false, placeholder: 'Current employer' },
          { name: 'Location', type: 'text', required: false, placeholder: 'City, State/Country' },
          { name: 'LinkedIn Profile', type: 'url', required: false, placeholder: 'https://linkedin.com/in/...' },
          { name: 'Email', type: 'email', required: false, placeholder: 'contact@email.com' },
          { name: 'Phone', type: 'tel', required: false, placeholder: '+1 (555) 123-4567' },
          { name: 'Notes', type: 'textarea', required: false, placeholder: 'Additional information' }
        ]
      },
      veterans: {
        name: 'Veterans Registry',
        description: 'Honor and track veteran service members',
        fields: [
          { name: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
          { name: 'Rank', type: 'text', required: true, placeholder: 'Final rank achieved' },
          { name: 'Branch of Service', type: 'select', required: true, placeholder: 'Army, Navy, Air Force, Marines, Coast Guard, Space Force' },
          { name: 'Years of Service', type: 'text', required: true, placeholder: 'e.g., 1990-2010' },
          { name: 'Military Occupation', type: 'text', required: false, placeholder: 'MOS/Rating/AFSC' },
          { name: 'Deployments', type: 'textarea', required: false, placeholder: 'List deployments and locations' },
          { name: 'Awards & Decorations', type: 'textarea', required: false, placeholder: 'Military honors received' },
          { name: 'Current Status', type: 'select', required: false, placeholder: 'Active, Reserve, Retired, Veteran' },
          { name: 'Contact Information', type: 'text', required: false, placeholder: 'Phone or email' },
          { name: 'Memorial Information', type: 'textarea', required: false, placeholder: 'For fallen heroes (optional)' }
        ]
      },
      team: {
        name: 'Team Directory',
        description: 'Manage team member information and roles',
        fields: [
          { name: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
          { name: 'Position/Role', type: 'text', required: true, placeholder: 'Job title or role' },
          { name: 'Department', type: 'text', required: true, placeholder: 'Team or department' },
          { name: 'Employee ID', type: 'text', required: false, placeholder: 'Unique identifier' },
          { name: 'Start Date', type: 'date', required: false, placeholder: 'YYYY-MM-DD' },
          { name: 'Manager', type: 'text', required: false, placeholder: 'Direct supervisor' },
          { name: 'Skills', type: 'textarea', required: false, placeholder: 'Key skills and expertise' },
          { name: 'Work Email', type: 'email', required: false, placeholder: 'work@company.com' },
          { name: 'Extension', type: 'tel', required: false, placeholder: 'Phone extension' },
          { name: 'Office Location', type: 'text', required: false, placeholder: 'Building/floor/room' }
        ]
      }
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      this.wallForm.patchValue({
        name: template.name,
        description: template.description
      });

      // Add template fields
      template.fields.forEach(fieldDef => {
        const fieldGroup = this.createFieldFormGroup({
          id: this.generateFieldId(),
          name: fieldDef.name,
          type: fieldDef.type as any,
          required: fieldDef.required,
          placeholder: fieldDef.placeholder
        });
        this.fieldsFormArray.push(fieldGroup);
      });
    }
  }

  private loadWall(id: string): void {
    this.wallService.getWallById(id).subscribe({
      next: (wall) => {
        if (wall) {
          this.selectedTheme = wall.theme;
          this.wallForm.patchValue({
            name: wall.name,
            description: wall.description,
            isPublic: wall.isPublic
          });

          // Load fields
          wall.fields.forEach(field => {
            this.fieldsFormArray.push(this.createFieldFormGroup(field));
          });
        }
      },
      error: (error) => {
        console.error('Error loading wall:', error);
        alert('Failed to load wall. Redirecting to wall list.');
        this.router.navigate(['/walls']);
      }
    });
  }

  selectTheme(theme: WallTheme): void {
    this.selectedTheme = theme;
  }

  setActiveTab(index: number): void {
    this.activeTab = index;
  }

  addField(): void {
    this.fieldsFormArray.push(this.createFieldFormGroup());
  }

  removeField(index: number): void {
    this.fieldsFormArray.removeAt(index);
  }

  private createFieldFormGroup(field?: FieldDefinition): FormGroup {
    return this.fb.group({
      id: [field?.id || this.generateFieldId()],
      name: [field?.name || '', [Validators.required]],
      type: [field?.type || 'text', [Validators.required]],
      required: [field?.required || false],
      placeholder: [field?.placeholder || '']
    });
  }

  private generateFieldId(): string {
    return 'field_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  editField(index: number): void {
    this.editingFieldIndex = index;
  }

  closeEditModal(): void {
    this.editingFieldIndex = null;
  }

  saveFieldEdit(): void {
    // Changes are automatically saved to the form since we're using reactive forms
    this.closeEditModal();
  }

  getEditingFieldGroup(): FormGroup {
    if (this.editingFieldIndex !== null) {
      return this.fieldsFormArray.at(this.editingFieldIndex) as FormGroup;
    }
    // Return empty form group as fallback
    return this.fb.group({
      name: [''],
      type: ['text'],
      required: [false],
      placeholder: ['']
    });
  }

  getFieldTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'text': 'Short Text',
      'longtext': 'Long Text',
      'textarea': 'Long Text',
      'email': 'Email',
      'number': 'Number',
      'date': 'Date',
      'url': 'URL',
      'tel': 'Phone',
      'select': 'Dropdown'
    };
    return typeLabels[type] || 'Text';
  }

  setVisibility(requiresLogin: boolean): void {
    this.wallForm.patchValue({ requiresLogin });
  }

  getPreviewShareLink(): string {
    const wallName = this.wallForm.get('name')?.value || 'my-wall';
    const slug = wallName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const baseUrl = 'https://riverside-wall-app.web.app';
    
    if (this.wallForm.get('requiresLogin')?.value) {
      return `${baseUrl}/internal/${slug}`;
    }
    return `${baseUrl}/wall/${slug}`;
  }

  async copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getPreviewShareLink());
      // TODO: Show success toast
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(this.getPreviewShareLink());
    }
  }

  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('Link copied to clipboard (fallback)');
    } catch (err) {
      console.error('Fallback: Could not copy text: ', err);
    }
    
    document.body.removeChild(textArea);
  }

  onSubmit(): void {
    if (this.wallForm.valid && !this.isSaving) {
      this.isSaving = true;

      // Get current user for permissions
      this.authService.currentUser$.subscribe(user => {
        if (!user) {
          this.isSaving = false;
          alert('You must be logged in to save a wall.');
          return;
        }

        // Create permissions
        const permissions = this.wallPermissions.createDefaultPermissions(user.uid);
        permissions.allowDepartmentEdit = this.wallForm.get('allowDepartmentEdit')?.value || false;

        // Create visibility
        const visibility = this.wallPermissions.createDefaultVisibility();
        if (this.wallForm.get('isPublished')?.value) {
          const publishSettings = this.wallPermissions.getPublishSettings(
            !this.wallForm.get('requiresLogin')?.value
          );
          Object.assign(visibility, publishSettings);
          visibility.publishedBy = user.uid;
        }

        const wallData: Omit<Wall, 'id'> = {
          name: this.wallForm.get('name')?.value,
          description: this.wallForm.get('description')?.value,
          fields: this.wallForm.get('fields')?.value,
          theme: this.selectedTheme,
          permissions,
          visibility,
          createdAt: new Date(),
          updatedAt: new Date(),
          
          // Legacy fields for backward compatibility
          ownerId: user.uid,
          isPublic: this.wallForm.get('isPublished')?.value && !this.wallForm.get('requiresLogin')?.value,
          sharedWith: []
        };

        if (this.isEditMode && this.wallId) {
          this.wallService.updateWall(this.wallId, wallData).subscribe({
            next: () => {
              this.isSaving = false;
              this.router.navigate(['/walls']);
            },
            error: (error: any) => {
              this.isSaving = false;
              console.error('Error saving wall:', error);
              alert('Failed to save wall. Please try again.');
            }
          });
        } else {
          this.wallService.createWall(wallData).subscribe({
            next: (result: string) => {
              this.isSaving = false;
              this.router.navigate(['/walls']);
            },
            error: (error: any) => {
              this.isSaving = false;
              console.error('Error saving wall:', error);
              alert('Failed to save wall. Please try again.');
            }
          });
        }
      });
    }
  }
}