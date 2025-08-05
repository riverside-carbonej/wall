import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { WallService } from '../../services/wall.service';
import { WallDataService } from '../../services/wall-data.service';
import { Wall, DEFAULT_THEMES, WallTheme } from '../../../../shared/models/wall.model';
import { WallPermissionsService } from '../../../../core/services/wall-permissions.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonGroupComponent, ButtonGroupItem } from '../../../../shared/components/button-group/button-group.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { MaterialSwitchComponent } from '../../../../shared/components/material-switch/material-switch.component';
import { Observable } from 'rxjs';
import { WallTemplatesService } from '../../services/wall-templates.service';
import { NavigationService } from '../../../../shared/services/navigation.service';

@Component({
  selector: 'app-wall-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonGroupComponent, PageLayoutComponent, MaterialSwitchComponent],
  template: `
    <app-page-layout
      [title]="isEditMode ? 'Edit Wall' : 'Create New Wall'"
      [subtitle]="isEditMode ? 'Update wall settings and appearance' : 'Configure your new wall'"
      [showBackButton]="true"
      [actions]="getPageActions()"
      (backClick)="onCancel()">
      
      <!-- Tab Navigation -->
      <app-button-group
        [items]="tabItems"
        [activeId]="activeTab.toString()"
        (selectionChange)="onTabChange($event)">
      </app-button-group>

      <form [formGroup]="wallForm" class="wall-form">
        <!-- Basic Information Tab -->
        <section class="tab-content" *ngIf="activeTab === 0">
          <div class="basic-info-section">
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
            <label for="organizationSubtitle">Subtitle</label>
            <input 
              id="organizationSubtitle" 
              type="text" 
              formControlName="organizationSubtitle" 
              placeholder="e.g., Riverside Local Schools"
              class="form-input"
            >
            <div class="form-help-text">This appears below the wall name</div>
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

          <!-- Organization Branding Section -->
          <div class="form-section">
            <h3>Organization Branding</h3>
            
            <div class="form-group">
              <label for="organizationName">Organization Name</label>
              <input 
                id="organizationName" 
                type="text" 
                formControlName="organizationName" 
                placeholder="e.g., Riverside High School"
                class="form-input"
              >
            </div>


            <div class="form-group">
              <label for="organizationLogo">Organization Logo</label>
              <div class="logo-upload-container">
                <div class="logo-preview" *ngIf="currentLogoUrl">
                  <img [src]="currentLogoUrl" alt="Current logo" class="logo-preview-image">
                </div>
                <div class="logo-upload-actions">
                  <input 
                    #logoFileInput
                    type="file" 
                    accept="image/*" 
                    (change)="onLogoFileSelected($event)"
                    class="file-input"
                    hidden
                  >
                  <button type="button" (click)="logoFileInput.click()" class="upload-button">
                    <span class="material-icons md-18">{{ currentLogoUrl ? 'edit' : 'upload' }}</span>
                    {{ currentLogoUrl ? 'Change Logo' : 'Upload Logo' }}
                  </button>
                  <button 
                    type="button" 
                    (click)="resetToDefaultLogo()" 
                    class="reset-button"
                    *ngIf="currentLogoUrl && currentLogoUrl !== '/assets/images/beaver-logo.png'"
                  >
                    <span class="material-icons md-18">refresh</span>
                    Reset to Default
                  </button>
                </div>
                <div class="logo-help-text">
                  Recommended: SVG or PNG format, square aspect ratio, max 2MB
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Theme Selection Tab -->
        <section class="tab-content" *ngIf="activeTab === 1">
          <div class="theme-section">
          <!-- Theme Presets -->
          <div class="theme-presets-section">
            <h3>Start with a preset</h3>
            <p class="section-help-text">Choose a starting point, then customize individual colors below</p>
            <div class="theme-grid">
              <div 
                *ngFor="let theme of availableThemes" 
                class="theme-option"
                [class.selected]="selectedTheme.id === theme.id"
                (click)="selectTheme(theme)"
              >
                <div class="theme-preview" [style.background-color]="theme.backgroundColor">
                  <div class="theme-header" [style.color]="theme.bodyTextColor">
                    <h4>{{ theme.name }}</h4>
                  </div>
                  <div class="theme-sample-card" 
                       [style.background-color]="theme.secondaryColor"
                       [style.color]="theme.bodyTextColor">
                    Sample Card
                  </div>
                </div>
                <div class="theme-name">{{ theme.name }}</div>
              </div>
            </div>
          </div>

          <!-- Custom Color Editor -->
          <div class="color-editor-section">
            <h3>Customize colors</h3>
            <p class="section-help-text">Click any color to customize it with the color picker</p>
            
            <!-- Core Brand Colors -->
            <div class="color-group">
              <h4>Brand Colors</h4>
              <div class="color-row">
                <div class="color-field">
                  <label>Primary Color</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.primaryColor"
                      (input)="updateThemeColor('primaryColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.primaryColor"
                      (input)="updateThemeColor('primaryColor', $event)"
                      class="color-text"
                      placeholder="#d4af37">
                  </div>
                </div>
                <div class="color-field">
                  <label>Secondary Color</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.secondaryColor"
                      (input)="updateThemeColor('secondaryColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.secondaryColor"
                      (input)="updateThemeColor('secondaryColor', $event)"
                      class="color-text"
                      placeholder="#8b7d3a">
                  </div>
                </div>
                <div class="color-field">
                  <label>Tertiary Color</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.tertiaryColor"
                      (input)="updateThemeColor('tertiaryColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.tertiaryColor"
                      (input)="updateThemeColor('tertiaryColor', $event)"
                      class="color-text"
                      placeholder="#f4e4a6">
                  </div>
                </div>
              </div>
            </div>

            <!-- Surface Colors -->
            <div class="color-group">
              <h4>Surface Colors</h4>
              <div class="color-row">
                <div class="color-field">
                  <label>Background</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.backgroundColor"
                      (input)="updateThemeColor('backgroundColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.backgroundColor"
                      (input)="updateThemeColor('backgroundColor', $event)"
                      class="color-text"
                      placeholder="#fefefe">
                  </div>
                </div>
                <div class="color-field">
                  <label>Surface</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.surfaceColor"
                      (input)="updateThemeColor('surfaceColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.surfaceColor"
                      (input)="updateThemeColor('surfaceColor', $event)"
                      class="color-text"
                      placeholder="#ffffff">
                  </div>
                </div>
                <div class="color-field">
                  <label>Card</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.cardColor"
                      (input)="updateThemeColor('cardColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.cardColor"
                      (input)="updateThemeColor('cardColor', $event)"
                      class="color-text"
                      placeholder="#ffffff">
                  </div>
                </div>
              </div>
            </div>

            <!-- Typography Colors -->
            <div class="color-group">
              <h4>Text Colors</h4>
              <div class="color-row">
                <div class="color-field">
                  <label>Title Text</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.titleColor"
                      (input)="updateThemeColor('titleColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.titleColor"
                      (input)="updateThemeColor('titleColor', $event)"
                      class="color-text"
                      placeholder="#1a1a1a">
                  </div>
                </div>
                <div class="color-field">
                  <label>Body Text</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.bodyTextColor"
                      (input)="updateThemeColor('bodyTextColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.bodyTextColor"
                      (input)="updateThemeColor('bodyTextColor', $event)"
                      class="color-text"
                      placeholder="#2d2d2d">
                  </div>
                </div>
              </div>
              <div class="color-row">
                <div class="color-field">
                  <label>Secondary Text</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.secondaryTextColor"
                      (input)="updateThemeColor('secondaryTextColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.secondaryTextColor"
                      (input)="updateThemeColor('secondaryTextColor', $event)"
                      class="color-text"
                      placeholder="#6b6b6b">
                  </div>
                </div>
                <div class="color-field">
                  <label>Caption Text</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.captionTextColor"
                      (input)="updateThemeColor('captionTextColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.captionTextColor"
                      (input)="updateThemeColor('captionTextColor', $event)"
                      class="color-text"
                      placeholder="#8b7d3a">
                  </div>
                </div>
              </div>
            </div>

            <!-- Semantic Colors -->
            <div class="color-group">
              <h4>Status Colors</h4>
              <div class="color-row">
                <div class="color-field">
                  <label>Error</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.errorColor"
                      (input)="updateThemeColor('errorColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.errorColor"
                      (input)="updateThemeColor('errorColor', $event)"
                      class="color-text"
                      placeholder="#dc2626">
                  </div>
                </div>
                <div class="color-field">
                  <label>Warning</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.warningColor"
                      (input)="updateThemeColor('warningColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.warningColor"
                      (input)="updateThemeColor('warningColor', $event)"
                      class="color-text"
                      placeholder="#d97706">
                  </div>
                </div>
                <div class="color-field">
                  <label>Success</label>
                  <div class="color-input-container">
                    <input 
                      type="color" 
                      [value]="selectedTheme.successColor"
                      (input)="updateThemeColor('successColor', $event)"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="selectedTheme.successColor"
                      (input)="updateThemeColor('successColor', $event)"
                      class="color-text"
                      placeholder="#059669">
                  </div>
                </div>
              </div>
            </div>

            <!-- Live Preview -->
            <div class="theme-live-preview">
              <h4>Live Preview</h4>
              <div class="preview-container" [style.background-color]="selectedTheme.backgroundColor">
                <div class="preview-card" [style.background-color]="selectedTheme.cardColor">
                  <h3 [style.color]="selectedTheme.titleColor">Sample Wall Title</h3>
                  <p [style.color]="selectedTheme.bodyTextColor">This is how your body text will look in the selected colors.</p>
                  <p [style.color]="selectedTheme.secondaryTextColor">Secondary text for less important information.</p>
                  <span [style.color]="selectedTheme.captionTextColor">Caption text • Last updated today</span>
                  <div class="preview-buttons">
                    <button [style.background-color]="selectedTheme.primaryColor" [style.color]="getContrastColor(selectedTheme.primaryColor)">
                      Primary Button
                    </button>
                    <button [style.background-color]="selectedTheme.secondaryColor" [style.color]="getContrastColor(selectedTheme.secondaryColor)">
                      Secondary
                    </button>
                  </div>
                  <div class="preview-status">
                    <span [style.color]="selectedTheme.successColor">✓ Success message</span>
                    <span [style.color]="selectedTheme.warningColor">⚠ Warning message</span>
                    <span [style.color]="selectedTheme.errorColor">✗ Error message</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Publishing Tab -->
        <section class="tab-content" *ngIf="activeTab === 2">
          <div class="publishing-section">
            <h3>Publishing Options</h3>
            <p class="section-description">Control how and when this wall is visible to others.</p>
            
            <div class="publishing-status">
              <div class="form-group">
                <app-material-switch
                  formControlName="isPublished"
                  label="Publish this wall"
                  helpText="Make this wall visible to others">
                </app-material-switch>
              </div>
            </div>
            
            <div class="visibility-options" *ngIf="wallForm.get('isPublished')?.value">
              <h4 class="section-title">Audience</h4>
              <p class="section-subtitle">Choose who can view your wall</p>
              
              <div class="visibility-cards">
                <div class="visibility-card" 
                     [class.selected]="wallForm.get('requiresLogin')?.value === true"
                     (click)="setVisibility(true)">
                  <div class="card-header">
                    <span class="material-icons card-icon">group</span>
                    <div class="card-title-group">
                      <h5 class="card-title">Riverside Users Only</h5>
                      <p class="card-subtitle">Internal access</p>
                    </div>
                    <div class="selection-indicator">
                      <input type="radio" 
                             name="visibility" 
                             [value]="true"
                             [checked]="wallForm.get('requiresLogin')?.value === true"
                             (change)="setVisibility(true)">
                    </div>
                  </div>
                  <p class="card-description">Only staff and students with Riverside Google accounts can view this wall</p>
                </div>
                
                <div class="visibility-card" 
                     [class.selected]="wallForm.get('requiresLogin')?.value === false"
                     (click)="setVisibility(false)">
                  <div class="card-header">
                    <span class="material-icons card-icon">public</span>
                    <div class="card-title-group">
                      <h5 class="card-title">Public Access</h5>
                      <p class="card-subtitle">Anyone with link</p>
                    </div>
                    <div class="selection-indicator">
                      <input type="radio" 
                             name="visibility" 
                             [value]="false"
                             [checked]="wallForm.get('requiresLogin')?.value === false"
                             (change)="setVisibility(false)">
                    </div>
                  </div>
                  <p class="card-description">Anyone with the link can view this wall, including parents and community members</p>
                </div>
              </div>
            </div>
            
            <div class="share-section" *ngIf="wallForm.get('isPublished')?.value">
              <h4 class="section-title">Share Link</h4>
              <p class="section-subtitle">Copy this link to share your wall</p>
              
              <div class="share-card">
                <div class="share-content">
                  <span class="material-icons share-icon">link</span>
                  <div class="link-container">
                    <input type="text" 
                           class="share-link-input" 
                           readonly 
                           [value]="getPreviewShareLink()"
                           #shareInput>
                  </div>
                  <button type="button" 
                          class="copy-button material-button-filled" 
                          (click)="copyShareLink()" 
                          title="Copy link to clipboard">
                    <span class="material-icons">content_copy</span>
                    <span class="button-text">Copy</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="draft-section" *ngIf="!wallForm.get('isPublished')?.value">
              <div class="draft-card">
                <div class="draft-content">
                  <span class="material-icons draft-icon">lock</span>
                  <div class="draft-text">
                    <h5 class="draft-title">Draft Mode</h5>
                    <p class="draft-description">Only you and editors can see this wall. Publish when ready to share with others.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Configuration Tab -->
        <section class="tab-content" *ngIf="activeTab === 3">
          <div class="settings-section">
            <h3>Wall Settings</h3>
            <p class="section-description">Configure behavior and user experience settings for this wall.</p>
            
            <div class="form-group">
              <label for="inactivityTimeout">Inactivity Timeout (minutes)</label>
              <input 
                id="inactivityTimeout" 
                type="number" 
                formControlName="inactivityTimeout" 
                placeholder="5"
                class="form-input"
                min="1"
                max="60"
              >
              <div class="form-help-text">
                After this period of inactivity, users will be redirected to the wall's home page.
              </div>
              <div class="error-message" *ngIf="wallForm.get('inactivityTimeout')?.invalid && wallForm.get('inactivityTimeout')?.touched">
                <span *ngIf="wallForm.get('inactivityTimeout')?.errors?.['required']">Timeout is required</span>
                <span *ngIf="wallForm.get('inactivityTimeout')?.errors?.['min']">Minimum timeout is 1 minute</span>
                <span *ngIf="wallForm.get('inactivityTimeout')?.errors?.['max']">Maximum timeout is 60 minutes</span>
              </div>
            </div>
          </div>
        </section>
      </form>

    </app-page-layout>
  `,
  styles: [`
    /* Center the tab navigation */
    app-button-group {
      display: flex;
      justify-content: center;
      margin-bottom: var(--md-sys-spacing-6);
    }

    /* Mobile responsive button group */
    @media (max-width: 768px) {
      app-button-group {
        margin-left: calc(var(--md-sys-spacing-2) * -1);
        margin-right: calc(var(--md-sys-spacing-2) * -1);
        width: calc(100% + var(--md-sys-spacing-4));
      }
    }

    .wall-form {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--md-sys-spacing-6);
      width: 100%;
    }



    /* Mobile optimizations */
    @media (max-width: 768px) {
      .tab-navigation {
        margin: 0 var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
        max-width: calc(100vw - var(--md-sys-spacing-xl));
        padding: var(--md-sys-spacing-xs);
      }

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


    .error-message {
      color: #d32f2f;
      font-size: 12px;
      margin-top: 4px;
      font-family: 'Google Sans', sans-serif;
    }

    /* Theme Selection */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
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
      padding: 12px;
      height: 80px;
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

    }

    /* Section Width Styles - Remove constraints for wider forms */
    .basic-info-section,
    .theme-section,
    .publishing-section,
    .settings-section {
      max-width: none;
      width: 100%;
    }

    /* Tab content should take full width */
    .tab-content {
      width: 100%;
      max-width: none;
    }

    /* Form sections should be wider and centered */
    .basic-info-section .form-section {
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
    }

    /* Form groups should be much wider and centered */
    .basic-info-section .form-group,
    .publishing-section .form-group,
    .settings-section .form-group {
      max-width: 800px;
      width: 100%;
      margin: 0 auto 16px auto;
    }

    /* Section titles alignment and spacing */
    .basic-info-section .form-section h3,
    .form-section h3 {
      max-width: 800px;
      width: 100%;
      margin: 32px auto 16px auto;
      text-align: left;
    }

    /* First section title should have less top margin */
    .basic-info-section .form-section:first-child h3 {
      margin-top: 16px;
    }

    .publishing-section h3,
    .settings-section h3 {
      max-width: 800px;
      width: 100%;
      margin: 32px auto 16px auto;
      text-align: left;
      color: var(--md-sys-color-on-surface);
      font-size: 20px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .section-description {
      max-width: 800px;
      width: 100%;
      margin: 0 auto 24px auto;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
    }

    .permission-option,
    .publishing-status,
    .visibility-options,
    .publishing-preview,
    .draft-info {
      max-width: 800px;
      width: 100%;
      margin: 0 auto 24px auto;
      padding: 20px;
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      background: var(--md-sys-color-surface-container-low);
    }

    .permission-option h4,
    .publishing-section h4,
    .visibility-options h4,
    .publishing-preview h4 {
      margin: 0 0 16px 0;
      color: var(--md-sys-color-on-surface);
      font-size: 18px;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    /* Material 3 option headers */
    .option-header {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
      margin-bottom: var(--md-sys-spacing-1);
    }

    .option-header .material-icons {
      color: var(--md-sys-color-primary);
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

    /* Material 3 Publishing Section */
    .section-title {
      font-family: var(--md-sys-typescale-headline-small-font-family);
      font-size: var(--md-sys-typescale-headline-small-font-size);
      font-weight: var(--md-sys-typescale-headline-small-font-weight);
      line-height: var(--md-sys-typescale-headline-small-line-height);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
    }

    .section-subtitle {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0 0 24px 0;
    }

    /* Visibility Cards */
    .visibility-cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .visibility-card {
      background: var(--md-sys-color-surface-container-lowest);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-large);
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      position: relative;
      overflow: hidden;
    }

    .visibility-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--md-sys-color-primary);
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.2, 0, 0, 1);
      z-index: 0;
    }

    .visibility-card:hover::before {
      opacity: 0.04;
    }

    .visibility-card:hover {
      border-color: var(--md-sys-color-primary);
      box-shadow: var(--md-sys-elevation-1);
      transform: translateY(-1px);
    }

    .visibility-card.selected {
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      background: var(--md-sys-color-primary-container);
      box-shadow: var(--md-sys-elevation-2);
    }

    .visibility-card.selected::before {
      opacity: 0.08;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }

    .card-icon {
      font-size: 24px;
      color: var(--md-sys-color-primary);
      flex-shrink: 0;
    }

    .card-title-group {
      flex: 1;
    }

    .card-title {
      font-family: var(--md-sys-typescale-title-medium-font-family);
      font-size: var(--md-sys-typescale-title-medium-font-size);
      font-weight: var(--md-sys-typescale-title-medium-font-weight);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 4px 0;
    }

    .card-subtitle {
      font-family: var(--md-sys-typescale-body-small-font-family);
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
    }

    .selection-indicator {
      position: relative;
      z-index: 1;
    }

    .selection-indicator input[type="radio"] {
      width: 20px;
      height: 20px;
      accent-color: var(--md-sys-color-primary);
      cursor: pointer;
    }

    .card-description {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      line-height: 1.5;
      position: relative;
      z-index: 1;
    }

    /* Share Section */
    .share-section {
      max-width: 800px;
      width: 100%;
      margin: 0 auto 32px auto;
    }

    .share-card {
      background: var(--md-sys-color-surface-container-low);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-large);
      padding: 20px;
    }

    .share-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .share-icon {
      font-size: 24px;
      color: var(--md-sys-color-on-surface-variant);
      flex-shrink: 0;
    }

    .link-container {
      flex: 1;
    }

    .share-link-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      outline: none;
      transition: border-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .share-link-input:focus {
      border-color: var(--md-sys-color-primary);
    }

    .material-button-filled {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      border-radius: var(--md-sys-shape-corner-full);
      padding: 10px 24px;
      font-family: var(--md-sys-typescale-label-large-font-family);
      font-size: var(--md-sys-typescale-label-large-font-size);
      font-weight: var(--md-sys-typescale-label-large-font-weight);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      overflow: hidden;
    }

    .material-button-filled::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--md-sys-color-on-primary);
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .material-button-filled:hover::before {
      opacity: 0.08;
    }

    .material-button-filled:hover {
      box-shadow: var(--md-sys-elevation-2);
      transform: translateY(-1px);
    }

    .material-button-filled:active {
      transform: translateY(0);
      box-shadow: var(--md-sys-elevation-1);
    }

    .button-text {
      position: relative;
      z-index: 1;
    }

    .material-button-filled .material-icons {
      font-size: 18px;
      position: relative;
      z-index: 1;
    }

    /* Draft Section */
    .draft-section {
      max-width: 800px;
      width: 100%;
      margin: 0 auto 32px auto;
    }

    .draft-card {
      background: var(--md-sys-color-surface-container-low);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-large);
      padding: 20px;
    }

    .draft-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .draft-icon {
      font-size: 24px;
      color: var(--md-sys-color-on-surface-variant);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .draft-text {
      flex: 1;
    }

    .draft-title {
      font-family: var(--md-sys-typescale-title-medium-font-family);
      font-size: var(--md-sys-typescale-title-medium-font-size);
      font-weight: var(--md-sys-typescale-title-medium-font-weight);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
    }

    .draft-description {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      line-height: 1.5;
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

    /* Enhanced Theme Editor Styles */
    .theme-presets-section {
      margin-bottom: var(--md-sys-spacing-8);
      padding-bottom: var(--md-sys-spacing-6);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .color-editor-section {
      margin-top: var(--md-sys-spacing-6);
    }

    .section-help-text {
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-body-medium-size);
      font-family: 'Google Sans', sans-serif;
      margin: 0 0 var(--md-sys-spacing-4) 0;
      line-height: 1.4;
    }

    .color-group {
      margin-bottom: var(--md-sys-spacing-8);
      padding: var(--md-sys-spacing-5);
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      border: 1px solid var(--md-sys-color-outline-variant);
    }

    .color-group h4 {
      margin: 0 0 var(--md-sys-spacing-4) 0;
      color: var(--md-sys-color-on-surface);
      font-size: var(--md-sys-typescale-title-medium-size);
      font-weight: var(--md-sys-typescale-title-medium-weight);
      font-family: 'Google Sans', sans-serif;
    }

    .color-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--md-sys-spacing-4);
      margin-bottom: var(--md-sys-spacing-4);
    }

    .color-row:last-child {
      margin-bottom: 0;
    }

    .color-field {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-2);
    }

    .color-field label {
      font-size: var(--md-sys-typescale-label-large-size);
      font-weight: var(--md-sys-typescale-label-large-weight);
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
      margin: 0;
    }

    .color-input-container {
      display: flex;
      gap: var(--md-sys-spacing-2);
      align-items: center;
    }

    .color-picker {
      width: var(--md-sys-touch-target-large);
      height: var(--md-sys-touch-target-min);
      border: 2px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-medium);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      background: none;
      padding: 0;
    }

    .color-picker:hover {
      border-color: var(--md-sys-color-primary);
      transform: scale(1.05);
      box-shadow: var(--md-sys-elevation-2);
    }

    .color-picker:focus {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    .color-text {
      flex: 1;
      padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-medium);
      font-size: var(--md-sys-typescale-body-medium-size);
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      background-color: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: var(--md-sys-touch-target-min);
    }

    .color-text:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .color-text:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      box-shadow: 0 0 0 3px var(--md-sys-color-primary-container);
      padding: calc(var(--md-sys-spacing-3) - 1px) calc(var(--md-sys-spacing-4) - 1px);
    }

    /* Live Preview Styles */
    .theme-live-preview {
      margin-top: var(--md-sys-spacing-8);
      padding: var(--md-sys-spacing-6);
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      border: 1px solid var(--md-sys-color-outline-variant);
    }

    .theme-live-preview h4 {
      margin: 0 0 var(--md-sys-spacing-4) 0;
      color: var(--md-sys-color-on-surface);
      font-size: var(--md-sys-typescale-title-medium-size);
      font-weight: var(--md-sys-typescale-title-medium-weight);
      font-family: 'Google Sans', sans-serif;
    }

    .preview-container {
      padding: var(--md-sys-spacing-6);
      border-radius: var(--md-sys-shape-corner-medium);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: 300px;
    }

    .preview-card {
      padding: var(--md-sys-spacing-6);
      border-radius: var(--md-sys-shape-corner-large);
      box-shadow: var(--md-sys-elevation-2);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .preview-card h3 {
      margin: 0 0 var(--md-sys-spacing-3) 0;
      font-size: var(--md-sys-typescale-headline-small-size);
      font-weight: var(--md-sys-typescale-headline-small-weight);
      font-family: 'Google Sans', sans-serif;
    }

    .preview-card p {
      margin: 0 0 var(--md-sys-spacing-2) 0;
      font-size: var(--md-sys-typescale-body-large-size);
      line-height: var(--md-sys-typescale-body-large-line-height);
      font-family: 'Google Sans', sans-serif;
    }

    .preview-card span {
      font-size: var(--md-sys-typescale-label-medium-size);
      font-family: 'Google Sans', sans-serif;
    }

    .preview-buttons {
      display: flex;
      gap: var(--md-sys-spacing-3);
      margin: var(--md-sys-spacing-4) 0;
    }

    .preview-buttons button {
      padding: var(--md-sys-spacing-3) var(--md-sys-spacing-5);
      border: none;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: var(--md-sys-typescale-label-large-size);
      font-weight: var(--md-sys-typescale-label-large-weight);
      font-family: 'Google Sans', sans-serif;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: var(--md-sys-touch-target-min);
      box-shadow: var(--md-sys-elevation-1);
    }

    .preview-buttons button:hover {
      transform: translateY(-1px);
      box-shadow: var(--md-sys-elevation-3);
    }

    .preview-status {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-1);
      margin-top: var(--md-sys-spacing-4);
    }

    .preview-status span {
      font-size: var(--md-sys-typescale-body-medium-size);
      font-family: 'Google Sans', sans-serif;
      font-weight: 500;
    }

    /* Logo Upload Styles */
    .logo-upload-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .logo-preview {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--md-sys-spacing-3);
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      border: 1px solid var(--md-sys-color-outline-variant);
      width: 100px;
      height: 100px;
      margin: 0;
    }

    .logo-preview-image {
      max-width: 80px;
      max-height: 80px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: var(--md-sys-shape-corner-small);
    }

    .logo-upload-actions {
      display: flex;
      gap: var(--md-sys-spacing-3);
      flex-wrap: wrap;
      justify-content: flex-start;
      margin-top: var(--md-sys-spacing-3);
    }

    .upload-button {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      padding: var(--md-sys-spacing-3) var(--md-sys-spacing-6);
      border-radius: var(--md-sys-shape-corner-full);
      cursor: pointer;
      font-weight: var(--md-sys-typescale-label-large-weight);
      font-size: var(--md-sys-typescale-label-large-size);
      font-family: 'Google Sans', sans-serif;
      min-height: 40px;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: var(--md-sys-elevation-1);
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
    }

    .upload-button:hover {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      box-shadow: var(--md-sys-elevation-2);
      transform: translateY(-1px);
    }

    .upload-button:active {
      transform: translateY(0);
      box-shadow: var(--md-sys-elevation-1);
    }

    .reset-button {
      background: transparent;
      color: var(--md-sys-color-error);
      border: 1px solid var(--md-sys-color-outline);
      padding: var(--md-sys-spacing-3) var(--md-sys-spacing-6);
      border-radius: var(--md-sys-shape-corner-full);
      cursor: pointer;
      font-weight: var(--md-sys-typescale-label-large-weight);
      font-size: var(--md-sys-typescale-label-large-size);
      font-family: 'Google Sans', sans-serif;
      min-height: 40px;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
    }

    .reset-button:hover {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      border-color: var(--md-sys-color-error);
      transform: translateY(-1px);
    }

    .reset-button:active {
      transform: translateY(0);
    }

    .logo-help-text {
      font-size: var(--md-sys-typescale-body-small-size);
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
      margin-top: var(--md-sys-spacing-2);
    }

    /* Mobile optimizations for color editor and logo upload */
    @media (max-width: 768px) {
      .color-row {
        grid-template-columns: 1fr;
      }

      .color-input-container {
        flex-direction: column;
        align-items: stretch;
      }

      .color-picker {
        width: 100%;
        height: var(--md-sys-touch-target-large);
      }

      .preview-buttons {
        flex-direction: column;
      }

      .preview-status {
        gap: var(--md-sys-spacing-2);
      }

      .logo-upload-actions {
        flex-direction: column;
        gap: var(--md-sys-spacing-2);
      }

      .upload-button,
      .reset-button {
        width: 100%;
        justify-content: center;
      }

      .logo-preview {
        width: 80px;
        height: 80px;
      }
    }

    @media (max-width: 480px) {
      .color-group {
        padding: var(--md-sys-spacing-4);
      }

      .theme-live-preview {
        padding: var(--md-sys-spacing-4);
      }

      .preview-container {
        padding: var(--md-sys-spacing-4);
        min-height: 250px;
      }

      .preview-card {
        padding: var(--md-sys-spacing-4);
      }



      .form-section h3 {
        color: var(--md-sys-color-on-surface);
        font-size: var(--md-sys-typescale-title-medium-size);
        margin: 0 0 16px 0;
        font-weight: 600;
      }

      .form-help-text {
        font-size: var(--md-sys-typescale-body-small-size);
        color: var(--md-sys-color-on-surface-variant);
        margin-top: 4px;
      }
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
  activeTab = 0;
  currentLogoUrl: string = '';
  templateObjectTypes: any[] = [];
  tabs = [
    { label: 'Basic Info' },
    { label: 'Theme' },
    { label: 'Fields' },
    { label: 'Permissions' },
    { label: 'Publishing' }
  ];

  tabItems: ButtonGroupItem[] = [
    { id: '0', label: 'Basic Info', icon: 'info' },
    { id: '1', label: 'Theme', icon: 'palette' },
    { id: '2', label: 'Publishing', icon: 'publish' },
    { id: '3', label: 'Configuration', icon: 'settings' }
  ];

  constructor(
    private fb: FormBuilder,
    private wallService: WallService,
    private wallDataService: WallDataService,
    private router: Router,
    private route: ActivatedRoute,
    private wallPermissions: WallPermissionsService,
    private authService: AuthService,
    private wallTemplatesService: WallTemplatesService,
    private navigationService: NavigationService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Load additional themes from template service
    const additionalThemes = this.wallTemplatesService.getAvailableThemes();
    this.availableThemes = [...DEFAULT_THEMES, ...additionalThemes];

    this.wallId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.wallId;
    
    // Only clear wall context when creating a NEW wall, not when editing
    if (!this.isEditMode) {
      this.navigationService.clearWallContext();
    }

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
      name: ['Untitled Wall', [Validators.required]],
      description: [''],
      
      // Organization branding
      organizationName: [''],
      organizationSubtitle: [''],
      organizationLogoUrl: [''],
      
      // Permission controls
      allowDepartmentEdit: [false],
      editors: this.fb.array([]),
      
      // Publishing controls
      isPublished: [false],
      requiresLogin: [true], // Default to login-required
      
      // Settings
      inactivityTimeout: [5, [Validators.required, Validators.min(1), Validators.max(60)]]
    });
  }


  private loadTemplate(templateType: string): void {
    const template = this.wallTemplatesService.getTemplate(templateType);
    if (template && template.wall) {
      // Apply basic wall properties
      this.wallForm.patchValue({
        name: template.wall.name || '',
        description: template.wall.description || '',
        organizationName: template.wall.organizationName || '',
        organizationSubtitle: template.wall.organizationSubtitle || '',
        allowDepartmentEdit: false,
        isPublished: template.wall.visibility?.isPublished || false,
        requiresLogin: template.wall.visibility?.requiresLogin ?? true,
        inactivityTimeout: template.wall.settings?.inactivityTimeout || 5
      });

      // Apply theme
      if (template.theme) {
        this.selectedTheme = template.theme;
        
        // Also add the template's theme to available themes if it's not already there
        const themeExists = this.availableThemes.some(t => t.id === template.theme.id);
        if (!themeExists) {
          this.availableThemes = [...this.availableThemes, template.theme];
        }
      }

      // Store object types to be used when creating the wall
      if (template.objectTypes) {
        this.templateObjectTypes = template.objectTypes;
      }
    }
  }

  private loadWall(id: string): void {
    this.wallService.getWallById(id).subscribe({
      next: (wall) => {
        if (wall) {
          this.selectedTheme = wall.theme;
          this.currentLogoUrl = wall.organizationLogoUrl || '/assets/images/beaver-logo.png';
          this.wallForm.patchValue({
            name: wall.name,
            description: wall.description,
            organizationName: wall.organizationName,
            organizationSubtitle: wall.organizationSubtitle,
            organizationLogoUrl: wall.organizationLogoUrl,
            inactivityTimeout: wall.settings?.inactivityTimeout || 5,
            // Load visibility settings
            isPublished: wall.visibility?.isPublished || false,
            requiresLogin: wall.visibility?.requiresLogin ?? true // Default to true (internal) if not set
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
    // Deep clone the theme so we can modify it without affecting the original
    this.selectedTheme = {
      ...theme,
      // Ensure we have a unique ID for custom themes
      id: theme.id === this.selectedTheme.id ? this.selectedTheme.id : theme.id,
      isCustom: theme.id !== this.selectedTheme.id ? false : this.selectedTheme.isCustom
    };
  }

  updateThemeColor(colorProperty: keyof WallTheme, event: Event): void {
    const target = event.target as HTMLInputElement;
    const newColor = target.value;
    
    // Validate hex color format
    if (this.isValidHexColor(newColor)) {
      // Create a new theme object with the updated color
      this.selectedTheme = {
        ...this.selectedTheme,
        [colorProperty]: newColor,
        isCustom: true,
        id: this.selectedTheme.isCustom ? this.selectedTheme.id : this.generateCustomThemeId()
      };
    }
  }

  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  private generateCustomThemeId(): string {
    return 'custom-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getContrastColor(backgroundColor: string): string {
    // Simple contrast calculation - returns black or white based on background luminance
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  setActiveTab(index: number): void {
    this.activeTab = index;
  }

  onTabChange(item: ButtonGroupItem): void {
    this.setActiveTab(parseInt(item.id));
  }

  // Logo handling methods
  onLogoFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB.');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentLogoUrl = e.target.result;
        this.wallForm.patchValue({ organizationLogoUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  resetToDefaultLogo(): void {
    this.currentLogoUrl = '/assets/images/beaver-logo.png';
    this.wallForm.patchValue({ organizationLogoUrl: '' });
  }

  setVisibility(requiresLogin: boolean): void {
    this.wallForm.patchValue({ requiresLogin });
  }

  getPreviewShareLink(): string {
    const wallId = this.wallId || 'new-wall';
    const baseUrl = 'https://rlswall.app';
    
    // URL stays the same regardless of visibility settings
    // Firebase security rules will enforce access control based on wall settings
    return `${baseUrl}/walls/${wallId}`;
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

        if (this.isEditMode && this.wallId) {
          // For updates, exclude ownership and creation fields to prevent data corruption
          const updateData: Partial<Wall> = {
            name: this.wallForm.get('name')?.value,
            description: this.wallForm.get('description')?.value,
            organizationName: this.wallForm.get('organizationName')?.value,
            organizationSubtitle: this.wallForm.get('organizationSubtitle')?.value,
            organizationLogoUrl: this.wallForm.get('organizationLogoUrl')?.value,
            theme: this.selectedTheme,
            permissions,
            visibility
          };
          
          this.wallService.updateWall(this.wallId, updateData).subscribe({
            next: () => {
              this.isSaving = false;
              // Stay on the edit page after successful update
              console.log('Wall updated successfully');
            },
            error: (error: any) => {
              this.isSaving = false;
              console.error('Error saving wall:', error);
              alert('Failed to save wall. Please try again.');
            }
          });
        } else {
          // For creation, include all necessary fields including ownership
          const wallData: Omit<Wall, 'id'> = {
            name: this.wallForm.get('name')?.value,
            description: this.wallForm.get('description')?.value,
            organizationName: this.wallForm.get('organizationName')?.value,
            organizationSubtitle: this.wallForm.get('organizationSubtitle')?.value,
            organizationLogoUrl: this.wallForm.get('organizationLogoUrl')?.value,
            
            // Enhanced object system (Phase 2)
            objectTypes: this.templateObjectTypes, // Use template object types if available
            
            // Theme and settings
            theme: this.selectedTheme,
            permissions,
            visibility,
            settings: {
              allowComments: false,
              allowRatings: false,
              enableNotifications: true,
              autoSave: true,
              moderationRequired: false,
              inactivityTimeout: this.wallForm.get('inactivityTimeout')?.value || 5
            },
            
            // Metadata
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivityAt: new Date()
          };
          
          // Determine if this is a template creation
          const template = this.route.snapshot.queryParamMap.get('template');
          console.log('Template parameter:', template);
          
          if (template) {
            console.log('Creating wall with template:', template);
            // Map template parameter to expected format
            const templateType = template === 'veterans' ? 'veteran' : template as 'veteran' | 'alumni' | 'general';
            
            // Use WallDataService for template creation with automatic default data population
            this.wallDataService.createCompleteWall(wallData, { 
              template: templateType,
              createSampleData: true // Always create sample data for templates
            }).subscribe({
              next: (result) => {
                console.log('Wall created successfully:', result);
                console.log('Wall object:', result.wall);
                console.log('Wall ID:', result.wall?.id);
                this.isSaving = false;
                
                // Check if wall and id exist
                if (result.wall && result.wall.id) {
                  // Navigate to the newly created wall
                  this.router.navigate(['/walls', result.wall.id]);
                } else {
                  console.error('Wall or Wall ID is missing from result:', result);
                  alert('Wall was created but navigation failed. Please check the walls list.');
                }
              },
              error: (error: any) => {
                this.isSaving = false;
                console.error('Error saving wall with template:', error);
                alert('Failed to save wall. Please try again.');
              }
            });
          } else {
            // Use regular wall creation for blank walls
            this.wallService.createWall(wallData).subscribe({
              next: (result: string) => {
                this.isSaving = false;
                // Navigate to the newly created wall
                this.router.navigate(['/walls', result]);
              },
              error: (error: any) => {
                this.isSaving = false;
                console.error('Error saving wall:', error);
                alert('Failed to save wall. Please try again.');
              }
            });
          }
        }
      });
    }
  }

  getPageActions(): PageAction[] {
    return [
      {
        label: 'Cancel',
        icon: 'close',
        variant: 'stroked',
        color: 'primary',
        action: () => this.onCancel()
      },
      {
        label: this.isSaving ? 'Saving...' : 'Save Wall',
        icon: 'save',
        variant: 'raised',
        color: 'primary',
        disabled: this.wallForm?.invalid || this.isSaving,
        action: () => this.onSubmit()
      }
    ];
  }

  onCancel(): void {
    if (this.isEditMode && this.wallId) {
      // If editing, go back to the wall home page
      this.router.navigate(['/walls', this.wallId]);
    } else {
      // If creating new wall, go to wall list
      this.router.navigate(['/walls']);
    }
  }
}