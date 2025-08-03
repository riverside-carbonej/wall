import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
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
    ThemedButtonComponent,
    DividerComponent,
    SideButtonComponent
  ],
  template: `
    <div class="navigation-menu" [class.open]="isMenuOpen" [class.closed]="!isMenuOpen">
      <div class="menu-content">
        

        <!-- Add Button -->
        @if (canShowAddButton()) {
          <div class="add-section">
            <app-themed-button
              variant="raised"
              color="primary"
              [fullWidth]="true"
              height="56px"
              [icon]="'edit'"
              [label]="navigationService.getAddButtonText()"
              [disabled]="!navigationService.canAdd()"
              (buttonClick)="handleAddClick()">
            </app-themed-button>
          </div>
        }

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

        <!-- Context Section -->
        @if (currentContext && currentContext.objectTypes.length > 0) {
          <div class="context-section">
            <mat-divider></mat-divider>
            
            <div class="section-header">
              <h3>Content Types</h3>
            </div>
            
            @for (objectType of currentContext.objectTypes; track trackObjectType($index, objectType)) {
              <app-side-button
                [title]="objectType.pluralName"
                [icon]="objectType.icon"
                [selected]="isObjectTypeSelectedWithCD(objectType.id)"
                (buttonClick)="handleObjectTypeClick(objectType.id)">
              </app-side-button>
            }
          </div>
        }

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
              [selected]="isAdminPathSelectedWithCD('/item-presets')"
              (buttonClick)="navigateToAdmin('/item-presets')">
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
    </div>
  `,
  styles: [`
    .navigation-menu {
      height: 100%;
      transition: all 200ms;
      background: var(--md-sys-color-surface-container-low);
      border-radius: 0 25px 25px 0;
      contain: strict;
      overflow: hidden;
    }

    .navigation-menu.open {
      background: var(--md-sys-color-surface-container-low);
      border-radius: 0 25px 25px 0;
      width: 300px;
      transition: all 200ms;
    }

    .navigation-menu.closed {
      width: 0px;
    }

    @media (min-width: 800px) {
      .navigation-menu.closed {
        width: 300px;
      }
    }

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
      
      .add-section {
        display: flex;
        justify-content: center;
      }
      
      .menu-items {
        align-items: center;
        width: 100%;
        gap: 8px;
      }
      
      .context-section {
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
      
      .add-section {
        display: none;
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
      scrollbar-width: thin;
      scrollbar-color: var(--md-sys-color-outline) transparent;
    }

    @media (max-width: 800px) {
      .menu-content {
        width: 100% !important;
      }
    }

    .menu-content::-webkit-scrollbar {
      width: 6px;
    }

    .menu-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .menu-content::-webkit-scrollbar-thumb {
      background: var(--md-sys-color-outline);
      border-radius: 3px;
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

    /* Add Button */
    .add-section {
      margin: 0.5em;
      margin-bottom: 1em;
    }

    /* Menu Items */
    .menu-items {
      flex: 1;
      min-height: 0;
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

    /* Context and Admin Sections */
    .context-section,
    .admin-section {
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
      
      .add-button {
        height: 44px;
        max-width: 300px;
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
    .add-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }
  `]
})
export class NavigationMenuComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isMenuOpen = false;
  currentContext: WallNavigationContext | null = null;
  activeMenuItems: WallMenuItem[] = [];
  currentUrl = '';

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateActiveMenuItems() {
    this.activeMenuItems = this.navigationService.getActiveMenuItems();
  }

  canShowAddButton(): boolean {
    return this.navigationService.canAdd();
  }

  handleAddClick() {
    if (this.currentContext && this.currentContext.objectTypes.length === 1) {
      // Auto-select single object type
      this.navigationService.navigateToAddPage(this.currentContext.objectTypes[0].id);
    } else {
      this.navigationService.navigateToAddPage();
    }
  }

  handleMenuItemClick(item: WallMenuItem) {
    this.navigationService.navigateToMenuItem(item);
  }

  handleObjectTypeClick(objectTypeId: string) {
    if (this.currentContext) {
      this.navigationService.navigateToMenuItem({
        title: '',
        icon: '',
        path: `/walls/${this.currentContext.wallId}/items`,
        condition: () => true,
        params: [{ name: 'objectType', value: objectTypeId }]
      });
    }
  }

  isObjectTypeSelected(objectTypeId: string): boolean {
    return this.navigationService.isMenuItemSelected({
      title: '',
      icon: '',
      path: `/walls/${this.currentContext?.wallId}/items`,
      condition: () => true,
      params: [{ name: 'objectType', value: objectTypeId }]
    });
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

  // Object type selection with change detection
  isObjectTypeSelectedWithCD(objectTypeId: string): boolean {
    return !!this.currentUrl && this.isObjectTypeSelected(objectTypeId);
  }

  // Admin path selection with change detection
  isAdminPathSelectedWithCD(path: string): boolean {
    return !!this.currentUrl && this.isAdminPathSelected(path);
  }

  // TrackBy functions for performance
  trackMenuItem(index: number, item: WallMenuItem): string {
    return `${item.title}-${item.path}`;
  }

  trackObjectType(index: number, objectType: any): string {
    return objectType.id;
  }
}