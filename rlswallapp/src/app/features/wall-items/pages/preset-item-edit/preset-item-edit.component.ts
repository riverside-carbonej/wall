import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../services/wall-item.service';
import { Wall, WallItem, WallObjectType, WallItemImage } from '../../../../shared/models/wall.model';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';

@Component({
  selector: 'app-preset-item-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    LoadingStateComponent,
    MaterialIconComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <div *ngIf="preset$ | async as preset">
        <div *ngIf="item$ | async as item">
          <app-page-layout
            [title]="'Edit ' + getItemTitle(preset, item)"
            [subtitle]="'Update ' + preset.name.toLowerCase() + ' details'"
            [showBackButton]="true"
            [actions]="getPageActions()"
            (backClick)="goBack()">
            
            <!-- Loading State -->
            @if (isLoading) {
              <app-loading-state 
                message="Loading item data...">
              </app-loading-state>
            }

            <!-- Edit Form -->
            @if (!isLoading) {
              <div class="edit-item-container">
                <div class="form-section">
                  <h3>Edit Item Details</h3>
                  <p>Edit form will be implemented here</p>
                </div>
              </div>
            }
            
          </app-page-layout>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .edit-item-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .form-section {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      padding: 24px;
    }
  `]
})
export class PresetItemEditComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall | null>;
  preset$!: Observable<WallObjectType | null>;
  item$!: Observable<WallItem | null>;
  itemForm!: FormGroup;
  isLoading = true;
  isSaving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
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

    // Initialize form when both preset and item are loaded
    combineLatest([this.preset$, this.item$]).subscribe(([preset, item]) => {
      if (preset && item) {
        this.initializeForm(preset, item);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(preset: WallObjectType, item: WallItem) {
    const formControls: any = {};
    
    preset.fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      const value = item.fieldData[field.id] || '';
      formControls[field.id] = [value, validators];
    });

    this.itemForm = this.fb.group(formControls);
  }

  goBack() {
    const wallId = this.route.snapshot.paramMap.get('wallId');
    const presetId = this.route.snapshot.paramMap.get('presetId');
    const itemId = this.route.snapshot.paramMap.get('itemId');
    this.router.navigate(['/walls', wallId, 'preset', presetId, 'items', itemId]);
  }

  getPageActions(): PageAction[] {
    return [
      {
        label: 'Save Changes',
        icon: 'save',
        variant: 'raised',
        color: 'primary',
        action: () => this.saveChanges()
      }
    ];
  }

  saveChanges() {
    // TODO: Implement save functionality
    console.log('Save changes functionality will be implemented');
  }

  getItemTitle(preset: WallObjectType, item: WallItem): string {
    const primaryField = preset.displaySettings?.primaryField;
    
    if (primaryField && item.fieldData[primaryField]) {
      return String(item.fieldData[primaryField]);
    }
    
    // Fallback to first text field
    const firstTextField = Object.keys(item.fieldData).find(key => 
      typeof item.fieldData[key] === 'string' && item.fieldData[key].trim()
    );
    
    return firstTextField ? String(item.fieldData[firstTextField]) : 'Untitled Item';
  }
}