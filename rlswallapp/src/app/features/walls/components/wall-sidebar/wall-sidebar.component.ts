import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallObjectType } from '../../../../shared/models/wall.model';

export interface SidebarNavItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  count?: number;
  isActive: boolean;
}

@Component({
  selector: 'app-wall-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="wall-sidebar" [class.collapsed]="isCollapsed()" [class.mobile]="isMobile()">
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <button 
          class="collapse-toggle btn-icon touch-target interactive"
          (click)="toggleCollapsed()"
          [attr.aria-label]="isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [title]="isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <span class="material-icons md-24">
            {{ isCollapsed() ? 'menu' : 'menu_open' }}
          </span>
        </button>
        
        <div class="sidebar-title" *ngIf="!isCollapsed()">
          <h3>Content Types</h3>
          <span class="item-count" *ngIf="totalItemCount() > 0">
            {{ totalItemCount() }} items
          </span>
        </div>
      </div>

      <!-- Navigation Items -->
      <nav class="sidebar-nav">
        <ul class="nav-list">
          <!-- All Items View -->
          <li class="nav-item">
            <button 
              class="nav-button touch-target interactive"
              [class.active]="selectedObjectTypeId() === null"
              (click)="selectObjectType(null)"
              [title]="'View all items'">
              <div class="nav-icon-container">
                <span class="material-icons md-24 nav-icon">dashboard</span>
                <span class="item-badge" *ngIf="totalItemCount() > 0 && !isCollapsed()">
                  {{ totalItemCount() }}
                </span>
              </div>
              <span class="nav-label" *ngIf="!isCollapsed()">All Items</span>
            </button>
          </li>

          <!-- Object Type Items -->
          <li class="nav-item" *ngFor="let objectType of objectTypes; trackBy: trackByObjectTypeId">
            <button 
              class="nav-button touch-target interactive"
              [class.active]="selectedObjectTypeId() === objectType.id"
              (click)="selectObjectType(objectType.id)"
              [title]="objectType.description || objectType.name"
              [style.--object-color]="objectType.color">
              <div class="nav-icon-container">
                <span class="material-icons md-24 nav-icon" [style.color]="objectType.color">
                  {{ objectType.icon }}
                </span>
                <span class="item-badge" *ngIf="getObjectTypeCount(objectType.id) > 0 && !isCollapsed()">
                  {{ getObjectTypeCount(objectType.id) }}
                </span>
              </div>
              <span class="nav-label" *ngIf="!isCollapsed()">{{ objectType.name }}</span>
            </button>
          </li>
        </ul>

        <!-- Add Object Type Button (for future phases) -->
        <div class="sidebar-actions" *ngIf="!isCollapsed() && showAddButton">
          <button 
            class="btn-outline touch-target interactive add-object-type-button"
            (click)="addObjectType()"
            [title]="'Add new object type'">
            <span class="material-icons md-20">add</span>
            Add Type
          </button>
        </div>
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer" *ngIf="!isCollapsed()">
        <div class="quick-stats">
          <div class="stat-item" *ngIf="objectTypes.length > 0">
            <span class="stat-label">Types:</span>
            <span class="stat-value">{{ objectTypes.length }}</span>
          </div>
          <div class="stat-item" *ngIf="totalItemCount() > 0">
            <span class="stat-label">Items:</span>
            <span class="stat-value">{{ totalItemCount() }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Overlay -->
    <div 
      class="sidebar-overlay" 
      *ngIf="isMobile() && !isCollapsed()"
      (click)="collapse()">
    </div>
  `,
  styles: [`
    .wall-sidebar {
      position: relative;
      width: 280px;
      height: 100vh;
      background: var(--md-sys-color-surface-container);
      border-right: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      flex-direction: column;
      transition: all var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
      z-index: 100;
      overflow: hidden;
    }

    .wall-sidebar.collapsed {
      width: 72px;
    }

    .wall-sidebar.mobile {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1100;
      box-shadow: var(--md-sys-elevation-level4);
      transform: translateX(-100%);
    }

    .wall-sidebar.mobile:not(.collapsed) {
      transform: translateX(0);
    }

    /* Sidebar Header */
    .sidebar-header {
      display: flex;
      align-items: center;
      padding: var(--md-sys-spacing-lg);
      gap: var(--md-sys-spacing-md);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      flex-shrink: 0;
    }

    .collapse-toggle {
      flex-shrink: 0;
    }

    .sidebar-title {
      flex: 1;
      min-width: 0;
    }

    .sidebar-title h3 {
      margin: 0;
      font-family: var(--md-sys-typescale-title-medium-font-family);
      font-size: var(--md-sys-typescale-title-medium-font-size);
      font-weight: var(--md-sys-typescale-title-medium-font-weight);
      line-height: var(--md-sys-typescale-title-medium-line-height);
      letter-spacing: var(--md-sys-typescale-title-medium-letter-spacing);
      color: var(--md-sys-color-on-surface);
    }

    .item-count {
      font-family: var(--md-sys-typescale-body-small-font-family);
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Navigation */
    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: var(--md-sys-spacing-sm) 0;
    }

    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-xs);
    }

    .nav-item {
      position: relative;
    }

    .nav-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-md);
      padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-lg);
      background: none;
      border: none;
      text-align: left;
      color: var(--md-sys-color-on-surface);
      border-radius: 0 var(--md-sys-shape-corner-full) var(--md-sys-shape-corner-full) 0;
      margin-right: var(--md-sys-spacing-md);
      transition: all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
      position: relative;
      overflow: hidden;
    }

    .nav-button:hover {
      background: var(--md-sys-color-secondary-container);
      color: var(--md-sys-color-on-secondary-container);
    }

    .nav-button.active {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }

    .nav-button.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--md-sys-color-primary);
    }

    .nav-icon-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .nav-icon {
      transition: color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .item-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      font-family: var(--md-sys-typescale-label-small-font-family);
      font-size: var(--md-sys-typescale-label-small-font-size);
      font-weight: var(--md-sys-typescale-label-small-font-weight);
      padding: 2px 6px;
      border-radius: var(--md-sys-shape-corner-full);
      min-width: 20px;
      text-align: center;
      box-sizing: border-box;
    }

    .nav-label {
      flex: 1;
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      font-weight: var(--md-sys-typescale-body-medium-font-weight);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Sidebar Actions */
    .sidebar-actions {
      padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }

    .add-object-type-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
      justify-content: center;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
      border-top: 1px solid var(--md-sys-color-outline-variant);
      flex-shrink: 0;
    }

    .quick-stats {
      display: flex;
      gap: var(--md-sys-spacing-lg);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--md-sys-spacing-xs);
    }

    .stat-label {
      font-family: var(--md-sys-typescale-label-small-font-family);
      font-size: var(--md-sys-typescale-label-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .stat-value {
      font-family: var(--md-sys-typescale-title-small-font-family);
      font-size: var(--md-sys-typescale-title-small-font-size);
      font-weight: var(--md-sys-typescale-title-small-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    /* Mobile Overlay */
    .sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1050;
      animation: fadeIn var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .wall-sidebar {
        width: 260px;
      }
    }

    @media (max-width: 768px) {
      .wall-sidebar {
        width: 280px;
      }

      .sidebar-header {
        padding: var(--md-sys-spacing-md);
      }

      .nav-button {
        padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
      }
    }

    /* Collapsed State Styles */
    .wall-sidebar.collapsed .nav-button {
      justify-content: center;
      margin-right: 0;
      border-radius: 0;
    }

    .wall-sidebar.collapsed .nav-button.active::before {
      width: 100%;
      height: 4px;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .wall-sidebar.collapsed .nav-icon-container {
      width: 48px;
      height: 48px;
    }

    .wall-sidebar.collapsed .item-badge {
      top: 8px;
      right: 8px;
      font-size: 10px;
      padding: 1px 4px;
      min-width: 16px;
    }

    /* Smooth scrolling */
    .sidebar-nav {
      scrollbar-width: thin;
      scrollbar-color: var(--md-sys-color-outline-variant) transparent;
    }

    .sidebar-nav::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar-nav::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar-nav::-webkit-scrollbar-thumb {
      background: var(--md-sys-color-outline-variant);
      border-radius: 3px;
    }

    .sidebar-nav::-webkit-scrollbar-thumb:hover {
      background: var(--md-sys-color-outline);
    }
  `]
})
export class WallSidebarComponent {
  @Input() objectTypes: WallObjectType[] = [];
  @Input() itemCounts: { [objectTypeId: string]: number } = {};
  @Input() showAddButton: boolean = false;
  @Input() isMobile: () => boolean = () => window.innerWidth <= 768;

  @Output() objectTypeSelected = new EventEmitter<string | null>();
  @Output() objectTypeAdded = new EventEmitter<void>();

  isCollapsed = signal(false);
  selectedObjectTypeId = signal<string | null>(null);

  totalItemCount = computed(() => {
    return Object.values(this.itemCounts).reduce((total, count) => total + count, 0);
  });

  toggleCollapsed(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  collapse(): void {
    this.isCollapsed.set(true);
  }

  expand(): void {
    this.isCollapsed.set(false);
  }

  selectObjectType(objectTypeId: string | null): void {
    this.selectedObjectTypeId.set(objectTypeId);
    this.objectTypeSelected.emit(objectTypeId);
    
    // Collapse sidebar on mobile after selection
    if (this.isMobile()) {
      this.collapse();
    }
  }

  addObjectType(): void {
    this.objectTypeAdded.emit();
  }

  getObjectTypeCount(objectTypeId: string): number {
    return this.itemCounts[objectTypeId] || 0;
  }

  trackByObjectTypeId(index: number, objectType: WallObjectType): string {
    return objectType.id;
  }
}