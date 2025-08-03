import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { FormFieldComponent } from '../../../../shared/components/input-field/input-field.component';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions, MatCheckbox, MatDivider, MatLabel, MatError } from '../../../../shared/components/material-stubs';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';
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
    ThemedButtonComponent,
    MaterialIconComponent,
    FormFieldComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCardActions,
    MatCheckbox,
    MatDivider,
    MatLabel,
    MatError,
    PageLayoutComponent
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
                    <mat-form-field 
                      class="editor-email-field">
                      <mat-label>Editor Email</mat-label>
                      <input matInput 
                             formControlName="email" 
                             type="email" 
                             placeholder="user@riversideschools.net"
                             required>
                      @if (control.get('email')?.hasError('required')) {
                        <mat-error>Email is required</mat-error>
                      }
                      @if (control.get('email')?.hasError('email')) {
                        <mat-error>Enter a valid email</mat-error>
                      }
                    </mat-form-field>
                    
                    <app-themed-button variant="icon" 
                            type="button"
                            color="warn" 
                            (click)="removeEditor($index)"
                            [disabled]="editorsArray.length <= 1">
                      <mat-icon>delete</mat-icon>
                    </app-themed-button>
                  </div>
                }
              </div>
              
              <app-themed-button variant="stroked" type="button" (click)="addEditor()">
                <mat-icon>add</mat-icon>
                Add Editor
              </app-themed-button>
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
                  <select matNativeControl formControlName="department">
                    <option value="">Select Department</option>
                    <option value="Administration">Administration</option>
                    <option value="English">English</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Fine Arts">Fine Arts</option>
                    <option value="Physical Education">Physical Education</option>
                    <option value="Technology">Technology</option>
                    <option value="Support Staff">Support Staff</option>
                  </select>
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
        
      </app-page-layout>
    </div>
  `,
  styles: [`
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
    private confirmationDialog: ConfirmationDialogService
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
    if (!this.permissionsForm.valid) {
      alert('Please fix validation errors before saving');
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
        alert('Permissions updated successfully');
      },
      error: (error) => {
        this.saving = false;
        console.error('Error updating permissions:', error);
        alert('Failed to update permissions');
      }
    });
  }
}