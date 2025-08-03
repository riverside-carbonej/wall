import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { CardComponent, CardAction } from '../../../../shared/components/card/card.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-wall-item-presets',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    PageLayoutComponent,
    CardComponent,
    ThemedButtonComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <app-page-layout
        title="Wall Item Presets"
        subtitle="Define the structure of items in this wall"
        [showBackButton]="true"
        [actions]="getPageActions()"
        (backClick)="goBack()">
        
        @if (wall.objectTypes && wall.objectTypes.length > 0) {
          <div class="presets-grid">
            @for (objectType of wall.objectTypes; track objectType.id) {
              <app-card
                variant="elevated"
                size="medium"
                [title]="objectType.name"
                [subtitle]="objectType.fields.length + ' fields'"
                [avatarIcon]="objectType.icon"
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
        
      </app-page-layout>
    </div>
  `,
  styles: [`
    /* Grid layout for presets */
    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .preset-card {
      height: fit-content;
      max-height: 280px;
    }

    .preset-card ::ng-deep .card-actions {
      padding: 12px 16px 16px;
      gap: 8px;
    }

    .preset-card ::ng-deep .card-content {
      padding: 8px 16px;
    }

    .preset-card ::ng-deep mat-card-header {
      padding: 16px 16px 8px;
    }

    .field-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }

    .field-chip {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      padding: 3px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 500;
      line-height: 1.2;
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
        return this.wallService.watchWallById(wallId);
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
    this.router.navigate(['add'], { relativeTo: this.route });
  }

  editPreset(objectType: WallObjectType) {
    this.router.navigate([objectType.id, 'edit'], { relativeTo: this.route });
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



  getMetadata(objectType: WallObjectType): Array<{key: string; value: string; icon?: string}> {
    return [];
  }

  getActions(objectType: WallObjectType): CardAction[] {
    return [
      {
        label: 'View Items',
        icon: 'inventory_2',
        primary: true,
        action: () => this.viewItems(objectType)
      },
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

  viewItems(objectType: WallObjectType) {
    this.wall$.pipe(
      switchMap(wall => {
        if (!wall) throw new Error('Wall not found');
        this.router.navigate(['/walls', wall.id, 'preset', objectType.id, 'items']);
        return [];
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

}