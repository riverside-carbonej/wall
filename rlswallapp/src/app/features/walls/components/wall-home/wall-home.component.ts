import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { WallItemService } from '../../../wall-items/services/wall-item.service';
import { Wall, WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { AuthService } from '../../../../core/services/auth.service';
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
      
      <!-- Animated background with ALL wall items from all object types mixed together -->
      <div class="content-container" #container>
        @if ((wallItems$ | async); as items) {
          @if (items.length > 0) {
            @if ((wall$ | async); as wall) {
              <app-wall-items-grid
                [items]="items"
                [wall]="wall"
                [preset]="null"
                [viewMode]="'grid'"
                [selectedItems]="[]"
                [pageSize]="200"
                [pageIndex]="0"
                [canEdit]="false"
                style="contain: content; pointer-events: none;">
              </app-wall-items-grid>
            }
          } @else {
            <!-- Fallback when no items -->
            <div class="no-items-fallback">
              <div class="placeholder-grid">
                @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
                  <div class="placeholder-card"></div>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      contain: strict;
      border-radius: 25px;
      background: rgba(0,0,0,0.3);
      position: relative;
      overflow: hidden;
    }

    .content-container {
      width: 200%;
      height: 300%;
      position: absolute;
      top: -50%;  /* Position to show upper-middle content */
      left: -50%;
      z-index: 1;
      pointer-events: none;
      transform-style: preserve-3d;
      transform: perspective(2000px) scale(1.1);
    }

    .no-items-fallback {
      width: 100%;
      height: 100%;
      padding: 2rem;
    }

    .placeholder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
      width: 100%;
      height: 100%;
    }

    .placeholder-card {
      background: linear-gradient(135deg, 
        rgba(var(--md-sys-color-primary-rgb), 0.1) 0%, 
        rgba(var(--md-sys-color-secondary-rgb), 0.1) 100%);
      border-radius: 12px;
      height: 200px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
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
        color-mix(in srgb, var(--md-sys-color-background) 90%, transparent) 0%, 
        color-mix(in srgb, var(--md-sys-color-background) 90%, transparent) 11%, 
        color-mix(in srgb, var(--md-sys-color-background) 85%, transparent) 18%, 
        color-mix(in srgb, var(--md-sys-color-background) 80%, transparent) 22%, 
        color-mix(in srgb, var(--md-sys-color-background) 75%, transparent) 26%, 
        color-mix(in srgb, var(--md-sys-color-background) 70%, transparent) 30%, 
        color-mix(in srgb, var(--md-sys-color-background) 65%, transparent) 35%, 
        color-mix(in srgb, var(--md-sys-color-background) 55%, transparent) 40%, 
        color-mix(in srgb, var(--md-sys-color-background) 45%, transparent) 45%, 
        color-mix(in srgb, var(--md-sys-color-background) 35%, transparent) 50%, 
        color-mix(in srgb, var(--md-sys-color-background) 25%, transparent) 55%, 
        color-mix(in srgb, var(--md-sys-color-background) 5%, transparent) 66%, 
        transparent 75%);
      width: 800px;
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
        font-size: 24px;
      }
      
      .organization-logo img {
        width: 10em;
        height: 10em;
      }
      
      .wall-title {
        font-size: 2.5em;
      }
    }

    @media (max-width: 480px) {
      .title-wrapper {
        font-size: 19.2px;
      }
      
      .organization-logo img {
        width: 8em;
        height: 8em;
      }
      
      .wall-title {
        font-size: 2em;
      }
      
      .organization-name {
        font-size: 0.8em;
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

  // Page rotation tracking
  private currentPage = 0;
  private cutsSinceLastPageChange = 0;
  private cutsBeforeNextPageChange = 3; // Always 3 cuts before page change
  private allPages: WallItem[][] = [];

  constructor(
    private route: ActivatedRoute,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.wallId = this.route.snapshot.paramMap.get('id')!;
    
    // Load wall data - use public method if not authenticated
    const currentUser = this.authService.currentUser;
    this.wall$ = (currentUser 
      ? this.wallService.getWallById(this.wallId)
      : this.wallService.getWallByIdPublic(this.wallId)
    ).pipe(
      takeUntil(this.destroy$)
    );

    // Extract object types from wall
    this.objectTypes$ = this.wall$.pipe(
      map(wall => wall?.objectTypes || [])
    );

    // Load ALL wall items and create pages with picture prioritization
    this.wallItemService.getWallItems(this.wallId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(items => {
      if (items.length === 0) {
        this.allPages = [[]];
        return;
      }

      // Shuffle helper using Fisher-Yates
      const shuffle = <T,>(arr: T[]): T[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Separate items with and without pictures
      const itemsWithPics = shuffle(items.filter(item => item.images && item.images.length > 0));
      const itemsWithoutPics = shuffle(items.filter(item => !item.images || item.images.length === 0));

      const totalItems = items.length;
      const pageSize = 200;
      const totalPages = Math.ceil(totalItems / pageSize);

      // Calculate how many items with pics should be on each page (aim for 50%+ but distribute evenly)
      const totalWithPics = itemsWithPics.length;
      const totalWithoutPics = itemsWithoutPics.length;

      // Create pages ensuring all items are used
      this.allPages = [];
      let withPicsIndex = 0;
      let withoutPicsIndex = 0;

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const page: WallItem[] = [];

        const remainingWithPics = totalWithPics - withPicsIndex;
        const remainingWithoutPics = totalWithoutPics - withoutPicsIndex;
        const remainingPages = totalPages - pageNum;

        let picsForThisPage: number;
        let noPicsForThisPage: number;

        if (remainingWithPics === 0) {
          // No more pics, use all remaining without pics
          picsForThisPage = 0;
          noPicsForThisPage = Math.min(pageSize, remainingWithoutPics);
        } else if (remainingWithoutPics === 0) {
          // No more without pics, use all remaining with pics
          picsForThisPage = Math.min(remainingWithPics, pageSize);
          noPicsForThisPage = 0;
        } else {
          // Distribute naturally based on ratio in collection, but ensure at least 50% with pics
          const naturalRatio = totalWithPics / totalItems;
          const minPicsRatio = 0.5; // Minimum 50% with pictures
          const targetRatio = Math.max(naturalRatio, minPicsRatio);

          const idealPicsPerPage = Math.ceil(pageSize * targetRatio);
          const maxPicsAvailable = Math.min(remainingWithPics, pageSize);
          const minPicsNeeded = Math.max(0, remainingWithPics - (remainingPages - 1) * pageSize);

          picsForThisPage = Math.max(minPicsNeeded, Math.min(idealPicsPerPage, maxPicsAvailable));
          noPicsForThisPage = Math.min(pageSize - picsForThisPage, remainingWithoutPics);
        }

        // Add items to page
        if (picsForThisPage > 0) {
          page.push(...itemsWithPics.slice(withPicsIndex, withPicsIndex + picsForThisPage));
          withPicsIndex += picsForThisPage;
        }

        if (noPicsForThisPage > 0) {
          page.push(...itemsWithoutPics.slice(withoutPicsIndex, withoutPicsIndex + noPicsForThisPage));
          withoutPicsIndex += noPicsForThisPage;
        }

        // If page has fewer than 200 items, cycle back and add more to reach 200
        while (page.length < pageSize && items.length > 0) {
          const remainingNeeded = pageSize - page.length;
          const itemsToCycle = shuffle([...items]).slice(0, remainingNeeded);
          page.push(...itemsToCycle);
        }

        // Shuffle the page for variety
        this.allPages.push(shuffle(page));
      }

      // Start with a random page
      this.currentPage = Math.floor(Math.random() * this.allPages.length);
    });

    // Create observable that returns current page
    this.wallItems$ = new Observable<WallItem[]>(observer => {
      const interval = setInterval(() => {
        if (this.allPages.length > 0) {
          observer.next(this.allPages[this.currentPage]);
        }
      }, 100);

      return () => clearInterval(interval);
    });

    // Navigation context is already set by wallContextGuard before this component loads
  }

  ngAfterViewInit() {
    // Delay animation start to avoid conflicts with initial render
    setTimeout(() => this.startAnimation(), 500);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
    }
  }
  
  private currentAnimation?: Animation;

  getLogoUrl(wall: Wall): string {
    // Use organization logo if set, otherwise default to Riverside logo
    return wall.organizationLogoUrl || '/assets/images/beaver-logo.png';
  }

  private switchToNextPage(): void {
    if (this.allPages.length <= 1) return;

    // Pick a different random page
    let newPage: number;
    do {
      newPage = Math.floor(Math.random() * this.allPages.length);
    } while (newPage === this.currentPage && this.allPages.length > 1);

    this.currentPage = newPage;
    this.cutsSinceLastPageChange = 0;
  }

  private getRandomAngle(): number {
    // Much wider angle range with more variation (20-80 degrees)
    const minAngle = 20 + Math.random() * 20; // 20-40 minimum
    const maxAngle = 60 + Math.random() * 20; // 60-80 maximum
    const range = maxAngle - minAngle;
    
    let randomAngle = (Math.random() * range * 2) - range;
    
    // Ensure minimum rotation for visibility
    if (Math.abs(randomAngle) < minAngle) {
      randomAngle = randomAngle < 0 ? -minAngle : minAngle;
    }
    
    return randomAngle;
  }

  private getRandomAngleX(): number {
    // More varied X rotation (3-12 degrees)
    return 3 + Math.random() * 9;
  }

  private startAnimation = () => {
    if (!this.containerRef?.nativeElement) return;
    
    // Cancel any existing animation
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
    }

    let randomAngle = this.getRandomAngle();
    let attempts = 0;
    while (Math.abs(randomAngle - this.prevAngle) < 8 && attempts < 10) {
      randomAngle = this.getRandomAngle();
      attempts++;
    }
    
    const randomAngleX = this.getRandomAngleX();
    
    // Alternate direction based on previous angle
    if ((this.prevAngle < 0 && randomAngle < 0) || (this.prevAngle > 0 && randomAngle > 0)) {
      randomAngle = -randomAngle;
    }
    this.prevAngle = randomAngle;

    // Much more dramatic camera movement
    const offsetScale = 0.6; // Increased for much more movement
    const randomStartX = (Math.random() * 100 - 50) * offsetScale; // Much wider X range
    const randomEndX = (Math.random() * 100 - 50) * offsetScale;
    // Y movement balanced around center
    const randomStartY = (Math.random() * 60 - 30) * offsetScale; // Balanced movement
    const randomEndY = (Math.random() * 60 - 30) * offsetScale;
    
    const elm = this.containerRef.nativeElement as HTMLDivElement;

    // Slower, longer animation for more relaxed movement
    this.duration = (Math.random() * 8000) + 18000;
    
    try {
      this.currentAnimation = elm.animate([
        {
          transform: `perspective(2000px) rotateY(${randomAngle}deg) rotateX(${randomAngleX}deg) translate3d(${randomStartX}%, ${randomStartY}%, 0) scale(1.1)`
        },
        {
          transform: `perspective(2000px) rotateY(${randomAngle}deg) rotateX(${randomAngleX}deg) translate3d(${randomEndX}%, ${randomEndY}%, 0) scale(1.1)`
        }
      ], {
        duration: this.duration,
        easing: 'linear',
      });

      this.currentAnimation.onfinish = () => {
        // Track cuts and switch pages after 3-5 cuts
        this.cutsSinceLastPageChange++;

        if (this.cutsSinceLastPageChange >= this.cutsBeforeNextPageChange) {
          this.switchToNextPage();
        }

        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
          this.startAnimation();
        });
      };
    } catch (error) {
      console.error('Animation error:', error);
    }
  }
}