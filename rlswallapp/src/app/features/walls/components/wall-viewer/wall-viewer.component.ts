import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { WallItemService } from '../../../wall-items/services/wall-item.service';
import { Wall, WallItem, WallViewMode, FieldDefinition } from '../../../../shared/models/wall.model';

@Component({
  selector: 'app-wall-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="wall-viewer" *ngIf="wall$ | async as wall" [style.background-color]="wall.theme.backgroundColor">
      <!-- Header -->
      <header class="wall-header" [style.color]="wall.theme.textColor">
        <div class="header-content">
          <div class="wall-info">
            <h1>{{ wall.name }}</h1>
            <p *ngIf="wall.description">{{ wall.description }}</p>
          </div>
          <div class="header-actions">
            <button 
              (click)="toggleMode()" 
              class="mode-toggle"
              [style.background-color]="wall.theme.primaryColor"
            >
              {{ viewMode === 'preview' ? 'Edit Mode' : 'Preview Mode' }}
            </button>
            <a [routerLink]="['/walls', wall.id, 'edit']" class="settings-button">⚙️</a>
          </div>
        </div>
      </header>

      <!-- Add Item Form (Edit Mode Only) -->
      <div class="add-item-section" *ngIf="viewMode === 'edit' && wall.fields.length > 0">
        <button 
          *ngIf="!showAddForm" 
          (click)="showAddItemForm()" 
          class="add-item-button"
          [style.background-color]="wall.theme.primaryColor"
        >
          + Add New Item
        </button>

        <form 
          *ngIf="showAddForm" 
          [formGroup]="addItemForm" 
          (ngSubmit)="onAddItem()"
          class="add-item-form"
          [style.border-color]="wall.theme.secondaryColor"
        >
          <h3 [style.color]="wall.theme.textColor">Add New Item</h3>
          <div class="form-fields">
            <div *ngFor="let field of wall.fields" class="form-field">
              <label [style.color]="wall.theme.textColor">
                {{ field.name }}{{ field.required ? ' *' : '' }}
              </label>
              <input 
                *ngIf="field.type === 'text' || field.type === 'email' || field.type === 'url'"
                [type]="field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'"
                [formControlName]="field.id"
                [placeholder]="field.placeholder || ''"
                class="form-input"
              >
              <input 
                *ngIf="field.type === 'date'"
                type="date"
                [formControlName]="field.id"
                class="form-input"
              >
              <input 
                *ngIf="field.type === 'number'"
                type="number"
                [formControlName]="field.id"
                [placeholder]="field.placeholder || ''"
                class="form-input"
              >
              <textarea 
                *ngIf="field.type === 'longtext'"
                [formControlName]="field.id"
                [placeholder]="field.placeholder || ''"
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" (click)="cancelAddItem()" class="cancel-button">Cancel</button>
            <button 
              type="submit" 
              [disabled]="addItemForm.invalid"
              class="save-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>

      <!-- Wall Items -->
      <div class="wall-content" *ngIf="wallItems$ | async as items">
        <div 
          class="items-container"
          [class.grid-layout]="wall.theme.layout === 'grid'"
          [class.list-layout]="wall.theme.layout === 'list'"
          [class.masonry-layout]="wall.theme.layout === 'masonry'"
          [class.timeline-layout]="wall.theme.layout === 'timeline'"
          [class.compact-spacing]="wall.theme.spacing === 'compact'"
          [class.comfortable-spacing]="wall.theme.spacing === 'comfortable'"
          [class.spacious-spacing]="wall.theme.spacing === 'spacious'"
        >
          <div 
            *ngFor="let item of items; trackBy: trackByItemId" 
            class="wall-item"
            [class.card-minimal]="wall.theme.cardStyle === 'minimal'"
            [class.card-bordered]="wall.theme.cardStyle === 'bordered'"
            [class.card-elevated]="wall.theme.cardStyle === 'elevated'"
            [class.card-rounded]="wall.theme.cardStyle === 'rounded'"
            [style.background-color]="getItemBackgroundColor(wall)"
            [style.color]="wall.theme.textColor"
          >
            <div class="item-actions" *ngIf="viewMode === 'edit'">
              <button (click)="editItem(item)" class="edit-item-button">✏️</button>
              <button (click)="deleteItem(item.id!)" class="delete-item-button">🗑️</button>
            </div>

            <div class="item-content">
              <div *ngFor="let field of wall.fields" class="item-field">
                <label class="field-label" [style.color]="getFieldLabelColor(wall)">
                  {{ field.name }}
                </label>
                <div class="field-value" [style.color]="wall.theme.textColor">
                  <ng-container [ngSwitch]="field.type">
                    <span *ngSwitchCase="'date'">
                      {{ item.data[field.id] | date:'mediumDate' }}
                    </span>
                    <span *ngSwitchCase="'email'">
                      <a [href]="'mailto:' + item.data[field.id]" [style.color]="wall.theme.primaryColor">
                        {{ item.data[field.id] }}
                      </a>
                    </span>
                    <span *ngSwitchCase="'url'">
                      <a [href]="item.data[field.id]" target="_blank" [style.color]="wall.theme.primaryColor">
                        {{ item.data[field.id] }}
                      </a>
                    </span>
                    <span *ngSwitchCase="'longtext'" class="long-text">
                      {{ item.data[field.id] }}
                    </span>
                    <span *ngSwitchDefault>
                      {{ item.data[field.id] }}
                    </span>
                  </ng-container>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="items.length === 0" [style.color]="wall.theme.textColor">
            <div class="empty-icon">📝</div>
            <h3>No items yet</h3>
            <p *ngIf="viewMode === 'preview'">This wall doesn't have any items to display.</p>
            <p *ngIf="viewMode === 'edit'">Add your first item to get started.</p>
            <button 
              *ngIf="viewMode === 'edit' && wall.fields.length > 0"
              (click)="showAddItemForm()"
              class="add-first-item-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              Add First Item
            </button>
            <a 
              *ngIf="wall.fields.length === 0"
              [routerLink]="['/walls', wall.id, 'edit']"
              class="setup-fields-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              Set Up Fields First
            </a>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading" [style.color]="wall.theme.textColor">
        <div class="loading-spinner"></div>
        <p>Loading wall items...</p>
      </div>
    </div>
  `,
  styles: [`
    .wall-viewer {
      min-height: 100vh;
      padding: 2rem;
      transition: background-color 0.3s ease;
    }

    .wall-header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      max-width: 1200px;
      margin: 0 auto;
    }

    .wall-info h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .wall-info p {
      margin: 0;
      opacity: 0.8;
      font-size: 1.1rem;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .mode-toggle {
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-toggle:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .settings-button {
      color: currentColor;
      text-decoration: none;
      font-size: 1.5rem;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .settings-button:hover {
      opacity: 1;
    }

    .add-item-section {
      max-width: 1200px;
      margin: 0 auto 2rem;
    }

    .add-item-button {
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .add-item-button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .add-item-form {
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-top: 1rem;
    }

    .add-item-form h3 {
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
    }

    .form-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .form-field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .form-input, .form-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .cancel-button {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .save-button {
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .save-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .wall-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .items-container {
      display: grid;
      gap: 1rem;
    }

    /* Layout Styles */
    .grid-layout {
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }

    .list-layout {
      grid-template-columns: 1fr;
    }

    .masonry-layout {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }

    .timeline-layout {
      grid-template-columns: 1fr;
    }

    /* Spacing Styles */
    .compact-spacing {
      gap: 0.5rem;
    }

    .comfortable-spacing {
      gap: 1rem;
    }

    .spacious-spacing {
      gap: 2rem;
    }

    .wall-item {
      position: relative;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .wall-item:hover {
      transform: translateY(-2px);
    }

    /* Card Styles */
    .card-minimal {
      border: none;
      box-shadow: none;
    }

    .card-bordered {
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .card-elevated {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .card-rounded {
      border-radius: 1rem;
    }

    .item-actions {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .wall-item:hover .item-actions {
      opacity: 1;
    }

    .edit-item-button, .delete-item-button {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      width: 2rem;
      height: 2rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .item-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .item-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.8;
    }

    .field-value {
      font-size: 1rem;
      line-height: 1.4;
    }

    .long-text {
      white-space: pre-wrap;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .empty-state p {
      margin: 0 0 2rem 0;
      opacity: 0.8;
    }

    .add-first-item-button, .setup-fields-button {
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
      display: inline-block;
    }

    .loading-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .wall-viewer {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .wall-info h1 {
        font-size: 2rem;
      }

      .form-fields {
        grid-template-columns: 1fr;
      }

      .grid-layout, .masonry-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WallViewerComponent implements OnInit {
  wall$!: Observable<Wall | null>;
  wallItems$!: Observable<WallItem[]>;
  viewMode: 'preview' | 'edit' = 'preview';
  showAddForm = false;
  addItemForm!: FormGroup;
  isLoading = true;
  wallId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('id')!;
    if (!this.wallId) {
      this.router.navigate(['/walls']);
      return;
    }

    this.wall$ = this.wallService.getWallById(this.wallId);
    this.wallItems$ = this.wallItemService.getWallItems(this.wallId);

    this.wall$.subscribe({
      next: (wall) => {
        if (wall) {
          this.initializeAddItemForm(wall.fields);
          this.isLoading = false;
        } else {
          this.router.navigate(['/walls']);
        }
      },
      error: (error) => {
        console.error('Error loading wall:', error);
        this.router.navigate(['/walls']);
      }
    });
  }

  private initializeAddItemForm(fields: FieldDefinition[]): void {
    const formGroup: { [key: string]: any } = {};
    
    fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      formGroup[field.id] = ['', validators];
    });

    this.addItemForm = this.fb.group(formGroup);
  }

  toggleMode(): void {
    this.viewMode = this.viewMode === 'preview' ? 'edit' : 'preview';
    this.showAddForm = false;
  }

  showAddItemForm(): void {
    this.showAddForm = true;
  }

  cancelAddItem(): void {
    this.showAddForm = false;
    this.addItemForm.reset();
  }

  onAddItem(): void {
    if (this.addItemForm.valid) {
      const wallItemData: Omit<WallItem, 'id'> = {
        wallId: this.wallId,
        data: this.addItemForm.value,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.wallItemService.createWallItem(wallItemData).subscribe({
        next: (itemId) => {
          // Refresh the wall items
          this.wallItems$ = this.wallItemService.getWallItems(this.wallId);
          this.cancelAddItem();
        },
        error: (error) => {
          console.error('Error adding item:', error);
          alert('Failed to add item. Please try again.');
        }
      });
    }
  }

  editItem(item: WallItem): void {
    // TODO: Implement inline editing
    console.log('Editing item:', item);
  }

  deleteItem(itemId: string): void {
    if (confirm('Are you sure you want to delete this item?')) {
      this.wallItemService.deleteWallItem(itemId).subscribe({
        next: () => {
          // Refresh the wall items
          this.wallItems$ = this.wallItemService.getWallItems(this.wallId);
        },
        error: (error) => {
          console.error('Error deleting item:', error);
          alert('Failed to delete item. Please try again.');
        }
      });
    }
  }

  getItemBackgroundColor(wall: Wall): string {
    return wall.theme.cardStyle === 'minimal' 
      ? 'transparent' 
      : 'rgba(255, 255, 255, 0.9)';
  }

  getFieldLabelColor(wall: Wall): string {
    return wall.theme.cardStyle === 'minimal' 
      ? wall.theme.textColor 
      : '#6b7280';
  }

  trackByItemId(index: number, item: WallItem): string {
    return item.id || index.toString();
  }
}