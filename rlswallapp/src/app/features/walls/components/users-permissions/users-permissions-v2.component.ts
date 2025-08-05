import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

// Our reusable components
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { MaterialSelectComponent, SelectOption } from '../../../../shared/components/material-select/material-select.component';
import { MatInput } from '../../../../shared/components/material-stubs';
import { ProgressSpinnerComponent } from '../../../../shared/components/progress-spinner/progress-spinner.component';

// Services
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FirebaseAuthSearchService } from '../../../../shared/services/firebase-auth-search.service';
import { WallService } from '../../services/wall.service';
import { NotificationService } from '../../../../shared/services/notification.service';

// RxJS
import { Observable } from 'rxjs';

// Models
import { Wall, UserProfile } from '../../../../shared/models/wall.model';
import { AuthUser } from '../../../../shared/services/firebase-auth-search.service';

interface WallUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
  accessLevel: 'viewer' | 'editor' | 'manager' | 'owner';
}

@Component({
  selector: 'app-users-permissions-v2',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ThemedButtonComponent,
    FormFieldComponent,
    MaterialIconComponent,
    PageLayoutComponent,
    MaterialSelectComponent,
    MatInput,
    MaterialIconComponent,
    ProgressSpinnerComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall; else loadingTemplate">
      <app-page-layout
        title="Users & Permissions"
        subtitle="Manage who can access and edit this wall"
        [showBackButton]="true"
        [actions]="pageActions()"
        (backClick)="goBack()">
        
        <div class="permissions-container">
          
          <!-- Access Summary -->
          <div class="access-summary-compact">
            <div class="summary-item">
              <mat-icon [icon]="'visibility'"></mat-icon>
              <span>{{ getAccessLevelCount('viewer') }} Viewers</span>
            </div>
            <div class="summary-item">
              <mat-icon [icon]="'edit'"></mat-icon>
              <span>{{ getAccessLevelCount('editor') }} Editors</span>
            </div>
            <div class="summary-item">
              <mat-icon [icon]="'admin_panel_settings'"></mat-icon>
              <span>{{ getAccessLevelCount('manager') }} Managers</span>
            </div>
          </div>

          <!-- People Table -->
          <div class="people-table-container">
            <h3>People with access</h3>
            
            <table class="people-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Access Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of wallUsers(); trackBy: trackByUid" class="user-row">
                  <td class="user-cell">
                    <div class="user-info">
                      <div class="user-avatar">
                        <img *ngIf="user.photoURL" [src]="user.photoURL" [alt]="user.displayName">
                        <mat-icon *ngIf="!user.photoURL" [icon]="'account_circle'"></mat-icon>
                      </div>
                      <div class="user-details">
                        <div class="user-name">{{ user.displayName || user.email }}</div>
                        <div class="user-email">{{ user.email }}</div>
                        <div class="user-role-desc">{{ getRoleDescription(user.accessLevel) }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="access-cell">
                    <app-material-select
                      [formControl]="getAccessLevelControl(user)"
                      [options]="getAccessLevelOptions(user)"
                      [disabled]="user.accessLevel === 'owner'">
                    </app-material-select>
                  </td>
                  <td class="actions-cell">
                    <app-themed-button
                      [variant]="'basic'"
                      [icon]="'delete'"
                      (buttonClick)="removeUser(user)"
                      *ngIf="user.accessLevel !== 'owner'"
                      [title]="'Remove user'">
                    </app-themed-button>
                  </td>
                </tr>
                
                <!-- Add User Row -->
                <tr class="add-user-row">
                  <td colspan="3">
                    <div class="add-user-content">
                      <mat-icon [icon]="'person_add'"></mat-icon>
                      <input
                        #searchInput
                        type="text"
                        class="add-user-input"
                        [(ngModel)]="searchQuery"
                        placeholder="Add people by name or email"
                        (input)="onSearchChange(searchQuery)"
                        (keydown.enter)="addUser()"
                        (focus)="positionDropdown($event)">
                      
                      <app-themed-button
                        [variant]="'raised'"
                        [disabled]="!canAddUser()"
                        text="Add"
                        (buttonClick)="addUser()">
                      </app-themed-button>
                      
                      <!-- Search Results Dropdown -->
                      <div class="search-results" *ngIf="showSearchResults() && searchResults().length > 0">
                        <div class="search-result" 
                             *ngFor="let user of searchResults()"
                             (click)="selectSearchResult(user)">
                          <div class="user-avatar small">
                            <img *ngIf="user.photoURL" [src]="user.photoURL" [alt]="user.displayName">
                            <mat-icon *ngIf="!user.photoURL" [icon]="'account_circle'"></mat-icon>
                          </div>
                          <div class="user-info">
                            <div class="user-name">{{ user.displayName || user.email }}</div>
                            <div class="user-email">{{ user.email }}</div>
                          </div>
                        </div>
                      </div>

                      <!-- No Results Message -->
                      <div class="search-results" *ngIf="showSearchResults() && searchResults().length === 0 && searchQuery.length > 2">
                        <div class="no-results">
                          <mat-icon [icon]="'info'"></mat-icon>
                          <span>No users found. Press Enter to invite by email.</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </app-page-layout>
    </div>
    
    <!-- Loading Template -->
    <ng-template #loadingTemplate>
      <div class="loading-container">
        <mat-progress-spinner></mat-progress-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .permissions-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Access Summary - Compact */
    .access-summary-compact {
      display: flex;
      gap: 32px;
      justify-content: center;
      background: var(--md-sys-color-surface-container);
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 24px;
    }
    
    .access-summary-compact .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .access-summary-compact .summary-item mat-icon {
      color: var(--md-sys-color-primary);
      font-size: 20px;
    }
    
    .access-summary-compact .summary-item span {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface);
      font-weight: 500;
    }

    /* People Table Container */
    .people-table-container {
      background: var(--md-sys-color-surface);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--md-sys-color-outline-variant);
    }
    
    .people-table-container h3 {
      margin: 0 0 20px 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    /* Table Styles */
    .people-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .people-table thead {
      background: var(--md-sys-color-surface-container);
    }
    
    .people-table th {
      text-align: left;
      padding: 16px 20px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }
    
    .people-table tbody tr:not(.add-user-row) {
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }
    
    .people-table tbody tr:not(.add-user-row):hover {
      background: var(--md-sys-color-surface-container);
    }
    
    .people-table td {
      padding: 16px 20px;
      vertical-align: middle;
    }

    /* User Cell */
    .user-cell .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--md-sys-color-surface-container-highest);
      flex-shrink: 0;
    }

    .user-avatar.small {
      width: 36px;
      height: 36px;
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-avatar mat-icon {
      font-size: 32px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: 2px;
    }
    
    .user-role-desc {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.8;
    }

    /* Access Cell */
    .access-cell app-material-select {
      min-width: 140px;
    }

    /* Actions Cell */
    .actions-cell {
      width: 80px;
      text-align: center;
    }

    /* Add User Row */
    .add-user-row {
      background: var(--md-sys-color-surface-container-low);
      border-top: 2px solid var(--md-sys-color-outline-variant);
    }
    
    .add-user-row td {
      padding: 20px;
    }
    
    .add-user-content {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
    }
    
    .add-user-content mat-icon {
      color: var(--md-sys-color-primary);
      font-size: 24px;
    }
    
    .add-user-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 8px;
      font-size: 0.875rem;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }
    
    .add-user-input:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
    }
    
    .add-user-input::placeholder {
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.7;
    }

    /* Search Results */
    .search-results {
      position: fixed;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 8px;
      margin-top: 4px;
      max-height: 250px;
      overflow-y: auto;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      min-width: 300px;
      max-width: 400px;
    }

    .add-user-content {
      position: relative;
    }

    .search-result {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .search-result:hover {
      background: var(--md-sys-color-surface-container);
    }

    .search-result .user-info {
      flex: 1;
    }

    .search-result .user-name {
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .search-result .user-email {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
    }

    .no-results {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
    }

    /* Loading */
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .permissions-container {
        padding: 16px;
        max-width: 100%;
      }

      .people-table-container {
        padding: 16px;
      }
      
      .access-summary-compact {
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      
      .people-table th,
      .people-table td {
        padding: 12px 16px;
      }
      
      .add-user-content {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      
      .search-results {
        left: 0;
        right: 0;
      }
    }
  `]
})
export class UsersPermissionsV2Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  wallId: string = '';

  // Signals for reactive state
  loading = signal(false);
  searchQuery = '';
  selectedUser: AuthUser | null = null;
  showSearchResults = signal(false);
  searchResults = signal<AuthUser[]>([]);
  wallUsers = signal<WallUser[]>([]);
  
  // Observable properties
  wall$!: Observable<Wall | null>;
  wall: Wall | null = null;
  ownerProfile: UserProfile | null = null;
  currentUserUid: string = '';
  isOwner = false;
  
  // Form controls map for access levels
  private accessLevelControls = new Map<string, FormControl>();

  // Computed values
  pageActions = computed<PageAction[]>(() => {
    if (!this.isOwner) return [];
    
    return [{
      label: 'Save Changes',
      icon: 'save',
      action: () => this.saveChanges(),
      primary: true
    }];
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private authService: AuthService,
    private firebaseAuthSearch: FirebaseAuthSearchService,
    private confirmationDialog: ConfirmationDialogService,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.wallId = this.route.snapshot.paramMap.get('id') || '';
    console.log('UsersPermissionsV2 - Loading wall:', this.wallId);
    this.wall$ = this.wallService.getWallById(this.wallId);
    
    // Get current user
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUserUid = user?.uid || '';
      console.log('Current user:', this.currentUserUid);
    });

    // Load wall and users
    this.loadWallData();
    
    // Setup search
    this.setupSearch();
    
    // Position search dropdown properly
    this.setupDropdownPositioning();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadWallData() {
    this.loading.set(true);
    
    this.wall$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((wall: Wall | null) => {
      console.log('Wall data received:', wall);
      this.wall = wall;
      if (wall) {
        this.isOwner = wall.permissions.owner === this.currentUserUid;
        
        // Create owner profile from auth
        this.ownerProfile = {
          uid: wall.permissions.owner,
          email: '', // Will be loaded separately
          displayName: 'Wall Owner',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date()
        };
        
        // Build users list
        this.buildUsersList(wall);
      } else {
        console.error('No wall data received');
      }
      this.loading.set(false);
    }, (error: any) => {
      console.error('Error loading wall:', error);
      this.loading.set(false);
    });
  }

  private buildUsersList(wall: Wall) {
    const users: WallUser[] = [];
    
    // Add owner
    users.push({
      uid: wall.permissions.owner,
      email: 'Loading...',
      displayName: 'Loading...',
      photoURL: undefined,
      accessLevel: 'owner'
    });
    
    // Add managers
    wall.permissions.managers?.forEach(uid => {
      users.push({
        uid,
        email: 'Loading...',
        displayName: 'Loading...',
        photoURL: undefined,
        accessLevel: 'manager'
      });
    });
    
    // Add editors
    wall.permissions.editors?.forEach(uid => {
      users.push({
        uid,
        email: 'Loading...',
        displayName: 'Loading...',
        photoURL: undefined,
        accessLevel: 'editor'
      });
    });
    
    // Add viewers
    wall.permissions.viewers?.forEach(uid => {
      users.push({
        uid,
        email: 'Loading...',
        displayName: 'Loading...',
        photoURL: undefined,
        accessLevel: 'viewer'
      });
    });
    
    this.wallUsers.set(users);
    
    // Load actual user data from Firebase Auth
    this.loadUserProfiles(users);
  }

  private setupSearch() {
    // Implement search with debounce
    // This would be connected to the search input
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    if (value.length > 2) {
      this.showSearchResults.set(true);
      // Perform search
      this.firebaseAuthSearch.searchUsers(value).subscribe({
        next: (results) => {
          console.log('Search results:', results);
          this.searchResults.set(results);
          // If no results from Firebase, show mock results for testing
          if (results.length === 0) {
            this.searchResults.set(this.getMockSearchResults(value));
          }
          // Position dropdown after results are set
          this.positionDropdownFromInput();
        },
        error: (error) => {
          console.error('Search error:', error);
          // Fallback to mock results
          this.searchResults.set(this.getMockSearchResults(value));
          // Position dropdown after results are set
          this.positionDropdownFromInput();
        }
      });
    } else {
      this.showSearchResults.set(false);
      this.searchResults.set([]);
    }
  }

  positionDropdown(event: Event) {
    this.positionDropdownFromInput();
  }

  private positionDropdownFromInput() {
    setTimeout(() => {
      const inputElement = document.querySelector('.add-user-input') as HTMLInputElement;
      const dropdown = document.querySelector('.search-results') as HTMLElement;
      
      if (inputElement && dropdown) {
        const rect = inputElement.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${Math.max(rect.width, 300)}px`;
        dropdown.style.display = 'block';
      }
    }, 50); // Small delay to ensure DOM is updated
  }

  private getMockSearchResults(searchTerm: string): AuthUser[] {
    // Mock users for testing when Cloud Function is not available
    const mockUsers: AuthUser[] = [
      {
        uid: 'mock1',
        email: `${searchTerm.toLowerCase()}@example.com`,
        displayName: `${searchTerm} User`,
        photoURL: null
      },
      {
        uid: 'mock2', 
        email: `test.${searchTerm.toLowerCase()}@company.com`,
        displayName: `Test ${searchTerm}`,
        photoURL: null
      },
      {
        uid: 'mock3',
        email: `${searchTerm}123@domain.org`,
        displayName: `${searchTerm} Demo User`,
        photoURL: null
      }
    ];
    
    return mockUsers.filter(user => 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  selectSearchResult(user: AuthUser) {
    this.selectedUser = user;
    this.searchQuery = user.email;
    this.showSearchResults.set(false);
  }

  canAddUser(): boolean {
    return !!this.selectedUser || this.isValidEmail(this.searchQuery);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async addUser() {
    if (!this.canAddUser()) return;
    
    const email = this.selectedUser?.email || this.searchQuery;
    const displayName = this.selectedUser?.displayName || email;
    
    // Check if user already exists
    if (this.wallUsers().some(u => u.email === email)) {
      this.notification.error('User already has access to this wall');
      return;
    }
    
    // Add user as viewer by default
    const newUser: WallUser = {
      uid: this.selectedUser?.uid || email, // Use email as temporary ID
      email,
      displayName,
      photoURL: this.selectedUser?.photoURL || undefined,
      accessLevel: 'viewer'
    };
    
    this.wallUsers.update(users => [...users, newUser]);
    
    // Clear search
    this.searchQuery = '';
    this.selectedUser = null;
    this.searchResults.set([]);
  }

  async removeUser(user: WallUser) {
    const confirmed = await this.confirmationDialog.confirm({
      title: 'Remove User',
      message: `Are you sure you want to remove ${user.displayName || user.email} from this wall?`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    });
    
    if (confirmed) {
      this.wallUsers.update(users => users.filter(u => u.uid !== user.uid));
      this.notification.success('User removed');
    }
  }

  getAccessLevelOptions(user: WallUser): SelectOption[] {
    // Owner cannot change their own role
    if (user.accessLevel === 'owner') {
      return [{ value: 'owner', label: 'Owner' }];
    }
    
    const options: SelectOption[] = [
      { value: 'viewer', label: 'Viewer' },
      { value: 'editor', label: 'Editor' },
      { value: 'manager', label: 'Manager' }
    ];
    
    // Add transfer ownership option for current owner
    if (this.isOwner && user.uid !== this.currentUserUid) {
      options.push({ 
        value: 'transfer-owner', 
        label: '👑 Transfer Ownership' 
      });
    }
    
    return options;
  }
  
  getRoleDescription(role: string): string {
    switch (role) {
      case 'owner': return 'Has full control over this wall';
      case 'manager': return 'Can manage users and settings';
      case 'editor': return 'Can add and edit items';
      case 'viewer': return 'Can view content';
      default: return '';
    }
  }
  
  getAccessLevelControl(user: WallUser): FormControl {
    if (!this.accessLevelControls.has(user.uid)) {
      const control = new FormControl(user.accessLevel);
      // Listen to value changes
      control.valueChanges.subscribe(newValue => {
        if (newValue) {
          this.onAccessLevelChange(user, newValue);
        }
      });
      this.accessLevelControls.set(user.uid, control);
    }
    return this.accessLevelControls.get(user.uid)!;
  }

  async onAccessLevelChange(user: WallUser, newLevel: string) {
    if (newLevel === 'transfer-owner') {
      await this.transferOwnership(user);
      // Reset to previous level if cancelled
      user.accessLevel = user.accessLevel === 'owner' ? 'owner' : user.accessLevel;
    } else {
      user.accessLevel = newLevel as any;
    }
  }

  private async transferOwnership(user: WallUser) {
    const confirmed = await this.confirmationDialog.confirm({
      title: 'Transfer Ownership',
      message: `Are you sure you want to transfer ownership to ${user.displayName || user.email}? You will become a manager and lose owner privileges.`,
      confirmText: 'Transfer Ownership',
      cancelText: 'Cancel'
    });
    
    if (confirmed) {
      // Update local state
      const currentOwner = this.wallUsers().find(u => u.accessLevel === 'owner');
      if (currentOwner) {
        currentOwner.accessLevel = 'manager';
      }
      user.accessLevel = 'owner';
      
      this.notification.success('Ownership transferred successfully');
    }
  }

  getAccessLevelCount(level: string): number {
    return this.wallUsers().filter(u => u.accessLevel === level).length;
  }

  async saveChanges() {
    this.loading.set(true);
    
    try {
      // Build permissions object
      const permissions = {
        owner: this.wallUsers().find(u => u.accessLevel === 'owner')?.uid || '',
        managers: this.wallUsers().filter(u => u.accessLevel === 'manager').map(u => u.uid),
        editors: this.wallUsers().filter(u => u.accessLevel === 'editor').map(u => u.uid),
        viewers: this.wallUsers().filter(u => u.accessLevel === 'viewer').map(u => u.uid)
      };
      
      // Update wall permissions
      await this.wallService.updateWallPermissions(this.wallId, permissions);
      
      this.notification.success('Permissions updated successfully');
    } catch (error) {
      this.notification.error('Failed to update permissions');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  trackByUid(index: number, user: WallUser): string {
    return user.uid;
  }

  private setupDropdownPositioning() {
    // Add click outside handler to close dropdown
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.add-user-content')) {
        this.showSearchResults.set(false);
      }
    });
  }

  private async loadUserProfiles(users: WallUser[]) {
    // Use Firebase Auth search service to get user profiles
    for (const user of users) {
      try {
        // In a real app, you'd want to batch these requests or use a different approach
        // For now, we'll try to get user info from the current user or show UID
        if (user.uid === this.currentUserUid) {
          // Get current user info from auth service
          this.authService.currentUser$.pipe(
            takeUntil(this.destroy$)
          ).subscribe(currentUser => {
            if (currentUser && currentUser.uid === user.uid) {
              user.email = currentUser.email || user.uid;
              user.displayName = currentUser.displayName || currentUser.email || user.uid;
              user.photoURL = currentUser.photoURL;
              this.wallUsers.update(users => [...users]); // Trigger update
            }
          });
        } else {
          // For other users, show UID as fallback since we don't have a user lookup service
          user.email = user.uid;
          user.displayName = `User ${user.uid.substring(0, 8)}...`;
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        user.email = user.uid;
        user.displayName = `User ${user.uid.substring(0, 8)}...`;
      }
    }
    
    // Update the signal to trigger UI refresh
    this.wallUsers.update(users => [...users]);
  }
}