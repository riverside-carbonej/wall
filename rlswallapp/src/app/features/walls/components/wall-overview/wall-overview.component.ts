import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, interval } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { Wall } from '../../../../shared/models/wall.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';

import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-wall-overview',
  standalone: true,
  imports: [
    CommonModule,
    MaterialIconComponent,
    EmptyStateComponent,
    PageLayoutComponent,
    ThemedButtonComponent
  ],
  template: `
    @if (!isLoading) {
      @if (currentWall) {
        <app-page-layout
          title="About"
          [actions]="getPageActions()"
          (backClick)="goBack()">
          
          <div class="page-content">
            <!-- Description Section -->
            <div class="description-section">
              @if (currentWall.description) {
                <div class="description-text" [innerHTML]="formatDescription(currentWall.description)"></div>
              } @else {
                <div class="no-description">No description has been provided for this wall.</div>
              }
            </div>

            <!-- Photo Gallery Section -->
            <div class="photo-gallery-section">
              @if (currentWall.galleryImages && currentWall.galleryImages.length > 0) {
                <div class="photo-gallery">
                  <!-- Main Display -->
                  <div class="main-photo-container">
                    <div class="main-photo" 
                         [style.background-image]="'url(' + getCurrentImage().url + ')'">
                      <div class="photo-overlay">
                        <div class="photo-navigation">
                          <app-themed-button 
                                  variant="icon"
                                  [icon]="'chevron_left'"
                                  [disabled]="currentWall.galleryImages.length <= 1"
                                  class="nav-button"
                                  (buttonClick)="previousImage()">
                          </app-themed-button>
                          <div class="photo-info">
                            <span class="photo-counter">
                              {{ currentImageIndex + 1 }} / {{ currentWall.galleryImages.length }}
                            </span>
                            @if (getCurrentImage().caption) {
                              <span class="photo-caption">{{ getCurrentImage().caption }}</span>
                            }
                          </div>
                          <app-themed-button 
                                  variant="icon"
                                  [icon]="'chevron_right'"
                                  [disabled]="currentWall.galleryImages.length <= 1"
                                  class="nav-button"
                                  (buttonClick)="nextImage()">
                          </app-themed-button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Thumbnail Strip -->
                  @if (currentWall.galleryImages.length > 1) {
                    <div class="thumbnail-strip">
                      @for (image of currentWall.galleryImages; track image.id; let i = $index) {
                        <div class="thumbnail" 
                             [class.active]="i === currentImageIndex"
                             [style.background-image]="'url(' + image.thumbnailUrl + ')'"
                             (click)="setCurrentImage(i)">
                        </div>
                      }
                    </div>
                  }

                  <!-- Slideshow Controls -->
                  <div class="slideshow-controls">
                    <app-themed-button
                      variant="raised"
                      [color]="isSlideshow ? 'accent' : 'primary'"
                      [icon]="isSlideshow ? 'pause' : 'play_arrow'"
                      [label]="(isSlideshow ? 'Pause' : 'Start') + ' Slideshow'"
                      (buttonClick)="toggleSlideshow()">
                    </app-themed-button>
                    @if (isSlideshow) {
                      <span class="slideshow-timing">{{ slideshowInterval / 1000 }}s per photo</span>
                    }
                  </div>
                </div>
              } @else {
                <!-- Photo Placeholders -->
                <div class="photo-placeholders">
                  <div class="main-placeholder"></div>
                  <div class="thumbnail-placeholders">
                    <div class="thumbnail-placeholder"></div>
                    <div class="thumbnail-placeholder"></div>
                    <div class="thumbnail-placeholder"></div>
                    <div class="thumbnail-placeholder"></div>
                  </div>
                </div>
              }
            </div>
            
            <!-- Wall Statistics -->
            <div class="statistics-footer">
              <div class="stats-container">
                <div class="stat-item">
                  <span class="stat-value">{{ totalItemCount }}</span>
                  <span class="stat-label">Entries</span>
                </div>
                <div class="stat-separator">•</div>
                <div class="stat-item">
                  <span class="stat-value">{{ currentWall.createdAt | date:'mediumDate' }}</span>
                  <span class="stat-label">Created</span>
                </div>
                <div class="stat-separator">•</div>
                <div class="stat-item">
                  <span class="stat-value">{{ currentWall.updatedAt | date:'mediumDate' }}</span>
                  <span class="stat-label">Last Updated</span>
                </div>
              </div>
            </div>
          </div>
        </app-page-layout>
      }
    }
  `,
  styles: [`
    /* Page Content */
    .page-content {
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    /* Description Section */
    .description-section {
      padding: 0 8px;
    }

    .description-text {
      font-size: 1.125rem;
      line-height: 1.7;
      color: var(--md-sys-color-on-surface);
      white-space: pre-wrap;
      margin: 0;
    }

    .no-description {
      color: var(--md-sys-color-on-surface-variant);
      font-style: italic;
      font-size: 1.125rem;
      line-height: 1.7;
      margin: 0;
    }

    /* Photo Gallery Section */
    .photo-gallery-section {
      margin-top: 8px;
    }

    /* Photo Placeholders */
    .photo-placeholders {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .main-placeholder {
      width: 100%;
      height: 300px;
      background: var(--md-sys-color-surface-container-low);
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant);
      opacity: 0.6;
    }

    .thumbnail-placeholders {
      display: flex;
      gap: 8px;
      justify-content: flex-start;
    }

    .thumbnail-placeholder {
      width: 80px;
      height: 60px;
      background: var(--md-sys-color-surface-container-low);
      border-radius: 6px;
      border: 1px solid var(--md-sys-color-outline-variant);
      opacity: 0.5;
      flex-shrink: 0;
    }


    /* Photo Gallery */
    .photo-gallery {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .main-photo-container {
      position: relative;
      width: 100%;
      height: 400px;
      border-radius: 12px;
      overflow: hidden;
      background: var(--md-sys-color-surface-variant);
    }

    .main-photo {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      position: relative;
    }

    .photo-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      padding: 20px;
    }

    .photo-navigation {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
    }

    .nav-button {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .nav-button:hover:not([disabled]) {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.1);
    }

    .nav-button[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .photo-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .photo-counter {
      font-size: 0.875rem;
      font-weight: 600;
      background: rgba(0, 0, 0, 0.6);
      padding: 4px 12px;
      border-radius: 16px;
    }

    .photo-caption {
      font-size: 1rem;
      text-align: center;
      max-width: 300px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
    }

    .thumbnail-strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 8px 0;
      scrollbar-width: thin;
    }

    .thumbnail {
      width: 80px;
      height: 60px;
      background-size: cover;
      background-position: center;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0.7;
      border: 2px solid transparent;
      flex-shrink: 0;
    }

    .thumbnail:hover {
      opacity: 1;
      transform: scale(1.05);
    }

    .thumbnail.active {
      opacity: 1;
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 2px rgba(var(--md-sys-color-primary-rgb), 0.2);
    }

    .slideshow-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: center;
      padding: 16px 0;
    }

    .control-button {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--md-sys-color-primary) !important;
      color: var(--md-sys-color-on-primary) !important;
      box-shadow: var(--md-sys-elevation-1) !important;
      border-radius: 200px !important;
      padding: 12px 24px !important;
      font-weight: 500 !important;
      text-transform: none !important;
      border: none !important;
      transition: all 0.2s ease;
    }

    .control-button:hover {
      background-color: var(--md-sys-color-primary) !important;
      box-shadow: var(--md-sys-elevation-3) !important;
      transform: translateY(-2px);
    }

    .control-button.active {
      background-color: var(--md-sys-color-secondary) !important;
      color: var(--md-sys-color-on-secondary) !important;
    }

    .slideshow-timing {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      background: var(--md-sys-color-surface-variant);
      padding: 8px 16px;
      border-radius: 16px;
    }

    /* Statistics Footer */
    .statistics-footer {
      margin-top: 48px;
      padding: 20px 0 8px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }

    .stats-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .stat-separator {
      font-size: 0.875rem;
      color: var(--md-sys-color-outline);
      font-weight: 400;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page-header {
        padding: 16px;
      }

      .header-content {
        gap: 12px;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .page-content {
        padding: 0 16px 16px;
        gap: 16px;
      }

      .main-photo-container {
        height: 300px;
      }

      .main-placeholder {
        height: 250px;
      }

      .photo-navigation {
        flex-direction: column;
        gap: 12px;
      }

      .nav-button {
        width: 40px !important;
        height: 40px !important;
      }

      .stats-container {
        gap: 12px;
      }

      .stat-separator {
        display: none;
      }

      .statistics-footer {
        margin-top: 32px;
      }
    }

    @media (max-width: 480px) {
      .header-actions, .back-button {
        position: static;
      }

      .header-content {
        flex-direction: column;
        text-align: center;
      }

      .header-info {
        order: -1;
      }
    }
  `]
})
export class WallOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  wallId!: string;
  wall$!: Observable<Wall | null>;
  isLoading = true;
  canEdit = false; // Will be set from navigation context
  totalItemCount = 0; // Will be set from navigation context

  // Gallery state
  currentImageIndex = 0;
  isSlideshow = false;
  slideshowInterval = 5000; // 5 seconds
  private slideshowTimer?: ReturnType<typeof setInterval>;
  currentWall: Wall | null = null;

  descriptionEmptyActions: EmptyStateAction[] = [
    {
      label: 'Add Description',
      icon: 'edit',
      primary: false,
      action: () => this.editWall()
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private navigationService: NavigationService,
    private authService: AuthService
  ) {}

  getPageActions(): PageAction[] {
    const actions: PageAction[] = [];
    
    if (this.canEdit) {
      actions.push({
        label: 'Edit Details',
        icon: 'edit',
        variant: 'raised',
        color: 'primary',
        action: () => this.editWall()
      });
    }
    
    return actions;
  }

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('id')!;
    
    if (!this.wallId) {
      this.router.navigate(['/walls']);
      return;
    }

    // Load wall data - use public method if not authenticated
    const currentUser = this.authService.currentUser;
    this.wall$ = (currentUser 
      ? this.wallService.getWallById(this.wallId)
      : this.wallService.getWallByIdPublic(this.wallId)
    ).pipe(
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    // Set component state
    this.wall$.subscribe(wall => {
      if (wall) {
        this.currentWall = wall;
        // Get permissions from navigation context set by the guard
        const wallContext = this.navigationService.currentContext;
        this.canEdit = wallContext?.canEdit ?? false;
        this.totalItemCount = wallContext?.totalItemCount ?? 0;
        
        console.log('🔍 WallOverviewComponent: Permissions from context', {
          wallId: this.wallId,
          canEdit: this.canEdit,
          canAdmin: wallContext?.canAdmin,
          totalItemCount: this.totalItemCount,
          wallContext
        });
      }
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopSlideshow();
  }

  goBack(): void {
    this.router.navigate(['/walls', this.wallId]);
  }

  editWall(): void {
    this.router.navigate(['/walls', this.wallId, 'edit']);
  }

  formatDescription(description: string): string {
    // Simple formatting - convert line breaks to <br> tags
    return description.replace(/\n/g, '<br>');
  }

  // Gallery methods
  getCurrentImage(): any {
    if (this.currentWall?.galleryImages && this.currentWall.galleryImages.length > 0) {
      return this.currentWall.galleryImages[this.currentImageIndex];
    }
    return { url: '', thumbnailUrl: '', caption: '', id: '' };
  }

  setCurrentImage(index: number): void {
    this.currentImageIndex = index;
  }

  nextImage(): void {
    if (this.currentWall?.galleryImages && this.currentWall.galleryImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.currentWall.galleryImages.length;
    }
  }

  previousImage(): void {
    if (this.currentWall?.galleryImages && this.currentWall.galleryImages.length > 0) {
      this.currentImageIndex = this.currentImageIndex === 0 
        ? this.currentWall.galleryImages.length - 1 
        : this.currentImageIndex - 1;
    }
  }

  toggleSlideshow(): void {
    if (this.isSlideshow) {
      this.stopSlideshow();
    } else {
      this.startSlideshow();
    }
  }

  private startSlideshow(): void {
    this.isSlideshow = true;
    this.slideshowTimer = setInterval(() => {
      this.nextImage();
    }, this.slideshowInterval);
  }

  private stopSlideshow(): void {
    this.isSlideshow = false;
    if (this.slideshowTimer) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = undefined;
    }
  }
}