import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallItem, WallObjectType, WallItemImage } from '../../../../shared/models/wall.model';
import { WallItemCardComponent } from '../wall-item-card/wall-item-card.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';

@Component({
  selector: 'app-wall-items-grid',
  standalone: true,
  imports: [
    CommonModule,
    WallItemCardComponent,
    MaterialIconComponent
  ],
  template: `
    <!-- Grid View -->
    @if (viewMode === 'grid' && paginatedItems.length > 0) {
      <div class="grid-layout">
        @for (item of paginatedItems; track item.id) {
          <app-wall-item-card
            [item]="item"
            [preset]="preset"
            [title]="getItemTitle(item)"
            [subtitle]="getItemSubtitle(item) || ''"
            [metadata]="getMetadata(item)"
            [selected]="isSelected(item)"
            [selectable]="hasSelection"
            (cardClick)="onItemClick(item)"
            (viewClick)="onViewItem(item)"
            (editClick)="onEditItem(item)">
          </app-wall-item-card>
        }
      </div>
    }

    <!-- List View -->
    @if (viewMode === 'list' && paginatedItems.length > 0) {
      <div class="list-layout">
        @for (item of paginatedItems; track item.id) {
          <div 
            class="list-item"
            [class.selected]="isSelected(item)"
            (click)="onItemClick(item)">
            
            <div class="item-avatar">
              @if (getPrimaryImage(item)?.url) {
                <img [src]="getPrimaryImage(item)!.url" [alt]="getPrimaryImage(item)!.altText || getItemTitle(item)" />
              } @else if (preset && preset.defaultImage && preset.defaultImage.url) {
                <img [src]="preset.defaultImage.url" [alt]="preset.defaultImage.altText || 'Default image'" />
              } @else {
                <div class="avatar-placeholder">
                  <mat-icon [icon]="preset?.icon || 'inventory_2'"></mat-icon>
                </div>
              }
            </div>
            
            <div class="item-content">
              <h3 class="item-title">{{ getItemTitle(item) }}</h3>
              <p class="item-subtitle" *ngIf="getItemSubtitle(item)">{{ getItemSubtitle(item) }}</p>
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
              <button 
                class="icon-button"
                (click)="$event.stopPropagation(); onViewItem(item)"
                title="View">
                <mat-icon [icon]="'visibility'"></mat-icon>
              </button>
              <button 
                class="icon-button"
                (click)="$event.stopPropagation(); onEditItem(item)"
                title="Edit">
                <mat-icon [icon]="'edit'"></mat-icon>
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: auto;
    }

    /* Grid Layout */
    .grid-layout {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      grid-auto-rows: 320px;
      gap: 12px;
      padding: 8px;
      width: 100%;
    }

    /* List Layout */
    .list-layout {
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      width: 100%;
      overflow: hidden;
      background: var(--md-sys-color-surface-container);
      margin: 8px;
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

    .icon-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .grid-layout {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      }
    }

    @media (max-width: 768px) {
      .grid-layout {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
        padding: 4px;
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
export class WallItemsGridComponent {
  @Input() items: WallItem[] = [];
  @Input() preset: WallObjectType | null = null;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() selectedItems: WallItem[] = [];
  @Input() pageSize: number = 50;
  @Input() pageIndex: number = 0;
  
  @Output() itemClick = new EventEmitter<WallItem>();
  @Output() viewItem = new EventEmitter<WallItem>();
  @Output() editItem = new EventEmitter<WallItem>();

  get hasSelection(): boolean {
    return this.selectedItems.length > 0;
  }

  get paginatedItems(): WallItem[] {
    if (!this.items) return [];
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.items.slice(startIndex, endIndex);
  }

  isSelected(item: WallItem): boolean {
    return this.selectedItems.includes(item);
  }

  onItemClick(item: WallItem): void {
    this.itemClick.emit(item);
  }

  onViewItem(item: WallItem): void {
    this.viewItem.emit(item);
  }

  onEditItem(item: WallItem): void {
    this.editItem.emit(item);
  }

  getPrimaryImage(item: WallItem): WallItemImage | null {
    if (!item.images || item.images.length === 0) return null;
    
    const primaryIndex = item.primaryImageIndex || 0;
    return item.images[primaryIndex] || item.images[0];
  }

  getItemTitle(item: WallItem): string {
    if (!this.preset) return 'Untitled Item';
    
    const primaryField = this.preset.displaySettings?.primaryField;
    
    if (primaryField && item.fieldData[primaryField]) {
      return String(item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(item.fieldData).find(key => 
      typeof item.fieldData[key] === 'string' && item.fieldData[key].trim()
    );
    
    return firstTextField ? String(item.fieldData[firstTextField]) : 'Untitled Item';
  }

  getItemSubtitle(item: WallItem): string | null {
    if (!this.preset) return null;
    
    const secondaryField = this.preset.displaySettings?.secondaryField;
    
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
}