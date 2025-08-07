import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy, signal, computed, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../divider/divider.component';
import { Subject, takeUntil } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { NavigationService } from '../../services/navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { SideButtonComponent } from '../side-button/side-button.component';
import { WallMenuItem, WallNavigationContext, AddMode } from '../../models/navigation.model';
import { QrCodeComponent } from '../qr-code/qr-code.component';

@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DividerComponent,
    SideButtonComponent,
    QrCodeComponent
  ],
  template: `
    <div class="navigation-menu" [class.open]="isMenuOpen()" [class.closed]="!isMenuOpen()">
      <div class="menu-content" #menuContent (scroll)="onScroll()">
        


        <!-- Navigation Items -->
        <div class="menu-items">
          @for (item of activeMenuItems(); track trackMenuItem($index, item)) {
            <app-side-button
              [title]="item.title"
              [icon]="item.icon"
              [selected]="isItemSelected(item)"
              [badge]="getItemBadge(item)"
              (buttonClick)="handleMenuItemClick(item)">
            </app-side-button>
          }
        </div>


        <!-- Admin Section -->
        @if (hasAdminPermissions()) {
          <div class="admin-section">
            <mat-divider></mat-divider>
            
            <div class="section-header">
              <h3>Administration</h3>
            </div>
              <!-- Wall-specific admin buttons -->
              <app-side-button
                title="Back to Walls"
                icon="arrow_back"
                [selected]="false"
                (buttonClick)="navigateToWalls()">
              </app-side-button>
              
              <app-side-button
                title="Wall Item Presets"
                icon="category"
                [selected]="isAdminPathSelectedWithCD('/presets')"
                (buttonClick)="navigateToAdmin('/presets')">
              </app-side-button>
              
              <app-side-button
                title="Wall Settings"
                icon="settings"
                [selected]="isAdminPathSelectedWithCD('/edit')"
                (buttonClick)="navigateToAdmin('/edit')">
              </app-side-button>
              
              <app-side-button
                title="Users & Permissions"
                icon="people"
                [selected]="isAdminPathSelectedWithCD('/permissions')"
                (buttonClick)="navigateToAdmin('/permissions')">
              </app-side-button>
          </div>
        }

        <!-- QR Code Section -->
        @if (shouldShowQrCode()) {
          <div class="qr-code-section">
            <app-qr-code 
              [data]="qrCodeUrl()"
              [label]="'Visit This Wall'"
              [size]="150">
            </app-qr-code>
          </div>
        }

      </div>
      
      <!-- Scroll indicator overlay -->
      <div class="scroll-indicator" *ngIf="showScrollIndicator()" [class.visible]="showScrollIndicator()">
        <span class="material-icons">keyboard_arrow_down</span>
      </div>
    </div>
  `,
  styles: [`
    .navigation-menu {
      height: 100%;
      transition: all 200ms;
      background: var(--md-sys-color-surface-container-low);
      --side-bar-radius: 3.25em;
      border-radius: 0 var(--side-bar-radius) var(--side-bar-radius) 0;
      contain: strict;
      overflow: hidden;
    }

    .navigation-menu.open {
      background: var(--md-sys-color-surface-container-low);
      width: 300px;
      transition: all 200ms;
    }

    .navigation-menu.closed {
      width: 0px;
    }

    /* Sidebar can be collapsed in desktop mode - removed forced open behavior */

    @media (max-width: 800px) {
      .navigation-menu.open {
        width: 100vw;
        border-radius: 0;
      }
      
      .navigation-menu {
        border-radius: 0;
      }
      
      .menu-content {
        align-items: center;
        width: 100%;
        padding: 24px;
        gap: 20px;
      }
      
      
      .menu-items {
        align-items: center;
        width: 100%;
        gap: 8px;
      }
      
      
      .admin-section {
        align-items: center;
        width: 100%;
        gap: 8px;
      }
      
      app-side-button {
        width: 100%;
        max-width: none;
      }
      
    }

    .menu-content {
      width: 300px;
      height: 100%;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
      scrollbar-width: none; /* Firefox - hide scrollbar */
      -ms-overflow-style: none; /* IE and Edge - hide scrollbar */
    }

    @media (max-width: 800px) {
      .menu-content {
        width: 100% !important;
      }
    }

    /* Webkit browsers - hide scrollbar */
    .menu-content::-webkit-scrollbar {
      display: none;
    }

    /* Header Section */
    .menu-header {
      padding: 8px 4px;
    }

    .wall-name, .app-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
      margin: 0 0 4px 0;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wall-subtitle, .app-subtitle {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }


    /* Menu Items */
    .menu-items {
      flex: none; /* Don't flex-shrink the menu items */
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Section Headers */
    .section-header {
      padding: 12px 4px 8px 4px;
    }

    .section-header h3 {
      font-size: 12px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Admin Section */
    .admin-section {
      flex: none; /* Don't flex-shrink the admin section */
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .menu-content {
        padding: 12px;
        gap: 12px;
      }
      
      
      .wall-name, .app-name {
        font-size: 16px;
      }
    }

    /* Material Divider Styling */
    mat-divider {
      margin: 0;
      border-color: var(--md-sys-color-outline-variant);
    }

    /* Loading and Empty States */
    .loading-state,
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
    }

    /* Focus and Accessibility */
    
    /* Scroll Indicator */
    .scroll-indicator {
      position: absolute;
      bottom: 16px;
      right: 16px;
      color: var(--md-sys-color-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: opacity 0.3s cubic-bezier(0.2, 0, 0, 1);
      pointer-events: none;
      z-index: 100;
    }
    
    .scroll-indicator.visible {
      opacity: 0.6;
    }
    
    .scroll-indicator span {
      font-size: 24px;
      animation: bounce 2s infinite;
    }
    
    /* QR Code Section */
    .qr-code-section {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-4px);
      }
      60% {
        transform: translateY(-2px);
      }
    }
  `]
})
export class NavigationMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private resizeListener?: () => void;
  private cdr = inject(ChangeDetectorRef);
  
  @ViewChild('menuContent') menuContent!: ElementRef<HTMLDivElement>;
  
  // Convert to signals for reactive state management
  private navigationService = inject(NavigationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Signal-based state
  protected readonly isMenuOpen = toSignal(this.navigationService.isMenuOpen$, { initialValue: false });
  protected readonly currentContext = toSignal(this.navigationService.currentContext$, { initialValue: null });
  protected readonly currentUrl = signal('');
  protected readonly showScrollIndicator = signal(false);
  
  // Computed properties for reactive updates
  protected readonly activeMenuItems = computed(() => {
    // Trigger recomputation when context changes
    this.currentContext();
    return this.navigationService.getActiveMenuItems();
  });
  
  protected readonly hasAdminPermissions = computed(() => {
    const context = this.currentContext();
    return context?.canAdmin ?? false;
  });
  
  protected readonly shouldShowQrCode = computed(() => {
    const context = this.currentContext();
    // Show QR code if wall settings explicitly enable it
    return context?.wallSettings?.showQrCode === true;
  });
  
  protected readonly qrCodeUrl = computed(() => {
    const context = this.currentContext();
    if (typeof window !== 'undefined' && context?.wallId) {
      // Generate URL for the specific wall
      return `${window.location.origin}/walls/${context.wallId}`;
    }
    return window.location.origin || 'https://riversidewalls.com';
  });

  constructor() {}

  ngOnInit() {
    // Subscribe to router events to update current URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl.set(event.url);
      // Mark for check since we're using OnPush
      this.cdr.markForCheck();
    });

    // Initial load
    this.currentUrl.set(this.router.url);
    
    // Set up effect to update scroll indicator when menu items change
    // Note: In OnPush, we need to manually trigger change detection for DOM operations
    this.navigationService.currentContext$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Check scroll indicator after context changes
      setTimeout(() => this.checkScrollIndicator(), 0);
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
    // Check scroll indicator after view is initialized
    setTimeout(() => this.checkScrollIndicator(), 100);
    
    // Also check on window resize
    this.resizeListener = () => this.checkScrollIndicator();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up resize listener
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  // Remove updateActiveMenuItems - now handled by computed signal


  handleMenuItemClick(item: WallMenuItem) {
    this.navigationService.navigateToMenuItem(item);
  }


  isAdminPathSelected(path: string): boolean {
    const context = this.currentContext();
    if (!context) return false;
    
    return this.navigationService.isMenuItemSelected({
      title: '',
      icon: '',
      path: `/walls/${context.wallId}${path}`,
      condition: () => true
    });
  }

  navigateToAdmin(path: string) {
    const context = this.currentContext();
    if (context) {
      this.navigationService.navigateToMenuItem({
        title: '',
        icon: '',
        path: `/walls/${context.wallId}${path}`,
        condition: () => true
      });
    }
  }

  navigateToWalls() {
    this.navigationService.navigateToMenuItem({
      title: 'Walls',
      icon: 'home',
      path: '/walls',
      condition: () => true
    });
  }

  navigateToRecycleBin() {
    this.navigationService.navigateToMenuItem({
      title: 'Recycle Bin',
      icon: 'delete',
      path: '/walls/recycle',
      condition: () => true
    });
  }

  navigateToCreateWall() {
    this.navigationService.navigateToMenuItem({
      title: 'Create New Wall',
      icon: 'add',
      path: '/walls/create',
      condition: () => true
    });
  }

  getItemBadge(item: WallMenuItem): string | undefined {
    // Could be extended to show counts, notifications, etc.
    return undefined;
  }

  // Check if menu item is selected using signal-based state
  isItemSelected(item: WallMenuItem): boolean {
    // Access signal to ensure reactivity when route changes
    return !!this.currentUrl() && this.navigationService.isMenuItemSelected(item);
  }


  // Admin path selection with signal-based change detection
  isAdminPathSelectedWithCD(path: string): boolean {
    return !!this.currentUrl() && this.isAdminPathSelected(path);
  }

  // TrackBy functions for performance
  trackMenuItem(index: number, item: WallMenuItem): string {
    return `${item.title}-${item.path}`;
  }

  // Scroll detection methods
  onScroll(): void {
    this.checkScrollIndicator();
  }

  private checkScrollIndicator(): void {
    if (this.menuContent?.nativeElement) {
      const element = this.menuContent.nativeElement;
      const hasOverflow = element.scrollHeight > element.clientHeight;
      
      // Show indicator if there's overflow content (so users know they can scroll)
      this.showScrollIndicator.set(hasOverflow);
      this.cdr.markForCheck();
    }
  }

}