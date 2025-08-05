import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService, AppUser } from '../../../core/services/auth.service';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

@Component({
  selector: 'app-user-account-menu',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent],
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
        
        <!-- User Photo -->
        <img 
          *ngIf="(currentUser$ | async)?.photoURL" 
          [src]="(currentUser$ | async)?.photoURL!" 
          [alt]="(currentUser$ | async)?.displayName || 'User Avatar'"
          class="avatar-image"
          (error)="onImageError($event)">
        
        <!-- Fallback Initials -->
        <div 
          *ngIf="(currentUser$ | async) && !(currentUser$ | async)?.photoURL" 
          class="avatar-initials">
          {{ getInitials((currentUser$ | async)?.displayName || (currentUser$ | async)?.email || '') }}
        </div>
        
        <!-- Generic User Icon -->
        <div 
          *ngIf="!(currentUser$ | async)" 
          class="avatar-generic">
          <mat-icon [icon]="'account_circle'"></mat-icon>
        </div>

        <!-- Dropdown Arrow -->
        <mat-icon 
          class="dropdown-arrow" 
          [class.rotated]="isMenuOpen"
          [icon]="'keyboard_arrow_down'">
        </mat-icon>
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
            <div class="user-details">
              <div class="user-name">{{ user.displayName || 'User' }}</div>
              <div class="user-email">{{ user.email }}</div>
            </div>
          </div>

          <div class="menu-divider"></div>

          <!-- Sign Out -->
          <div class="menu-section">
            <button 
              class="menu-item danger"
              (click)="onSignOut()"
              type="button">
              <mat-icon [icon]="'logout'"></mat-icon>
              <span>Sign Out</span>
            </button>
          </div>
        } @else {
          <!-- Not Signed In -->
          <div class="menu-section">
            <button 
              class="menu-item"
              (click)="onSignIn()"
              type="button">
              <mat-icon [icon]="'login'"></mat-icon>
              <span>Sign In</span>
            </button>
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
      gap: 8px;
      padding: 6px 12px 6px 6px;
      border: none;
      border-radius: 50px;
      background: var(--md-sys-color-surface-container-low);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      position: relative;
      min-height: 48px;
      box-sizing: border-box;
      border: 1px solid var(--md-sys-color-outline-variant);
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
      min-width: 280px;
      background: var(--md-sys-color-surface-container);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 24px;
      box-shadow: var(--md-sys-elevation-3);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px) scale(0.95);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      overflow: hidden;
    }

    .account-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* User Info Section */
    .user-info-section {
      padding: 20px;
      background: var(--md-sys-color-surface-container-high);
      border-radius: 24px 24px 0 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
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
      word-break: break-word;
      margin-top: 4px;
    }

    /* Menu Sections */
    .menu-section {
      padding: 12px 0;
    }

    .menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface);
      font-size: 16px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      border-radius: 16px;
      margin: 0 8px;
    }

    .menu-item:hover {
      background: var(--md-sys-color-surface-container-highest);
      transform: translateY(-1px);
    }

    .menu-item:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: -2px;
    }

    .menu-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .menu-item.danger {
      color: var(--md-sys-color-error);
    }

    .menu-item.danger mat-icon {
      color: var(--md-sys-color-error);
    }

    .menu-item.danger:hover {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      transform: translateY(-1px);
    }

    .menu-item.danger:hover mat-icon {
      color: var(--md-sys-color-on-error-container);
    }

    /* Menu Divider */
    .menu-divider {
      height: 1px;
      background: var(--md-sys-color-outline-variant);
      margin: 8px 16px;
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
        right: -16px;
        left: -16px;
        width: auto;
        min-width: unset;
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Close menu when clicking outside
    document.addEventListener('click', this.onDocumentClick.bind(this));
    
    // Close menu on escape key
    document.addEventListener('keydown', this.onDocumentKeydown.bind(this));
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

  onImageError(event: any): void {
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
}