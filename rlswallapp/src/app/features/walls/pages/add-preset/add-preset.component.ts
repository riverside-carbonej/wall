import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, switchMap, filter } from 'rxjs';

import { WallService } from '../../services/wall.service';
import { Wall, WallObjectType } from '../../../../shared/models/wall.model';
import { ObjectTypeBuilderComponent, ObjectTypeBuilderConfig } from '../../../object-types/components/object-type-builder/object-type-builder.component';
import { PageLayoutComponent } from '../../../../shared/components/page-layout/page-layout.component';
import { FormStateService } from '../../../../shared/services/form-state.service';

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
          [config]="getBuilderConfig(wall)"
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
    private wallService: WallService,
    private formStateService: FormStateService
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
    // Get the current wall ID from the route instead of using the reactive stream
    const wallId = this.route.snapshot.paramMap.get('id');
    if (!wallId) {
      console.error('No wall ID found in route');
      alert('Failed to save preset. Please try again.');
      return;
    }

    // Save the object type
    this.wallService.addObjectTypeToWall(wallId, objectType).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (savedObjectType) => {
        console.log('Object type saved successfully');
        // Navigate to the created preset's edit page
        this.router.navigate(['/walls', wallId, 'presets', savedObjectType.id, 'edit']);
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

  getBuilderConfig(wall: Wall): ObjectTypeBuilderConfig {
    const baseConfig: ObjectTypeBuilderConfig = {
      mode: 'create',
      wallId: wall.id
    };

    // Check if this is a veterans wall by looking for veterans-specific object types or wall name
    const isVeteransWall = wall.name.toLowerCase().includes('veterans') || 
                          wall.name.toLowerCase().includes('wall of honor') ||
                          wall.objectTypes?.some(ot => ['veteran', 'deployment', 'branch'].includes(ot.id));

    if (isVeteransWall) {
      baseConfig.allowedFieldTypes = ['text', 'date', 'color', 'location'];
    }

    return baseConfig;
  }
}