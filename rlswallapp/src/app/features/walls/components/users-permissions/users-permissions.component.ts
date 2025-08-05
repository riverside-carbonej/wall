import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { FormFieldComponent } from '../../../../shared/components/input-field/input-field.component';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions, MatDivider, MatLabel, MatError, MatSelect, MatIcon } from '../../../../shared/components/material-stubs';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { MaterialSwitchComponent } from '../../../../shared/components/material-switch/material-switch.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../shared/services/user.service';
import { FirebaseAuthSearchService } from '../../../../shared/services/firebase-auth-search.service';
import { Observable, Subject, takeUntil, startWith, map, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { switchMap, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { Wall, WallPermissions, UserProfile } from '../../../../shared/models/wall.model';
import { WallUserEntity } from '../../../../shared/models/user.model';
import { NavigationService } from '../../../../shared/services/navigation.service';

interface WallUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  accessLevel: 'viewer' | 'editor' | 'manager';
}

@Component({
  selector: 'app-users-permissions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ThemedButtonComponent,
    FormFieldComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCardActions,
    MatDivider,
    MatLabel,
    MatError,
    MatSelect,
    MatIcon,
    PageLayoutComponent,
    MaterialSwitchComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <app-page-layout
        title="Users & Permissions"
        subtitle="Manage who can access and edit this wall"
        [showBackButton]="true"
        [actions]="getPageActions()"
        (backClick)="goBack()">
        
        <form [formGroup]="permissionsForm" class="permissions-form">
          
          <!-- Owner Section -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>person</mat-icon>
              <div class="section-text">
                <h3>Wall Owner</h3>
                <p>The user who created this wall and has full control</p>
              </div>
            </div>
            
            <div class="owner-card">
              <div class="user-info">
                <div class="user-avatar">
                  <img *ngIf="ownerProfile?.photoURL" [src]="ownerProfile?.photoURL" [alt]="ownerProfile?.displayName || ''" class="user-photo">
                  <mat-icon *ngIf="!ownerProfile?.photoURL">account_circle</mat-icon>
                </div>
                <div class="user-details">
                  <div class="user-name">{{ ownerProfile?.displayName || 'Wall Owner' }}</div>
                  <div class="user-email">{{ ownerProfile?.email || 'Unknown Email' }}</div>
                  <div class="owner-badge">Owner</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Users & Access Levels Section -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>group</mat-icon>
              <div class="section-text">
                <h3>Users & Access Levels</h3>
                <p>Manage user permissions for this wall</p>
              </div>
            </div>
            
            <!-- Add User Form -->
            <div class="add-user-form">
              <div class="form-group">
                <label for="newUserEmail">Search and Add User</label>
                <div class="input-with-button">
                  <div class="input-container">
                    <input 
                      id="newUserEmail"
                      type="text" 
                      [(ngModel)]="newUserEmail"
                      [ngModelOptions]="{standalone: true}"
                      placeholder="Search by name or email..."
                      class="form-input"
                      (input)="onNewUserInput($event)"
                      (focus)="showDropdown = true"
                      (blur)="hideDropdown()">
                    
                    <!-- User Search Dropdown -->
                    <div class="user-dropdown" *ngIf="showDropdown">
                      <div 
                        class="user-option"
                        *ngFor="let user of filteredUsers; trackBy: trackByEmail"
                        (mousedown)="selectUser(user)">
                        <div class="user-avatar small">
                          <img *ngIf="user.photoURL" [src]="user.photoURL" [alt]="user.displayName" class="user-photo">
                          <mat-icon *ngIf="!user.photoURL">account_circle</mat-icon>
                        </div>
                        <div class="user-info">
                          <div class="user-name">{{ user.displayName || user.email }}</div>
                          <div class="user-email">{{ user.email }}</div>
                        </div>
                      </div>
                      
                      <div class="no-suggestions" *ngIf="filteredUsers.length === 0 && newUserEmail.length > 2">
                        <mat-icon>info</mat-icon>
                        <span>User search service is being set up. Please add users manually by typing their complete email address.</span>
                      </div>
                      
                      <div class="no-suggestions" *ngIf="filteredUsers.length === 0 && newUserEmail.length > 0 && newUserEmail.length <= 2">
                        <mat-icon>person_search</mat-icon>
                        <span>Type at least 3 characters to search</span>
                      </div>
                      
                      <div class="no-suggestions" *ngIf="filteredUsers.length === 0 && newUserEmail.length === 0">
                        <mat-icon>person_search</mat-icon>
                        <span>Start typing to search for users</span>
                      </div>
                    </div>
                  </div>
                  
                  <button type="button"
                          class="add-button"
                          (click)="addUser()"
                          [disabled]="!selectedUser && !isValidEmailForManualAdd()">
                    <mat-icon>person_add</mat-icon>
                    {{ selectedUser ? 'Add Selected User' : 'Add User by Email' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Users Table -->
            <div class="users-table">
              <!-- Table Header -->
              <div class="table-header">
                <div class="header-cell user-col">User</div>
                <div class="header-cell access-col">Access Level</div>
                <div class="header-cell actions-col">Actions</div>
              </div>
              
              <!-- Owner Row -->
              <div class="table-row owner-row">
                <div class="table-cell user-cell">
                  <div class="user-info">
                    <div class="user-avatar">
                      <img *ngIf="ownerProfile?.photoURL" [src]="ownerProfile?.photoURL" [alt]="ownerProfile?.displayName || ''" class="user-photo">
                      <mat-icon *ngIf="!ownerProfile?.photoURL">account_circle</mat-icon>
                    </div>
                    <div class="user-details">
                      <div class="user-name">{{ ownerProfile?.displayName || 'Wall Owner' }}</div>
                      <div class="user-email">{{ ownerProfile?.email }}</div>
                      <div class="owner-badge small">Owner</div>
                    </div>
                  </div>
                </div>
                <div class="table-cell access-cell">
                  <span class="access-badge owner">Full Access</span>
                </div>
                <div class="table-cell actions-cell">
                  <span class="no-actions">—</span>
                </div>
              </div>

              <!-- User Rows -->
              <div class="table-row" *ngFor="let user of currentUsers; trackBy: trackByEmail">
                <div class="table-cell user-cell">
                  <div class="user-info">
                    <div class="user-avatar">
                      <img *ngIf="user.photoURL" [src]="user.photoURL" [alt]="user.displayName" class="user-photo">
                      <mat-icon *ngIf="!user.photoURL">account_circle</mat-icon>
                    </div>
                    <div class="user-details">
                      <div class="user-name">{{ user.displayName || user.email }}</div>
                      <div class="user-email">{{ user.email }}</div>
                    </div>
                  </div>
                </div>
                <div class="table-cell access-cell">
                  <select class="form-select" 
                          [(ngModel)]="user.accessLevel" 
                          [ngModelOptions]="{standalone: true}"
                          (change)="onAccessLevelChange(user, $any($event.target).value)">
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="manager">Manager</option>
                  </select>
                  <button *ngIf="isOwner && user.uid !== currentUserUid" 
                          type="button" 
                          class="transfer-ownership-btn"
                          (click)="transferOwnership(user)"
                          title="Transfer ownership to this user">
                    <mat-icon>crown</mat-icon>
                  </button>
                </div>
                <div class="table-cell actions-cell">
                  <button type="button"
                          class="remove-button"
                          (click)="removeUser(user)"
                          [title]="'Remove ' + (user.displayName || user.email)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Empty State -->
              <div class="table-row empty-row" *ngIf="currentUsers.length === 0">
                <div class="empty-state">
                  <mat-icon>person_add</mat-icon>
                  <p>No additional users have been added to this wall</p>
                  <p class="empty-subtitle">Add users above to grant them access</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Access Summary Section -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>security</mat-icon>
              <div class="section-text">
                <h3>Access Summary</h3>
              </div>
            </div>
            
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Users</div>
                <div class="summary-value">{{ getTotalUsersCount() }}</div>
                <div class="summary-detail">
                  {{ getEditorsCount() }} editor{{ getEditorsCount() !== 1 ? 's' : '' }}, 
                  {{ getViewersCount() }} viewer{{ getViewersCount() !== 1 ? 's' : '' }}
                </div>
              </div>
              
              <div class="summary-item">
                <div class="summary-label">Wall Visibility</div>
                <div class="summary-value">
                  <span *ngIf="wall.visibility.isPublished">Published</span>
                  <span *ngIf="!wall.visibility.isPublished">Draft</span>
                </div>
                <div class="summary-detail">
                  <span *ngIf="wall.visibility.isPublished && wall.visibility.requiresLogin">Login Required</span>
                  <span *ngIf="wall.visibility.isPublished && !wall.visibility.requiresLogin">Public</span>
                  <span *ngIf="!wall.visibility.isPublished">Only editors can view</span>
                </div>
              </div>
            </div>
            
            <div class="access-info">
              <div class="access-level-info">
                <div class="access-level-item">
                  <strong>Editor:</strong> Can add, edit, and manage wall content
                </div>
                <div class="access-level-item">
                  <strong>Viewer:</strong> Can view wall content (read-only access)
                </div>
              </div>
            </div>
          </div>

        </form>
        
      </app-page-layout>
    </div>
  `,
  styles: [`
    .permissions-form {
      max-width: 800px;
      margin: 0 auto;
    }

    /* Form Sections */
    .form-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .section-header mat-icon {
      color: var(--md-sys-color-primary);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .section-text h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .section-text p {
      margin: 4px 0 0 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Form Elements */
    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface);
      font-weight: 500;
      font-size: 14px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 16px 20px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 16px;
      font-size: 16px;
      line-height: 24px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      min-height: 56px;
      box-sizing: border-box;
    }

    .form-input:hover, .form-select:hover {
      border-color: var(--md-sys-color-on-surface);
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      box-shadow: 0 0 0 3px var(--md-sys-color-primary-container);
      padding: 15px 19px;
    }

    .form-select {
      appearance: none;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 16px center;
      background-repeat: no-repeat;
      background-size: 16px;
      padding-right: 48px;
    }

    /* Owner Card */
    .owner-card {
      background: var(--md-sys-color-primary-container);
      border: 1px solid var(--md-sys-color-primary);
      border-radius: 16px;
      padding: 20px;
    }

    /* Add User Form */
    .add-user-form {
      background: var(--md-sys-color-surface-container-lowest);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .input-with-button {
      display: flex;
      gap: 16px;
      align-items: flex-end;
    }

    .input-container {
      flex: 1;
      position: relative;
    }

    .add-button {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      border-radius: 16px;
      padding: 16px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 56px;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .add-button:hover:not(:disabled) {
      background: var(--md-sys-color-primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .add-button:disabled {
      background: var(--md-sys-color-outline);
      color: var(--md-sys-color-on-surface-variant);
      cursor: not-allowed;
    }

    .add-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* User Suggestions */
    .user-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      margin-top: 4px;
    }

    .user-suggestion {
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .user-suggestion:hover {
      background-color: var(--md-sys-color-primary-container);
    }

    .user-suggestion:first-child {
      border-radius: 16px 16px 0 0;
    }

    .user-suggestion:last-child {
      border-radius: 0 0 16px 16px;
    }

    .no-suggestions {
      padding: 16px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 0.875rem;
      background: var(--md-sys-color-surface-container-lowest);
      border-radius: 12px;
      margin: 4px;
    }

    .no-suggestions mat-icon {
      color: var(--md-sys-color-primary);
    }

    /* User Dropdown */
    .user-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--md-sys-color-surface);
      border: 2px solid var(--md-sys-color-outline);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
      max-height: 300px;
      overflow-y: auto;
      margin-top: 4px;
    }

    .user-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .user-option:hover {
      background: var(--md-sys-color-surface-container-high);
    }

    .user-option:first-child {
      border-radius: 16px 16px 0 0;
    }

    .user-option:last-child {
      border-radius: 0 0 16px 16px;
    }

    .user-option .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-option .user-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-option .user-email {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* User Info Components */
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-avatar.small {
      width: 32px;
      height: 32px;
    }

    .user-avatar mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .user-avatar.small mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .user-photo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 500;
      font-size: 1rem;
      color: var(--md-sys-color-on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Badges */
    .owner-badge {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
      display: inline-block;
    }

    .owner-badge.small {
      padding: 2px 8px;
      font-size: 0.6875rem;
    }

    .access-badge {
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .access-badge.owner {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
    }

    /* Users Table */
    .users-table {
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 100px;
      gap: 16px;
      background: var(--md-sys-color-surface-container-high);
      padding: 16px 20px;
    }

    .header-cell {
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 100px;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .table-row:hover {
      background: var(--md-sys-color-surface-container-lowest);
    }

    .owner-row {
      background: var(--md-sys-color-primary-container);
    }

    .owner-row:hover {
      background: var(--md-sys-color-primary-container);
    }

    .table-cell {
      display: flex;
      align-items: center;
    }

    .actions-cell {
      justify-content: center;
    }

    .remove-button {
      background: none;
      border: none;
      color: var(--md-sys-color-error);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .remove-button:hover {
      background: var(--md-sys-color-error-container);
    }

    .remove-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .no-actions {
      color: var(--md-sys-color-outline);
      font-size: 1.2rem;
    }

    /* Empty State */
    .empty-row {
      grid-column: 1 / -1;
      border-bottom: none;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-state p {
      margin: 8px 0;
      font-size: 1rem;
    }

    .empty-subtitle {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .summary-item {
      background: var(--md-sys-color-surface-container-lowest);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      padding: 20px;
    }

    .summary-label {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 4px;
    }

    .summary-detail {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Access Info */
    .access-info {
      background: var(--md-sys-color-surface-container-lowest);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 16px;
      padding: 20px;
    }

    .access-level-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .access-level-item {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
    }

    .access-level-item strong {
      color: var(--md-sys-color-on-surface);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .permissions-form {
        max-width: 100%;
        margin: 0;
        padding: 0 16px;
      }

      .input-with-button {
        flex-direction: column;
        align-items: stretch;
      }

      .add-button {
        width: 100%;
        justify-content: center;
      }

      .table-header,
      .table-row {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .header-cell {
        display: none;
      }

      .table-cell {
        padding: 8px 0;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }

      .table-cell:last-child {
        border-bottom: none;
      }

      .actions-cell {
        justify-content: flex-start;
        padding-top: 12px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .user-avatar {
        width: 40px;
        height: 40px;
      }

      .user-avatar mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    /* Transfer Ownership Button */
    .transfer-ownership-btn {
      background: var(--md-sys-color-tertiary-container);
      border: 1px solid var(--md-sys-color-tertiary);
      color: var(--md-sys-color-on-tertiary-container);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      margin-left: 8px;
    }

    .transfer-ownership-btn:hover {
      background-color: var(--md-sys-color-tertiary);
      color: var(--md-sys-color-on-tertiary);
    }

    .transfer-ownership-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class UsersPermissionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;
  permissionsForm!: FormGroup;
  ownerProfile: WallUser | null = null;
  saving = false;
  isOwner = false;
  currentUserUid: string | null = null;
  filteredUsers: WallUser[] = [];
  currentUsers: WallUser[] = [];
  newUserEmail: string = '';
  currentUserEmail: string | null = null;
  allUsers: WallUserEntity[] = [];
  selectedUser: WallUser | null = null;
  showDropdown: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private fb: FormBuilder,
    private confirmationDialog: ConfirmationDialogService,
    private authService: AuthService,
    private userService: UserService,
    private firebaseAuthSearchService: FirebaseAuthSearchService,
    private navigationService: NavigationService
  ) {
    this.initializeForm();
    this.currentUserEmail = this.authService.currentUser?.email || null;
  }

  ngOnInit() {
    // Get current user info
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUserEmail = user?.email || null;
      this.currentUserUid = user?.uid || null;
    });

    // Load initial users (this will likely be empty since users are in Firebase Auth, not Firestore)
    this.userService.getAllUsers().pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.allUsers = users;
      this.updateFilteredUsers();
    });

    this.wall$ = this.route.paramMap.pipe(
      switchMap(params => {
        const wallId = params.get('id')!;
        return this.wallService.getWallById(wallId);
      }),
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    this.wall$.subscribe(wall => {
      this.isOwner = wall.permissions.owner === this.currentUserUid;
      this.loadWallPermissions(wall);
      this.loadOwnerProfile(wall.permissions.owner);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.permissionsForm = this.fb.group({
      // We don't need form arrays anymore, just keep the form for consistency
    });
  }

  private loadWallPermissions(wall: Wall) {
    // Clear existing users
    this.currentUsers = [];
    
    // Load current editors from wall permissions
    wall.permissions.editors.forEach(uid => {
      const userEntity = this.allUsers.find(u => u.id === uid);
      if (userEntity) {
        this.currentUsers.push({
          uid: userEntity.id,
          email: userEntity.email,
          displayName: userEntity.displayName || `${userEntity.firstName} ${userEntity.lastName}`,
          photoURL: userEntity.profilePicture,
          accessLevel: 'editor'
        });
      } else {
        // Create a basic profile for users not in our database
        // Try to get user info from Firebase Auth or create fallback
        this.getUserDisplayInfo(uid).then(userInfo => {
          this.currentUsers.push({
            uid: uid,
            email: userInfo.email,
            displayName: userInfo.displayName,
            accessLevel: 'editor'
          });
        });
      }
    });
    
    // Load current managers from wall permissions
    if (wall.permissions.managers) {
      wall.permissions.managers.forEach(uid => {
        const userEntity = this.allUsers.find(u => u.id === uid);
        if (userEntity) {
          this.currentUsers.push({
            uid: userEntity.id,
            email: userEntity.email,
            displayName: userEntity.displayName || `${userEntity.firstName} ${userEntity.lastName}`,
            photoURL: userEntity.profilePicture,
            accessLevel: 'manager'
          });
        } else {
          this.getUserDisplayInfo(uid).then(userInfo => {
            this.currentUsers.push({
              uid: uid,
              email: userInfo.email,
              displayName: userInfo.displayName,
              accessLevel: 'manager'
            });
          });
        }
      });
    }

    // Load current viewers from wall permissions
    if (wall.permissions.viewers) {
      wall.permissions.viewers.forEach(uid => {
        const userEntity = this.allUsers.find(u => u.id === uid);
        if (userEntity) {
          this.currentUsers.push({
            uid: userEntity.id,
            email: userEntity.email,
            displayName: userEntity.displayName || `${userEntity.firstName} ${userEntity.lastName}`,
            photoURL: userEntity.profilePicture,
            accessLevel: 'viewer'
          });
        } else {
          this.getUserDisplayInfo(uid).then(userInfo => {
            this.currentUsers.push({
              uid: uid,
              email: userInfo.email,
              displayName: userInfo.displayName,
              accessLevel: 'viewer'
            });
          });
        }
      });
    }
  }

  private loadOwnerProfile(ownerId: string) {
    // First try to find the owner in the user database by UID
    const ownerEntity = this.allUsers.find(u => u.id === ownerId);
    
    if (ownerEntity) {
      this.ownerProfile = {
        uid: ownerEntity.id,
        email: ownerEntity.email,
        displayName: ownerEntity.displayName || `${ownerEntity.firstName} ${ownerEntity.lastName}`,
        photoURL: ownerEntity.profilePicture,
        accessLevel: 'editor' // Owners are always editors
      };
    } else {
      // If not found in database, check if current user is the owner
      const currentUser = this.authService.currentUser;
      if (currentUser && currentUser.uid === ownerId) {
        this.ownerProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || this.extractDisplayName(currentUser.email || ''),
          photoURL: currentUser.photoURL || undefined,
          accessLevel: 'editor'
        };
      } else {
        // Fallback: create a basic profile
        this.ownerProfile = {
          uid: ownerId,
          email: 'Unknown User',
          displayName: 'Unknown User',
          accessLevel: 'editor'
        };
      }
    }
  }

  private extractDisplayName(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async getUserDisplayInfo(uid: string): Promise<{email: string, displayName: string}> {
    try {
      // Try to get user info from Firebase Auth via search
      const searchResult = await this.firebaseAuthSearchService.searchUsers(uid).toPromise();
      if (searchResult && searchResult.length > 0) {
        const user = searchResult[0];
        return {
          email: user.email || `uid:${uid}`,
          displayName: user.displayName || this.extractDisplayName(user.email || uid)
        };
      }
    } catch (error) {
      console.warn('Could not fetch user info for UID:', uid, error);
    }

    // Fallback: if UID looks like email, use it; otherwise create fallback
    const isEmail = uid.includes('@');
    return {
      email: isEmail ? uid : `uid:${uid}`,
      displayName: isEmail ? this.extractDisplayName(uid) : `User ${uid.substring(0, 8)}...`
    };
  }

  // Handle new user input with filtering
  onNewUserInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.selectedUser = null; // Clear selection when typing
    this.showDropdown = value.length > 0;
    
    // Only search if we have at least 3 characters
    if (value.length >= 3) {
      this.searchUsers(value);
    } else {
      this.filteredUsers = [];
    }
  }

  // Handle user selection from dropdown
  selectUser(user: WallUser): void {
    this.selectedUser = user;
    this.newUserEmail = user.displayName || user.email; // Show display name in input
    this.showDropdown = false;
  }

  // Hide dropdown
  hideDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200); // Delay to allow for selection
  }

  // Search users using Firebase Auth search service
  private searchUsers(searchTerm: string): void {
    this.firebaseAuthSearchService.searchUsers(searchTerm).pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.filteredUsers = users
        .filter(user => !this.isUserAlreadyAdded({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email,
          photoURL: user.photoURL || undefined,
          accessLevel: 'editor'
        }) && user.email !== this.currentUserEmail)
        .map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email, // Fallback to email if no displayName
          photoURL: user.photoURL || undefined, // Convert null to undefined
          accessLevel: 'editor' as 'editor' | 'viewer'
        }));
    });
  }

  private updateFilteredUsers(searchTerm: string = ''): void {
    const availableUsers = this.allUsers.map(user => ({
      uid: user.id,
      email: user.email,
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      photoURL: user.profilePicture,
      accessLevel: 'editor' as 'editor' | 'viewer'
    }));

    if (searchTerm.length > 0) {
      this.filteredUsers = availableUsers.filter(user => 
        !this.isUserAlreadyAdded(user) &&
        user.email !== this.currentUserEmail &&
        (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } else {
      this.filteredUsers = availableUsers.filter(user => 
        !this.isUserAlreadyAdded(user) && user.email !== this.currentUserEmail
      );
    }
  }


  // Check if user is already added
  private isUserAlreadyAdded(user: WallUser): boolean {
    return this.currentUsers.some(u => u.email === user.email) ||
           user.email === this.currentUserEmail;
  }

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check if email is valid for manual addition
  isValidEmailForManualAdd(): boolean {
    return this.isValidEmail(this.newUserEmail) && !this.selectedUser;
  }

  // Add new user to the table
  addUser(): void {
    // If a user is selected from dropdown, use that
    if (this.selectedUser) {
      if (this.selectedUser.email === this.currentUserEmail) {
        alert('You cannot add yourself as an editor');
        return;
      }

      if (this.isUserAlreadyAdded(this.selectedUser)) {
        alert('This user is already added');
        return;
      }

      this.currentUsers.push(this.selectedUser);
      this.newUserEmail = '';
      this.selectedUser = null;
      this.filteredUsers = [];
      return;
    }

    // Otherwise, try to add by email manually
    if (!this.isValidEmailForManualAdd()) {
      return;
    }

    if (this.newUserEmail === this.currentUserEmail) {  
      alert('You cannot add yourself as an editor');
      return;
    }

    // Create a user object from the email
    const manualUser: WallUser = {
      uid: this.newUserEmail, // Use email as UID for manual users
      email: this.newUserEmail,
      displayName: this.extractDisplayName(this.newUserEmail),
      accessLevel: 'editor'
    };

    if (this.isUserAlreadyAdded(manualUser)) {
      alert('This user is already added');
      return;
    }

    this.currentUsers.push(manualUser);
    this.newUserEmail = '';
    this.selectedUser = null;
    this.filteredUsers = [];
    this.showDropdown = false;
  }

  // Remove user from table
  removeUser(user: WallUser): void {
    const index = this.currentUsers.findIndex(u => u.email === user.email);
    if (index > -1) {
      this.currentUsers.splice(index, 1);
    }
  }


  // Get total users count
  getTotalUsersCount(): number {
    return this.currentUsers.length + 1; // +1 for owner
  }

  // Get editors count
  getEditorsCount(): number {
    return this.currentUsers.filter(u => u.accessLevel === 'editor').length + 1; // +1 for owner
  }

  // Get viewers count
  getViewersCount(): number {
    return this.currentUsers.filter(u => u.accessLevel === 'viewer').length;
  }

  // Track by function for ngFor
  trackByEmail(index: number, user: any): string {
    return user.email;
  }

  // Handle access level changes
  onAccessLevelChange(user: WallUser, newLevel: string) {
    if (newLevel === 'viewer' || newLevel === 'editor' || newLevel === 'manager') {
      user.accessLevel = newLevel as 'viewer' | 'editor' | 'manager';
    }
  }

  // Transfer ownership to another user
  transferOwnership(user: WallUser) {
    const confirmTransfer = confirm(
      `Are you sure you want to transfer ownership of this wall to ${user.displayName || user.email}? ` +
      `This action cannot be undone and you will become a manager.`
    );
    
    if (confirmTransfer) {
      // Implementation will be added in the wall service
      alert('Transfer ownership functionality will be implemented in the next update');
    }
  }

  getPageActions(): PageAction[] {
    return [
      {
        label: 'Save Changes',
        icon: 'save',
        variant: 'raised',
        color: 'primary',
        disabled: !this.permissionsForm?.valid || this.saving,
        action: () => this.savePermissions()
      }
    ];
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  savePermissions() {
    this.saving = true;
    
    const wallId = this.route.snapshot.paramMap.get('id')!;
    
    // Separate by access level
    const editors = this.currentUsers
      .filter(user => user.accessLevel === 'editor')
      .map(user => user.uid);
      
    const managers = this.currentUsers
      .filter(user => user.accessLevel === 'manager')
      .map(user => user.uid);
      
    const viewers = this.currentUsers
      .filter(user => user.accessLevel === 'viewer')
      .map(user => user.uid);
    
    const updatedPermissions: Partial<WallPermissions> = {
      editors: editors,
      managers: managers,
      viewers: viewers,
      allowDepartmentEdit: false
    };

    this.wallService.updateWallPermissions(wallId, updatedPermissions).subscribe({
      next: () => {
        this.saving = false;
        alert('Permissions updated successfully');
        
        // Refresh navigation context to update sidebar permissions
        this.refreshNavigationContext(wallId);
      },
      error: (error) => {
        this.saving = false;
        console.error('Error updating permissions:', error);
        alert('Failed to update permissions');
      }
    });
  }

  private refreshNavigationContext(wallId: string): void {
    // Re-fetch the wall and update navigation context with fresh permissions
    this.wallService.getWallById(wallId).subscribe(wall => {
      if (!wall) return;

      // Get current user
      this.authService.currentUser$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(user => {
        if (!user) return;

        // Calculate fresh permissions
        const canEdit = wall.permissions.owner === user.uid ||
                       wall.permissions.editors.includes(user.uid) ||
                       (wall.permissions.managers && wall.permissions.managers.includes(user.uid));
        
        const canAdmin = wall.permissions.owner === user.uid ||
                        (wall.permissions.managers && wall.permissions.managers.includes(user.uid));

        // Update navigation context
        this.navigationService.updateWallContext(wall, canEdit, canAdmin, 0);
      });
    });
  }
}