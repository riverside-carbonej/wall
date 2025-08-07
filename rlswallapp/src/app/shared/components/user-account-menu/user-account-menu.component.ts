import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService, AppUser } from '../../../core/services/auth.service';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { BugReportDialogComponent } from '../bug-report-dialog/bug-report-dialog.component';

@Component({
  selector: 'app-user-account-menu',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent, ThemedButtonComponent],
  template: `
    <div class="user-account-menu">
      <!-- User Avatar Button -->
      <button 
        class="user-avatar-button"
        [class.active]="isMenuOpen"
        (click)="toggleMenu()"
        [attr.aria-expanded]="isMenuOpen"
        [attr.aria-label]="'User account menu for ' + ((currentUser$ | async)?.displayName || (currentUser$ | async)?.email || 'User')"
        #avatarButton>
        
        @if (currentUser$ | async; as user) {
          <!-- User Photo -->
          @if (user.photoURL && !imageLoadFailed) {
            <img 
              [src]="user.photoURL" 
              [alt]="user.displayName || 'User Avatar'"
              class="avatar-image"
              (load)="onImageLoad()"
              (error)="onImageError($event)"
              referrerpolicy="no-referrer">
          } @else {
            <!-- Fallback Initials -->
            <div class="avatar-initials">
              {{ getInitials(user.displayName || user.email || '') }}
            </div>
          }
        } @else {
          <!-- Generic User Icon -->
          <div class="avatar-generic">
            <mat-icon [icon]="'account_circle'"></mat-icon>
          </div>
        }

      </button>

      <!-- Dropdown Menu -->
      <div 
        class="account-dropdown"
        [class.open]="isMenuOpen"
        [attr.aria-hidden]="!isMenuOpen"
        #dropdown>
        
        @if (currentUser$ | async; as user) {
          <!-- User Info Section -->
          <div class="user-info-section">
            <!-- User Avatar in Dropdown -->
            <div class="dropdown-avatar">
              @if (user.photoURL && !imageLoadFailed) {
                <img 
                  [src]="user.photoURL" 
                  [alt]="user.displayName || 'User Avatar'"
                  class="dropdown-avatar-image"
                  (load)="onImageLoad()"
                  (error)="onImageError($event)"
                  referrerpolicy="no-referrer">
              } @else {
                <!-- Fallback Initials -->
                <div class="dropdown-avatar-initials">
                  {{ getInitials(user.displayName || user.email || '') }}
                </div>
              }
            </div>
            
            <div class="user-details">
              <div class="user-name">{{ user.displayName || 'User' }}</div>
              <div class="user-email">{{ user.email }}</div>
            </div>
          </div>

          <!-- Bug Report Button (only show when logged in) -->
          @if (user) {
            <div class="menu-divider"></div>
            
            <div class="menu-section">
              <app-themed-button
                [fullWidth]="true"
                [color]="'primary'"
                [variant]="'basic'"
                [icon]="'bug_report'"
                [label]="'Report Bug'"
                [customPadding]="'16px 24px'"
                [height]="'48px'"
                [justifyContent]="'center'"
                (buttonClick)="onReportBug()">
              </app-themed-button>
            </div>
          }

          <div class="menu-divider"></div>

          <!-- Sign Out -->
          <div class="menu-section">
            <app-themed-button
              [fullWidth]="true"
              [color]="'warn'"
              [variant]="'basic'"
              [icon]="'logout'"
              [label]="'Sign Out'"
              [customPadding]="'16px 24px'"
              [height]="'48px'"
              [justifyContent]="'center'"
              (buttonClick)="onSignOut()">
            </app-themed-button>
          </div>
        } @else {
          <!-- Not Signed In -->
          <div class="menu-section">
            <app-themed-button
              [fullWidth]="true"
              [color]="'primary'"
              [variant]="'basic'"
              [icon]="'login'"
              [label]="'Sign In'"
              [customPadding]="'16px 24px'"
              [height]="'48px'"
              [justifyContent]="'center'"
              (buttonClick)="onSignIn()">
            </app-themed-button>
          </div>
        }
      </div>

      <!-- Backdrop -->
      <div 
        class="menu-backdrop"
        [class.visible]="isMenuOpen"
        (click)="closeMenu()">
      </div>
    </div>
  `,
  styles: [`
    .user-account-menu {
      position: relative;
      display: inline-block;
    }

    /* User Avatar Button */
    .user-avatar-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border: none;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      position: relative;
      width: 40px;
      height: 40px;
      box-sizing: border-box;
    }

    .user-avatar-button:hover {
      background: var(--md-sys-color-surface-container);
      transform: translateY(-1px);
      box-shadow: var(--md-sys-elevation-2);
    }

    .user-avatar-button.active {
      background: var(--md-sys-color-surface-container-high);
      box-shadow: var(--md-sys-elevation-1);
    }

    .user-avatar-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    /* Avatar Styles */
    .avatar-image,
    .avatar-initials,
    .avatar-generic {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-image {
      object-fit: cover;
      border: 2px solid var(--md-sys-color-outline-variant);
    }

    .avatar-initials {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      font-weight: 500;
      font-size: 16px;
      text-transform: uppercase;
    }

    .avatar-generic {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
    }

    .avatar-generic mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    /* Dropdown Arrow */
    .dropdown-arrow {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-on-surface-variant);
      transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .dropdown-arrow.rotated {
      transform: rotate(180deg);
    }

    /* Dropdown Menu */
    .account-dropdown {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      min-width: 320px;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 28px;
      box-shadow: var(--md-sys-elevation-3);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px) scale(0.95);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      overflow: hidden;
      padding: 8px;
    }

    .account-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* User Info Section */
    .user-info-section {
      padding: 24px;
      background: var(--md-sys-color-surface-container);
      border-radius: 20px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .user-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
      line-height: 1.2;
    }

    .user-email {
      font-size: 14px;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 4px;
      max-width: 100%;
    }

    /* Dropdown Avatar */
    .dropdown-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dropdown-avatar-image {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--md-sys-color-outline-variant);
    }

    .dropdown-avatar-initials {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 24px;
      text-transform: uppercase;
      border: 3px solid var(--md-sys-color-outline-variant);
    }

    /* Menu Sections */
    .menu-section {
      padding: 8px 16px;
    }


    /* Menu Divider */
    .menu-divider {
      height: 1px;
      background: var(--md-sys-color-outline-variant);
      margin: 8px 0;
    }

    /* Backdrop */
    .menu-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .menu-backdrop.visible {
      opacity: 1;
      visibility: visible;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .account-dropdown {
        right: 16px;
        min-width: min(280px, calc(100vw - 32px));
        max-width: calc(100vw - 32px);
      }
      
      .user-email {
        font-size: 13px;
      }
    }

    /* High Contrast */
    @media (prefers-contrast: high) {
      .user-avatar-button {
        border: 2px solid var(--md-sys-color-outline);
      }
      
      .account-dropdown {
        border-width: 2px;
      }
      
      .avatar-image {
        border-width: 3px;
      }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .user-avatar-button,
      .dropdown-arrow,
      .account-dropdown,
      .menu-backdrop,
      .menu-item {
        transition: none;
      }
    }
  `]
})
export class UserAccountMenuComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @ViewChild('avatarButton') avatarButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('dropdown') dropdown!: ElementRef<HTMLDivElement>;
  
  currentUser$: Observable<AppUser | null>;
  isMenuOpen = false;
  imageLoadFailed = false;

  private dialogRef?: ComponentRef<BugReportDialogComponent>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    private viewContainerRef: ViewContainerRef
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Close menu when clicking outside
    document.addEventListener('click', this.onDocumentClick.bind(this));
    
    // Close menu on escape key
    document.addEventListener('keydown', this.onDocumentKeydown.bind(this));
    
    // Debug: Log current user state
    this.currentUser$.subscribe(user => {
      console.log('UserAccountMenuComponent - Current user:', user);
      // Reset image load failed flag when user changes
      this.imageLoadFailed = false;
      if (user) {
        console.log('User details:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    document.removeEventListener('keydown', this.onDocumentKeydown.bind(this));
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  private onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  private onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isMenuOpen) {
      this.closeMenu();
      this.avatarButton.nativeElement.focus();
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    
    // If it's an email, extract the part before @
    if (name.includes('@')) {
      name = name.split('@')[0];
    }
    
    // Split by spaces and take first letter of each word
    const words = name.trim().split(/\s+/);
    
    if (words.length === 1) {
      // Single word - take first 2 characters
      return words[0].substring(0, 2).toUpperCase();
    } else {
      // Multiple words - take first letter of first 2 words
      return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
    }
  }

  onImageLoad(): void {
    console.log('User avatar image loaded successfully');
    this.imageLoadFailed = false;
  }

  onImageError(event: any): void {
    console.log('User avatar image failed to load:', event);
    this.imageLoadFailed = true;
    // Hide the broken image and let the initials show instead
    event.target.style.display = 'none';
  }


  onSignOut(): void {
    this.closeMenu();
    this.authService.signOut().subscribe({
      next: () => {
        this.router.navigate(['/']).then(() => {
          window.location.reload();
        });
      },
      error: (error: any) => {
        console.error('Sign out error:', error);
      }
    });
  }

  onSignIn(): void {
    this.closeMenu();
    this.router.navigate(['/login']);
  }

  onReportBug(): void {
    this.closeMenu();
    
    // Create and show the bug report dialog
    if (!this.dialogRef) {
      this.dialogRef = this.viewContainerRef.createComponent(BugReportDialogComponent);
      document.body.appendChild(this.dialogRef.location.nativeElement);
      
      // Clean up reference when dialog is closed
      const checkInterval = setInterval(() => {
        if (!document.body.contains(this.dialogRef!.location.nativeElement)) {
          clearInterval(checkInterval);
          this.dialogRef?.destroy();
          this.dialogRef = undefined;
        }
      }, 100);
    }
  }
}