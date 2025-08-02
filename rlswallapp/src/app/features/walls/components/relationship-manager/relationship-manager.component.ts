import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WallObjectType, RelationshipDefinition, EnhancedWallItem } from '../../../../shared/models/wall.model';
import { RelationshipService, RelationshipGraph, RelationshipPath } from '../../services/relationship.service';

export interface RelationshipFormData {
  name: string;
  description: string;
  fromObjectTypeId: string;
  toObjectTypeId: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  bidirectional: boolean;
  required: boolean;
  cascadeDelete: boolean;
}

@Component({
  selector: 'app-relationship-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="relationship-manager">
      <!-- Header -->
      <header class="manager-header">
        <div class="header-content">
          <div class="header-info">
            <h2>Relationship Manager</h2>
            <p>Define and manage relationships between object types</p>
          </div>
          <div class="header-actions">
            <button 
              class="btn-secondary touch-target interactive"
              (click)="toggleView()"
              [title]="currentView() === 'list' ? 'Switch to graph view' : 'Switch to list view'">
              <span class="material-icons md-20">
                {{ currentView() === 'list' ? 'account_tree' : 'list' }}
              </span>
              {{ currentView() === 'list' ? 'Graph View' : 'List View' }}
            </button>
            <button 
              class="btn-primary touch-target interactive"
              (click)="showAddRelationshipForm()"
              [disabled]="!canAddRelationships()">
              <span class="material-icons md-20">add</span>
              Add Relationship
            </button>
          </div>
        </div>
      </header>

      <!-- Relationship Statistics -->
      <div class="relationship-stats" *ngIf="relationshipStats()">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons md-24">account_tree</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ relationshipStats()!.totalRelationships }}</div>
              <div class="stat-label">Total Relationships</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons md-24">hub</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ relationshipDefinitions.length }}</div>
              <div class="stat-label">Relationship Types</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons md-24">connect_without_contact</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ relationshipStats()!.mostConnectedItems.length }}</div>
              <div class="stat-label">Connected Items</div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div class="relationship-list" *ngIf="currentView() === 'list'">
        <h3>Relationship Definitions</h3>
        
        <!-- No Definitions State -->
        <div class="empty-state" *ngIf="relationshipDefinitions.length === 0">
          <div class="empty-icon">
            <span class="material-icons md-48">account_tree</span>
          </div>
          <h4>No relationship types defined</h4>
          <p>Create relationship types to connect your object types together.</p>
          <button 
            class="btn-primary touch-target interactive"
            (click)="showAddRelationshipForm()"
            [disabled]="!canAddRelationships()">
            <span class="material-icons md-20">add</span>
            Create First Relationship Type
          </button>
        </div>

        <!-- Relationship Definition Cards -->
        <div class="definition-cards" *ngIf="relationshipDefinitions.length > 0">
          <div 
            *ngFor="let definition of relationshipDefinitions; trackBy: trackByDefinitionId"
            class="definition-card">
            
            <div class="card-header">
              <div class="definition-info">
                <h4 class="definition-name">{{ definition.name }}</h4>
                <p class="definition-description">{{ definition.description }}</p>
              </div>
              <div class="definition-actions">
                <button 
                  class="btn-icon touch-target interactive"
                  (click)="editRelationshipDefinition(definition)"
                  [title]="'Edit relationship definition'">
                  <span class="material-icons md-18">edit</span>
                </button>
                <button 
                  class="btn-icon touch-target interactive delete-action"
                  (click)="deleteRelationshipDefinition(definition)"
                  [title]="'Delete relationship definition'">
                  <span class="material-icons md-18">delete</span>
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="relationship-visual">
                <div class="object-type from-type">
                  <span class="type-icon material-icons md-20" 
                        [style.color]="getObjectTypeColor(definition.fromObjectTypeId)">
                    {{ getObjectTypeIcon(definition.fromObjectTypeId) }}
                  </span>
                  <span class="type-name">{{ getObjectTypeName(definition.fromObjectTypeId) }}</span>
                </div>
                
                <div class="relationship-connector">
                  <div class="connector-line" 
                       [class.bidirectional]="definition.bidirectional">
                  </div>
                  <div class="relationship-type">
                    {{ definition.relationshipType }}
                  </div>
                  <span class="material-icons connector-icon">
                    {{ definition.bidirectional ? 'sync_alt' : 'arrow_forward' }}
                  </span>
                </div>
                
                <div class="object-type to-type">
                  <span class="type-icon material-icons md-20" 
                        [style.color]="getObjectTypeColor(definition.toObjectTypeId)">
                    {{ getObjectTypeIcon(definition.toObjectTypeId) }}
                  </span>
                  <span class="type-name">{{ getObjectTypeName(definition.toObjectTypeId) }}</span>
                </div>
              </div>

              <div class="relationship-properties">
                <div class="property-item" *ngIf="definition.required">
                  <span class="material-icons md-16">star</span>
                  <span>Required</span>
                </div>
                <div class="property-item" *ngIf="definition.bidirectional">
                  <span class="material-icons md-16">sync_alt</span>
                  <span>Bidirectional</span>
                </div>
                <div class="property-item" *ngIf="definition.cascadeDelete">
                  <span class="material-icons md-16">delete_sweep</span>
                  <span>Cascade Delete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Graph View -->
      <div class="relationship-graph" *ngIf="currentView() === 'graph'">
        <h3>Relationship Graph</h3>
        
        <div class="graph-container">
          <div class="graph-canvas" #graphCanvas>
            <!-- Graph visualization would go here -->
            <!-- For now, showing a placeholder -->
            <div class="graph-placeholder">
              <span class="material-icons md-48">account_tree</span>
              <p>Interactive relationship graph visualization</p>
              <p class="placeholder-note">Graph visualization will be implemented with D3.js or similar library</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Relationship Form -->
      <div class="relationship-form-overlay" *ngIf="showForm()" (click)="hideForm()">
        <div class="relationship-form-container" (click)="$event.stopPropagation()">
          <form [formGroup]="relationshipForm" (ngSubmit)="onSubmitRelationship()">
            <div class="form-header">
              <h3>{{ editingDefinition() ? 'Edit' : 'Add' }} Relationship Type</h3>
              <button 
                type="button" 
                class="btn-icon touch-target interactive"
                (click)="hideForm()">
                <span class="material-icons md-24">close</span>
              </button>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-field">
                  <label for="name">Relationship Name *</label>
                  <input 
                    id="name"
                    type="text" 
                    formControlName="name"
                    placeholder="e.g., 'served in', 'worked at', 'attended'"
                    class="form-input">
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label for="description">Description</label>
                  <textarea 
                    id="description"
                    formControlName="description"
                    placeholder="Describe this relationship..."
                    class="form-textarea"
                    rows="3">
                  </textarea>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label for="fromObjectType">From Object Type *</label>
                  <select 
                    id="fromObjectType"
                    formControlName="fromObjectTypeId"
                    class="form-select">
                    <option value="">Select object type...</option>
                    <option 
                      *ngFor="let objectType of objectTypes" 
                      [value]="objectType.id">
                      {{ objectType.name }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label for="toObjectType">To Object Type *</label>
                  <select 
                    id="toObjectType"
                    formControlName="toObjectTypeId"
                    class="form-select">
                    <option value="">Select object type...</option>
                    <option 
                      *ngFor="let objectType of objectTypes" 
                      [value]="objectType.id">
                      {{ objectType.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label for="relationshipType">Relationship Type *</label>
                  <select 
                    id="relationshipType"
                    formControlName="relationshipType"
                    class="form-select">
                    <option value="one-to-one">One to One</option>
                    <option value="one-to-many">One to Many</option>
                    <option value="many-to-many">Many to Many</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      formControlName="bidirectional"
                      class="checkbox-input">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Bidirectional relationship</span>
                  </label>
                  
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      formControlName="required"
                      class="checkbox-input">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Required relationship</span>
                  </label>
                  
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      formControlName="cascadeDelete"
                      class="checkbox-input">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Cascade delete</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary touch-target interactive"
                (click)="hideForm()">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn-primary touch-target interactive"
                [disabled]="relationshipForm.invalid || isSubmitting()">
                {{ isSubmitting() ? 'Saving...' : (editingDefinition() ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .relationship-manager {
      background: var(--md-sys-color-surface-container-lowest);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: var(--md-sys-spacing-xl);
      margin: var(--md-sys-spacing-lg);
    }

    /* Header */
    .manager-header {
      margin-bottom: var(--md-sys-spacing-xl);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--md-sys-spacing-lg);
    }

    .header-info h2 {
      margin: 0 0 var(--md-sys-spacing-sm) 0;
      font-family: var(--md-sys-typescale-headline-medium-font-family);
      font-size: var(--md-sys-typescale-headline-medium-font-size);
      color: var(--md-sys-color-on-surface);
    }

    .header-info p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
    }

    .header-actions {
      display: flex;
      gap: var(--md-sys-spacing-md);
      flex-shrink: 0;
    }

    /* Statistics */
    .relationship-stats {
      margin-bottom: var(--md-sys-spacing-xl);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--md-sys-spacing-lg);
    }

    .stat-card {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-large);
      padding: var(--md-sys-spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-md);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .stat-icon {
      color: var(--md-sys-color-primary);
    }

    .stat-value {
      font-family: var(--md-sys-typescale-headline-small-font-family);
      font-size: var(--md-sys-typescale-headline-small-font-size);
      font-weight: var(--md-sys-typescale-headline-small-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    .stat-label {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      color: var(--md-sys-color-on-surface-variant);
    }

    /* List View */
    .relationship-list h3 {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      color: var(--md-sys-color-on-surface);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: var(--md-sys-spacing-xxl);
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-large);
      border: 2px dashed var(--md-sys-color-outline-variant);
    }

    .empty-icon {
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: var(--md-sys-spacing-lg);
    }

    .empty-state h4 {
      margin: 0 0 var(--md-sys-spacing-sm) 0;
      color: var(--md-sys-color-on-surface);
    }

    .empty-state p {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Definition Cards */
    .definition-cards {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-lg);
    }

    .definition-card {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-large);
      padding: var(--md-sys-spacing-lg);
      box-shadow: var(--md-sys-elevation-level1);
      border: 1px solid var(--md-sys-color-outline-variant);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--md-sys-spacing-md);
    }

    .definition-name {
      margin: 0;
      font-family: var(--md-sys-typescale-title-medium-font-family);
      font-size: var(--md-sys-typescale-title-medium-font-size);
      color: var(--md-sys-color-on-surface);
    }

    .definition-description {
      margin: var(--md-sys-spacing-xs) 0 0 0;
      color: var(--md-sys-color-on-surface-variant);
    }

    .definition-actions {
      display: flex;
      gap: var(--md-sys-spacing-sm);
    }

    .delete-action:hover {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }

    /* Relationship Visual */
    .relationship-visual {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-lg);
      margin-bottom: var(--md-sys-spacing-md);
    }

    .object-type {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
      background: var(--md-sys-color-surface-container-highest);
      padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
      border-radius: var(--md-sys-shape-corner-medium);
      flex: 1;
    }

    .type-name {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      color: var(--md-sys-color-on-surface);
    }

    .relationship-connector {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--md-sys-spacing-xs);
      position: relative;
      flex: 2;
    }

    .connector-line {
      width: 100%;
      height: 2px;
      background: var(--md-sys-color-primary);
      position: relative;
    }

    .connector-line::after {
      content: '';
      position: absolute;
      right: -4px;
      top: -2px;
      width: 0;
      height: 0;
      border-left: 6px solid var(--md-sys-color-primary);
      border-top: 3px solid transparent;
      border-bottom: 3px solid transparent;
    }

    .connector-line.bidirectional::before {
      content: '';
      position: absolute;
      left: -4px;
      top: -2px;
      width: 0;
      height: 0;
      border-right: 6px solid var(--md-sys-color-primary);
      border-top: 3px solid transparent;
      border-bottom: 3px solid transparent;
    }

    .relationship-type {
      font-family: var(--md-sys-typescale-label-small-font-family);
      font-size: var(--md-sys-typescale-label-small-font-size);
      color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
      padding: 2px 6px;
      border-radius: var(--md-sys-shape-corner-small);
    }

    .connector-icon {
      color: var(--md-sys-color-primary);
    }

    /* Relationship Properties */
    .relationship-properties {
      display: flex;
      gap: var(--md-sys-spacing-md);
      flex-wrap: wrap;
    }

    .property-item {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-xs);
      background: var(--md-sys-color-secondary-container);
      color: var(--md-sys-color-on-secondary-container);
      padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
      border-radius: var(--md-sys-shape-corner-small);
      font-family: var(--md-sys-typescale-label-small-font-family);
      font-size: var(--md-sys-typescale-label-small-font-size);
    }

    /* Graph View */
    .relationship-graph h3 {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      color: var(--md-sys-color-on-surface);
    }

    .graph-container {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-large);
      height: 500px;
      overflow: hidden;
    }

    .graph-canvas {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .graph-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
    }

    .placeholder-note {
      font-style: italic;
      margin-top: var(--md-sys-spacing-sm);
    }

    /* Form Overlay */
    .relationship-form-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--md-sys-spacing-lg);
    }

    .relationship-form-container {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-extra-large);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--md-sys-elevation-level4);
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--md-sys-spacing-xl);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .form-header h3 {
      margin: 0;
      color: var(--md-sys-color-on-surface);
    }

    .form-content {
      padding: var(--md-sys-spacing-xl);
    }

    .form-row {
      display: flex;
      gap: var(--md-sys-spacing-lg);
      margin-bottom: var(--md-sys-spacing-lg);
    }

    .form-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-sm);
    }

    .form-field label {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface);
      font-weight: 500;
    }

    .form-input, .form-textarea, .form-select {
      padding: var(--md-sys-spacing-md);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      font-family: var(--md-sys-typescale-body-large-font-family);
      font-size: var(--md-sys-typescale-body-large-font-size);
      background: var(--md-sys-color-surface-container-highest);
      color: var(--md-sys-color-on-surface);
      transition: border-color var(--md-sys-motion-duration-short2);
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      border-width: 2px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-md);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-sm);
      cursor: pointer;
    }

    .checkbox-input {
      display: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--md-sys-motion-duration-short2);
    }

    .checkbox-input:checked + .checkbox-custom {
      background: var(--md-sys-color-primary);
      border-color: var(--md-sys-color-primary);
    }

    .checkbox-input:checked + .checkbox-custom::after {
      content: '✓';
      color: var(--md-sys-color-on-primary);
      font-size: 14px;
      font-weight: bold;
    }

    .checkbox-text {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      color: var(--md-sys-color-on-surface);
    }

    .form-actions {
      padding: var(--md-sys-spacing-xl);
      border-top: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      gap: var(--md-sys-spacing-md);
      justify-content: flex-end;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .relationship-visual {
        flex-direction: column;
        gap: var(--md-sys-spacing-md);
      }

      .form-row {
        flex-direction: column;
      }

      .relationship-form-container {
        margin: var(--md-sys-spacing-md);
        max-height: calc(100vh - 32px);
      }
    }
  `]
})
export class RelationshipManagerComponent implements OnInit {
  @Input() wallId!: string;
  @Input() objectTypes: WallObjectType[] = [];
  @Input() relationshipDefinitions: RelationshipDefinition[] = [];
  @Input() wallItems: EnhancedWallItem[] = [];

  @Output() relationshipDefinitionAdded = new EventEmitter<RelationshipDefinition>();
  @Output() relationshipDefinitionUpdated = new EventEmitter<RelationshipDefinition>();
  @Output() relationshipDefinitionDeleted = new EventEmitter<string>();

  // Component state
  currentView = signal<'list' | 'graph'>('list');
  showForm = signal(false);
  isSubmitting = signal(false);
  editingDefinition = signal<RelationshipDefinition | null>(null);
  
  // Computed properties
  relationshipStats = signal<{
    totalRelationships: number;
    mostConnectedItems: { itemId: string; connectionCount: number }[];
  } | null>(null);

  relationshipForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private relationshipService: RelationshipService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadRelationshipStatistics();
  }

  private initializeForm(): void {
    this.relationshipForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      fromObjectTypeId: ['', Validators.required],
      toObjectTypeId: ['', Validators.required],
      relationshipType: ['one-to-many', Validators.required],
      bidirectional: [false],
      required: [false],
      cascadeDelete: [false]
    });
  }

  private loadRelationshipStatistics(): void {
    if (!this.wallId) return;

    this.relationshipService.getRelationshipStatistics(this.wallId).subscribe({
      next: (stats) => {
        this.relationshipStats.set(stats);
      },
      error: (error) => {
        console.error('Error loading relationship statistics:', error);
      }
    });
  }

  toggleView(): void {
    this.currentView.update(view => view === 'list' ? 'graph' : 'list');
  }

  canAddRelationships(): boolean {
    return this.objectTypes.length >= 2;
  }

  showAddRelationshipForm(): void {
    this.editingDefinition.set(null);
    this.relationshipForm.reset({
      relationshipType: 'one-to-many',
      bidirectional: false,
      required: false,
      cascadeDelete: false
    });
    this.showForm.set(true);
  }

  editRelationshipDefinition(definition: RelationshipDefinition): void {
    this.editingDefinition.set(definition);
    this.relationshipForm.patchValue({
      name: definition.name,
      description: definition.description,
      fromObjectTypeId: definition.fromObjectTypeId,
      toObjectTypeId: definition.toObjectTypeId,
      relationshipType: definition.relationshipType,
      bidirectional: definition.bidirectional,
      required: definition.required,
      cascadeDelete: definition.cascadeDelete
    });
    this.showForm.set(true);
  }

  deleteRelationshipDefinition(definition: RelationshipDefinition): void {
    if (confirm(`Are you sure you want to delete the relationship "${definition.name}"? This action cannot be undone.`)) {
      this.relationshipDefinitionDeleted.emit(definition.id);
    }
  }

  hideForm(): void {
    this.showForm.set(false);
    this.editingDefinition.set(null);
    this.relationshipForm.reset();
  }

  onSubmitRelationship(): void {
    if (this.relationshipForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.relationshipForm.value as RelationshipFormData;
    
    const relationshipDefinition: RelationshipDefinition = {
      id: this.editingDefinition()?.id || this.generateId(),
      name: formData.name,
      description: formData.description,
      fromObjectTypeId: formData.fromObjectTypeId,
      toObjectTypeId: formData.toObjectTypeId,
      relationshipType: formData.relationshipType,
      bidirectional: formData.bidirectional,
      required: formData.required,
      cascadeDelete: formData.cascadeDelete
    };

    if (this.editingDefinition()) {
      this.relationshipDefinitionUpdated.emit(relationshipDefinition);
    } else {
      this.relationshipDefinitionAdded.emit(relationshipDefinition);
    }

    this.isSubmitting.set(false);
    this.hideForm();
  }

  getObjectTypeName(objectTypeId: string): string {
    const objectType = this.objectTypes.find(ot => ot.id === objectTypeId);
    return objectType?.name || 'Unknown';
  }

  getObjectTypeIcon(objectTypeId: string): string {
    const objectType = this.objectTypes.find(ot => ot.id === objectTypeId);
    return objectType?.icon || 'folder';
  }

  getObjectTypeColor(objectTypeId: string): string {
    const objectType = this.objectTypes.find(ot => ot.id === objectTypeId);
    return objectType?.color || '#6366f1';
  }

  trackByDefinitionId(index: number, definition: RelationshipDefinition): string {
    return definition.id;
  }

  private generateId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}