import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { WallItemService } from '../../../wall-items/services/wall-item.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { WallItemsGridComponent } from '../../../wall-items/components/wall-items-grid/wall-items-grid.component';

@Component({
  selector: 'app-wall-home',
  standalone: true,
  imports: [CommonModule, WallItemsGridComponent],
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
            
            <!-- Organization Logo -->
            <div class="organization-logo">
              <img [src]="getLogoUrl(wall)" [alt]="wall.organizationName || 'Riverside'" />
            </div>
            
            <!-- Wall Title Group -->
            <div class="wall-title-group">
              <p class="organization-name" [style.color]="wall.theme.titleColor">
                {{ wall.organizationSubtitle || 'Riverside Local Schools' }}
              </p>
              <h1 class="wall-title" [style.color]="wall.theme.titleColor">
                {{ wall.name }}
              </h1>
            </div>
          </div>
        }
      </div>
      
      <!-- Animated background with all wall items -->
      <div class="content-container" #container>
        <app-wall-items-grid
          [items]="(wallItems$ | async) || []"
          [preset]="null"
          [viewMode]="'grid'"
          [selectedItems]="[]"
          [pageSize]="100"
          [pageIndex]="0"
          style="contain: content; pointer-events: none;">
        </app-wall-items-grid>
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
      scale: 1.0;
      position: relative;
      z-index: 1;
      pointer-events: none;
      transform-style: preserve-3d;
      transform: perspective(1000px);
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
      background: radial-gradient(circle, 
        color-mix(in srgb, var(--md-sys-color-background) 95%, transparent) 0%, 
        color-mix(in srgb, var(--md-sys-color-background) 95%, transparent) 11%, 
        color-mix(in srgb, var(--md-sys-color-background) 90%, transparent) 18%, 
        color-mix(in srgb, var(--md-sys-color-background) 85%, transparent) 22%, 
        color-mix(in srgb, var(--md-sys-color-background) 80%, transparent) 26%, 
        color-mix(in srgb, var(--md-sys-color-background) 75%, transparent) 30%, 
        color-mix(in srgb, var(--md-sys-color-background) 70%, transparent) 35%, 
        color-mix(in srgb, var(--md-sys-color-background) 60%, transparent) 40%, 
        color-mix(in srgb, var(--md-sys-color-background) 50%, transparent) 45%, 
        color-mix(in srgb, var(--md-sys-color-background) 40%, transparent) 50%, 
        color-mix(in srgb, var(--md-sys-color-background) 30%, transparent) 55%, 
        color-mix(in srgb, var(--md-sys-color-background) 5%, transparent) 66%, 
        transparent 75%);
      width: 2000px;
      aspect-ratio: 1/1;
      position: absolute;
    }

    .title-wrapper {
      width: max-content;
      height: min-content;
      min-width: min(500px, 90vw);
      max-width: 90vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 10;
      font-size: 24px;
      pointer-events: auto;
      text-align: center;
      padding: 0 1rem;
    }

    .organization-logo {
      margin-bottom: 2rem;
    }

    .organization-logo img {
      width: 10em;
      height: 10em;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      margin-bottom: -1.5em;
    }

    .wall-title-group {
      margin-bottom: 0;
    }

    .organization-name {
      font-size: 1em;
      font-weight: 500;
      margin: 0 0 1.5rem 0;
      opacity: 0.9;
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .wall-title {
      font-size: 2.5em;
      font-weight: 600;
      line-height: 1.3;
      margin: 0 0 1rem 0;
      text-shadow: 0 2px 12px rgba(0,0,0,0.4);
      letter-spacing: -0.02em;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      max-width: 100%;
    }

    /* Responsive adjustments for narrow screens */
    @media (max-width: 768px) {
      .title-wrapper {
        font-size: 18px;
      }
      
      .organization-logo img {
        width: 8em;
        height: 8em;
      }
      
      .wall-title {
        font-size: 2em;
      }
    }

    @media (max-width: 480px) {
      .title-wrapper {
        font-size: 16px;
      }
      
      .organization-logo img {
        width: 6em;
        height: 6em;
      }
      
      .wall-title {
        font-size: 1.75em;
      }
      
      .organization-name {
        font-size: 0.9em;
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

    // Navigation context is already set by wallContextGuard before this component loads
  }

  ngAfterViewInit() {
    // Start animation immediately
    this.startAnimation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  getLogoUrl(wall: Wall): string {
    // Use organization logo if set, otherwise default to Riverside logo
    return wall.organizationLogoUrl || '/assets/images/beaver-logo.png';
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
        transform: `perspective(1000px) rotateY(${randomAngle}deg) rotateX(${randomAngleX}deg) translate3d(${randomStartX}%, ${randomStartY}%, 0) scale(1.0)`
      },
      {
        transform: `perspective(1000px) rotateY(${randomAngle}deg) rotateX(${randomAngleX}deg) translate3d(${randomEndX}%, ${randomEndY}%, 0) scale(1.0)`
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