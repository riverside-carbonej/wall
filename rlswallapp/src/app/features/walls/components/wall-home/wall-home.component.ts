import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { WallItemService } from '../../../wall-items/services/wall-item.service';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { WallItemListComponent } from '../../../wall-items/pages/wall-item-list/wall-item-list.component';

@Component({
  selector: 'app-wall-home',
  standalone: true,
  imports: [CommonModule, WallItemListComponent],
  template: `
    <div class="wall-home">
      <!-- Title overlay with wall branding -->
      <div class="title-container">
        <div class="blur-background"></div>
        @if (wall$ | async; as wall) {
          <div class="title-wrapper">
            <!-- Wall Logo -->
            @if (wall.logoUrl) {
              <div class="wall-logo">
                <img [src]="wall.logoUrl" [alt]="wall.name" />
              </div>
            }
            
            <!-- Wall Title Group -->
            <div class="wall-title-group">
              <p class="organization-name" [style.color]="wall.theme.titleColor">
                {{ wall.organizationName || 'Riverside' }}
              </p>
              <h1 class="wall-title" [style.color]="wall.theme.titleColor">
                {{ wall.name }}
              </h1>
              @if (wall.description) {
                <p class="wall-description" 
                   [style.color]="wall.theme.secondaryTextColor">
                  {{ wall.description }}
                </p>
              }
            </div>
            
            <!-- Quick Stats -->
            @if (wallItems$ | async; as items) {
              <div class="quick-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ items.length }}</span>
                  <span class="stat-label">{{ items.length === 1 ? 'Item' : 'Items' }}</span>
                </div>
                @if (objectTypes$ | async; as objectTypes) {
                  <div class="stat-item">
                    <span class="stat-number">{{ objectTypes.length }}</span>
                    <span class="stat-label">{{ objectTypes.length === 1 ? 'Type' : 'Types' }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
      
      <!-- Animated background with all wall items -->
      <div class="content-container" #container>
        <app-wall-item-list 
          [wallId]="wallId" 
          [showInLargeView]="true"
          [showToolbar]="false"
          [isBackgroundMode]="true"
          style="contain: content;">
        </app-wall-item-list>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      perspective: 1000px;
      pointer-events: none;
      contain: strict;
      border-radius: 25px;
      background: rgba(0,0,0,0.3);
      position: relative;
      overflow: hidden;
    }

    .content-container {
      width: 100%;
      height: 100%;
      scale: 2;
      position: relative;
      z-index: 1;
      pointer-events: none;
    }

    .title-container {
      position: absolute;
      z-index: 100;
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      grid-template-columns: 100%;
      grid-template-rows: 100%;
      pointer-events: none;
    }

    .blur-background {
      backdrop-filter: blur(3em);
      -webkit-backdrop-filter: blur(3em);
      -webkit-mask-image: radial-gradient(circle, black 20%, transparent 500px);
      mask-image: radial-gradient(circle, black 20%, transparent 500px);
      width: 1100px;
      aspect-ratio: 1/1;
      position: absolute;
    }

    .title-wrapper {
      width: min-content;
      height: min-content;
      min-width: 500px;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 10;
      font-size: 24px;
      pointer-events: auto;
      text-align: center;
    }

    .wall-logo img {
      width: 8em;
      height: 8em;
      object-fit: contain;
      margin-bottom: 1rem;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      padding: 1rem;
    }

    .wall-title-group {
      margin-bottom: 2rem;
    }

    .organization-name {
      font-size: 1em;
      font-weight: 500;
      margin: 0 0 0.5rem 0;
      opacity: 0.9;
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .wall-title {
      font-size: 2.5em;
      font-weight: 600;
      margin: 0 0 1rem 0;
      white-space: nowrap;
      text-shadow: 0 2px 12px rgba(0,0,0,0.4);
      letter-spacing: -0.02em;
    }

    .wall-description {
      font-size: 1.1em;
      font-weight: 400;
      margin: 0;
      opacity: 0.8;
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 600px;
      line-height: 1.4;
    }

    .quick-stats {
      display: flex;
      gap: 3rem;
      margin-top: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-number {
      font-size: 2.5em;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 12px rgba(0,0,0,0.4);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.9em;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .title-wrapper {
        min-width: 300px;
        font-size: 18px;
        padding: 0 1rem;
      }
      
      .wall-logo img {
        width: 6em;
        height: 6em;
      }
      
      .wall-title {
        font-size: 2em;
        white-space: normal;
        line-height: 1.1;
      }

      .wall-description {
        font-size: 1em;
      }

      .quick-stats {
        gap: 2rem;
      }

      .stat-number {
        font-size: 2em;
      }

      .stat-label {
        font-size: 0.8em;
      }
    }

    @media (max-width: 480px) {
      .title-wrapper {
        min-width: 280px;
        font-size: 16px;
      }

      .wall-title {
        font-size: 1.8em;
      }

      .quick-stats {
        gap: 1.5rem;
      }
    }
  `]
})
export class WallHomeComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true, read: ElementRef }) containerRef!: ElementRef;

  private destroy$ = new Subject<void>();
  
  wallId!: string;
  wall$!: Observable<Wall | null>;
  wallItems$!: Observable<WallItem[]>;
  objectTypes$!: Observable<WallObjectType[]>;
  
  public duration = 10000;
  private prevAngle = 0;
  private animationId?: number;

  constructor(
    private route: ActivatedRoute,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private navigationService: NavigationService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.wallId = this.route.snapshot.paramMap.get('id')!;
    
    // Load wall data
    this.wall$ = this.wallService.getWallById(this.wallId).pipe(
      takeUntil(this.destroy$)
    );

    // Load wall items  
    this.wallItems$ = this.wallItemService.getWallItems(this.wallId).pipe(
      takeUntil(this.destroy$)
    );

    // Extract object types from wall
    this.objectTypes$ = this.wall$.pipe(
      map(wall => wall?.objectTypes || [])
    );

    // Update navigation context when data is available - but debounce to prevent flashing
    setTimeout(() => {
      combineLatest([this.wall$, this.wallItems$]).subscribe(([wall, items]) => {
        if (wall) {
          // TODO: Get actual user permissions from auth service
          const canEdit = true; // Placeholder
          const canAdmin = true; // Placeholder
          const itemCount = items?.length || 0;
          this.navigationService.updateWallContext(wall, canEdit, canAdmin, itemCount);
        }
      });
    }, 100); // Small delay to allow navigation to settle
  }

  ngAfterViewInit() {
    // Start animation after a short delay to let content load
    setTimeout(() => {
      this.startAnimation();
    }, 1000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.navigationService.clearWallContext();
    
    // Clean up animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private getRandomAngle(): number {
    let randomAngle = (Math.random() * 90) - 45;
    while (Math.abs(randomAngle) < 20) {
      randomAngle = this.getRandomAngle();
    }
    return randomAngle;
  }

  private getRandomAngleX(): number {
    return Math.random() * 5;
  }

  private startAnimation = () => {
    if (!this.containerRef?.nativeElement) return;

    let randomAngle = this.getRandomAngle();
    while (Math.abs(randomAngle - this.prevAngle) < 20) {
      randomAngle = this.getRandomAngle();
    }
    
    const randomAngleX = this.getRandomAngleX();
    
    // Alternate direction based on previous angle
    if ((this.prevAngle < 0 && randomAngle < 0) || (this.prevAngle > 0 && randomAngle > 0)) {
      randomAngle = -randomAngle;
    }
    this.prevAngle = randomAngle;

    const offsetScale = 0.5;
    const randomStartX = Math.random() * 100 * offsetScale;
    const randomEndX = Math.random() * 100 * offsetScale;
    const randomStartY = Math.random() * 100 * offsetScale;
    const randomEndY = Math.random() * 100 * offsetScale;
    
    const elm = this.containerRef.nativeElement as HTMLDivElement;

    this.duration = (Math.random() * 5000) + 10000;
    
    const animation = elm.animate([
      {
        transform: `rotateY(${randomAngle}deg) rotateX(${randomAngleX}deg) translate(${randomStartX}%, ${randomStartY}%) scale(2)`
      },
      {
        transform: `rotateY(${randomAngle}deg) rotateX(${randomAngleX}deg) translate(${randomEndX}%, ${randomEndY}%) scale(2)`
      }
    ], {
      duration: this.duration,
      easing: 'linear',
    });

    animation.onfinish = () => {
      this.startAnimation();
    };
    
    this.cdr.detectChanges();
  }
}