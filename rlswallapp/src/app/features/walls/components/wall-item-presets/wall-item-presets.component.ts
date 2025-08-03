import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ProgressSpinnerComponent } from '../../../../shared/components/progress-spinner/progress-spinner.component';
import { Observable, Subject, takeUntil } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { ObjectTypeBuilderComponent, ObjectTypeBuilderConfig } from '../../../object-types/components/object-type-builder/object-type-builder.component';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { CardComponent, CardAction, CardMenuItem } from '../../../../shared/components/card/card.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-wall-item-presets',
  standalone: true,
  imports: [
    CommonModule,
    ThemedButtonComponent,
    MaterialIconComponent,
    ProgressSpinnerComponent,
    ObjectTypeBuilderComponent,
    EmptyStateComponent,
    PageLayoutComponent,
    CardComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <app-page-layout
        title="Wall Item Presets"
        subtitle="Define the structure of items in this wall"
        [showBackButton]="true"
        [actions]="getPageActions()"
        (backClick)="goBack()">
        
        <!-- Content Section -->
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
        } @else {
          @if (wall.objectTypes && wall.objectTypes.length > 0) {
            <div class="presets-grid">
              @for (objectType of wall.objectTypes; track objectType.id) {
                <app-card
                  variant="elevated"
                  size="medium"
                  [title]="objectType.name"
                  [subtitle]="objectType.fields.length + ' fields'"
                  [avatarIcon]="objectType.icon"
                  [description]="objectType.description"
                  [metadata]="getMetadata(objectType)"
                  [actions]="getActions(objectType)"
                  class="preset-card">
                  
                  <div class="field-summary">
                    @for (field of objectType.fields | slice:0:3; track field.id) {
                      <span class="field-chip">{{ field.name }}</span>
                    }
                    @if (objectType.fields.length > 3) {
                      <span class="field-chip more">+{{ objectType.fields.length - 3 }} more</span>
                    }
                  </div>
                </app-card>
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
        }
        
      </app-page-layout>
    </div>
  `,
  styles: [`
    /* Grid layout for presets */
    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .preset-card {
      /* Card component handles styling */
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

    /* Responsive design */
    @media (max-width: 768px) {
      .presets-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WallItemPresetsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;
  showBuilder = false;
  editingObjectType: WallObjectType | null = null;
  
  
  emptyStateActions: EmptyStateAction[] = [
    {
      label: 'Create Preset',
      icon: 'add',
      primary: false,
      action: () => this.createNewPreset()
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private confirmationDialog: ConfirmationDialogService
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

  getPageActions(): PageAction[] {
    if (this.showBuilder) {
      return []; // No header actions when showing builder (builder has its own controls)
    }
    
    return [
      {
        label: 'New Preset',
        icon: 'add',
        variant: 'raised',
        color: 'primary',
        action: () => this.createNewPreset()
      }
    ];
  }

  createNewPreset() {
    this.editingObjectType = null;
    this.showBuilder = true;
  }

  editPreset(objectType: WallObjectType) {
    this.editingObjectType = objectType;
    this.showBuilder = true;
  }

  deletePreset(objectType: WallObjectType) {
    this.confirmationDialog.confirmDelete(objectType.name).subscribe(confirmed => {
      if (confirmed) {
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
    });
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
  }

  getMetadata(objectType: WallObjectType): Array<{key: string; value: string; icon?: string}> {
    return [
      { key: 'fields', value: `${objectType.fields.length} fields`, icon: 'list' }
    ];
  }

  getActions(objectType: WallObjectType): CardAction[] {
    return [
      {
        label: 'Edit',
        icon: 'edit',
        primary: false,
        action: () => this.editPreset(objectType)
      },
      {
        label: 'Delete',
        icon: 'delete',
        primary: false,
        action: () => this.deletePreset(objectType)
      }
    ];
  }

}