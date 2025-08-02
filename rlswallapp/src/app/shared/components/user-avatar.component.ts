import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AppUser } from '../../core/services/auth.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar-container" [class.clickable]="clickable" [style.width.px]="size" [style.height.px]="size">
      <!-- User profile picture if logged in and has photo -->
      <img 
        *ngIf="(user$ | async)?.photoURL" 
        [src]="(user$ | async)?.photoURL || ''" 
        [alt]="(user$ | async)?.displayName || 'User Avatar'"
        class="avatar-image"
        (error)="onImageError($event)"
        [style.width.px]="size" 
        [style.height.px]="size"
      />
      
      <!-- Fallback to initials if logged in but no photo -->
      <div 
        *ngIf="(user$ | async) && !(user$ | async)?.photoURL" 
        class="avatar-initials"
        [style.width.px]="size" 
        [style.height.px]="size"
        [style.font-size.px]="size * 0.4"
      >
        {{ getInitials((user$ | async)?.displayName || (user$ | async)?.email || '') }}
      </div>
      
      <!-- Generic user icon if not logged in -->
      <div 
        *ngIf="!(user$ | async)" 
        class="avatar-generic"
        [style.width.px]="size" 
        [style.height.px]="size"
      >
        <span 
          class="material-icons generic-user-icon"
          [style.font-size.px]="size * 0.6"
        >
          account_circle
        </span>
      </div>
      
      <!-- Online indicator (optional) -->
      <div *ngIf="showOnlineIndicator && (user$ | async)" class="online-indicator"></div>
    </div>
  `,
  styles: [`
    .avatar-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      overflow: hidden;
      background: var(--md-sys-color-surface-variant);
      border: 2px solid var(--md-sys-color-outline-variant);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .avatar-container.clickable {
      cursor: pointer;
    }

    .avatar-container.clickable:hover {
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .avatar-image {
      border-radius: 50%;
      object-fit: cover;
      background: var(--md-sys-color-surface-variant);
    }

    .avatar-initials {
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .avatar-generic {
      border-radius: 50%;
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .generic-user-icon {
      opacity: 0.7;
    }

    .online-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 8px;
      height: 8px;
      background: #4CAF50;
      border: 2px solid var(--md-sys-color-surface);
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* Size variants */
    .avatar-container.size-small { width: 24px; height: 24px; }
    .avatar-container.size-medium { width: 32px; height: 32px; }
    .avatar-container.size-large { width: 40px; height: 40px; }
    .avatar-container.size-xl { width: 56px; height: 56px; }

    /* Responsive behavior */
    @media (max-width: 768px) {
      .avatar-container.clickable:hover {
        transform: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .avatar-container {
        border-width: 3px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .avatar-container {
        transition: none;
      }
      
      .avatar-container.clickable:hover {
        transform: none;
      }
    }
  `]
})
export class UserAvatarComponent implements OnInit {
  @Input() size: number = 32;
  @Input() clickable: boolean = false;
  @Input() showOnlineIndicator: boolean = false;
  
  user$: Observable<AppUser | null>;

  constructor(private authService: AuthService) {
    this.user$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Component initialized
  }

  /**
   * Generate initials from user's display name or email
   */
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

  /**
   * Handle image load errors (fallback to initials)
   */
  onImageError(event: any): void {
    // Hide the broken image and let the initials show instead
    event.target.style.display = 'none';
  }
}