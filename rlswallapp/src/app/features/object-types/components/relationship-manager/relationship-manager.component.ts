import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { WallObjectType, RelationshipDefinition } from '../../../../shared/models/wall.model';
import { ObjectTypeManagementService } from '../../../../shared/services/object-type-management.service';

export interface RelationshipTemplate {
  id: string;
  name: string;
  description: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  bidirectional: boolean;
  cascadeDelete: boolean;
  examples: string[];
}

@Component({
  selector: 'app-relationship-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    MatDialogModule,
    DragDropModule
  ],
  template: `
    <div class="relationship-manager">
      <mat-card class="manager-header">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>device_hub</mat-icon>
            Relationship Manager
          </mat-card-title>
          <mat-card-subtitle>
            Define how objects connect and relate to each other
          </mat-card-subtitle>
          <div class="header-actions">
            <button mat-raised-button color="primary" 
                    (click)="addRelationship()" 
                    [disabled]="!canAddRelationship">
              <mat-icon>add</mat-icon>
              Add Relationship
            </button>
            <button mat-icon-button [matMenuTriggerFor]="templatesMenu" 
                    matTooltip="Use relationship template">
              <mat-icon>library_add</mat-icon>
            </button>
            <mat-menu #templatesMenu="matMenu">
              @for (template of relationshipTemplates; track template.id) {
                <button mat-menu-item (click)="addFromTemplate(template)">
                  <mat-icon>{{getRelationshipIcon(template.relationshipType)}}</mat-icon>
                  <div class="template-menu-item">
                    <span class="template-name">{{template.name}}</span>
                    <span class="template-description">{{template.description}}</span>
                  </div>
                </button>
              }
            </mat-menu>
          </div>
        </mat-card-header>
      </mat-card>

      <form [formGroup]="relationshipsForm">
        <!-- Relationship Overview -->
        <mat-card class="overview-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>analytics</mat-icon>
              Relationship Overview
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="overview-stats">
              <div class="stat-item">
                <div class="stat-number">{{relationshipsArray.length}}</div>
                <div class="stat-label">Total Relationships</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{bidirectionalCount}}</div>
                <div class="stat-label">Bidirectional</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{cascadeDeleteCount}}</div>
                <div class="stat-label">With Cascade Delete</div>
              </div>
            </div>

            @if (availableObjectTypes.length < 2) {
              <div class="warning-message">
                <mat-icon>warning</mat-icon>
                <div>
                  <strong>Not enough object types</strong>
                  <p>You need at least 2 object types to create relationships. Add more object types first.</p>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Relationships List -->
        <mat-card class="relationships-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>link</mat-icon>
              Relationships ({{relationshipsArray.length}})
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (relationshipsArray.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">device_hub</mat-icon>
                <h3>No relationships defined</h3>
                <p>Create relationships to connect different types of objects in meaningful ways.</p>
                <div class="empty-actions">
                  <button mat-raised-button color="primary" 
                          (click)="addRelationship()" 
                          [disabled]="!canAddRelationship">
                    <mat-icon>add</mat-icon>
                    Create Your First Relationship
                  </button>
                  <button mat-button (click)="showExamples()">
                    <mat-icon>lightbulb</mat-icon>
                    See Examples
                  </button>
                </div>
              </div>
            } @else {
              <div cdkDropList (cdkDropListDropped)="onRelationshipReorder($event)" 
                   class="relationships-list">
                @for (relationship of relationshipsArray.controls; track relationship; let i = $index) {
                  <div class="relationship-item" cdkDrag>
                    <div class="relationship-drag-handle" cdkDragHandle>
                      <mat-icon>drag_indicator</mat-icon>
                    </div>
                    
                    <mat-expansion-panel [expanded]="expandedRelationshipIndex === i" 
                                       (opened)="expandedRelationshipIndex = i"
                                       (closed)="expandedRelationshipIndex = -1">
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          <div class="relationship-header">
                            <mat-icon class="relationship-type-icon">
                              {{getRelationshipIcon(relationship.get('relationshipType')?.value)}}
                            </mat-icon>
                            <div class="relationship-title">
                              {{relationship.get('name')?.value || 'Untitled Relationship'}}
                            </div>
                            <div class="relationship-badges">
                              <mat-chip class="type-chip">
                                {{getRelationshipTypeLabel(relationship.get('relationshipType')?.value)}}
                              </mat-chip>
                              @if (relationship.get('bidirectional')?.value) {
                                <mat-chip class="feature-chip">Bidirectional</mat-chip>
                              }
                              @if (relationship.get('cascadeDelete')?.value) {
                                <mat-chip class="warning-chip">Cascade Delete</mat-chip>
                              }
                            </div>
                          </div>
                        </mat-panel-title>
                        <mat-panel-description>
                          <div class="relationship-description">
                            {{getRelationshipDescription($any(relationship))}}
                          </div>
                        </mat-panel-description>
                      </mat-expansion-panel-header>

                      <div class="relationship-editor" [formGroup]="$any(relationship)">
                        <div class="form-section">
                          <h4>Basic Information</h4>
                          
                          <div class="form-row">
                            <mat-form-field class="full-width">
                              <mat-label>Relationship Name</mat-label>
                              <input matInput formControlName="name" 
                                     placeholder="e.g., 'served in', 'belongs to', 'manages'">
                              @if (relationship.get('name')?.hasError('required')) {
                                <mat-error>Relationship name is required</mat-error>
                              }
                            </mat-form-field>
                          </div>

                          <div class="form-row">
                            <mat-form-field class="full-width">
                              <mat-label>Description</mat-label>
                              <textarea matInput formControlName="description" rows="2"
                                       placeholder="Describe how these objects relate to each other..."></textarea>
                            </mat-form-field>
                          </div>
                        </div>

                        <mat-divider></mat-divider>

                        <div class="form-section">
                          <h4>Object Types</h4>
                          
                          <div class="form-row">
                            <mat-form-field class="half-width">
                              <mat-label>From Object Type</mat-label>
                              <mat-select formControlName="fromObjectTypeId">
                                @for (objectType of availableObjectTypes; track objectType.id) {
                                  <mat-option [value]="objectType.id">
                                    <mat-icon>{{objectType.icon}}</mat-icon>
                                    {{objectType.name}}
                                  </mat-option>
                                }
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field class="half-width">
                              <mat-label>To Object Type</mat-label>
                              <mat-select formControlName="toObjectTypeId">
                                @for (objectType of availableObjectTypes; track objectType.id) {
                                  <mat-option [value]="objectType.id">
                                    <mat-icon>{{objectType.icon}}</mat-icon>
                                    {{objectType.name}}
                                  </mat-option>
                                }
                              </mat-select>
                            </mat-form-field>
                          </div>

                          <div class="relationship-preview">
                            <div class="preview-container">
                              @if (getFromObjectType($any(relationship)) && getToObjectType($any(relationship))) {
                                <div class="object-type-preview">
                                  <mat-icon>{{getFromObjectType($any(relationship))?.icon}}</mat-icon>
                                  <span>{{getFromObjectType($any(relationship))?.name}}</span>
                                </div>
                                <div class="relationship-arrow">
                                  <mat-icon>{{getRelationshipIcon(relationship.get('relationshipType')?.value)}}</mat-icon>
                                  <span class="relationship-label">{{relationship.get('name')?.value || 'relationship'}}</span>
                                  @if (relationship.get('bidirectional')?.value) {
                                    <mat-icon class="bidirectional-indicator">swap_horiz</mat-icon>
                                  }
                                </div>
                                <div class="object-type-preview">
                                  <mat-icon>{{getToObjectType($any(relationship))?.icon}}</mat-icon>
                                  <span>{{getToObjectType($any(relationship))?.name}}</span>
                                </div>
                              } @else {
                                <div class="preview-placeholder">
                                  Select object types to see relationship preview
                                </div>
                              }
                            </div>
                          </div>
                        </div>

                        <mat-divider></mat-divider>

                        <div class="form-section">
                          <h4>Relationship Type</h4>
                          
                          <div class="form-row">
                            <mat-form-field class="full-width">
                              <mat-label>Relationship Type</mat-label>
                              <mat-select formControlName="relationshipType">
                                <mat-option value="one-to-one">
                                  <mat-icon>looks_one</mat-icon>
                                  One-to-One
                                  <span class="type-description">Each item relates to exactly one other item</span>
                                </mat-option>
                                <mat-option value="one-to-many">
                                  <mat-icon>call_split</mat-icon>
                                  One-to-Many
                                  <span class="type-description">One item can relate to multiple other items</span>
                                </mat-option>
                                <mat-option value="many-to-many">
                                  <mat-icon>device_hub</mat-icon>
                                  Many-to-Many
                                  <span class="type-description">Multiple items can relate to multiple other items</span>
                                </mat-option>
                              </mat-select>
                            </mat-form-field>
                          </div>

                          <div class="relationship-type-explanation">
                            {{getRelationshipTypeExplanation(relationship.get('relationshipType')?.value)}}
                          </div>
                        </div>

                        <mat-divider></mat-divider>

                        <div class="form-section">
                          <h4>Advanced Options</h4>
                          
                          <div class="form-row">
                            <div class="checkbox-group">
                              <mat-slide-toggle formControlName="required">
                                Required Relationship
                              </mat-slide-toggle>
                              <span class="option-description">
                                Objects must have this relationship to be valid
                              </span>
                            </div>
                          </div>

                          <div class="form-row">
                            <div class="checkbox-group">
                              <mat-slide-toggle formControlName="bidirectional">
                                Bidirectional
                              </mat-slide-toggle>
                              <span class="option-description">
                                Show relationship from both object types
                              </span>
                            </div>
                          </div>

                          <div class="form-row">
                            <div class="checkbox-group">
                              <mat-slide-toggle formControlName="cascadeDelete" 
                                              (change)="onCascadeDeleteChange(i, $event.checked)">
                                Cascade Delete
                              </mat-slide-toggle>
                              <span class="option-description warning-text">
                                Delete related items when parent is deleted (use with caution)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div class="relationship-actions">
                          <button mat-button color="warn" type="button" 
                                  (click)="removeRelationship(i)">
                            <mat-icon>delete</mat-icon>
                            Remove Relationship
                          </button>
                          <button mat-button type="button" (click)="duplicateRelationship(i)">
                            <mat-icon>content_copy</mat-icon>
                            Duplicate
                          </button>
                          <button mat-button type="button" (click)="previewRelationship(i)">
                            <mat-icon>visibility</mat-icon>
                            Preview
                          </button>
                        </div>
                      </div>
                    </mat-expansion-panel>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Actions -->
        <div class="manager-actions">
          <button mat-button type="button" (click)="onCancel()">
            Cancel
          </button>
          <button mat-button type="button" (click)="validateRelationships()">
            <mat-icon>check_circle</mat-icon>
            Validate
          </button>
          <button mat-raised-button color="primary" type="button" 
                  (click)="onSave()" [disabled]="!relationshipsForm.valid || isSaving">
            <mat-icon>save</mat-icon>
            Save Relationships
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrl: './relationship-manager.component.scss'
})
export class RelationshipManagerComponent implements OnInit {
  @Input() wallId!: string;
  @Input() availableObjectTypes: WallObjectType[] = [];
  @Input() existingRelationships: RelationshipDefinition[] = [];
  
  @Output() save = new EventEmitter<RelationshipDefinition[]>();
  @Output() cancel = new EventEmitter<void>();

  relationshipsForm!: FormGroup;
  expandedRelationshipIndex = -1;
  isSaving = false;

  relationshipTemplates: RelationshipTemplate[] = [
    {
      id: 'hierarchy',
      name: 'Hierarchical Relationship',
      description: 'Parent-child or manager-employee type relationships',
      relationshipType: 'one-to-many',
      bidirectional: true,
      cascadeDelete: false,
      examples: ['Manager manages Employees', 'Department contains Teams', 'Category contains Items']
    },
    {
      id: 'membership',
      name: 'Membership Relationship',
      description: 'Objects belonging to groups or organizations',
      relationshipType: 'many-to-many',
      bidirectional: true,
      cascadeDelete: false,
      examples: ['Person belongs to Organizations', 'Student enrolled in Courses', 'User has Roles']
    },
    {
      id: 'ownership',
      name: 'Ownership Relationship',
      description: 'One object owns or is responsible for another',
      relationshipType: 'one-to-many',
      bidirectional: false,
      cascadeDelete: true,
      examples: ['Company owns Assets', 'User owns Documents', 'Project has Tasks']
    },
    {
      id: 'association',
      name: 'Association Relationship',
      description: 'Loose connection between objects',
      relationshipType: 'many-to-many',
      bidirectional: true,
      cascadeDelete: false,
      examples: ['Person attended Events', 'Product has Tags', 'Article mentions People']
    }
  ];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private objectTypeService: ObjectTypeManagementService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  get relationshipsArray(): FormArray {
    return this.relationshipsForm.get('relationships') as FormArray;
  }

  get canAddRelationship(): boolean {
    return this.availableObjectTypes.length >= 2;
  }

  get bidirectionalCount(): number {
    return this.relationshipsArray.controls.filter(
      control => control.get('bidirectional')?.value
    ).length;
  }

  get cascadeDeleteCount(): number {
    return this.relationshipsArray.controls.filter(
      control => control.get('cascadeDelete')?.value
    ).length;
  }

  private initializeForm(): void {
    this.relationshipsForm = this.fb.group({
      relationships: this.fb.array([])
    });

    // Load existing relationships
    if (this.existingRelationships.length > 0) {
      this.existingRelationships.forEach(relationship => {
        this.relationshipsArray.push(this.createRelationshipFormGroup(relationship));
      });
    }
  }

  private createRelationshipFormGroup(relationship?: Partial<RelationshipDefinition>): FormGroup {
    return this.fb.group({
      id: [relationship?.id || this.generateRelationshipId()],
      name: [relationship?.name || '', Validators.required],
      description: [relationship?.description || ''],
      fromObjectTypeId: [relationship?.fromObjectTypeId || '', Validators.required],
      toObjectTypeId: [relationship?.toObjectTypeId || '', Validators.required],
      relationshipType: [relationship?.relationshipType || 'one-to-many', Validators.required],
      required: [relationship?.required || false],
      bidirectional: [relationship?.bidirectional || false],
      cascadeDelete: [relationship?.cascadeDelete || false]
    });
  }

  addRelationship(): void {
    if (!this.canAddRelationship) return;

    const newRelationship = this.createRelationshipFormGroup();
    this.relationshipsArray.push(newRelationship);
    this.expandedRelationshipIndex = this.relationshipsArray.length - 1;
  }

  addFromTemplate(template: RelationshipTemplate): void {
    if (!this.canAddRelationship) return;

    const relationshipData: Partial<RelationshipDefinition> = {
      name: template.name,
      description: template.description,
      relationshipType: template.relationshipType,
      bidirectional: template.bidirectional,
      cascadeDelete: template.cascadeDelete,
      required: false
    };

    const newRelationship = this.createRelationshipFormGroup(relationshipData);
    this.relationshipsArray.push(newRelationship);
    this.expandedRelationshipIndex = this.relationshipsArray.length - 1;
  }

  removeRelationship(index: number): void {
    this.relationshipsArray.removeAt(index);
    if (this.expandedRelationshipIndex === index) {
      this.expandedRelationshipIndex = -1;
    } else if (this.expandedRelationshipIndex > index) {
      this.expandedRelationshipIndex--;
    }
  }

  duplicateRelationship(index: number): void {
    const relationshipToDuplicate = this.relationshipsArray.at(index).value;
    const duplicatedRelationship = {
      ...relationshipToDuplicate,
      id: this.generateRelationshipId(),
      name: `${relationshipToDuplicate.name} Copy`
    };
    
    const newRelationshipGroup = this.createRelationshipFormGroup(duplicatedRelationship);
    this.relationshipsArray.insert(index + 1, newRelationshipGroup);
    this.expandedRelationshipIndex = index + 1;
  }

  onRelationshipReorder(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.relationshipsArray.controls, event.previousIndex, event.currentIndex);
    this.relationshipsArray.updateValueAndValidity();
  }

  onCascadeDeleteChange(index: number, enabled: boolean): void {
    if (enabled) {
      // Show warning about cascade delete
      console.warn('Cascade delete enabled - this will delete related items when parent is deleted');
    }
  }

  getRelationshipIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'one-to-one': 'looks_one',
      'one-to-many': 'call_split',
      'many-to-many': 'device_hub'
    };
    return icons[type] || 'link';
  }

  getRelationshipTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'one-to-one': 'One-to-One',
      'one-to-many': 'One-to-Many',
      'many-to-many': 'Many-to-Many'
    };
    return labels[type] || type;
  }

  getRelationshipTypeExplanation(type: string): string {
    const explanations: { [key: string]: string } = {
      'one-to-one': 'Each item can relate to exactly one other item. Example: Person has one Profile.',
      'one-to-many': 'One item can relate to multiple other items. Example: Department has many Employees.',
      'many-to-many': 'Multiple items can relate to multiple other items. Example: Students enrolled in multiple Courses.'
    };
    return explanations[type] || '';
  }

  getRelationshipDescription(relationship: FormGroup): string {
    const fromType = this.getFromObjectType(relationship);
    const toType = this.getToObjectType(relationship);
    const name = relationship.get('name')?.value;
    
    if (fromType && toType && name) {
      return `${fromType.name} ${name} ${toType.name}`;
    }
    return 'Configure object types and relationship name';
  }

  getFromObjectType(relationship: FormGroup): WallObjectType | undefined {
    const id = relationship.get('fromObjectTypeId')?.value;
    return this.availableObjectTypes.find(ot => ot.id === id);
  }

  getToObjectType(relationship: FormGroup): WallObjectType | undefined {
    const id = relationship.get('toObjectTypeId')?.value;
    return this.availableObjectTypes.find(ot => ot.id === id);
  }

  validateRelationships(): void {
    const relationships = this.relationshipsArray.value;
    const errors: string[] = [];

    // Check for duplicate relationships
    const relationshipKeys = new Set();
    relationships.forEach((rel: any, index: number) => {
      const key = `${rel.fromObjectTypeId}-${rel.toObjectTypeId}-${rel.name}`;
      if (relationshipKeys.has(key)) {
        errors.push(`Duplicate relationship found at index ${index + 1}`);
      }
      relationshipKeys.add(key);
    });

    // Check for circular dependencies with cascade delete
    relationships.forEach((rel: any, index: number) => {
      if (rel.cascadeDelete) {
        // TODO: Implement circular dependency detection
      }
    });

    if (errors.length > 0) {
      console.warn('Relationship validation errors:', errors);
      // TODO: Show validation errors to user
    } else {
      console.log('All relationships are valid');
      // TODO: Show success message
    }
  }

  previewRelationship(index: number): void {
    const relationship = this.relationshipsArray.at(index).value;
    // TODO: Open preview dialog
    console.log('Preview relationship:', relationship);
  }

  showExamples(): void {
    // TODO: Open examples dialog
    console.log('Show relationship examples');
  }

  private generateRelationshipId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onCancel(): void {
    this.cancel.emit();
  }

  async onSave(): Promise<void> {
    if (!this.relationshipsForm.valid) return;

    this.isSaving = true;
    try {
      const relationships: RelationshipDefinition[] = this.relationshipsArray.value;
      this.save.emit(relationships);
    } catch (error) {
      console.error('Error saving relationships:', error);
      // TODO: Show error message to user
    } finally {
      this.isSaving = false;
    }
  }
}