import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subject, takeUntil } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { ObjectTypeBuilderComponent, ObjectTypeBuilderConfig } from '../../../object-types/components/object-type-builder/object-type-builder.component';
import { TemplateLibraryComponent } from '../../../object-types/components/template-library/template-library.component';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-wall-item-presets',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    ObjectTypeBuilderComponent,
    TemplateLibraryComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="wall-item-presets" *ngIf="wall$ | async as wall">
      <!-- Header -->
      <mat-toolbar class="page-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="page-title">Wall Item Presets</span>
        <span class="spacer"></span>
        <button mat-raised-button color="primary" (click)="createNewPreset()">
          <mat-icon>add</mat-icon>
          New Preset
        </button>
      </mat-toolbar>

      <!-- Content -->
      <div class="content-container">
        <mat-tab-group [selectedIndex]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          
          <!-- Existing Presets Tab -->
          <mat-tab label="Current Presets">
            <div class="tab-content">
              @if (wall.objectTypes && wall.objectTypes.length > 0) {
                <div class="presets-grid">
                  @for (objectType of wall.objectTypes; track objectType.id) {
                    <mat-card class="preset-card">
                      <mat-card-header>
                        <div mat-card-avatar class="preset-avatar">
                          <mat-icon [style.color]="objectType.color">{{ objectType.icon }}</mat-icon>
                        </div>
                        <mat-card-title>{{ objectType.name }}</mat-card-title>
                        <mat-card-subtitle>{{ objectType.fields.length }} fields</mat-card-subtitle>
                      </mat-card-header>
                      
                      <mat-card-content>
                        <p class="preset-description">{{ objectType.description }}</p>
                        <div class="field-summary">
                          @for (field of objectType.fields | slice:0:3; track field.id) {
                            <span class="field-chip">{{ field.name }}</span>
                          }
                          @if (objectType.fields.length > 3) {
                            <span class="field-chip more">+{{ objectType.fields.length - 3 }} more</span>
                          }
                        </div>
                      </mat-card-content>
                      
                      <mat-card-actions>
                        <button mat-button (click)="editPreset(objectType)">
                          <mat-icon>edit</mat-icon>
                          Edit
                        </button>
                        <button mat-button color="warn" (click)="deletePreset(objectType)">
                          <mat-icon>delete</mat-icon>
                          Delete
                        </button>
                      </mat-card-actions>
                    </mat-card>
                  }
                </div>
              } @else {
                <app-empty-state
                  icon="category"
                  title="No Wall Item Presets Yet"
                  message="Create your first preset to define the structure of items in this wall."
                  [actions]="emptyStateActions">
                </app-empty-state>
              }
            </div>
          </mat-tab>

          <!-- Template Library Tab -->
          <mat-tab label="Template Library">
            <div class="tab-content">
              <app-template-library
                [wallId]="wall.id"
                (templateSelected)="onTemplateSelected($event)">
              </app-template-library>
            </div>
          </mat-tab>

          <!-- Create/Edit Preset Tab -->
          <mat-tab label="Create Preset" [disabled]="!showBuilder">
            <div class="tab-content">
              @if (showBuilder) {
                <app-object-type-builder
                  [config]="{
                    mode: editingObjectType ? 'edit' : 'create',
                    wallId: wall.id,
                    initialData: editingObjectType || undefined
                  }"
                  (save)="onObjectTypeSaved($event)"
                  (cancel)="onBuilderCancelled()">
                </app-object-type-builder>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .wall-item-presets {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      flex-shrink: 0;
    }

    .page-title {
      font-size: 1.25rem;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .content-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tab-content {
      padding: 24px;
      height: calc(100vh - 120px);
      overflow-y: auto;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .preset-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .preset-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .preset-avatar {
      background: var(--md-sys-color-primary-container);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preset-description {
      color: var(--md-sys-color-on-surface-variant);
      margin: 0 0 16px 0;
      line-height: 1.4;
    }

    .field-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .field-chip {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .field-chip.more {
      background: var(--md-sys-color-outline-variant);
      color: var(--md-sys-color-on-surface-variant);
    }

    mat-card-actions {
      padding: 8px 16px 16px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .presets-grid {
        grid-template-columns: 1fr;
      }
      
      .tab-content {
        padding: 16px;
      }
    }
  `]
})
export class WallItemPresetsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;
  selectedTabIndex = 0;
  showBuilder = false;
  editingObjectType: WallObjectType | null = null;
  
  emptyStateActions: EmptyStateAction[] = [
    {
      label: 'Create Preset',
      primary: true,
      action: () => this.createNewPreset()
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService
  ) {}

  ngOnInit() {
    this.wall$ = this.route.paramMap.pipe(
      switchMap(params => {
        const wallId = params.get('id')!;
        return this.wallService.getWallById(wallId);
      }),
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  createNewPreset() {
    this.editingObjectType = null;
    this.showBuilder = true;
    this.selectedTabIndex = 2; // Switch to Create Preset tab
  }

  editPreset(objectType: WallObjectType) {
    this.editingObjectType = objectType;
    this.showBuilder = true;
    this.selectedTabIndex = 2; // Switch to Create Preset tab
  }

  deletePreset(objectType: WallObjectType) {
    if (confirm(`Are you sure you want to delete the "${objectType.name}" preset? This action cannot be undone.`)) {
      this.wall$.pipe(
        switchMap(wall => {
          if (!wall) throw new Error('Wall not found');
          return this.wallService.removeObjectTypeFromWall(wall.id, objectType.id);
        }),
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          console.log('Preset deleted successfully');
          // The wall$ observable will automatically update
        },
        error: (error) => {
          console.error('Error deleting preset:', error);
          alert('Failed to delete preset. Please try again.');
        }
      });
    }
  }

  onTemplateSelected(template: any) {
    // Apply template to create new object type
    console.log('Template selected:', template);
    if (template.objectTypes && template.objectTypes.length > 0) {
      // Use first object type from template as initial data
      this.editingObjectType = template.objectTypes[0] as WallObjectType;
      this.showBuilder = true;
      this.selectedTabIndex = 2; // Switch to Create Preset tab
    } else {
      this.createNewPreset();
    }
  }

  onObjectTypeSaved(objectType: WallObjectType) {
    this.wall$.pipe(
      switchMap(wall => {
        if (!wall) throw new Error('Wall not found');
        
        if (this.editingObjectType && this.editingObjectType.id) {
          // Update existing object type
          return this.wallService.updateObjectTypeInWall(wall.id, this.editingObjectType.id, objectType);
        } else {
          // Add new object type
          return this.wallService.addObjectTypeToWall(wall.id, objectType);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('Object type saved successfully');
        this.showBuilder = false;
        this.editingObjectType = null;
        this.selectedTabIndex = 0; // Return to Current Presets tab
        // The wall$ observable will automatically update
      },
      error: (error) => {
        console.error('Error saving object type:', error);
        alert('Failed to save preset. Please try again.');
      }
    });
  }

  onBuilderCancelled() {
    this.showBuilder = false;
    this.editingObjectType = null;
    this.selectedTabIndex = 0; // Return to Current Presets tab
  }

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
    if (event.index !== 2) {
      this.showBuilder = false;
      this.editingObjectType = null;
    }
  }
}