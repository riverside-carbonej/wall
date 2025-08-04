import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, switchMap, filter, map } from 'rxjs';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { ObjectTypeBuilderComponent, ObjectTypeBuilderConfig } from '../../../object-types/components/object-type-builder/object-type-builder.component';
import { PageLayoutComponent } from '../../../../shared/components/page-layout/page-layout.component';

@Component({
  selector: 'app-edit-preset',
  standalone: true,
  imports: [
    CommonModule,
    ObjectTypeBuilderComponent,
    PageLayoutComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <div *ngIf="objectType$ | async as objectType">
        <app-page-layout
          [title]="'Edit ' + capitalizeFirstLetter(objectType.name) + ' Preset'"
          subtitle="Modify the structure and fields for this item type"
          [showBackButton]="true"
          (backClick)="goBack()">
          
          <app-object-type-builder
            [config]="{
              mode: 'edit',
              wallId: wall.id,
              initialData: objectType
            }"
            (save)="onObjectTypeSaved($event)"
            (cancel)="onBuilderCancelled()">
          </app-object-type-builder>
          
        </app-page-layout>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class EditPresetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;
  objectType$!: Observable<WallObjectType>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService
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

    this.objectType$ = this.route.paramMap.pipe(
      switchMap(params => {
        const objectTypeId = params.get('presetId')!;
        return this.wall$.pipe(
          map(wall => {
            if (!wall || !wall.objectTypes) return null;
            return wall.objectTypes.find(ot => ot.id === objectTypeId) || null;
          }),
          filter(objectType => objectType !== null)
        );
      }),
      takeUntil(this.destroy$)
    ) as Observable<WallObjectType>;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['../../presets'], { relativeTo: this.route });
  }

  onObjectTypeSaved(objectType: WallObjectType) {
    this.route.paramMap.pipe(
      switchMap(params => {
        const wallId = params.get('id')!;
        const presetId = params.get('presetId')!;
        return this.wallService.updateObjectTypeInWall(wallId, presetId, objectType);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('Object type updated successfully');
        this.goBack();
      },
      error: (error) => {
        console.error('Error updating object type:', error);
        alert('Failed to update preset. Please try again.');
      }
    });
  }

  onBuilderCancelled() {
    this.goBack();
  }

  capitalizeFirstLetter(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}