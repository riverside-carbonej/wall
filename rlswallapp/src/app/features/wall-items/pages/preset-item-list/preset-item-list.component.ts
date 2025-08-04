import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';
import { NlpService } from '../../../../shared/services/nlp.service';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { CardComponent, CardAction } from '../../../../shared/components/card/card.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { MatSpinner } from '../../../../shared/components/material-stubs';
import { ButtonGroupComponent, ButtonGroupItem } from '../../../../shared/components/button-group/button-group.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';
import { WallItemCardComponent } from '../../components/wall-item-card/wall-item-card.component';
import { WallItemsGridComponent } from '../../components/wall-items-grid/wall-items-grid.component';

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
    MatSpinner,
    ButtonGroupComponent,
    WallItemCardComponent,
    WallItemsGridComponent
  ],
  template: `
    <div class="page-wrapper" *ngIf="wall$ | async as wall">
      <div *ngIf="preset$ | async as preset" class="full-height">
        
        <!-- Custom Header -->
        <div class="custom-header">
          <button class="back-button" (click)="goBack()">
            <mat-icon [icon]="'arrow_back'"></mat-icon>
          </button>
          
          <div class="header-info">
            <h1 class="page-title">{{ nlpService.getPresetPageTitle(preset.name) }}</h1>
            <p class="page-subtitle" *ngIf="!isLoading">{{ nlpService.getCountText(totalItems, preset.name) }}</p>
          </div>
          
          <!-- View Toggle -->
          <app-button-group
            [items]="viewToggleItems"
            [activeId]="largeView ? 'grid' : 'list'"
            (selectionChange)="onViewToggleChange($event)">
          </app-button-group>
          
          <!-- Pagination in header -->
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
          
          <!-- Loading Spinner -->
          <mat-spinner
            *ngIf="isLoading"
            class="loading-spinner">
          </mat-spinner>
          
          <!-- Selection Bar -->
          @if (selection.length > 0) {
            <div class="selection-bar">
              <button class="icon-button" (click)="clearSelection()">
                <mat-icon [icon]="'close'"></mat-icon>
              </button>
              <span class="selection-count">{{ selection.length }} selected</span>
              <button 
                class="text-button"
                (click)="toggleSelectAll()">
                {{ isAllPageItemsSelected() ? 'Deselect Page' : 'Select Page' }}
              </button>
              <button 
                class="icon-button delete-button"
                (click)="deleteSelected()">
                <mat-icon [icon]="'delete'"></mat-icon>
              </button>
            </div>
          }

          <!-- Content Container -->
          <div class="content-container">
            
            <!-- Empty State -->
            @if (!isLoading && totalItems === 0) {
              <app-empty-state
                [icon]="preset.icon || 'inventory_2'"
                [title]="nlpService.getEmptyStateTitle(preset.name)"
                [message]="'Add your first ' + preset.name.toLowerCase() + ' entry to get started!'"
                [actions]="emptyStateActions">
              </app-empty-state>
            }

            <!-- Items Grid/List View -->
            @if (!isLoading && allItems.length > 0) {
              <app-wall-items-grid
                [items]="allItems"
                [preset]="preset"
                [viewMode]="largeView ? 'grid' : 'list'"
                [selectedItems]="selection"
                [pageSize]="pageSize"
                [pageIndex]="pageIndex"
                (itemClick)="onItemClick($event)"
                (viewItem)="onViewItem($event)"
                (editItem)="onEditItem($event)">
              </app-wall-items-grid>
            }
          </div>
          
          <!-- Floating Add Button -->
          <button 
            class="floating-add-button"
            (click)="navigateToAdd()">
            <mat-icon [icon]="'add'"></mat-icon>
            <span>{{ nlpService.getAddButtonText(preset.name) }}</span>
          </button>
          
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .page-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .full-height {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* Custom Header */
    .custom-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      flex-shrink: 0;
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

    .header-info {
      flex: 1;
    }

    .back-button {
      color: var(--md-sys-color-on-surface);
      background: transparent;
      border: none;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .back-button:hover {
      background: var(--md-sys-color-surface-variant);
    }

    .back-button mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .title-section {
      flex: 1;
    }

    .page-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      line-height: 1.2;
    }

    .page-subtitle {
      margin: 4px 0 0 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.8;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Floating Add Button */
    .floating-add-button {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      height: 56px;
      padding: 0 24px;
      border-radius: 28px;
      border: none;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      box-shadow: var(--md-sys-elevation-3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      z-index: 100;
      font-size: 16px;
      font-weight: 500;
      font-family: 'Google Sans', 'Roboto', sans-serif;
    }

    .floating-add-button:hover {
      box-shadow: var(--md-sys-elevation-4);
      transform: translateX(-50%) scale(1.05);
    }

    .floating-add-button:active {
      transform: translateX(-50%) scale(0.95);
    }

    .floating-add-button mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    /* View Toggle */
    .view-toggle {
      margin: 16px 0;
    }

    /* View Toggle Styles - Now handled by ButtonGroupComponent */

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

    .primary-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
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

    .icon-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
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

    /* Action Bar */
    .action-bar {
      padding: 8px 24px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 16px;
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
      padding: 12px 24px;
      gap: 12px;
      background: var(--md-sys-color-surface-container);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
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
      overflow-y: auto;
      overflow-x: hidden;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }


    /* Responsive Design */
    @media (max-width: 768px) {
      .page-title {
        font-size: 1.75rem;
      }

      .floating-add-button {
        bottom: 16px;
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
  pageSize = 50;

  emptyStateActions: EmptyStateAction[] = [
    {
      label: 'Add First Item',
      icon: 'add',
      primary: true,
      action: () => this.navigateToAdd()
    }
  ];

  viewToggleItems: ButtonGroupItem[] = [
    {
      id: 'grid',
      label: 'Grid',
      icon: 'grid_view'
    },
    {
      id: 'list',
      label: 'List',
      icon: 'view_list'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private confirmationDialog: ConfirmationDialogService,
    public nlpService: NlpService
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

  onViewToggleChange(item: ButtonGroupItem) {
    this.setLargeView(item.id === 'grid');
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

  isAllPageItemsSelected(): boolean {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const currentPageItems = this.allItems.slice(startIndex, endIndex);
    
    return currentPageItems.length > 0 && currentPageItems.every(item => this.selection.includes(item));
  }

  clearSelection() {
    this.selection = [];
  }

  toggleSelectAll() {
    // Get current page items
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const currentPageItems = this.allItems.slice(startIndex, endIndex);
    
    // Check if all current page items are selected
    const allPageItemsSelected = currentPageItems.every(item => this.selection.includes(item));
    
    if (allPageItemsSelected) {
      // Deselect all items from current page
      this.selection = this.selection.filter(item => !currentPageItems.includes(item));
    } else {
      // Select all items from current page
      const newSelections = currentPageItems.filter(item => !this.selection.includes(item));
      this.selection = [...this.selection, ...newSelections];
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


  getPageActions(preset: WallObjectType): PageAction[] {
    return [
      {
        label: this.nlpService.getAddButtonText(preset.name),
        icon: 'add',
        variant: 'raised',
        color: 'primary',
        action: () => this.navigateToAdd()
      }
    ];
  }

}