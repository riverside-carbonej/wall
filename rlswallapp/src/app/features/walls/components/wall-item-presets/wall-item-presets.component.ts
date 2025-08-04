import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import { NlpService } from '../../../../shared/services/nlp.service';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-wall-item-presets',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    PageLayoutComponent,
    MaterialIconComponent
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
              <div class="preset-card">
                <!-- Card Header -->
                <div class="card-header">
                  <div class="icon-container">
                    <mat-icon [icon]="objectType.icon || 'category'"></mat-icon>
                  </div>
                  <div class="header-content">
                    <h3 class="preset-title">{{ nlpService.capitalizeTitle(objectType.name) }}</h3>
                    <p class="preset-subtitle">{{ objectType.fields.length }} field{{ objectType.fields.length !== 1 ? 's' : '' }}</p>
                  </div>
                </div>
                
                <!-- Field Summary -->
                <div class="card-content">
                  <div class="field-summary">
                    @for (field of objectType.fields | slice:0:4; track field.id) {
                      <span class="field-chip">{{ nlpService.capitalizeTitle(field.name) }}</span>
                    }
                    @if (objectType.fields.length > 4) {
                      <span class="field-chip more">+{{ objectType.fields.length - 4 }} more</span>
                    }
                  </div>
                </div>
                
                <!-- Card Actions -->
                <div class="card-actions">
                  <button class="action-button primary" (click)="viewItems(objectType)">
                    <mat-icon [icon]="'visibility'"></mat-icon>
                    View Items
                  </button>
                  <button class="action-button secondary" (click)="editPreset(objectType)">
                    <mat-icon [icon]="'edit'"></mat-icon>
                    Edit
                  </button>
                  <button class="action-button danger" (click)="deletePreset(objectType)">
                    <mat-icon [icon]="'delete'"></mat-icon>
                    Delete
                  </button>
                </div>
              </div>
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
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
      padding: 0;
    }

    /* Simple card styling */
    .preset-card {
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--md-sys-elevation-1);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      display: flex;
      flex-direction: column;
      height: fit-content;
    }

    .preset-card:hover {
      box-shadow: var(--md-sys-elevation-2);
      transform: translateY(-2px);
    }

    /* Card Header */
    .card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 20px 16px;
    }

    .icon-container {
      width: 48px;
      height: 48px;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icon-container mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .header-content {
      flex: 1;
      min-width: 0;
    }

    .preset-title {
      margin: 0 0 4px 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      line-height: 1.2;
    }

    .preset-subtitle {
      margin: 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.8;
    }

    /* Card Content */
    .card-content {
      padding: 16px 20px;
      flex: 1;
    }

    .field-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .field-chip {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.2;
    }

    .field-chip.more {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Card Actions */
    .card-actions {
      display: flex;
      gap: 8px;
      padding: 16px 20px 20px;
      border-top: 1px solid var(--md-sys-color-outline);
      background: var(--md-sys-color-surface-container-lowest);
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      flex: 1;
      justify-content: center;
      min-height: 40px;
    }

    .action-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .action-button.primary {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
    }

    .action-button.primary:hover {
      background: color-mix(in srgb, var(--md-sys-color-primary) 90%, black);
    }

    .action-button.secondary {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
    }

    .action-button.secondary:hover {
      background: color-mix(in srgb, var(--md-sys-color-surface-variant) 80%, var(--md-sys-color-on-surface-variant));
    }

    .action-button.danger {
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
    }

    .action-button.danger:hover {
      background: color-mix(in srgb, var(--md-sys-color-error-container) 80%, var(--md-sys-color-error));
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .presets-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .card-actions {
        flex-direction: column;
      }
      
      .action-button {
        flex: none;
      }
    }

    @media (max-width: 480px) {
      .card-header {
        padding: 16px;
      }
      
      .card-content {
        padding: 12px 16px;
      }
      
      .card-actions {
        padding: 12px 16px 16px;
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
    private confirmationDialog: ConfirmationDialogService,
    public nlpService: NlpService
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
    // Get wallId from route
    const wallId = this.route.snapshot.paramMap.get('id');
    if (!wallId) {
      console.error('Missing wallId for add preset navigation');
      return;
    }
    
    // Navigate to add preset page with explicit path
    this.router.navigate(['/walls', wallId, 'presets', 'add']);
  }

  editPreset(objectType: WallObjectType) {
    // Get wallId from route
    const wallId = this.route.snapshot.paramMap.get('id');
    if (!wallId || !objectType.id) {
      console.error('Missing wallId or preset ID for edit navigation', { wallId, presetId: objectType.id });
      return;
    }
    
    // Navigate to edit preset page with explicit path
    this.router.navigate(['/walls', wallId, 'presets', objectType.id, 'edit']);
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