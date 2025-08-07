import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';

import { WallItem, WallObjectType, FieldDefinition } from '../../../../shared/models/wall.model';
import { WallItemService } from '../../services/wall-item.service';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { WallItemsGridComponent } from '../wall-items-grid/wall-items-grid.component';

interface SelectableItem {
  id: string;
  name: string;
  subtitle?: string;
  selected: boolean;
  item: WallItem;
}

@Component({
  selector: 'app-entity-association-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialIconComponent,
    ThemedButtonComponent,
    LoadingStateComponent,
    WallItemsGridComponent
  ],
  template: `
    <div class="entity-association-manager">
      <!-- Header with search and actions -->
      <div class="manager-header">
        <div class="search-section">
          <div class="search-input-wrapper">
            <mat-icon [icon]="'search'"></mat-icon>
            <input 
              type="text" 
              class="search-input"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
              [placeholder]="'Search ' + getObjectTypeName() + '...'"
              [disabled]="!canEdit">
          </div>
        </div>
        
        @if (canEdit && hasChanges()) {
          <div class="action-buttons">
            <app-themed-button
              variant="stroked"
              label="Cancel"
              (buttonClick)="onCancel()">
            </app-themed-button>
            <app-themed-button
              variant="raised"
              color="primary"
              [icon]="'save'"
              label="Save Changes"
              (buttonClick)="onSave()">
            </app-themed-button>
          </div>
        }
      </div>

      <!-- Selection mode for available items -->
      @if (canEdit && !isLoading) {
        <div class="available-items-section">
          <div class="section-header">
            <h3>Available {{ getObjectTypeName() }}</h3>
            <span class="item-count">{{ getAvailableCount() }} items</span>
          </div>
          
          <div class="items-list">
            @if (filteredAvailableItems.length > 0) {
              @for (item of filteredAvailableItems; track item.id) {
                <div class="selectable-item" 
                     [class.selected]="item.selected"
                     (click)="toggleItemSelection(item)">
                  <div class="item-checkbox">
                    @if (item.selected) {
                      <mat-icon [icon]="'check_box'"></mat-icon>
                    } @else {
                      <mat-icon [icon]="'check_box_outline_blank'"></mat-icon>
                    }
                  </div>
                  <div class="item-content">
                    <div class="item-name">{{ item.name }}</div>
                    @if (item.subtitle) {
                      <div class="item-subtitle">{{ item.subtitle }}</div>
                    }
                  </div>
                </div>
              }
            } @else {
              <div class="no-items">
                @if (searchTerm) {
                  <p>No {{ getObjectTypeName().toLowerCase() }} found matching "{{ searchTerm }}"</p>
                } @else {
                  <p>No available {{ getObjectTypeName().toLowerCase() }} to add</p>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Display items section -->
      <div class="associated-items-section">
        <div class="section-header">
          @if (canEdit) {
            <h3>Associated {{ getObjectTypeName() }}</h3>
            <span class="item-count">{{ associatedItems.length }} items</span>
          } @else {
            <h3>All {{ getObjectTypeName() }}</h3>
            <span class="item-count">{{ getAllItemsCount() }} items</span>
          }
        </div>
        
        @if (isLoading) {
          <app-loading-state 
            type="spinner" 
            [message]="'Loading ' + getObjectTypeName().toLowerCase() + '...'"
            [spinnerSize]="40">
          </app-loading-state>
        } @else {
          <!-- Show all items when not editing, only associated when editing -->
          @if (!canEdit && getAllItems().length > 0) {
            <app-wall-items-grid
              [items]="getAllWallItems()"
              [preset]="targetObjectType"
              [viewMode]="'grid'"
              [isSelectionMode]="false"
              [selectedItems]="[]"
              [canEdit]="false"
              (itemClick)="onViewItem($event)">
            </app-wall-items-grid>
          } @else if (canEdit && associatedItems.length > 0) {
            <app-wall-items-grid
              [items]="getAssociatedWallItems()"
              [preset]="targetObjectType"
              [viewMode]="'grid'"
              [isSelectionMode]="false"
              [selectedItems]="[]"
              [canEdit]="canEdit"
              (itemClick)="onViewItem($event)">
            </app-wall-items-grid>
          } @else {
            <div class="no-items">
              @if (canEdit) {
                <mat-icon [icon]="'link_off'"></mat-icon>
                <p>No {{ getObjectTypeName().toLowerCase() }} are currently associated</p>
                <p class="hint">Select items from the list above to create associations</p>
              } @else {
                <mat-icon [icon]="'inbox'"></mat-icon>
                <p>No {{ getObjectTypeName().toLowerCase() }} found</p>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .entity-association-manager {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px;
    }

    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .search-section {
      flex: 1;
      max-width: 400px;
    }

    .search-input-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: var(--md-sys-color-surface-container-low);
      border-radius: 28px;
      border: 1px solid var(--md-sys-color-outline);
      transition: all 0.2s ease;
    }

    .search-input-wrapper:focus-within {
      background: var(--md-sys-color-surface-container);
      border-color: var(--md-sys-color-primary);
    }

    .search-input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-size: 14px;
      color: var(--md-sys-color-on-surface);
    }

    .search-input::placeholder {
      color: var(--md-sys-color-on-surface-variant);
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .available-items-section,
    .associated-items-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .item-count {
      font-size: 14px;
      color: var(--md-sys-color-on-surface-variant);
      padding: 4px 12px;
      background: var(--md-sys-color-surface-container);
      border-radius: 12px;
    }

    .items-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      padding: 8px;
      background: var(--md-sys-color-surface-container-lowest);
      border-radius: 12px;
    }

    .selectable-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--md-sys-color-surface);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .selectable-item:hover {
      background: var(--md-sys-color-surface-container);
    }

    .selectable-item.selected {
      background: var(--md-sys-color-primary-container);
      border-color: var(--md-sys-color-primary);
    }

    .item-checkbox {
      color: var(--md-sys-color-on-surface-variant);
    }

    .selectable-item.selected .item-checkbox {
      color: var(--md-sys-color-primary);
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtitle {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .no-items {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
    }

    .no-items mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-items p {
      margin: 4px 0;
      font-size: 14px;
    }

    .no-items .hint {
      font-size: 12px;
      opacity: 0.7;
    }
  `]
})
export class EntityAssociationManagerComponent implements OnInit {
  @Input() currentItem!: WallItem;
  @Input() targetObjectType!: WallObjectType;
  @Input() field!: FieldDefinition;
  @Input() wallId!: string;
  @Input() canEdit: boolean = false;
  
  @Output() associationsChanged = new EventEmitter<string[]>();
  @Output() viewItem = new EventEmitter<WallItem>();
  @Output() editItem = new EventEmitter<WallItem>();
  
  private wallItemService = inject(WallItemService);
  private searchSubject = new Subject<string>();
  
  searchTerm: string = '';
  isLoading: boolean = false;
  
  availableItems: SelectableItem[] = [];
  filteredAvailableItems: SelectableItem[] = [];
  associatedItems: SelectableItem[] = [];
  
  private originalAssociatedIds: string[] = [];
  
  ngOnInit() {
    console.log('🎯 EntityAssociationManager initialized:', {
      currentItem: this.currentItem?.id,
      targetObjectType: this.targetObjectType?.name,
      field: this.field?.name,
      canEdit: this.canEdit
    });
    this.loadItems();
    
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(term => {
      this.filterItems(term);
    });
  }
  
  private async loadItems() {
    this.isLoading = true;
    
    try {
      // Get all items of the target type
      const allItems = await this.wallItemService.getWallItemsByObjectType(
        this.wallId,
        this.targetObjectType.id
      ).toPromise();
      
      console.log('📦 Loaded items for association:', {
        targetType: this.targetObjectType.name,
        totalItems: allItems?.length || 0,
        wallId: this.wallId,
        targetObjectTypeId: this.targetObjectType.id
      });
      
      if (!allItems) return;
      
      // Get current associations
      const currentAssociations = this.getCurrentAssociations();
      this.originalAssociatedIds = [...currentAssociations];
      
      // Process items into selectable format
      const selectableItems = allItems.map(item => this.createSelectableItem(item));
      
      // Split into available and associated
      this.availableItems = [];
      this.associatedItems = [];
      
      selectableItems.forEach(item => {
        if (currentAssociations.includes(item.id)) {
          item.selected = true;
          this.associatedItems.push(item);
        } else {
          item.selected = false;
          this.availableItems.push(item);
        }
      });
      
      console.log('🔍 Split items:', {
        available: this.availableItems.length,
        associated: this.associatedItems.length,
        currentAssociations
      });
      
      this.filteredAvailableItems = [...this.availableItems];
      
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  private getCurrentAssociations(): string[] {
    const fieldValue = this.currentItem.fieldData[this.field.id];
    if (!fieldValue) return [];
    return Array.isArray(fieldValue) ? fieldValue : [fieldValue];
  }
  
  private createSelectableItem(item: WallItem): SelectableItem {
    const primaryField = this.targetObjectType.displaySettings?.primaryField;
    const secondaryField = this.targetObjectType.displaySettings?.secondaryField;
    
    let name = 'Untitled';
    let subtitle = '';
    
    if (primaryField && item.fieldData[primaryField]) {
      name = this.formatFieldValue(item.fieldData[primaryField]);
    } else {
      // Find first text field
      const firstTextField = this.targetObjectType.fields.find(f => 
        f.type === 'text' && item.fieldData[f.id]
      );
      if (firstTextField && item.fieldData[firstTextField.id]) {
        name = this.formatFieldValue(item.fieldData[firstTextField.id]);
      }
    }
    
    if (secondaryField && item.fieldData[secondaryField]) {
      subtitle = this.formatFieldValue(item.fieldData[secondaryField]);
    }
    
    return {
      id: item.id!,
      name,
      subtitle,
      selected: false,
      item
    };
  }
  
  private formatFieldValue(value: any): string {
    if (!value) return '';
    if (typeof value === 'object') {
      if (value.address) return value.address;
      if (value.lat && value.lng) return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
      if (Array.isArray(value)) return value.join(', ');
      return '';
    }
    return String(value);
  }
  
  onSearchChange(term: string) {
    this.searchSubject.next(term);
  }
  
  private filterItems(term: string) {
    if (!term.trim()) {
      this.filteredAvailableItems = [...this.availableItems];
      return;
    }
    
    const searchTerm = term.toLowerCase();
    this.filteredAvailableItems = this.availableItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm))
    );
  }
  
  toggleItemSelection(item: SelectableItem) {
    if (!this.canEdit) return;
    
    if (item.selected) {
      // Remove from associated
      item.selected = false;
      this.associatedItems = this.associatedItems.filter(i => i.id !== item.id);
      this.availableItems.push(item);
      this.filteredAvailableItems = [...this.availableItems];
    } else {
      // Add to associated
      if (!this.field.entityConfig?.allowMultiple && this.associatedItems.length > 0) {
        // Single selection - remove previous
        const previous = this.associatedItems[0];
        previous.selected = false;
        this.availableItems.push(previous);
        this.associatedItems = [];
      }
      
      item.selected = true;
      this.associatedItems.push(item);
      this.availableItems = this.availableItems.filter(i => i.id !== item.id);
      this.filteredAvailableItems = [...this.availableItems];
    }
  }
  
  hasChanges(): boolean {
    const currentIds = this.associatedItems.map(i => i.id).sort();
    return JSON.stringify(currentIds) !== JSON.stringify(this.originalAssociatedIds.sort());
  }
  
  onCancel() {
    // Reset to original state
    this.loadItems();
  }
  
  onSave() {
    const newAssociations = this.associatedItems.map(i => i.id);
    this.associationsChanged.emit(newAssociations);
    this.originalAssociatedIds = [...newAssociations];
  }
  
  getObjectTypeName(): string {
    return this.targetObjectType.name;
  }
  
  getAvailableCount(): number {
    return this.filteredAvailableItems.length;
  }
  
  getAssociatedWallItems(): WallItem[] {
    return this.associatedItems.map(i => i.item);
  }
  
  getAllItems(): SelectableItem[] {
    return [...this.availableItems, ...this.associatedItems];
  }
  
  getAllItemsCount(): number {
    return this.availableItems.length + this.associatedItems.length;
  }
  
  getAllWallItems(): WallItem[] {
    return this.getAllItems().map(i => i.item);
  }
  
  onViewItem(item: WallItem) {
    this.viewItem.emit(item);
  }
  
  onEditItem(item: WallItem) {
    this.editItem.emit(item);
  }
}