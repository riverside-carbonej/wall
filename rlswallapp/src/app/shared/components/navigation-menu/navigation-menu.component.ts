import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../divider/divider.component';
import { Subject, takeUntil } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NavigationService } from '../../services/navigation.service';
import { SideButtonComponent } from '../side-button/side-button.component';
import { WallMenuItem, WallNavigationContext, AddMode } from '../../models/navigation.model';

@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  imports: [
    CommonModule,
    DividerComponent,
    SideButtonComponent
  ],
  template: `
    <div class="navigation-menu" [class.open]="isMenuOpen" [class.closed]="!isMenuOpen">
      <div class="menu-content" #menuContent (scroll)="onScroll()">
        


        <!-- Navigation Items -->
        <div class="menu-items">
          @for (item of activeMenuItems; track trackMenuItem($index, item)) {
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
        @if (currentContext?.canAdmin) {
          <div class="admin-section">
            <mat-divider></mat-divider>
            
            <div class="section-header">
              <h3>Administration</h3>
            </div>
            
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

      </div>
      
      <!-- Scroll indicator overlay -->
      <div class="scroll-indicator" *ngIf="showScrollIndicator" [class.visible]="showScrollIndicator">
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
  
  @ViewChild('menuContent') menuContent!: ElementRef<HTMLDivElement>;
  
  isMenuOpen = false;
  currentContext: WallNavigationContext | null = null;
  activeMenuItems: WallMenuItem[] = [];
  currentUrl = '';
  showScrollIndicator = false;

  constructor(
    public navigationService: NavigationService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to menu state
    this.navigationService.isMenuOpen$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isOpen => {
      this.isMenuOpen = isOpen;
    });

    // Subscribe to navigation context
    this.navigationService.currentContext$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(context => {
      this.currentContext = context;
      this.updateActiveMenuItems();
    });

    // Subscribe to router events to trigger change detection for selected state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.url;
    });

    // Initial load
    this.currentUrl = this.router.url;
    this.updateActiveMenuItems();
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

  private updateActiveMenuItems() {
    this.activeMenuItems = this.navigationService.getActiveMenuItems();
    // Check scroll indicator after menu items change
    setTimeout(() => this.checkScrollIndicator(), 0);
  }


  handleMenuItemClick(item: WallMenuItem) {
    this.navigationService.navigateToMenuItem(item);
  }


  isAdminPathSelected(path: string): boolean {
    if (!this.currentContext) return false;
    
    return this.navigationService.isMenuItemSelected({
      title: '',
      icon: '',
      path: `/walls/${this.currentContext.wallId}${path}`,
      condition: () => true
    });
  }

  navigateToAdmin(path: string) {
    if (this.currentContext) {
      this.navigationService.navigateToMenuItem({
        title: '',
        icon: '',
        path: `/walls/${this.currentContext.wallId}${path}`,
        condition: () => true
      });
    }
  }

  getItemBadge(item: WallMenuItem): string | undefined {
    // Could be extended to show counts, notifications, etc.
    return undefined;
  }

  // Check if menu item is selected (triggers change detection when currentUrl changes)
  isItemSelected(item: WallMenuItem): boolean {
    // Access currentUrl to ensure change detection triggers when route changes
    return !!this.currentUrl && this.navigationService.isMenuItemSelected(item);
  }


  // Admin path selection with change detection
  isAdminPathSelectedWithCD(path: string): boolean {
    return !!this.currentUrl && this.isAdminPathSelected(path);
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
      this.showScrollIndicator = hasOverflow;
    }
  }

}