import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';

@Component({
  selector: 'app-preset-item-view',
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    LoadingStateComponent,
    MaterialIconComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <div *ngIf="preset$ | async as preset">
        <div *ngIf="item$ | async as item">
          <app-page-layout
            [title]="getItemTitle(preset, item)"
            [subtitle]="'View ' + preset.name.toLowerCase() + ' details'"
            [showBackButton]="true"
            [actions]="getPageActions()"
            (backClick)="goBack()">
            
            <!-- Loading State -->
            @if (isLoading) {
              <app-loading-state 
                message="Loading item details...">
              </app-loading-state>
            }

            <!-- Item Content -->
            @if (!isLoading) {
              <div class="item-view-container">
                <div class="item-details">
                  <h3>Item Details</h3>
                  <p>View item details will be implemented here</p>
                </div>
              </div>
            }
            
          </app-page-layout>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .item-view-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .item-details {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      padding: 24px;
    }
  `]
})
export class PresetItemViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  preset$!: Observable<WallObjectType | null>;
  item$!: Observable<WallItem | null>;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private wallItemService: WallItemService
  ) {}

  ngOnInit() {
    // Get route parameters
    const routeParams$ = this.route.paramMap.pipe(
      map(params => ({
        wallId: params.get('wallId')!,
        presetId: params.get('presetId')!,
        itemId: params.get('itemId')!
      }))
    );

    // Load wall data
    this.wall$ = routeParams$.pipe(
      switchMap(({ wallId }) => this.wallService.getWallById(wallId)),
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    // Load preset data from wall
    this.preset$ = combineLatest([this.wall$, routeParams$]).pipe(
      map(([wall, { presetId }]) => {
        if (!wall || !wall.objectTypes) return null;
        return wall.objectTypes.find(ot => ot.id === presetId) || null;
      }),
      takeUntil(this.destroy$)
    );

    // Load item data
    this.item$ = routeParams$.pipe(
      switchMap(({ itemId }) => this.wallItemService.getWallItemById(itemId)),
      takeUntil(this.destroy$)
    );

    // Handle loading state
    this.item$.subscribe(() => {
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items']);
  }

  getPageActions(): PageAction[] {
    return [
      {
        label: 'Edit',
        icon: 'edit',
        variant: 'raised',
        color: 'primary',
        action: () => this.editItem()
      }
    ];
  }

  editItem() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    const itemId = this.route.snapshot.paramMap.get('itemId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', itemId, 'edit']);
  }

  getItemTitle(preset: WallObjectType, item: WallItem): string {
    const primaryField = preset.displaySettings?.primaryField;
    
    if (primaryField && item.fieldData[primaryField]) {
      return this.formatFieldValue(item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(item.fieldData).find(key => 
      typeof item.fieldData[key] === 'string' && item.fieldData[key].trim()
    );
    
    return firstTextField ? this.formatFieldValue(item.fieldData[firstTextField]) : 'Untitled Item';
  }

  private formatFieldValue(value: any): string {
    if (!value) return '';
    
    // Handle location objects
    if (value && typeof value === 'object') {
      if (value.address) {
        return value.address;
      } else if (value.lat && value.lng) {
        return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
      } else if (Array.isArray(value)) {
        return value.join(', ');
      } else {
        return '';
      }
    }
    
    return String(value);
  }
}