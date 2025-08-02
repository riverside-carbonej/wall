import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { Wall } from '../../../../shared/models/wall.model';

@Component({
  selector: 'app-wall-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="docs-homepage">
      <!-- Template Gallery -->
      <section class="template-section">
        <div class="section-header">
          <h2>Start a new wall</h2>
        </div>
        <div class="template-gallery">
          <div class="template-item blank-template" (click)="createBlankWall()">
            <div class="template-icon">
              <svg viewBox="0 0 24 24" width="56" height="56">
                <path fill="#d4af37" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path fill="#202124" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
            </div>
            <span class="template-label">Blank</span>
          </div>
          
          <div class="template-item" (click)="createFromTemplate('alumni')">
            <div class="template-icon alumni-template">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="#d4af37" d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
              </svg>
            </div>
            <span class="template-label">Alumni Directory</span>
          </div>

          <div class="template-item" (click)="createFromTemplate('veterans')">
            <div class="template-icon veterans-template">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="#d4af37" d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A0.5,0.5 0 0,0 7,13.5A0.5,0.5 0 0,0 7.5,14A0.5,0.5 0 0,0 8,13.5A0.5,0.5 0 0,0 7.5,13M16.5,13A0.5,0.5 0 0,0 16,13.5A0.5,0.5 0 0,0 16.5,14A0.5,0.5 0 0,0 17,13.5A0.5,0.5 0 0,0 16.5,13Z"/>
              </svg>
            </div>
            <span class="template-label">Veterans Registry</span>
          </div>

          <div class="template-item" (click)="createFromTemplate('team')">
            <div class="template-icon team-template">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="#d4af37" d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,14C12.42,14 16,15.79 16,18V20H0V18C0,15.79 3.58,14 8,14Z"/>
              </svg>
            </div>
            <span class="template-label">Team Directory</span>
          </div>
        </div>
      </section>

      <!-- Recent Walls -->
      <section class="recent-section">
        <div class="section-header">
          <h2>Recent walls</h2>
          <div class="view-controls">
            <button class="view-toggle" [class.active]="viewMode === 'grid'" (click)="setViewMode('grid')">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3"/>
              </svg>
            </button>
            <button class="view-toggle" [class.active]="viewMode === 'list'" (click)="setViewMode('list')">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M3,5H21V7H3V5M3,13V11H21V13H3M3,19V17H21V19H3Z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="search-filter" *ngIf="(filteredWalls$ | async)?.length || searchTerm">
          <div class="search-container">
            <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#5f6368" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search walls..." 
              [(ngModel)]="searchTerm"
              (input)="onSearchChange($event)"
              class="search-input"
            >
          </div>
        </div>

        <div class="walls-container" [class.list-view]="viewMode === 'list'" [class.grid-view]="viewMode === 'grid'">
          <div *ngIf="filteredWalls$ | async as walls">
            <div class="wall-item" *ngFor="let wall of walls; trackBy: trackByWallId" (click)="openWall(wall.id!)">
              <div class="wall-thumbnail">
                <div class="wall-preview" [style.background]="getWallGradient(wall)">
                  <div class="preview-content">
                    <div class="preview-dots">
                      <div class="dot"></div>
                      <div class="dot"></div>
                      <div class="dot"></div>
                    </div>
                    <div class="preview-lines">
                      <div class="line long"></div>
                      <div class="line medium"></div>
                      <div class="line short"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="wall-info">
                <h3 class="wall-title">{{ wall.name }}</h3>
                <div class="wall-meta">
                  <span class="wall-date">{{ getFormattedDate(wall.updatedAt) }}</span>
                  <span class="wall-fields">{{ wall.fields.length }} fields</span>
                </div>
              </div>
              <div class="wall-menu">
                <button class="menu-button" (click)="toggleMenu(wall.id!, $event)">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
                  </svg>
                </button>
                <div class="menu-dropdown" *ngIf="openMenuId === wall.id" (click)="$event.stopPropagation()">
                  <button (click)="openWall(wall.id!)">Open</button>
                  <button (click)="editWall(wall.id!)">Edit</button>
                  <button (click)="duplicateWall(wall.id!)">Make a copy</button>
                  <button (click)="deleteWall(wall.id!)" class="delete-option">Delete</button>
                </div>
              </div>
            </div>

            <div class="empty-state" *ngIf="walls.length === 0 && !isLoading">
              <div class="empty-illustration">
                <svg viewBox="0 0 200 120" width="200" height="120" class="empty-svg">
                  <rect x="40" y="20" width="120" height="80" rx="8" class="svg-surface"/>
                  <rect x="50" y="30" width="100" height="6" rx="3" class="svg-line"/>
                  <rect x="50" y="45" width="80" height="4" rx="2" class="svg-line"/>
                  <rect x="50" y="55" width="60" height="4" rx="2" class="svg-line"/>
                  <circle cx="70" cy="75" r="8" class="svg-dot svg-dot-1"/>
                  <circle cx="90" cy="75" r="8" class="svg-dot svg-dot-2"/>
                  <circle cx="110" cy="75" r="8" class="svg-dot svg-dot-3"/>
                </svg>
              </div>
              <h3>No walls yet</h3>
              <p>Create your first wall to get started with organizing your data</p>
              <button class="primary-button" (click)="createBlankWall()">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
                Create wall
              </button>
            </div>
          </div>
        </div>

        <div class="loading-state" *ngIf="isLoading">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>Loading your walls...</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .docs-homepage {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
      background: var(--md-sys-color-background);
    }

    /* Template Section */
    .template-section {
      margin-bottom: 48px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-header h2 {
      font-size: 22px;
      font-weight: 400;
      color: var(--md-sys-color-on-background);
      margin: 0;
    }

    .template-gallery {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding: 8px 0 16px 0;
      margin: 0 -8px;
    }

    .template-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 120px;
      padding: 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      position: relative;
      z-index: 1;
    }

    .template-item:hover {
      box-shadow: var(--md-sys-elevation-3);
      transform: translateY(-4px);
      z-index: 2;
    }

    .blank-template {
      border: 2px dashed #d4af37;
      background: linear-gradient(135deg, #d4af3708, #d4af3715);
    }

    .template-icon {
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      margin-bottom: 12px;
      background: var(--md-sys-color-surface-variant);
    }

    .alumni-template, .veterans-template, .team-template {
      background: linear-gradient(135deg, #d4af3715, #d4af3708);
    }

    .template-label {
      font-size: 14px;
      color: var(--md-sys-color-on-surface);
      text-align: center;
      font-weight: 400;
    }

    /* Recent Section */
    .recent-section {
      margin-bottom: 32px;
    }

    .view-controls {
      display: flex;
      gap: 4px;
      background: var(--md-sys-color-surface-container);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 24px;
      padding: 4px;
    }

    .view-toggle {
      background: none;
      border: none;
      border-radius: 20px;
      padding: 8px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .view-toggle.active {
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      box-shadow: var(--md-sys-elevation-1);
    }

    .search-filter {
      margin: 24px 0;
      display: flex;
      justify-content: center;
    }

    .search-container {
      position: relative;
      max-width: 400px;
      width: 100%;
    }

    .search-input {
      width: 100%;
      height: 48px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 24px;
      padding: 0 48px 0 16px;
      font-size: 16px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      transition: all 0.2s;
      outline: none;
    }

    .search-input:focus {
      box-shadow: 0 2px 8px rgba(0,0,0,0.16);
      border-color: #d4af37;
    }

    .search-icon {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }

    /* Walls Container */
    .walls-container {
      margin-top: 24px;
    }

    .grid-view {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }

    .list-view {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .wall-item {
      background: var(--md-sys-color-surface);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--md-sys-color-outline);
      overflow: hidden;
      position: relative;
    }

    .wall-item:hover {
      box-shadow: var(--md-sys-elevation-3);
      transform: translateY(-2px);
    }

    .grid-view .wall-item {
      display: flex;
      flex-direction: column;
    }

    .list-view .wall-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
    }

    .wall-thumbnail {
      flex-shrink: 0;
    }

    .grid-view .wall-thumbnail {
      height: 160px;
    }

    .list-view .wall-thumbnail {
      width: 40px;
      height: 40px;
      margin-right: 16px;
    }

    .wall-preview {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .list-view .wall-preview {
      border-radius: 6px;
    }

    .preview-content {
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .list-view .preview-content {
      padding: 8px;
      gap: 4px;
    }

    .preview-dots {
      display: flex;
      gap: 6px;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--md-sys-color-outline);
      opacity: 0.3;
    }

    .list-view .dot {
      width: 3px;
      height: 3px;
    }

    .preview-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .line {
      height: 4px;
      background: var(--md-sys-color-outline);
      opacity: 0.2;
      border-radius: 2px;
    }

    .list-view .line {
      height: 2px;
    }

    .line.long { width: 80%; }
    .line.medium { width: 60%; }
    .line.short { width: 40%; }

    .wall-info {
      padding: 16px;
      flex: 1;
    }

    .list-view .wall-info {
      padding: 0;
    }

    .wall-title {
      font-size: 16px;
      font-weight: 400;
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
      line-height: 1.3;
    }

    .list-view .wall-title {
      font-size: 14px;
      margin: 0 0 4px 0;
    }

    .wall-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .list-view .wall-meta {
      gap: 8px;
    }

    .wall-menu {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .wall-item:hover .wall-menu {
      opacity: 1;
    }

    .menu-button {
      background: var(--md-sys-color-surface);
      opacity: 0.9;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.2s;
      backdrop-filter: blur(4px);
    }

    .menu-button:hover {
      background: var(--md-sys-color-surface);
      opacity: 1;
      color: var(--md-sys-color-on-surface);
    }

    .menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--md-sys-color-surface);
      border-radius: 8px;
      box-shadow: var(--md-sys-elevation-4);
      padding: 8px 0;
      min-width: 120px;
      z-index: 10;
    }

    .menu-dropdown button {
      background: none;
      border: none;
      padding: 8px 16px;
      width: 100%;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
      color: var(--md-sys-color-on-surface);
      transition: background 0.2s;
    }

    .menu-dropdown button:hover {
      background: var(--md-sys-color-surface-variant);
    }

    .menu-dropdown .delete-option {
      color: #d93025;
    }

    .menu-dropdown .delete-option:hover {
      background: #fce8e6;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 64px 32px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .empty-illustration {
      margin-bottom: 24px;
    }

    .empty-state h3 {
      font-size: 20px;
      font-weight: 400;
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
    }

    .empty-state p {
      font-size: 14px;
      margin: 0 0 24px 0;
      line-height: 1.4;
    }

    .primary-button {
      background: #d4af37;
      color: white;
      border: none;
      border-radius: 24px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .primary-button:hover {
      background: #b8941f;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 64px 32px;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--md-sys-color-outline);
      border-top-color: var(--md-sys-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-state p {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
      margin: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* SVG Theme Support */
    .svg-surface {
      fill: var(--md-sys-color-surface-variant);
      stroke: var(--md-sys-color-outline);
      stroke-width: 2;
    }

    .svg-line {
      fill: var(--md-sys-color-outline);
      opacity: 0.4;
    }

    .svg-dot {
      fill: var(--md-sys-color-primary);
    }

    .svg-dot-1 { opacity: 0.3; }
    .svg-dot-2 { opacity: 0.6; }
    .svg-dot-3 { opacity: 1; }

    /* Responsive */
    @media (max-width: 768px) {
      .docs-homepage {
        padding: 24px 16px;
      }

      .template-gallery {
        gap: 12px;
      }

      .template-item {
        min-width: 100px;
        padding: 12px;
      }

      .template-icon {
        width: 56px;
        height: 56px;
      }

      .grid-view {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .view-controls {
        align-self: flex-end;
      }
    }
  `]
})
export class WallListComponent implements OnInit {
  walls$ = new BehaviorSubject<Wall[]>([]);
  searchTerm$ = new BehaviorSubject<string>('');
  filteredWalls$: Observable<Wall[]>;
  isLoading = true;
  searchTerm = '';
  viewMode: 'grid' | 'list' = 'grid';
  openMenuId: string | null = null;

  constructor(private wallService: WallService, private router: Router) {
    this.filteredWalls$ = combineLatest([
      this.walls$,
      this.searchTerm$.pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
    ]).pipe(
      map(([walls, searchTerm]) => {
        if (!searchTerm.trim()) {
          return walls;
        }
        const term = searchTerm.toLowerCase();
        return walls.filter(wall => 
          wall.name.toLowerCase().includes(term) ||
          wall.description?.toLowerCase().includes(term)
        );
      })
    );
  }

  ngOnInit(): void {
    this.loadWalls();
  }

  loadWalls(): void {
    this.isLoading = true;
    this.wallService.getAllWalls().subscribe({
      next: (walls) => {
        this.walls$.next(walls);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading walls:', error);
        this.isLoading = false;
      }
    });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm$.next(target.value);
  }

  deleteWall(id: string): void {
    if (confirm('Are you sure you want to delete this wall? This action cannot be undone.')) {
      this.wallService.deleteWall(id).subscribe({
        next: () => {
          const currentWalls = this.walls$.value;
          this.walls$.next(currentWalls.filter(wall => wall.id !== id));
        },
        error: (error) => {
          console.error('Error deleting wall:', error);
          alert('Failed to delete wall. Please try again.');
        }
      });
    }
  }

  trackByWallId(index: number, wall: Wall): string {
    return wall.id || index.toString();
  }

  // New methods for Google Docs style
  createBlankWall(): void {
    this.router.navigate(['/walls/create']);
  }

  createFromTemplate(template: string): void {
    this.router.navigate(['/walls/create'], { queryParams: { template } });
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  openWall(id: string): void {
    this.router.navigate(['/walls', id]);
  }

  editWall(id: string): void {
    this.router.navigate(['/walls', id, 'edit']);
  }

  duplicateWall(id: string): void {
    // TODO: Implement duplication
    console.log('Duplicate wall:', id);
  }

  toggleMenu(wallId: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === wallId ? null : wallId;
  }

  getWallGradient(wall: Wall): string {
    const baseColor = wall.theme.primaryColor || '#d4af37';
    return `linear-gradient(135deg, ${baseColor}15, ${baseColor}08)`;
  }

  getFormattedDate(date: Date): string {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    
    return new Date(date).toLocaleDateString();
  }
}