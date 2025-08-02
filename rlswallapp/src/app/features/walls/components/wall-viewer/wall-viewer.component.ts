import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { WallItemService } from '../../../wall-items/services/wall-item.service';
import { ImageUploadService } from '../../../wall-items/services/image-upload.service';
import { ItemImageGalleryComponent } from '../../../wall-items/components/item-image-gallery/item-image-gallery.component';
import { MapViewComponent } from '../../../maps/components/map-view/map-view.component';
import { Wall, WallItem, WallViewMode, FieldDefinition, WallItemImage } from '../../../../shared/models/wall.model';

@Component({
  selector: 'app-wall-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ItemImageGalleryComponent, MapViewComponent],
  template: `
    <div class="wall-viewer" *ngIf="wall$ | async as wall">
      <!-- Clean header with just actions -->
      <header class="wall-header">
        <div class="header-content">
          <div class="wall-description" *ngIf="wall.description">
            <p [style.color]="wall.theme.bodyTextColor">{{ wall.description }}</p>
          </div>
          <div class="header-actions">
            <button 
              *ngIf="wall.fields && wall.fields.length > 0"
              (click)="showAddItemForm()" 
              class="btn-primary touch-target interactive focusable add-item-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              <span class="material-icons md-20">add</span>
              Add Item
            </button>
            <button 
              (click)="toggleMapView()" 
              class="btn-secondary touch-target interactive focusable map-toggle-button"
              [class.active]="showMapView"
              [style.background-color]="showMapView ? wall.theme.primaryColor : 'transparent'"
              [style.color]="showMapView ? 'white' : wall.theme.primaryColor"
            >
              <span class="material-icons md-20">{{ showMapView ? 'list' : 'map' }}</span>
              {{ showMapView ? 'List View' : 'Map View' }}
            </button>
            <a [routerLink]="['/walls', wall.id, 'edit']" class="btn-secondary touch-target interactive focusable settings-button">
              <span class="material-icons md-24">settings</span>
            </a>
          </div>
        </div>
      </header>

      <!-- Add Item Form -->
      <div class="add-item-section" *ngIf="showAddForm && wall.fields && wall.fields.length > 0">
        <form 
          [formGroup]="addItemForm" 
          (ngSubmit)="onAddItem()"
          class="add-item-form"
        >
          <h3>Add New Item</h3>
          <div class="form-fields">
            <div *ngFor="let field of wall.fields" class="form-field">
              <label>
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
            <button type="button" (click)="cancelAddItem()" class="btn-secondary touch-target interactive cancel-button">
              <span class="material-icons md-18">close</span>
              Cancel
            </button>
            <button 
              type="submit" 
              [disabled]="addItemForm.invalid"
              class="btn-primary touch-target interactive save-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              <span class="material-icons md-18">check</span>
              Add Item
            </button>
          </div>
        </form>
      </div>

      <!-- Map View -->
      <div class="map-section" *ngIf="showMapView && (wallItems$ | async) as items">
        <app-map-view
          [wallItems]="items"
          [objectTypes]="wall.objectTypes"
          [height]="'60vh'"
          [showControls]="true"
          (itemClick)="onMapItemClick($event)">
        </app-map-view>
      </div>

      <!-- Wall Items -->
      <div class="wall-content" *ngIf="!showMapView && (wallItems$ | async) as items">
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
            [style.color]="wall.theme.bodyTextColor"
          >
            <div class="item-actions">
              <button (click)="editItem(item)" class="edit-item-button">
                <span class="material-icons md-18">edit</span>
              </button>
              <button (click)="deleteItem(item.id!)" class="delete-item-button">
                <span class="material-icons md-18">delete</span>
              </button>
            </div>

            <!-- Image Gallery Section -->
            <div class="item-images" *ngIf="item.images && item.images.length > 0">
              <app-item-image-gallery
                [images]="item.images"
                [showControls]="true"
                [maxImages]="10"
                (imageAdded)="onImageAdded(item)"
                (imageEdited)="onImageEdited($event, item)"
                (imageDeleted)="onImageDeleted($event, item)"
                (primaryImageChanged)="onPrimaryImageChanged($event, item)">
              </app-item-image-gallery>
            </div>

            <div class="item-content">
              <div *ngFor="let field of wall.fields" class="item-field">
                <label class="field-label" [style.color]="getFieldLabelColor(wall)">
                  {{ field.name }}
                </label>
                <div class="field-value" [style.color]="wall.theme.bodyTextColor">
                  <ng-container [ngSwitch]="field.type">
                    <span *ngSwitchCase="'date'">
                      {{ getFieldData(item, field.id) | date:'mediumDate' }}
                    </span>
                    <span *ngSwitchCase="'email'">
                      <a [href]="'mailto:' + getFieldData(item, field.id)" [style.color]="wall.theme.primaryColor">
                        {{ getFieldData(item, field.id) }}
                      </a>
                    </span>
                    <span *ngSwitchCase="'url'">
                      <a [href]="getFieldData(item, field.id)" target="_blank" [style.color]="wall.theme.primaryColor">
                        {{ getFieldData(item, field.id) }}
                      </a>
                    </span>
                    <span *ngSwitchCase="'longtext'" class="long-text">
                      {{ getFieldData(item, field.id) }}
                    </span>
                    <span *ngSwitchDefault>
                      {{ getFieldData(item, field.id) }}
                    </span>
                  </ng-container>
                </div>
              </div>
            </div>

            <!-- Add Images Button for items without images -->
            <div class="add-images-section" *ngIf="!item.images || item.images.length === 0">
              <button 
                class="btn-outline touch-target interactive add-images-button"
                (click)="onImageAdded(item)"
                [title]="'Add images to this item'">
                <span class="material-icons md-20">add_photo_alternate</span>
                Add Images
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="items.length === 0" [style.color]="wall.theme.bodyTextColor">
            <div class="empty-icon">📝</div>
            <h3>No items yet</h3>
            <p *ngIf="wall.fields && wall.fields.length > 0">Add your first item to get started.</p>
            <p *ngIf="!wall.fields || wall.fields.length === 0">Set up fields first to start adding content.</p>
            <button 
              *ngIf="wall.fields && wall.fields.length > 0"
              (click)="showAddItemForm()"
              class="btn-primary touch-target interactive add-first-item-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              Add First Item
            </button>
            <a 
              *ngIf="!wall.fields || wall.fields.length === 0"
              [routerLink]="['/walls', wall.id, 'edit']"
              class="btn-primary touch-target interactive setup-fields-button"
              [style.background-color]="wall.theme.primaryColor"
            >
              Set Up Fields First
            </a>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading" [style.color]="wall.theme.bodyTextColor">
        <div class="loading-spinner"></div>
        <p>Loading wall items...</p>
      </div>
    </div>
  `,
  styles: [`
    .wall-viewer {
      min-height: 100vh;
      background: var(--md-sys-color-surface-container-lowest);
      font-family: var(--md-sys-typescale-body-large-font-family);
    }

    .wall-header {
      background: var(--md-sys-color-surface);
      padding: var(--md-sys-spacing-lg);
      margin-bottom: var(--md-sys-spacing-md);
      box-shadow: var(--md-sys-elevation-level1);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      gap: var(--md-sys-spacing-lg);
    }

    .wall-description {
      flex: 1;
      min-width: 0;
    }

    .wall-description p {
      margin: 0;
      font-family: var(--md-sys-typescale-body-large-font-family);
      font-size: var(--md-sys-typescale-body-large-font-size);
      font-weight: var(--md-sys-typescale-body-large-font-weight);
      line-height: var(--md-sys-typescale-body-large-line-height);
      letter-spacing: var(--md-sys-typescale-body-large-letter-spacing);
      opacity: 0.87;
    }

    .header-actions {
      display: flex;
      gap: var(--md-sys-spacing-md);
      align-items: center;
      flex-shrink: 0;
    }

    .mode-toggle {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
    }

    .settings-button {
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }

    .add-item-section {
      max-width: 1200px;
      margin: 0 auto var(--md-sys-spacing-xl);
    }

    .add-item-button {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
    }

    .add-item-form {
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: var(--md-sys-spacing-xl);
      margin-top: var(--md-sys-spacing-lg);
      box-shadow: var(--md-sys-elevation-level2);
    }

    .add-item-form h3 {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      font-family: var(--md-sys-typescale-headline-small-font-family);
      font-size: var(--md-sys-typescale-headline-small-font-size);
      font-weight: var(--md-sys-typescale-headline-small-font-weight);
      line-height: var(--md-sys-typescale-headline-small-line-height);
      letter-spacing: var(--md-sys-typescale-headline-small-letter-spacing);
      color: var(--md-sys-color-on-surface);
    }

    .form-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--md-sys-spacing-lg);
      margin-bottom: var(--md-sys-spacing-xl);
    }

    .form-field label {
      display: block;
      margin-bottom: var(--md-sys-spacing-sm);
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      font-weight: var(--md-sys-typescale-body-medium-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    .form-input, .form-textarea {
      width: 100%;
      padding: var(--md-sys-spacing-md);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      font-family: var(--md-sys-typescale-body-large-font-family);
      font-size: var(--md-sys-typescale-body-large-font-size);
      background: var(--md-sys-color-surface-container-highest);
      color: var(--md-sys-color-on-surface);
      box-sizing: border-box;
      transition: border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
      min-height: var(--md-sys-touch-target-min);
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }

    .form-textarea {
      resize: vertical;
      min-height: calc(var(--md-sys-touch-target-min) * 2);
    }

    .form-actions {
      display: flex;
      gap: var(--md-sys-spacing-md);
      justify-content: flex-end;
      align-items: center;
    }

    .cancel-button, .save-button {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
    }

    .wall-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--md-sys-spacing-lg);
    }

    .items-container {
      display: grid;
      gap: var(--md-sys-spacing-lg);
    }

    /* Layout Styles */
    .grid-layout {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }

    .list-layout {
      grid-template-columns: 1fr;
    }

    .masonry-layout {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }

    .timeline-layout {
      grid-template-columns: 1fr;
    }

    /* Spacing Styles */
    .compact-spacing {
      gap: var(--md-sys-spacing-md);
    }

    .comfortable-spacing {
      gap: var(--md-sys-spacing-lg);
    }

    .spacious-spacing {
      gap: var(--md-sys-spacing-xl);
    }

    .wall-item {
      position: relative;
      padding: var(--md-sys-spacing-xl);
      border-radius: var(--md-sys-shape-corner-extra-large);
      background: var(--md-sys-color-surface-container);
      border: 1px solid var(--md-sys-color-outline-variant);
      transition: all var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
      box-shadow: var(--md-sys-elevation-level1);
      overflow: hidden;
    }

    .wall-item:hover {
      transform: translateY(-4px);
      box-shadow: var(--md-sys-elevation-level3);
      border-color: var(--md-sys-color-primary);
    }

    .wall-item:active {
      transform: translateY(-1px);
      box-shadow: var(--md-sys-elevation-level2);
    }

    /* Card Styles */
    .card-minimal {
      border: none;
      box-shadow: none;
      background: transparent;
    }

    .card-minimal:hover {
      background: var(--md-sys-color-surface-container-lowest);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .card-bordered {
      border: 2px solid var(--md-sys-color-outline);
      box-shadow: none;
    }

    .card-bordered:hover {
      border-color: var(--md-sys-color-primary);
      box-shadow: var(--md-sys-elevation-level2);
    }

    .card-elevated {
      box-shadow: var(--md-sys-elevation-level2);
      border: none;
    }

    .card-elevated:hover {
      box-shadow: var(--md-sys-elevation-level4);
    }

    .card-rounded {
      border-radius: var(--md-sys-shape-corner-extra-large);
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
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border: 1px solid var(--md-sys-color-outline);
      width: var(--md-sys-touch-target-min);
      height: var(--md-sys-touch-target-min);
      border-radius: var(--md-sys-shape-corner-full);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .edit-item-button:hover {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border-color: var(--md-sys-color-primary);
      transform: translateY(-1px);
      box-shadow: var(--md-sys-elevation-level2);
    }

    .delete-item-button:hover {
      background: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
      border-color: var(--md-sys-color-error);
      transform: translateY(-1px);
      box-shadow: var(--md-sys-elevation-level2);
    }

    .item-images {
      margin-bottom: var(--md-sys-spacing-lg);
    }

    .item-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .add-images-section {
      margin-top: var(--md-sys-spacing-md);
      padding-top: var(--md-sys-spacing-md);
      border-top: 1px dashed var(--md-sys-color-outline-variant);
      display: flex;
      justify-content: center;
    }

    .add-images-button {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
      opacity: 0.7;
      transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .add-images-button:hover {
      opacity: 1;
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
      padding: var(--md-sys-spacing-xxl) var(--md-sys-spacing-xl);
      background: var(--md-sys-color-surface-container-lowest);
      border-radius: var(--md-sys-shape-corner-extra-large);
      border: 2px dashed var(--md-sys-color-outline-variant);
      margin: var(--md-sys-spacing-lg) 0;
    }

    .empty-icon {
      font-size: 6rem;
      margin-bottom: var(--md-sys-spacing-lg);
      opacity: 0.6;
      display: block;
      line-height: 1;
    }

    .empty-state h3 {
      margin: 0 0 var(--md-sys-spacing-md) 0;
      font-family: var(--md-sys-typescale-headline-medium-font-family);
      font-size: var(--md-sys-typescale-headline-medium-font-size);
      font-weight: var(--md-sys-typescale-headline-medium-font-weight);
      line-height: var(--md-sys-typescale-headline-medium-line-height);
      letter-spacing: var(--md-sys-typescale-headline-medium-letter-spacing);
      color: var(--md-sys-color-on-surface);
    }

    .empty-state p {
      margin: 0 0 var(--md-sys-spacing-xl) 0;
      font-family: var(--md-sys-typescale-body-large-font-family);
      font-size: var(--md-sys-typescale-body-large-font-size);
      font-weight: var(--md-sys-typescale-body-large-font-weight);
      line-height: var(--md-sys-typescale-body-large-line-height);
      letter-spacing: var(--md-sys-typescale-body-large-letter-spacing);
      color: var(--md-sys-color-on-surface-variant);
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .add-first-item-button, .setup-fields-button {
      text-decoration: none;
    }

    .loading-state {
      text-align: center;
      padding: var(--md-sys-spacing-xxl) var(--md-sys-spacing-xl);
      background: var(--md-sys-color-surface-container-lowest);
      border-radius: var(--md-sys-shape-corner-extra-large);
      margin: var(--md-sys-spacing-lg) 0;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid var(--md-sys-color-outline-variant);
      border-top-color: var(--md-sys-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto var(--md-sys-spacing-lg);
    }

    .loading-state p {
      font-family: var(--md-sys-typescale-body-large-font-family);
      font-size: var(--md-sys-typescale-body-large-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
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

    /* Map Section */
    .map-section {
      margin: 24px;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .map-toggle-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border: 2px solid;
      border-radius: 12px;
      background: transparent;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .map-toggle-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .map-toggle-button.active {
      border-color: transparent;
    }

    .map-toggle-button .material-icons {
      transition: transform 0.2s ease;
    }

    .map-toggle-button:hover .material-icons {
      transform: scale(1.1);
    }

    @media (max-width: 768px) {
      .map-section {
        margin: 16px;
        border-radius: 12px;
      }

      .header-actions {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .map-toggle-button {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class WallViewerComponent implements OnInit {
  wall$!: Observable<Wall | null>;
  wallItems$!: Observable<WallItem[]>;
  showAddForm = false;
  addItemForm!: FormGroup;
  isLoading = true;
  wallId!: string;
  showMapView = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private imageUploadService: ImageUploadService,
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
          this.initializeAddItemForm(wall.fields || []);
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
        objectTypeId: 'default-type', // TODO: Get from selected object type
        fieldData: this.addItemForm.value,
        data: this.addItemForm.value, // Legacy compatibility
        images: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user', // TODO: Get from auth service
        updatedBy: 'current-user'  // TODO: Get from auth service
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
      ? wall.theme.bodyTextColor 
      : '#6b7280';
  }

  trackByItemId(index: number, item: WallItem): string {
    return item.id || index.toString();
  }

  // Image handling methods
  onImageAdded(item: WallItem): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      if (files && files.length > 0) {
        this.uploadImages(files, item);
      }
    };
    
    input.click();
  }

  onImageEdited(image: WallItemImage, item: WallItem): void {
    // TODO: Implement image editing dialog
    const newCaption = prompt('Enter image caption:', image.caption || '');
    if (newCaption !== null) {
      const updatedImage: WallItemImage = {
        ...image,
        caption: newCaption
      };
      
      this.updateItemImage(item, updatedImage);
    }
  }

  onImageDeleted(image: WallItemImage, item: WallItem): void {
    // Remove image from Firebase Storage
    this.imageUploadService.deleteImage(image.url).subscribe({
      next: () => {
        // Remove image from item
        const currentImages = item.images || [];
        const updatedImages = currentImages.filter(img => img.id !== image.id);
        const updatedItem: WallItem = {
          ...item,
          images: updatedImages,
          primaryImageId: image.isPrimary ? undefined : item.primaryImageId
        };
        
        this.updateWallItem(updatedItem);
      },
      error: (error) => {
        console.error('Error deleting image:', error);
        alert('Failed to delete image. Please try again.');
      }
    });
  }

  onPrimaryImageChanged(image: WallItemImage, item: WallItem): void {
    // Update all images to mark only this one as primary
    const currentImages = item.images || [];
    const updatedImages = currentImages.map(img => ({
      ...img,
      isPrimary: img.id === image.id
    }));
    
    const updatedItem: WallItem = {
      ...item,
      images: updatedImages,
      primaryImageId: image.id
    };
    
    this.updateWallItem(updatedItem);
  }

  private uploadImages(files: FileList, item: WallItem): void {
    const fileArray = Array.from(files);
    
    // Validate each file
    for (const file of fileArray) {
      const validation = this.imageUploadService.validateImage(file);
      if (!validation.isValid) {
        alert(`Invalid file ${file.name}: ${validation.errors.join(', ')}`);
        return;
      }
    }
    
    // Upload images
    this.imageUploadService.uploadMultipleImages(
      files,
      this.wallId,
      item.id!,
      (fileIndex, progress) => {
        // TODO: Show upload progress
        console.log(`File ${fileIndex} upload progress: ${progress}%`);
      }
    ).subscribe({
      next: (uploadedImages) => {
        // Add uploaded images to item
        const currentImages = item.images || [];
        const updatedImages = [...currentImages, ...uploadedImages];
        
        // If this is the first image, make it primary
        if (currentImages.length === 0 && uploadedImages.length > 0) {
          uploadedImages[0].isPrimary = true;
        }
        
        const updatedItem: WallItem = {
          ...item,
          images: updatedImages,
          primaryImageId: currentImages.length === 0 ? uploadedImages[0]?.id : item.primaryImageId
        };
        
        this.updateWallItem(updatedItem);
      },
      error: (error) => {
        console.error('Error uploading images:', error);
        alert('Failed to upload images. Please try again.');
      }
    });
  }

  private updateItemImage(item: WallItem, updatedImage: WallItemImage): void {
    const currentImages = item.images || [];
    const updatedImages = currentImages.map(img => 
      img.id === updatedImage.id ? updatedImage : img
    );
    
    const updatedItem: WallItem = {
      ...item,
      images: updatedImages
    };
    
    this.updateWallItem(updatedItem);
  }

  private updateWallItem(updatedItem: WallItem): void {
    this.wallItemService.updateWallItem(updatedItem.id!, updatedItem).subscribe({
      next: () => {
        // Refresh the wall items
        this.wallItems$ = this.wallItemService.getWallItems(this.wallId);
      },
      error: (error) => {
        console.error('Error updating wall item:', error);
        alert('Failed to update item. Please try again.');
      }
    });
  }

  /**
   * Helper method to safely get field data from item
   * Handles both new fieldData structure and legacy data structure
   */
  getFieldData(item: WallItem, fieldId: string): any {
    const fieldData = item.fieldData || item.data || {};
    return fieldData[fieldId];
  }

  /**
   * Helper method to safely get item images
   */
  getItemImages(item: WallItem): WallItemImage[] {
    return item.images || [];
  }

  /**
   * Helper method to check if item has images
   */
  hasImages(item: WallItem): boolean {
    return !!(item.images && item.images.length > 0);
  }

  // Map-related methods
  toggleMapView(): void {
    this.showMapView = !this.showMapView;
  }

  onMapItemClick(event: any): void {
    // Handle map item click - could open a detail modal or scroll to item
    console.log('Map item clicked:', event);
    // For now, just switch back to list view and scroll to the item
    this.showMapView = false;
    // You could implement scrolling to the specific item here
  }
}