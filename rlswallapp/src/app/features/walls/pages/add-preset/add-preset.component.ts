import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, switchMap, filter } from 'rxjs';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { ObjectTypeBuilderComponent, ObjectTypeBuilderConfig } from '../../../object-types/components/object-type-builder/object-type-builder.component';
import { PageLayoutComponent } from '../../../../shared/components/page-layout/page-layout.component';

@Component({
  selector: 'app-add-preset',
  standalone: true,
  imports: [
    CommonModule,
    ObjectTypeBuilderComponent,
    PageLayoutComponent
  ],
  template: `
    <div *ngIf="wall$ | async as wall">
      <app-page-layout
        title="Add New Wall Item Preset"
        subtitle="Define the structure for a new type of item in this wall"
        [showBackButton]="true"
        (backClick)="goBack()">
        
        <app-object-type-builder
          [config]="{
            mode: 'create',
            wallId: wall.id
          }"
          (save)="onObjectTypeSaved($event)"
          (cancel)="onBuilderCancelled()">
        </app-object-type-builder>
        
      </app-page-layout>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AddPresetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wall$!: Observable<Wall>;

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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['../presets'], { relativeTo: this.route });
  }

  onObjectTypeSaved(objectType: WallObjectType) {
    this.wall$.pipe(
      switchMap(wall => {
        if (!wall) throw new Error('Wall not found');
        return this.wallService.addObjectTypeToWall(wall.id, objectType);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('Object type saved successfully');
        this.goBack();
      },
      error: (error) => {
        console.error('Error saving object type:', error);
        alert('Failed to save preset. Please try again.');
      }
    });
  }

  onBuilderCancelled() {
    this.goBack();
  }
}