import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd, NavigationStart, NavigationError, NavigationCancel } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { filter, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemeService } from './shared/services/theme.service';
import { UserAvatarComponent } from './shared/components/user-avatar.component';
import { WallService } from './features/walls/services/wall.service';
import { Wall, WallTheme } from './shared/models/wall.model';
import { NavigationService } from './shared/services/navigation.service';
import { NavigationMenuComponent } from './shared/components/navigation-menu/navigation-menu.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, FormsModule, UserAvatarComponent, NavigationMenuComponent],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms cubic-bezier(0.2, 0, 0, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.2, 0, 0, 1)', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ],
  template: `
    <div class="app-container">
      <!-- Enhanced Material 3 Header -->
      <header class="app-header elevation-1">
        <div class="header-content">
          <!-- Dynamic navigation based on route -->
          <div class="header-start">
            <!-- Menu toggle button -->
            <button 
              class="menu-toggle-button btn-icon touch-target interactive focusable"
              (click)="toggleMenu()"
              [attr.aria-label]="navigationService.isMenuOpen ? 'Close menu' : 'Open menu'"
              [title]="navigationService.isMenuOpen ? 'Close menu' : 'Open menu'">
              <span class="material-icons md-24">
                {{ navigationService.isMenuOpen ? 'close' : 'menu' }}
              </span>
            </button>

            <!-- App navigation (when not in a wall) -->
            <a *ngIf="!currentWall()" routerLink="/" class="logo-link interactive focusable">
              <div class="logo-container">
                <img src="assets/images/beaver-logo.png" alt="Riverside Schools Logo" class="logo-icon">
                <span class="logo-text title-large">Riverside Wall</span>
              </div>
            </a>

            <!-- Wall navigation (when viewing a wall) -->
            <div *ngIf="currentWall()" class="wall-nav">
                <img 
                  [src]="currentWall()?.logoUrl || 'assets/images/beaver-logo.png'" 
                  [alt]="currentWall()?.name + ' Logo' || 'Wall Logo'" 
                  class="wall-logo-icon">
              <div class="wall-info">
                <h1 class="wall-title" [style.color]="currentWall()?.theme?.titleColor">
                  {{ currentWall()?.name }}
                </h1>
                <span class="wall-breadcrumb" *ngIf="isWallEdit()">
                  <span class="material-icons md-16">chevron_right</span>
                  Edit
                </span>
              </div>
            </div>
          </div>

          <!-- Adaptive search section -->
          <div class="header-center" [class.hidden-mobile]="!showMobileSearch()">
            <div class="search-container">
              <div class="search-field">
                <span class="material-icons md-24 search-leading-icon">search</span>
                <input 
                  type="text" 
                  [placeholder]="getSearchPlaceholder()"
                  class="search-input body-large focusable"
                  [(ngModel)]="searchValue"
                  (input)="onSearchInput($event)">
                <button 
                  *ngIf="searchQuery()" 
                  class="search-clear-button touch-target interactive"
                  (click)="clearSearch()"
                  aria-label="Clear search">
                  <span class="material-icons md-20">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile-optimized actions -->
          <div class="header-end">
            <!-- Mobile search toggle -->
            <button 
              class="header-action-button touch-target interactive focusable md-only"
              (click)="toggleMobileSearch()"
              [attr.aria-label]="showMobileSearch() ? 'Close search' : 'Open search'">
              <span class="material-icons md-24" [class.primary]="showMobileSearch()">
                {{ showMobileSearch() ? 'close' : 'search' }}
              </span>
            </button>

            <!-- Theme toggle with enhanced accessibility (hidden when viewing a wall) -->
            <button 
              *ngIf="!currentWall()"
              class="header-action-button touch-target interactive focusable btn-state"
              (click)="toggleTheme()" 
              [attr.aria-label]="currentTheme().mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
              [title]="currentTheme().mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">
              <span class="material-icons md-24" [class.warning]="currentTheme().mode === 'light'">
                {{ currentTheme().mode === 'dark' ? 'light_mode' : 'dark_mode' }}
              </span>
            </button>


            <!-- User profile with enhanced presentation -->
            <div class="profile-section">
              <app-user-avatar 
                [size]="40" 
                [clickable]="true"
                class="interactive">
              </app-user-avatar>
            </div>
          </div>
        </div>

        <!-- Mobile search overlay -->
        <div class="mobile-search-overlay" *ngIf="showMobileSearch()" [@slideDown]>
          <div class="mobile-search-container p-4">
            <div class="search-field">
              <span class="material-icons md-24 search-leading-icon">search</span>
              <input 
                type="text" 
                [placeholder]="getSearchPlaceholder()"
                class="search-input body-large focusable"
                [(ngModel)]="searchValue"
                (input)="onSearchInput($event)"
                #mobileSearchInput>
              <button 
                *ngIf="searchQuery()" 
                class="search-clear-button touch-target interactive"
                (click)="clearSearch()"
                aria-label="Clear search">
                <span class="material-icons md-20">close</span>
              </button>
            </div>
            
            <!-- Quick search suggestions -->
            <div class="search-suggestions" *ngIf="searchSuggestions().length > 0">
              <div class="suggestions-header label-medium">Quick suggestions</div>
              <div class="suggestion-item interactive p-3" 
                   *ngFor="let suggestion of searchSuggestions()" 
                   (click)="selectSuggestion(suggestion)">
                <span class="material-icons md-20 on-surface-variant">{{ suggestion.icon }}</span>
                <span class="suggestion-text body-medium">{{ suggestion.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main content area with side navigation -->
      <div class="app-body">
        <!-- Side Navigation Menu -->
        <app-navigation-menu></app-navigation-menu>
        
        <!-- Main content area -->
        <main class="app-main">
          @if (isNavigating()) {
            <div class="navigation-loading-bar">
              <div class="loading-progress" 
                   [style.width.%]="navigationProgress().progress">
              </div>
            </div>
          }
          <router-outlet />
        </main>
      </div>

      <!-- Mobile FAB -->
      <button 
        *ngIf="canShowMobileFAB()" 
        class="mobile-fab" 
        [class.hidden]="navigationService.isMenuOpen"
        (click)="handleMobileFABClick()"
        [attr.aria-label]="navigationService.getAddButtonText()">
        <span class="material-icons md-24">add</span>
      </button>

    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--md-sys-color-background);
      position: relative;
      overflow: hidden;
    }

    /* Enhanced Material 3 Header */
    .app-header {
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-outline);
      position: sticky;
      top: 0;
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-6);
      min-height: 80px;
      gap: var(--md-sys-spacing-4);
    }

    /* Mobile-first logo section */
    .header-start {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .logo-link {
      text-decoration: none;
      color: inherit;
      border-radius: var(--md-sys-shape-corner-small);
      padding: var(--md-sys-spacing-2);
      margin: calc(var(--md-sys-spacing-2) * -1);
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--md-sys-shape-corner-small);
    }

    .logo-text {
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
      white-space: nowrap;
    }

    /* Wall navigation styles */
    .wall-nav {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-md);
      flex: 1;
      min-width: 0;
      gap: 0.5em;
    }

    .wall-logo-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--md-sys-shape-corner-small);
      object-fit: cover;
    }

    .back-button {
      flex-shrink: 0;
    }

    .wall-info {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
      min-width: 0;
      flex: 1;
    }

    .wall-title {
      margin: 0;
      font-family: var(--md-sys-typescale-title-large-font-family);
      font-size: 1.5rem;
      font-weight: 600;
      line-height: var(--md-sys-typescale-title-large-line-height);
      letter-spacing: var(--md-sys-typescale-title-large-letter-spacing);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .wall-breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-xs);
      color: var(--md-sys-color-on-surface-variant);
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      white-space: nowrap;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      
      .wall-breadcrumb {
        display: none;
      }
    }

    /* Adaptive search section */
    .header-center {
      flex: 1;
      max-width: 600px;
      margin: 0 var(--md-sys-spacing-4);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .search-container {
      position: relative;
      width: 100%;
    }

    .search-field {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-leading-icon {
      position: absolute;
      left: var(--md-sys-spacing-4);
      z-index: 2;
      color: var(--md-sys-color-on-surface-variant);
    }

    .search-input {
      width: 100%;
      height: var(--md-sys-touch-target-min);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: 0 var(--md-sys-spacing-12) 0 var(--md-sys-spacing-12);
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      outline: none;
      font-family: inherit;
    }

    .search-input::placeholder {
      color: var(--md-sys-color-on-surface-variant);
    }

    .search-input:focus {
      background: var(--md-sys-color-surface);
      box-shadow: var(--md-sys-elevation-2);
      border-color: var(--md-sys-color-primary);
      transform: scale(1.02);
    }

    .search-clear-button {
      position: absolute;
      right: var(--md-sys-spacing-2);
      background: none;
      border: none;
      border-radius: 50%;
      color: var(--md-sys-color-on-surface-variant);
      z-index: 2;
    }

    /* Mobile-optimized actions */
    .header-end {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
      flex-shrink: 0;
    }

    .header-action-button {
      background: none;
      border: none;
      border-radius: 50%;
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .header-action-button:hover {
      background-color: var(--md-sys-color-primary-container);
      transform: scale(1.05);
    }

    .profile-section {
      margin-left: var(--md-sys-spacing-2);
    }

    /* Mobile search overlay */
    .mobile-search-overlay {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-outline);
      z-index: 999;
    }

    .mobile-search-container {
      padding: var(--md-sys-spacing-4);
    }

    .search-suggestions {
      margin-top: var(--md-sys-spacing-4);
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-variant);
      overflow: hidden;
    }

    .suggestions-header {
      padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface-variant);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .suggestion-item:hover {
      background-color: var(--md-sys-color-primary-container);
    }

    .suggestion-text {
      color: var(--md-sys-color-on-surface);
    }

    /* App Body Layout */
    .app-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      transition: all 200ms;
      min-height: 0;
    }

    /* Main content area */
    .app-main {
      flex: 1;
      background-color: var(--md-sys-color-background);
      overflow: auto;
      transition: all 200ms;
      min-width: 0;
      position: relative;
    }

    /* Navigation loading bar */
    .navigation-loading-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--md-sys-color-surface-variant);
      z-index: 1000;
      overflow: hidden;
    }

    .loading-progress {
      height: 100%;
      background: linear-gradient(
        90deg,
        var(--md-sys-color-primary) 0%,
        var(--md-sys-color-secondary) 50%,
        var(--md-sys-color-tertiary) 100%
      );
      width: 0%;
      transition: width 0.3s ease-out;
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 8px rgba(var(--md-sys-color-primary-rgb), 0.3);
    }

    /* Menu toggle button */
    .menu-toggle-button {
      background: none;
      border: none;
      border-radius: 50%;
      color: var(--md-sys-color-on-surface);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      margin-right: var(--md-sys-spacing-2);
    }

    .menu-toggle-button:hover {
      background-color: var(--md-sys-color-primary-container);
      transform: scale(1.05);
    }


    /* Responsive design */
    @media (min-width: 769px) {
      .md-only {
        display: none !important;
      }

      .header-center.hidden-mobile {
        display: block !important;
      }
    }

    @media (max-width: 768px) {
      .header-content {
        padding: var(--md-sys-spacing-4) var(--md-sys-spacing-4);
        min-height: 80px;
      }

      .logo-text {
        display: none;
      }

      .header-center:not(.hidden-mobile) {
        display: none;
      }

      .hidden-mobile {
        display: none !important;
      }

      .search-input {
        font-size: 16px; /* Prevent zoom on iOS */
      }
    }

    @media (max-width: 480px) {
      .header-content {
        padding: var(--md-sys-spacing-3) var(--md-sys-spacing-3);
        min-height: 72px;
      }

      .logo-icon {
        width: 32px;
        height: 32px;
      }

      .wall-logo-icon {
        width: 32px;
        height: 32px;
      }

    }

    /* Mobile FAB */
    .mobile-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      box-shadow: var(--md-sys-elevation-3);
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      z-index: 1000;
      opacity: 1;
      pointer-events: auto;
    }

    .mobile-fab.hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.8);
    }

    .mobile-fab:hover {
      transform: scale(1.1);
      box-shadow: var(--md-sys-elevation-4);
    }

    .mobile-fab:active {
      transform: scale(0.95);
      box-shadow: var(--md-sys-elevation-2);
    }

    @media (max-width: 800px) {
      .mobile-fab {
        display: flex;
      }
    }

    /* Animation for mobile search */
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class App implements OnInit {
  protected readonly title = signal('RLS Wall App');
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private wallService = inject(WallService);
  public navigationService = inject(NavigationService);
  protected currentTheme = signal(this.themeService.getCurrentThemeSync());
  
  // Route-aware navigation
  protected currentWall = signal<Wall | null>(null);
  protected currentRoute = signal('');
  
  // Search functionality
  protected searchQuery = signal('');
  protected showMobileSearch = signal(false);
  protected searchSuggestions = signal<{icon: string, text: string}[]>([]);
  
  // Navigation loading state with proper progress tracking
  protected navigationProgress = toSignal(this.router.events.pipe(
    map(event => {
      if (event instanceof NavigationStart) {
        return { isNavigating: true, progress: 10 };
      } else if (event instanceof NavigationEnd) {
        return { isNavigating: false, progress: 100 };
      } else if (event instanceof NavigationError || event instanceof NavigationCancel) {
        return { isNavigating: false, progress: 0 };
      } else {
        // Intermediate progress for other events (Guards, Resolvers, etc.)
        const currentNav = this.router.getCurrentNavigation();
        if (currentNav) {
          return { isNavigating: true, progress: 50 };
        }
        return { isNavigating: false, progress: 0 };
      }
    })
  ), { initialValue: { isNavigating: false, progress: 0 } });

  protected isNavigating = () => this.navigationProgress().isNavigating;
  
  // For ngModel binding
  get searchValue(): string {
    return this.searchQuery();
  }
  
  set searchValue(value: string) {
    this.searchQuery.set(value);
  }

  ngOnInit(): void {
    this.themeService.getCurrentTheme().subscribe(theme => {
      this.currentTheme.set(theme);
    });

    // Listen to route changes to update navigation context
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      switchMap((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
        
        // Check if we're on a wall route
        const wallMatch = event.url.match(/\/walls\/([^\/]+)/);
        if (wallMatch && wallMatch[1] !== 'new') {
          const wallId = wallMatch[1];
          return this.wallService.getWallById(wallId);
        } else {
          this.currentWall.set(null);
          // Clear wall theme when leaving wall context
          this.themeService.clearWallTheme();
          return of(null);
        }
      })
    ).subscribe(wall => {
      if (wall) {
        this.currentWall.set(wall);
        // Apply wall theme (use default if none exists)
        const wallTheme = wall.theme || this.themeService.generateDefaultWallTheme();
        this.themeService.applyWallTheme(wallTheme);
        // Update navigation context
        this.navigationService.updateWallContext(wall, true, true); // TODO: Get real permissions
      } else {
        this.navigationService.clearWallContext();
      }
    });

    // Update add mode when route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.navigationService.updateAddMode();
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMenu(): void {
    this.navigationService.isMenuOpen = !this.navigationService.isMenuOpen;
  }

  // Navigation methods
  navigateBack(): void {
    this.router.navigate(['/walls']);
  }

  isWallEdit(): boolean {
    return this.currentRoute().includes('/edit');
  }

  getSearchPlaceholder(): string {
    if (this.currentWall()) {
      return `Search in ${this.currentWall()?.name}...`;
    }
    return 'Search walls, people, content...';
  }

  // Mobile search methods
  toggleMobileSearch(): void {
    this.showMobileSearch.update(show => !show);
    if (this.showMobileSearch()) {
      // Focus search input after animation
      setTimeout(() => {
        const input = document.querySelector('.mobile-search-overlay input') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    
    // Update search suggestions based on query
    if (target.value.length > 0) {
      this.searchSuggestions.set([
        { icon: 'dashboard', text: `Search in walls for "${target.value}"` },
        { icon: 'person', text: `Find people named "${target.value}"` },
        { icon: 'tag', text: `Show items tagged "${target.value}"` }
      ]);
    } else {
      this.searchSuggestions.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSuggestions.set([]);
  }

  selectSuggestion(suggestion: {icon: string, text: string}): void {
    // Handle suggestion selection
    console.log('Selected suggestion:', suggestion);
    this.showMobileSearch.set(false);
  }

  // Apps menu methods
  toggleAppsMenu(): void {
    // TODO: Implement apps menu
    console.log('Apps menu clicked');
  }

  // Mobile FAB methods
  canShowMobileFAB(): boolean {
    // Only show on mobile and when navigation service allows adding
    // Don't show on walls list page (/walls)
    const currentUrl = this.currentRoute();
    if (currentUrl === '/walls' || currentUrl === '/') {
      return false;
    }
    return this.navigationService.canAdd();
  }

  handleMobileFABClick(): void {
    if (this.currentWall() && this.currentWall()!.objectTypes.length === 1) {
      // Auto-select single object type
      this.navigationService.navigateToAddPage(this.currentWall()!.objectTypes[0].id);
    } else {
      this.navigationService.navigateToAddPage();
    }
  }

}
