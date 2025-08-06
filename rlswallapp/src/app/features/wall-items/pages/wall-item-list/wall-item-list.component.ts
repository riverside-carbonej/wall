import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ProgressSpinnerComponent } from '../../../../shared/components/progress-spinner/progress-spinner.component';
import { TooltipComponent } from '../../../../shared/components/tooltip/tooltip.component';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WallItemService } from '../../services/wall-item.service';
import { WallService } from '../../../walls/services/wall.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { CardComponent, CardAction, CardMenuItem } from '../../../../shared/components/card/card.component';
import { WallItemImageComponent } from '../../../../shared/components/wall-item-image/wall-item-image.component';

@Component({
  selector: 'app-wall-item-list',
  standalone: true,
  imports: [
    CommonModule,
    ThemedButtonComponent,
    MaterialIconComponent,
    ProgressSpinnerComponent,
    TooltipComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    CardComponent,
    WallItemImageComponent
  ],
  template: `
    <div class="wall-item-list" 
         [class.background-mode]="isBackgroundMode"
         [class.large-view]="showInLargeView">
      
      <!-- Toolbar (only in normal mode) -->
      @if (showToolbar && !isBackgroundMode) {
        <div class="list-toolbar">
          <div class="toolbar-title">
            <h2>Wall Items</h2>
            @if (wallItems$ | async; as items) {
              <span class="item-count">
                {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}
              </span>
            }
          </div>
          <div class="toolbar-actions">
            <app-themed-button
              [variant]="'raised'"
              [color]="'primary'"
              [icon]="'add'"
              [label]="'Add Item'"
              (buttonClick)="navigateToAdd()">
            </app-themed-button>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading) {
        <app-loading-state 
          message="Loading wall items..."
          [containerClass]="isBackgroundMode ? 'background-loading' : ''">
        </app-loading-state>
      }

      <!-- Empty State -->
      @if (!isLoading && (wallItems$ | async)?.length === 0) {
        <!-- No Object Types Yet -->
        @if (objectTypes.length === 0) {
          <app-empty-state
            icon="category"
            title="No Wall Item Presets Yet"
            message="This wall needs Wall Item Presets (templates) before you can add items. Create a preset first to define the structure."
            [actions]="!isBackgroundMode ? noObjectTypesActions : []"
            [containerClass]="isBackgroundMode ? 'background-empty' : ''">
          </app-empty-state>
        } @else {
          <!-- Have Object Types but No Items -->
          <app-empty-state
            icon="inventory_2"
            title="No items yet"
            message="This wall doesn't have any items yet. Add your first item to get started!"
            [actions]="!isBackgroundMode ? emptyStateActions : []"
            [containerClass]="isBackgroundMode ? 'background-empty' : ''">
          </app-empty-state>
        }
      }

      <!-- Items Grid -->
      @if (!isLoading && (wallItems$ | async); as items) {
        @if (items.length > 0) {
          <div class="items-grid" 
               [class.large-grid]="showInLargeView"
               [class.background-grid]="isBackgroundMode">
            
            @for (item of items; track item.id) {
              <div class="item-card-wrapper"
                   [class.clickable]="!isBackgroundMode"
                   (click)="onItemClick(item)">
                
                <app-card
                  variant="elevated"
                  size="medium"
                  [title]="getItemTitle(item)"
                  [subtitle]="getItemSubtitle(item) || undefined"
                  [avatarIcon]="getObjectTypeIcon(item)"
                  [imageSlot]="true"
                  [metadata]="getMetadata(item)"
                  [actions]="!isBackgroundMode ? getActions(item) : []"
                  [clickable]="!isBackgroundMode"
                  [class.background-card]="isBackgroundMode"
                  class="wall-item-card">
                  
                  <!-- Card Image -->
                  <app-wall-item-image 
                    slot="media"
                    [images]="item.images || []"
                    [primaryImageIndex]="item.primaryImageIndex || 0"
                    [preset]="getObjectType(item) || null"
                    [uniqueId]="item.id">
                  </app-wall-item-image>
                  
                  <!-- Object Type Badge -->
                  @if (!isBackgroundMode) {
                    <div slot="media-overlay" class="object-type-badge" 
                         [style.background-color]="getObjectTypeColor(item)">
                      <mat-icon>{{ getObjectTypeIcon(item) }}</mat-icon>
                    </div>
                  }
                </app-card>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .wall-item-list {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .background-mode {
      pointer-events: none;
      height: 100vh;
      overflow: hidden;
    }

    /* Toolbar */
    .list-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-medium);
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .toolbar-title h2 {
      margin: 0;
      color: var(--md-sys-color-on-surface);
      font-size: 1.5rem;
      font-weight: 500;
    }

    .item-count {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      padding: 0.25rem 0.75rem;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Items Grid */
    .items-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      padding: 0 1rem 1rem;
    }

    .large-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.25rem;
      padding: 0;
    }

    .background-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.5rem;
      height: 100%;
      overflow: hidden;
      padding: 1rem;
    }

    /* Item Cards */
    .item-card-wrapper {
      /* Card component handles hover and transition effects */
    }

    .wall-item-card {
      height: 100%;
    }

    .wall-item-card app-wall-item-image {
      width: 100%;
      height: 200px;
      display: block;
    }

    .background-card {
      opacity: 0.9;
    }

    .large-view .wall-item-card {
      height: 300px;
    }

    .background-mode .wall-item-card {
      height: 200px;
      pointer-events: none;
    }

    .object-type-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .object-type-badge mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    /* Loading and Empty States */
    .background-loading {
      background: rgba(0,0,0,0.1);
      backdrop-filter: blur(10px);
    }

    .background-empty {
      background: rgba(0,0,0,0.1);
      backdrop-filter: blur(10px);
      color: white;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .items-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        padding: 0 0.5rem 0.5rem;
      }

      .large-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      }

      .background-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }

      .list-toolbar {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .toolbar-title {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .items-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .background-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }

      .background-mode .wall-item-card {
        height: 150px;
      }
    }
  `]
})
export class WallItemListComponent implements OnInit, OnDestroy {
  @Input() wallId?: string;
  @Input() showInLargeView = false;
  @Input() showToolbar = true;
  @Input() isBackgroundMode = false;

  private destroy$ = new Subject<void>();
  
  wallItems$!: Observable<WallItem[]>;
  wall$!: Observable<Wall | null>;
  objectTypes: WallObjectType[] = [];
  isLoading = true;

  emptyStateActions: EmptyStateAction[] = [
    {
      label: 'Add First Item',
      icon: 'add',
      primary: true,
      action: () => this.navigateToAdd()
    }
  ];

  noObjectTypesActions: EmptyStateAction[] = [
    {
      label: 'Create Wall Item Preset',
      icon: 'category',
      primary: true,
      action: () => this.navigateToObjectTypes()
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallItemService: WallItemService,
    private wallService: WallService
  ) {}

  ngOnInit() {
    // Get wallId from input or route
    this.wallId = this.wallId || this.route.snapshot.paramMap.get('wallId') || '';
    
    if (!this.wallId) {
      console.error('No wallId provided to WallItemListComponent');
      return;
    }

    // Check for legacy URL with objectType query parameter and redirect to new preset-based URL
    const objectTypeParam = this.route.snapshot.queryParamMap.get('objectType');
    if (objectTypeParam) {
      // Redirect to new preset-based URL structure
      this.router.navigate(['/walls', this.wallId, 'preset', objectTypeParam, 'items'], {
        replaceUrl: true // Replace the current URL in history
      });
      return;
    }

    // Load wall data
    this.wall$ = this.wallService.getWallById(this.wallId).pipe(
      takeUntil(this.destroy$)
    );

    // Load wall items
    this.wallItems$ = this.wallItemService.getWallItems(this.wallId).pipe(
      takeUntil(this.destroy$)
    );

    // Extract object types for reference
    this.wall$.subscribe(wall => {
      if (wall) {
        this.objectTypes = wall.objectTypes || [];
      }
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Item Data Methods
  getPrimaryImage(item: WallItem) {
    if (!item.images || item.images.length === 0) return null;
    
    const primaryIndex = item.primaryImageIndex || 0;
    return item.images[primaryIndex] || item.images[0];
  }

  getItemTitle(item: WallItem): string {
    const objectType = this.getObjectType(item);
    const primaryField = objectType?.displaySettings?.primaryField;
    
    if (primaryField && item.fieldData[primaryField]) {
      return this.formatFieldValue(item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(item.fieldData).find(key => 
      typeof item.fieldData[key] === 'string' && item.fieldData[key].trim()
    );
    
    return firstTextField ? this.formatFieldValue(item.fieldData[firstTextField]) : 'Untitled Item';
  }

  getItemSubtitle(item: WallItem): string | null {
    const objectType = this.getObjectType(item);
    const secondaryField = objectType?.displaySettings?.secondaryField;
    
    if (secondaryField && item.fieldData[secondaryField]) {
      return this.formatFieldValue(item.fieldData[secondaryField]);
    }
    
    return null;
  }

  private formatFieldValue(value: any): string {
    if (!value) return '';
    
    // Handle location objects
    if (value && typeof value === 'object') {
      if (value.address) {
        return value.address;
      } else if (value.lat && value.lng) {
        return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
      } else if (Array.isArray(value)) {
        return value.join(', ');
      } else {
        return '';
      }
    }
    
    return String(value);
  }

  getObjectType(item: WallItem): WallObjectType | undefined {
    return this.objectTypes.find(ot => ot.id === item.objectTypeId);
  }

  getObjectTypeName(item: WallItem): string {
    return this.getObjectType(item)?.name || 'Unknown Type';
  }

  getObjectTypeIcon(item: WallItem): string {
    return this.getObjectType(item)?.icon || 'category';
  }

  getObjectTypeColor(item: WallItem): string {
    return this.getObjectType(item)?.color || '#6750A4';
  }

  // Navigation Methods
  navigateToAdd() {
    if (this.objectTypes.length === 0) {
      // No object types available - redirect to manage page
      this.navigateToObjectTypes();
    } else if (this.objectTypes.length === 1) {
      // Auto-select single object type and navigate to preset-based add page
      this.router.navigate(['/walls', this.wallId, 'preset', this.objectTypes[0].id, 'items', 'add']);
    } else {
      // Multiple object types - let user choose
      this.router.navigate(['/walls', this.wallId, 'items', 'select-type']);
    }
  }

  navigateToObjectTypes() {
    // Navigate to Wall Item Presets management
    this.router.navigate(['/walls', this.wallId, 'presets']);
  }

  onItemClick(item: WallItem) {
    if (!this.isBackgroundMode) {
      this.onViewItem(item);
    }
  }

  onViewItem(item: WallItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/walls', this.wallId, 'items', item.id]);
  }

  onEditItem(item: WallItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/walls', this.wallId, 'items', item.id, 'edit']);
  }

  getMetadata(item: WallItem): Array<{key: string; value: string; icon?: string}> {
    if (this.isBackgroundMode) return [];
    
    return [
      {
        key: 'type',
        value: this.getObjectTypeName(item),
        icon: this.getObjectTypeIcon(item)
      },
      {
        key: 'updated',
        value: new Date(item.updatedAt).toLocaleDateString(),
        icon: 'schedule'
      }
    ];
  }

  getActions(item: WallItem): CardAction[] {
    if (this.isBackgroundMode) return [];
    
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
}