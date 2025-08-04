import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../../walls/services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { ObjectTypeSelectorComponent } from '../../components/object-type-selector/object-type-selector.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';

@Component({
  selector: 'app-object-type-selection-page',
  standalone: true,
  imports: [
    CommonModule,
    ObjectTypeSelectorComponent,
    LoadingStateComponent,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      title="Select Item Type"
      subtitle="Choose the type of item you want to add to your wall"
      [showBackButton]="true"
      [actions]="pageActions"
      (backClick)="onCancel()">
      
      @if (isLoading) {
        <app-loading-state
          message="Loading item types..."
          [spinnerSize]="60">
        </app-loading-state>
      } @else {
        @if (wall$ | async; as wall) {
          <app-object-type-selector
            [objectTypes]="wall.objectTypes || []"
            (objectTypeSelected)="onObjectTypeSelected($event)"
            (cancel)="onCancel()"
            (manageTypes)="onManageTypes()">
          </app-object-type-selector>
        }
      }
    </app-page-layout>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
    }
  `]
})
export class ObjectTypeSelectionPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;
  wallId!: string;
  isLoading = true;

  pageActions: PageAction[] = [
    {
      label: 'Manage Types',
      icon: 'settings',
      variant: 'stroked',
      action: () => this.onManageTypes()
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService
  ) {}

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('wallId')!;
    
    if (!this.wallId) {
      this.router.navigate(['/walls']);
      return;
    }

    this.wall$ = this.wallService.getWallById(this.wallId).pipe(
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    // Set loading to false after wall loads
    this.wall$.subscribe(() => {
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onObjectTypeSelected(objectType: WallObjectType): void {
    // Navigate to preset-based add page with selected object type
    this.router.navigate(['/walls', this.wallId, 'preset', objectType.id, 'items', 'add']);
  }

  onCancel(): void {
    // Go back to wall home
    this.router.navigate(['/walls', this.wallId]);
  }

  onManageTypes(): void {
    // Navigate to wall item presets management
    this.router.navigate(['/walls', this.wallId, 'presets']);
  }
}