import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, takeUntil } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { Wall, WallPermissions, UserProfile } from '../../../../shared/models/wall.model';

@Component({
  selector: 'app-users-permissions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="users-permissions" *ngIf="wall$ | async as wall">
      <!-- Header -->
      <mat-toolbar class="page-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="page-title">Users & Permissions</span>
        <span class="spacer"></span>
        <button mat-raised-button color="primary" (click)="savePermissions()" [disabled]="!permissionsForm.valid || saving">
          <mat-icon>save</mat-icon>
          Save Changes
        </button>
      </mat-toolbar>

      <!-- Content -->
      <div class="content-container">
        <form [formGroup]="permissionsForm" class="permissions-form">
          
          <!-- Owner Section -->
          <mat-card class="permissions-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>person</mat-icon>
                Wall Owner
              </mat-card-title>
              <mat-card-subtitle>The user who created this wall and has full control</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="owner-info">
                <div class="user-avatar">
                  <mat-icon>account_circle</mat-icon>
                </div>
                <div class="user-details">
                  <div class="user-name">{{ ownerProfile?.displayName || wall.permissions.owner }}</div>
                  <div class="user-email">{{ wall.permissions.owner }}</div>
                  <div class="user-role">Owner - Full Access</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Editors Section -->
          <mat-card class="permissions-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>group</mat-icon>
                Editors
              </mat-card-title>
              <mat-card-subtitle>Users who can add, edit, and manage content</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="editors-list" formArrayName="editors">
                @for (control of editorsArray.controls; track $index) {
                  <div class="editor-row" [formGroupName]="$index">
                    <mat-form-field class="editor-email-field">
                      <mat-label>Editor Email</mat-label>
                      <input matInput 
                             formControlName="email" 
                             type="email" 
                             placeholder="user@riversideschools.net">
                      <mat-error *ngIf="control.get('email')?.hasError('required')">Email is required</mat-error>
                      <mat-error *ngIf="control.get('email')?.hasError('email')">Enter a valid email</mat-error>
                    </mat-form-field>
                    
                    <button mat-icon-button 
                            type="button"
                            color="warn" 
                            (click)="removeEditor($index)"
                            [disabled]="editorsArray.length <= 1">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </div>
              
              <button mat-stroked-button type="button" (click)="addEditor()">
                <mat-icon>add</mat-icon>
                Add Editor
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Department Access Section -->
          <mat-card class="permissions-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>business</mat-icon>
                Department Access
              </mat-card-title>
              <mat-card-subtitle>Grant access to entire departments</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <mat-checkbox formControlName="allowDepartmentEdit" class="department-checkbox">
                Enable department-based editing
              </mat-checkbox>
              
              @if (permissionsForm.get('allowDepartmentEdit')?.value) {
                <mat-form-field class="department-field">
                  <mat-label>Department</mat-label>
                  <mat-select formControlName="department">
                    <mat-option value="">Select Department</mat-option>
                    <mat-option value="Administration">Administration</mat-option>
                    <mat-option value="English">English</mat-option>
                    <mat-option value="Mathematics">Mathematics</mat-option>
                    <mat-option value="Science">Science</mat-option>
                    <mat-option value="Social Studies">Social Studies</mat-option>
                    <mat-option value="Fine Arts">Fine Arts</mat-option>
                    <mat-option value="Physical Education">Physical Education</mat-option>
                    <mat-option value="Technology">Technology</mat-option>
                    <mat-option value="Support Staff">Support Staff</mat-option>
                  </mat-select>
                </mat-form-field>
                
                <div class="department-info">
                  <mat-icon class="info-icon">info</mat-icon>
                  <span>All users in the selected department will have editing access to this wall.</span>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Access Summary -->
          <mat-card class="permissions-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>security</mat-icon>
                Access Summary
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="access-summary">
                <div class="summary-item">
                  <strong>Total Editors:</strong> 
                  {{ editorsArray.length + (permissionsForm.get('allowDepartmentEdit')?.value ? 1 : 0) }}
                  @if (permissionsForm.get('allowDepartmentEdit')?.value) {
                    ({{ editorsArray.length }} individual + {{ permissionsForm.get('department')?.value || 'department' }} members)
                  }
                </div>
                
                <div class="summary-item">
                  <strong>Access Level:</strong> Edit content and manage wall items
                </div>
                
                <div class="summary-item">
                  <strong>Wall Visibility:</strong> 
                  @if (wall.visibility.isPublished) {
                    Published 
                    @if (wall.visibility.requiresLogin) {
                      (Login Required)
                    } @else {
                      (Public)
                    }
                  } @else {
                    Draft (Only editors can view)
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .users-permissions {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      flex-shrink: 0;
    }

    .page-title {
      font-size: 1.25rem;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .content-container {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .permissions-form {
      max-width: 800px;
      margin: 0 auto;
    }

    .permissions-section {
      margin-bottom: 24px;
    }

    .permissions-section mat-card-header {
      margin-bottom: 16px;
    }

    .permissions-section mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Owner Section */
    .owner-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-on-primary-container);
    }

    .user-avatar mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .user-name {
      font-weight: 500;
      font-size: 1.1rem;
    }

    .user-email {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 0.9rem;
    }

    .user-role {
      color: var(--md-sys-color-primary);
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* Editors Section */
    .editors-list {
      margin-bottom: 16px;
    }

    .editor-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .editor-email-field {
      flex: 1;
    }

    /* Department Section */
    .department-checkbox {
      margin-bottom: 16px;
    }

    .department-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .department-info {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .info-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-top: 2px;
    }

    /* Access Summary */
    .access-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-item {
      padding: 8px 0;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .content-container {
        padding: 16px;
      }
      
      .editor-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      
      .owner-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
    }
  `]
})
export class UsersPermissionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;
  permissionsForm!: FormGroup;
  ownerProfile: UserProfile | null = null;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.wall$ = this.route.paramMap.pipe(
      switchMap(params => {
        const wallId = params.get('id')!;
        return this.wallService.getWallById(wallId);
      }),
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    this.wall$.subscribe(wall => {
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
      editors: this.fb.array([]),
      department: [''],
      allowDepartmentEdit: [false]
    });
  }

  private loadWallPermissions(wall: Wall) {
    const editorsArray = this.editorsArray;
    
    // Clear existing editors
    editorsArray.clear();
    
    // Add current editors
    wall.permissions.editors.forEach(email => {
      editorsArray.push(this.fb.group({
        email: [email, [Validators.required, Validators.email]]
      }));
    });

    // If no editors, add empty one
    if (editorsArray.length === 0) {
      this.addEditor();
    }

    // Set department settings
    this.permissionsForm.patchValue({
      department: wall.permissions.department || '',
      allowDepartmentEdit: wall.permissions.allowDepartmentEdit
    });
  }

  private loadOwnerProfile(ownerId: string) {
    // For now, create a simple mock profile
    // TODO: Implement actual user profile lookup
    this.ownerProfile = {
      uid: ownerId,
      email: ownerId,
      displayName: this.extractDisplayName(ownerId),
      department: 'Unknown',
      role: 'user',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };
  }

  private extractDisplayName(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  get editorsArray(): FormArray {
    return this.permissionsForm.get('editors') as FormArray;
  }

  addEditor() {
    this.editorsArray.push(this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    }));
  }

  removeEditor(index: number) {
    this.editorsArray.removeAt(index);
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  savePermissions() {
    if (!this.permissionsForm.valid) {
      this.snackBar.open('Please fix validation errors before saving', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    
    const formValue = this.permissionsForm.value;
    const wallId = this.route.snapshot.paramMap.get('id')!;
    
    const updatedPermissions: Partial<WallPermissions> = {
      editors: formValue.editors
        .map((editor: any) => editor.email)
        .filter((email: string) => email.trim() !== ''),
      department: formValue.allowDepartmentEdit ? formValue.department : undefined,
      allowDepartmentEdit: formValue.allowDepartmentEdit
    };

    this.wallService.updateWallPermissions(wallId, updatedPermissions).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Permissions updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.saving = false;
        console.error('Error updating permissions:', error);
        this.snackBar.open('Failed to update permissions', 'Close', { duration: 3000 });
      }
    });
  }
}