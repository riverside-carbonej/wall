import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { CardComponent, CardAction } from '../../../../shared/components/card/card.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { MatSpinner } from '../../../../shared/components/material-stubs';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-preset-item-list',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    PageLayoutComponent,
    CardComponent,
    LoadingStateComponent,
    MaterialIconComponent,
    MatSpinner
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <div *ngIf="preset$ | async as preset">
        <div class="page-container">
          
          <!-- Loading Spinner -->
          <mat-spinner
            [style.opacity]="isLoading ? '1' : '0'"
            class="loading-spinner">
          </mat-spinner>
          
          <!-- Header -->
          <div class="list-header">
            <div class="header-top">
              <button 
                mat-icon-button 
                (click)="goBack()" 
                class="back-button">
                <mat-icon [icon]="'arrow_back'"></mat-icon>
              </button>
              <div class="title-section">
                <h1 class="page-title">{{ preset.name }} Items</h1>
                <p class="page-subtitle" *ngIf="!isLoading">{{ totalItems }} {{ preset.name.toLowerCase() }}{{ totalItems !== 1 ? 's' : '' }}</p>
              </div>
            </div>
            
            <!-- Action Bar -->
            <div class="action-bar">
              @if (selection.length <= 0) {
                <div class="filter-bar">
                  <!-- View Toggle -->
                  <div class="view-toggle">
                    <button 
                      class="toggle-button"
                      [class.active]="largeView"
                      (click)="setLargeView(true)">
                      <mat-icon [icon]="'grid_view'"></mat-icon>
                      Grid
                    </button>
                    <button 
                      class="toggle-button"
                      [class.active]="!largeView"
                      (click)="setLargeView(false)">
                      <mat-icon [icon]="'view_list'"></mat-icon>
                      List
                    </button>
                  </div>
                  
                  <!-- Add Button -->
                  <button 
                    class="add-button primary-button"
                    (click)="navigateToAdd()">
                    <mat-icon [icon]="'add'"></mat-icon>
                    Add {{ preset.name }}
                  </button>
                  
                  <!-- Pagination -->
                  <div class="pagination">
                    <button 
                      class="page-button"
                      [disabled]="pageIndex === 0"
                      (click)="changePage(pageIndex - 1)">
                      <mat-icon [icon]="'chevron_left'"></mat-icon>
                    </button>
                    <span class="page-info">
                      {{ getPageStart() }} - {{ getPageEnd() }} of {{ totalItems }}
                    </span>
                    <button 
                      class="page-button"
                      [disabled]="pageIndex >= getMaxPage()"
                      (click)="changePage(pageIndex + 1)">
                      <mat-icon [icon]="'chevron_right'"></mat-icon>
                    </button>
                  </div>
                </div>
              } @else {
                <div class="selection-bar">
                  <button class="icon-button" (click)="clearSelection()">
                    <mat-icon [icon]="'close'"></mat-icon>
                  </button>
                  <span class="selection-count">{{ selection.length }} selected</span>
                  <button 
                    class="text-button"
                    (click)="toggleSelectAll()">
                    {{ selection.length === currentPageItems.length ? 'Deselect All' : 'Select All' }}
                  </button>
                  <button 
                    class="icon-button delete-button"
                    (click)="deleteSelected()">
                    <mat-icon [icon]="'delete'"></mat-icon>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Content Container -->
          <div class="content-container">
            
            <!-- Empty State -->
            @if (!isLoading && totalItems === 0) {
              <app-empty-state
                [icon]="preset.icon || 'inventory_2'"
                [title]="'No ' + preset.name.toLowerCase() + ' yet'"
                [message]="'Add your first ' + preset.name.toLowerCase() + ' entry to get started!'"
                [actions]="emptyStateActions">
              </app-empty-state>
            }

            <!-- Grid View -->
            @if (!isLoading && largeView && currentPageItems.length > 0) {
              <div class="grid-layout" [style.opacity]="isLoading ? '0' : '1'">
                @for (item of currentPageItems; track item.id) {
                  <app-card
                    variant="elevated"
                    size="medium"
                    [title]="getItemTitle(preset, item)"
                    [subtitle]="getItemSubtitle(preset, item) || undefined"
                    [avatarIcon]="preset.icon"
                    [imageUrl]="getPrimaryImage(item)?.url"
                    [imageAlt]="getPrimaryImage(item)?.altText || getItemTitle(preset, item)"
                    [metadata]="getMetadata(item)"
                    [actions]="getCardActions(item)"
                    [clickable]="true"
                    [class.selected]="isSelected(item)"
                    (cardClick)="onItemClick(item)"
                    class="item-card">
                  </app-card>
                }
              </div>
            }

            <!-- List View -->
            @if (!isLoading && !largeView && currentPageItems.length > 0) {
              <div class="list-layout" [style.opacity]="isLoading ? '0' : '1'">
                @for (item of currentPageItems; track item.id) {
                  <div 
                    class="list-item"
                    [class.selected]="isSelected(item)"
                    (click)="onItemClick(item)">
                    
                    <div class="item-avatar">
                      @if (getPrimaryImage(item)?.url) {
                        <img [src]="getPrimaryImage(item)!.url" [alt]="getPrimaryImage(item)!.altText || getItemTitle(preset, item)" />
                      } @else {
                        <div class="avatar-placeholder">
                          <mat-icon [icon]="preset.icon || 'inventory_2'"></mat-icon>
                        </div>
                      }
                    </div>
                    
                    <div class="item-content">
                      <h3 class="item-title">{{ getItemTitle(preset, item) }}</h3>
                      <p class="item-subtitle" *ngIf="getItemSubtitle(preset, item)">{{ getItemSubtitle(preset, item) }}</p>
                      <div class="item-metadata">
                        @for (meta of getMetadata(item); track meta.key) {
                          <span class="metadata-item">
                            <mat-icon [icon]="meta.icon || 'info'"></mat-icon>
                            {{ meta.value }}
                          </span>
                        }
                      </div>
                    </div>
                    
                    <div class="item-actions">
                      @for (action of getListActions(item); track action.label) {
                        <button 
                          class="icon-button"
                          (click)="$event.stopPropagation(); action.action()"
                          [title]="action.label">
                          <mat-icon [icon]="action.icon"></mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: block;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: min-content auto;
      gap: 1em;
      position: relative;
      padding: 24px;
    }

    .loading-spinner {
      position: absolute;
      left: 50%;
      top: 50%;
      pointer-events: none;
      z-index: 1000;
      transform: translate(-50%, -50%);
      transition: opacity 200ms;
    }

    /* Header Styles */
    .list-header {
      display: grid;
      grid-template-rows: min-content min-content;
      grid-template-columns: 100%;
      height: min-content;
      align-items: center;
      gap: 1em;
    }

    .header-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-button {
      color: var(--md-sys-color-on-surface);
    }

    .title-section {
      flex: 1;
    }

    .page-title {
      margin: 0;
      font-size: 2.25rem;
      font-weight: 400;
      color: var(--md-sys-color-on-surface);
      line-height: 1.2;
    }

    .page-subtitle {
      margin: 4px 0 0 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.7;
    }

    /* Action Bar */
    .action-bar {
      border-radius: 100px;
      background: var(--md-sys-color-surface-container);
      z-index: 100;
      overflow: hidden;
    }

    .filter-bar {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      gap: 16px;
    }

    /* View Toggle Styles */
    .view-toggle {
      display: flex;
      border-radius: 100px;
      background: var(--md-sys-color-surface-container-low);
      padding: 4px;
      gap: 4px;
    }

    .toggle-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      border-radius: 100px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .toggle-button:hover {
      background: var(--md-sys-color-surface-container);
    }

    .toggle-button.active {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
    }

    /* Button Styles */
    .primary-button {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      border-radius: 100px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      margin-left: auto;
      box-shadow: var(--md-sys-elevation-1);
    }

    .primary-button:hover {
      background: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
      box-shadow: var(--md-sys-elevation-2);
    }

    .icon-button {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .icon-button:hover {
      background: var(--md-sys-color-surface-container);
    }

    .icon-button:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .text-button {
      background: transparent;
      border: none;
      color: var(--md-sys-color-primary);
      padding: 8px 16px;
      border-radius: 100px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .text-button:hover {
      background: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
    }

    /* Pagination Styles */
    .pagination {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-left: auto;
    }

    .page-button {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .page-button:hover:not(:disabled) {
      background: var(--md-sys-color-surface-container);
    }

    .page-button:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      white-space: nowrap;
    }

    .selection-bar {
      display: flex;
      align-items: center;
      color: var(--md-sys-color-on-surface);
      padding: 8px 16px;
      gap: 12px;
    }

    .selection-count {
      font-weight: 500;
    }

    .select-all-button {
      font-size: 0.875rem;
    }

    .delete-button {
      color: var(--md-sys-color-error);
      margin-left: auto;
    }

    /* Content Container */
    .content-container {
      overflow: hidden auto;
      width: 100%;
      display: grid;
      grid-template-rows: 100%;
      grid-template-columns: 100%;
      place-items: center;
      position: relative;
      border-radius: calc(10px + 1em);
      height: min-content;
      min-height: 400px;
    }

    /* Grid Layout */
    .grid-layout {
      position: relative;
      display: grid;
      grid-auto-rows: 300px;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      transition: opacity 200ms;
      width: 100%;
      height: min-content;
      place-self: start;
    }

    .item-card {
      height: fit-content;
      max-height: 300px;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .item-card.selected {
      border: 2px solid var(--md-sys-color-primary);
      background: color-mix(in srgb, var(--md-sys-color-primary) 8%, var(--md-sys-color-surface));
    }

    /* List Layout */
    .list-layout {
      position: relative;
      border-radius: 25px;
      display: grid;
      grid-auto-rows: min-content;
      grid-template-columns: 1fr;
      transition: opacity 200ms;
      width: 100%;
      height: min-content;
      place-self: start;
      overflow: hidden;
      background: var(--md-sys-color-surface-container);
    }

    .list-item {
      display: grid;
      grid-template-columns: 60px 1fr min-content;
      gap: 16px;
      padding: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      align-items: center;
    }

    .list-item:hover {
      background: color-mix(in srgb, var(--md-sys-color-primary) 4%, transparent);
    }

    .list-item.selected {
      background: color-mix(in srgb, var(--md-sys-color-primary) 12%, var(--md-sys-color-surface));
      border-left: 4px solid var(--md-sys-color-primary);
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .item-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-subtitle {
      margin: 0 0 8px 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-metadata {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
    }

    .metadata-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .item-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .list-item:hover .item-actions {
      opacity: 1;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
        gap: 16px;
      }

      .grid-layout {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }

      .page-title {
        font-size: 1.75rem;
      }

      .filter-bar {
        flex-wrap: wrap;
        gap: 12px;
      }

      .add-button {
        margin-left: 0;
        margin-top: 8px;
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .grid-layout {
        grid-template-columns: 1fr;
      }

      .list-item {
        grid-template-columns: 40px 1fr min-content;
        gap: 12px;
        padding: 12px;
      }

      .item-avatar {
        width: 40px;
        height: 40px;
      }
    }
  `]
})
export class PresetItemListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  preset$!: Observable<WallObjectType | null>;
  items$!: Observable<WallItem[]>;
  
  // State management
  isLoading = true;
  largeView = true;
  selection: WallItem[] = [];
  
  // Pagination
  allItems: WallItem[] = [];
  currentPageItems: WallItem[] = [];
  totalItems = 0;
  pageIndex = 0;
  pageSize = 20;

  emptyStateActions: EmptyStateAction[] = [
    {
      label: 'Add First Item',
      icon: 'add',
      primary: true,
      action: () => this.navigateToAdd()
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private confirmationDialog: ConfirmationDialogService
  ) {}

  ngOnInit() {
    // Get route parameters
    const routeParams$ = this.route.paramMap.pipe(
      map(params => ({
        wallId: params.get('wallId')!,
        presetId: params.get('presetId')!
      }))
    );

    // Load wall data
    this.wall$ = routeParams$.pipe(
      switchMap(({ wallId }) => this.wallService.getWallById(wallId)),
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    // Load preset data from wall
    this.preset$ = combineLatest([this.wall$, routeParams$]).pipe(
      map(([wall, { presetId }]) => {
        if (!wall || !wall.objectTypes) return null;
        return wall.objectTypes.find(ot => ot.id === presetId) || null;
      }),
      takeUntil(this.destroy$)
    );

    // Load items for this preset
    this.items$ = combineLatest([routeParams$, this.preset$]).pipe(
      switchMap(([{ wallId, presetId }]) => {
        return this.wallItemService.getWallItemsByObjectType(wallId, presetId);
      }),
      takeUntil(this.destroy$)
    );

    // Handle loading state and pagination
    this.items$.subscribe(items => {
      this.allItems = items;
      this.totalItems = items.length;
      this.updateCurrentPageItems();
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Pagination Methods
  private updateCurrentPageItems() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.currentPageItems = this.allItems.slice(startIndex, endIndex);
  }

  changePage(newPageIndex: number) {
    if (newPageIndex >= 0 && newPageIndex <= this.getMaxPage()) {
      this.pageIndex = newPageIndex;
      this.updateCurrentPageItems();
      this.selection = []; // Clear selection when changing pages
    }
  }

  getPageStart(): number {
    return this.totalItems === 0 ? 0 : (this.pageIndex * this.pageSize) + 1;
  }

  getPageEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalItems);
  }

  getMaxPage(): number {
    return Math.max(0, Math.ceil(this.totalItems / this.pageSize) - 1);
  }

  // View Mode Methods
  setLargeView(isLarge: boolean) {
    this.largeView = isLarge;
  }

  // Navigation Methods
  goBack() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    this.router.navigate(['/walls', wallId, 'presets']);
  }

  navigateToAdd() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', 'add']);
  }

  onViewItem(item: WallItem) {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', item.id]);
  }

  onEditItem(item: WallItem) {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', item.id, 'edit']);
  }

  // Selection Methods
  onItemClick(item: WallItem) {
    this.toggleSelection(item);
  }

  isSelected(item: WallItem): boolean {
    return this.selection.includes(item);
  }

  toggleSelection(item: WallItem) {
    if (this.isSelected(item)) {
      this.selection = this.selection.filter(i => i !== item);
    } else {
      this.selection.push(item);
    }
  }

  clearSelection() {
    this.selection = [];
  }

  toggleSelectAll() {
    if (this.selection.length === this.currentPageItems.length) {
      this.selection = [];
    } else {
      this.selection = [...this.currentPageItems];
    }
  }

  deleteSelected() {
    this.confirmationDialog.confirmDelete(`${this.selection.length} item${this.selection.length > 1 ? 's' : ''}`).subscribe(confirmed => {
      if (confirmed) {
        // TODO: Implement bulk delete
        console.log('Delete selected items:', this.selection);
        this.selection = [];
      }
    });
  }

  // Item Display Methods
  getPrimaryImage(item: WallItem) {
    if (!item.images || item.images.length === 0) return null;
    
    const primaryIndex = item.primaryImageIndex || 0;
    return item.images[primaryIndex] || item.images[0];
  }

  getItemTitle(preset: WallObjectType, item: WallItem): string {
    const primaryField = preset.displaySettings?.primaryField;
    
    if (primaryField && item.fieldData[primaryField]) {
      return String(item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(item.fieldData).find(key => 
      typeof item.fieldData[key] === 'string' && item.fieldData[key].trim()
    );
    
    return firstTextField ? String(item.fieldData[firstTextField]) : 'Untitled Item';
  }

  getItemSubtitle(preset: WallObjectType, item: WallItem): string | null {
    const secondaryField = preset.displaySettings?.secondaryField;
    
    if (secondaryField && item.fieldData[secondaryField]) {
      return String(item.fieldData[secondaryField]);
    }
    
    return null;
  }

  getMetadata(item: WallItem): Array<{key: string; value: string; icon?: string}> {
    return [
      {
        key: 'updated',
        value: new Date(item.updatedAt).toLocaleDateString(),
        icon: 'schedule'
      },
      {
        key: 'images',
        value: item.images?.length ? `${item.images.length} image${item.images.length > 1 ? 's' : ''}` : 'No images',
        icon: 'photo_library'
      }
    ];
  }

  // Action Methods
  getCardActions(item: WallItem): CardAction[] {
    return [
      {
        label: 'View',
        icon: 'visibility',
        primary: false,
        action: () => this.onViewItem(item)
      },
      {
        label: 'Edit',
        icon: 'edit',
        primary: false,
        action: () => this.onEditItem(item)
      }
    ];
  }

  getListActions(item: WallItem): Array<{label: string; icon: string; action: () => void}> {
    return [
      {
        label: 'View',
        icon: 'visibility',
        action: () => this.onViewItem(item)
      },
      {
        label: 'Edit',
        icon: 'edit',
        action: () => this.onEditItem(item)
      }
    ];
  }
}