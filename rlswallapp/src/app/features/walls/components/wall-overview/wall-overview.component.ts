import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil, interval } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { WallService } from '../../services/wall.service';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { Wall } from '../../../../shared/models/wall.model';
import { SideButtonComponent } from '../../../../shared/components/side-button/side-button.component';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-wall-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    SideButtonComponent
  ],
  template: `
    @if (!isLoading) {
      @if (currentWall) {
        <!-- Content with integrated header -->
        <div class="page-content">
          <!-- Header content integrated into page -->
          <div class="header-content">
            <app-side-button 
              title="Back" 
              icon="arrow_back" 
              (buttonClick)="goBack()"
              class="back-button">
            </app-side-button>
            <div class="header-info">
              <h1 class="page-title">{{ currentWall.name }}</h1>
              <p class="page-subtitle">Overview</p>
            </div>
            @if (canEdit) {
              <div class="header-actions">
                <app-side-button 
                  title="Edit Details" 
                  icon="edit" 
                  (buttonClick)="editWall()"
                  class="edit-button">
                </app-side-button>
              </div>
            }
          </div>
          <!-- Description Section -->
          <mat-card class="content-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>description</mat-icon>
                Description
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (currentWall.description) {
                <div class="description-text" [innerHTML]="formatDescription(currentWall.description)"></div>
              } @else {
                @if (canEdit) {
                  <div class="empty-state-custom">
                    <mat-icon class="empty-icon">description</mat-icon>
                    <h3 class="empty-title">No Description Yet</h3>
                    <p class="empty-message">Add a description to help visitors understand what this wall is about.</p>
                    <button mat-raised-button color="primary" (click)="editWall()" class="empty-action">
                      <mat-icon>edit</mat-icon>
                      Add Description
                    </button>
                  </div>
                } @else {
                  <p class="no-description">No description available for this wall.</p>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Photo Gallery Section -->
          <mat-card class="content-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>photo_library</mat-icon>
                Photo Gallery
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (currentWall.galleryImages && currentWall.galleryImages.length > 0) {
                <div class="photo-gallery">
                  <!-- Main Display -->
                  <div class="main-photo-container">
                    <div class="main-photo" 
                         [style.background-image]="'url(' + getCurrentImage().url + ')'">
                      <div class="photo-overlay">
                        <div class="photo-navigation">
                          <button mat-icon-button 
                                  (click)="previousImage()" 
                                  [disabled]="currentWall.galleryImages.length <= 1"
                                  class="nav-button">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <div class="photo-info">
                            <span class="photo-counter">
                              {{ currentImageIndex + 1 }} / {{ currentWall.galleryImages.length }}
                            </span>
                            @if (getCurrentImage().caption) {
                              <span class="photo-caption">{{ getCurrentImage().caption }}</span>
                            }
                          </div>
                          <button mat-icon-button 
                                  (click)="nextImage()" 
                                  [disabled]="currentWall.galleryImages.length <= 1"
                                  class="nav-button">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
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
                    <button mat-raised-button
                            [class.active]="isSlideshow"
                            (click)="toggleSlideshow()"
                            class="control-button"
                            [color]="isSlideshow ? 'accent' : 'primary'">
                      <mat-icon>{{ isSlideshow ? 'pause' : 'play_arrow' }}</mat-icon>
                      {{ isSlideshow ? 'Pause' : 'Start' }} Slideshow
                    </button>
                    @if (isSlideshow) {
                      <span class="slideshow-timing">{{ slideshowInterval / 1000 }}s per photo</span>
                    }
                  </div>
                </div>
              } @else {
                @if (canEdit) {
                  <div class="empty-state-custom">
                    <mat-icon class="empty-icon">photo_library</mat-icon>
                    <h3 class="empty-title">No Photos Yet</h3>
                    <p class="empty-message">Add photos to create a gallery showcasing this wall's content and context.</p>
                    <button mat-raised-button color="primary" (click)="editWall()" class="empty-action">
                      <mat-icon>add_photo_alternate</mat-icon>
                      Add Photos
                    </button>
                  </div>
                } @else {
                  <p class="no-gallery">No photos available for this wall.</p>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Wall Statistics -->
          <mat-card class="content-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>analytics</mat-icon>
                Wall Statistics
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ currentWall.objectTypes.length || 0 }}</div>
                  <div class="stat-label">Item Types</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ totalItemCount }}</div>
                  <div class="stat-label">Total Items</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ currentWall.createdAt | date:'mediumDate' }}</div>
                  <div class="stat-label">Created</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ currentWall.updatedAt | date:'mediumDate' }}</div>
                  <div class="stat-label">Last Updated</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    }
  `,
  styles: [`
    /* Page Content - Uses app's scroll container */
    .page-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    /* Header content integrated into page */
    .header-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      position: relative;
      min-height: 80px;
      margin-bottom: 24px;
    }

    .back-button {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: auto !important;
      min-width: 120px;
    }

    .header-info {
      text-align: center;
      flex: 1;
    }

    .page-title {
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
    }

    .page-subtitle {
      margin: 8px 0 0 0;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .header-actions {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
    }

    .edit-button {
      width: auto !important;
      min-width: 140px;
    }

    /* Content Cards - Use header background color */
    .content-card {
      border-radius: 16px;
      box-shadow: var(--md-sys-elevation-1);
      background: var(--md-sys-color-surface-container);
    }

    .content-card mat-card-header {
      padding-bottom: 16px;
    }

    .content-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .content-card mat-card-title mat-icon {
      color: var(--md-sys-color-primary);
    }

    /* Description */
    .description-text {
      font-size: 1.1rem;
      line-height: 1.6;
      color: var(--md-sys-color-on-surface);
      white-space: pre-wrap;
    }

    .no-description {
      color: var(--md-sys-color-on-surface-variant);
      font-style: italic;
      margin: 0;
    }

    /* Custom Empty State */
    .empty-state-custom {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      min-height: 200px;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
    }

    .empty-message {
      font-size: 1rem;
      color: var(--md-sys-color-on-surface-variant);
      margin: 0 0 24px 0;
      line-height: 1.5;
      max-width: 400px;
    }

    .empty-action {
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

    .empty-action:hover {
      background-color: var(--md-sys-color-primary) !important;
      box-shadow: var(--md-sys-elevation-2) !important;
      transform: translateY(-1px);
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

    .no-gallery {
      color: var(--md-sys-color-on-surface-variant);
      font-style: italic;
      margin: 0;
    }

    /* Statistics */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 20px;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background: var(--md-sys-color-surface-variant);
      border-radius: 12px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--md-sys-color-primary);
      margin-bottom: 8px;
      display: block;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
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

      .photo-navigation {
        flex-direction: column;
        gap: 12px;
      }

      .nav-button {
        width: 40px !important;
        height: 40px !important;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .stat-value {
        font-size: 1.5rem;
      }

      .stat-item {
        padding: 12px;
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
  canEdit = true; // TODO: Get from auth service
  totalItemCount = 0; // TODO: Get from wall items service

  // Gallery state
  currentImageIndex = 0;
  isSlideshow = false;
  slideshowInterval = 5000; // 5 seconds
  private slideshowTimer?: ReturnType<typeof setInterval>;
  currentWall: Wall | null = null;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('id')!;
    
    if (!this.wallId) {
      this.router.navigate(['/walls']);
      return;
    }

    // Load wall data - navigation context is already set by the guard
    this.wall$ = this.wallService.getWallById(this.wallId).pipe(
      filter(wall => wall !== null),
      takeUntil(this.destroy$)
    ) as Observable<Wall>;

    // Set component state
    this.wall$.subscribe(wall => {
      if (wall) {
        this.currentWall = wall;
        // TODO: Get actual permissions and item count
        this.canEdit = true; // Already handled in guard
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