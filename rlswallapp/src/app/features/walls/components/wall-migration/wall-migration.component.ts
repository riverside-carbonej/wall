import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { WallService } from '../../services/wall.service';
import { Wall } from '../../../../shared/models/wall.model';

export interface MigrationStatus {
  wallId: string;
  wallName: string;
  needsMigration: boolean;
  hasLegacyFields: boolean;
  hasObjectTypes: boolean;
  legacyFieldCount: number;
  objectTypeCount: number;
  migrationInProgress: boolean;
  migrationComplete: boolean;
  migrationError?: string;
}

@Component({
  selector: 'app-wall-migration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="migration-container">
      <!-- Header -->
      <header class="migration-header">
        <div class="header-content">
          <div class="header-info">
            <h1>Wall Migration Center</h1>
            <p>Upgrade your walls to the new object-oriented system for enhanced functionality</p>
          </div>
          <div class="header-actions">
            <button 
              class="btn-primary touch-target interactive"
              (click)="refreshMigrationStatus()"
              [disabled]="isLoading()">
              <span class="material-icons md-20">refresh</span>
              Refresh Status
            </button>
            <button 
              class="btn-secondary touch-target interactive"
              (click)="batchMigrateAll()"
              [disabled]="isLoading() || !hasWallsToMigrate()"
              *ngIf="hasWallsToMigrate()">
              <span class="material-icons md-20">upgrade</span>
              Migrate All
            </button>
          </div>
        </div>
      </header>

      <!-- Migration Overview -->
      <div class="migration-overview" *ngIf="migrationStats()">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons md-32">folder</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ migrationStats()!.totalWalls }}</div>
              <div class="stat-label">Total Walls</div>
            </div>
          </div>
          
          <div class="stat-card migration-needed">
            <div class="stat-icon">
              <span class="material-icons md-32">upgrade</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ migrationStats()!.wallsNeedingMigration }}</div>
              <div class="stat-label">Need Migration</div>
            </div>
          </div>
          
          <div class="stat-card migrated">
            <div class="stat-icon">
              <span class="material-icons md-32">check_circle</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ migrationStats()!.wallsAlreadyMigrated }}</div>
              <div class="stat-label">Already Migrated</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons md-32">new_releases</span>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ migrationStats()!.newWalls }}</div>
              <div class="stat-label">New Format Walls</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Migration List -->
      <div class="migration-list">
        <h2>Wall Migration Status</h2>
        
        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading()">
          <div class="loading-spinner"></div>
          <p>Loading wall migration status...</p>
        </div>

        <!-- No Walls State -->
        <div class="empty-state" *ngIf="!isLoading() && migrationList().length === 0">
          <div class="empty-icon">
            <span class="material-icons md-48">folder_open</span>
          </div>
          <h3>No walls found</h3>
          <p>Create your first wall to get started with the new object-oriented system.</p>
          <a routerLink="/walls/new" class="btn-primary touch-target interactive">
            <span class="material-icons md-20">add</span>
            Create First Wall
          </a>
        </div>

        <!-- Migration Items -->
        <div class="migration-items" *ngIf="!isLoading() && migrationList().length > 0">
          <div 
            *ngFor="let item of migrationList(); trackBy: trackByWallId"
            class="migration-item"
            [class.needs-migration]="item.needsMigration"
            [class.migrated]="item.migrationComplete"
            [class.in-progress]="item.migrationInProgress">
            
            <div class="item-info">
              <div class="item-header">
                <h3 class="item-title">{{ item.wallName }}</h3>
                <div class="item-status">
                  <span 
                    class="status-badge"
                    [class.needs-migration]="item.needsMigration"
                    [class.migrated]="item.migrationComplete"
                    [class.in-progress]="item.migrationInProgress">
                    
                    <span class="material-icons md-16">
                      {{ getStatusIcon(item) }}
                    </span>
                    {{ getStatusText(item) }}
                  </span>
                </div>
              </div>
              
              <div class="item-details">
                <div class="detail-item" *ngIf="item.hasLegacyFields">
                  <span class="detail-label">Legacy Fields:</span>
                  <span class="detail-value">{{ item.legacyFieldCount }}</span>
                </div>
                <div class="detail-item" *ngIf="item.hasObjectTypes">
                  <span class="detail-label">Object Types:</span>
                  <span class="detail-value">{{ item.objectTypeCount }}</span>
                </div>
                <div class="detail-item error" *ngIf="item.migrationError">
                  <span class="detail-label">Error:</span>
                  <span class="detail-value">{{ item.migrationError }}</span>
                </div>
              </div>
            </div>

            <div class="item-actions">
              <a 
                [routerLink]="['/walls', item.wallId]"
                class="btn-outline touch-target interactive"
                [title]="'View wall'">
                <span class="material-icons md-18">visibility</span>
                View
              </a>
              
              <button 
                *ngIf="item.needsMigration && !item.migrationInProgress"
                class="btn-secondary touch-target interactive"
                (click)="migrateWall(item)"
                [title]="'Migrate to object types'">
                <span class="material-icons md-18">upgrade</span>
                Migrate
              </button>
              
              <button 
                *ngIf="item.migrationInProgress"
                class="btn-secondary touch-target interactive"
                disabled>
                <span class="material-icons md-18 spinning">hourglass_empty</span>
                Migrating...
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Migration Help -->
      <div class="migration-help">
        <h3>What is Migration?</h3>
        <div class="help-content">
          <div class="help-item">
            <span class="material-icons md-24">info</span>
            <div>
              <strong>Object Types:</strong> The new system uses object types instead of simple fields, 
              allowing for complex relationships and better organization.
            </div>
          </div>
          <div class="help-item">
            <span class="material-icons md-24">backup</span>
            <div>
              <strong>Safe Migration:</strong> Your original data is preserved during migration. 
              The process converts your fields into a single object type.
            </div>
          </div>
          <div class="help-item">
            <span class="material-icons md-24">enhanced_encryption</span>
            <div>
              <strong>Enhanced Features:</strong> After migration, you can add relationships, 
              create multiple object types, and use advanced features.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .migration-container {
      min-height: 100vh;
      background: var(--md-sys-color-surface-container-lowest);
      padding: var(--md-sys-spacing-lg);
    }

    /* Header */
    .migration-header {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: var(--md-sys-spacing-xl);
      margin-bottom: var(--md-sys-spacing-xl);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--md-sys-spacing-lg);
    }

    .header-info h1 {
      margin: 0 0 var(--md-sys-spacing-sm) 0;
      font-family: var(--md-sys-typescale-headline-large-font-family);
      font-size: var(--md-sys-typescale-headline-large-font-size);
      font-weight: var(--md-sys-typescale-headline-large-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    .header-info p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant);
      font-family: var(--md-sys-typescale-body-large-font-family);
      font-size: var(--md-sys-typescale-body-large-font-size);
    }

    .header-actions {
      display: flex;
      gap: var(--md-sys-spacing-md);
      flex-shrink: 0;
    }

    /* Migration Overview */
    .migration-overview {
      margin-bottom: var(--md-sys-spacing-xl);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--md-sys-spacing-lg);
    }

    .stat-card {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-large);
      padding: var(--md-sys-spacing-xl);
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-lg);
      box-shadow: var(--md-sys-elevation-level1);
      transition: all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }

    .stat-card:hover {
      box-shadow: var(--md-sys-elevation-level2);
    }

    .stat-card.migration-needed {
      border-left: 4px solid var(--md-sys-color-warning);
    }

    .stat-card.migrated {
      border-left: 4px solid var(--md-sys-color-success);
    }

    .stat-icon {
      color: var(--md-sys-color-primary);
    }

    .stat-value {
      font-family: var(--md-sys-typescale-headline-medium-font-family);
      font-size: var(--md-sys-typescale-headline-medium-font-size);
      font-weight: var(--md-sys-typescale-headline-medium-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    .stat-label {
      font-family: var(--md-sys-typescale-body-medium-font-family);
      font-size: var(--md-sys-typescale-body-medium-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Migration List */
    .migration-list {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: var(--md-sys-spacing-xl);
      margin-bottom: var(--md-sys-spacing-xl);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .migration-list h2 {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      font-family: var(--md-sys-typescale-headline-medium-font-family);
      font-size: var(--md-sys-typescale-headline-medium-font-size);
      font-weight: var(--md-sys-typescale-headline-medium-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: var(--md-sys-spacing-xxl);
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--md-sys-color-outline-variant);
      border-top-color: var(--md-sys-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto var(--md-sys-spacing-lg);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: var(--md-sys-spacing-xxl);
    }

    .empty-icon {
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: var(--md-sys-spacing-lg);
    }

    .empty-state h3 {
      margin: 0 0 var(--md-sys-spacing-sm) 0;
      color: var(--md-sys-color-on-surface);
    }

    .empty-state p {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Migration Items */
    .migration-items {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-md);
    }

    .migration-item {
      background: var(--md-sys-color-surface-container-highest);
      border-radius: var(--md-sys-shape-corner-large);
      padding: var(--md-sys-spacing-lg);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--md-sys-spacing-lg);
      border: 1px solid var(--md-sys-color-outline-variant);
    }

    .migration-item.needs-migration {
      border-left: 4px solid var(--md-sys-color-warning);
    }

    .migration-item.migrated {
      border-left: 4px solid var(--md-sys-color-success);
    }

    .migration-item.in-progress {
      border-left: 4px solid var(--md-sys-color-primary);
    }

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--md-sys-spacing-sm);
    }

    .item-title {
      margin: 0;
      font-family: var(--md-sys-typescale-title-medium-font-family);
      font-size: var(--md-sys-typescale-title-medium-font-size);
      font-weight: var(--md-sys-typescale-title-medium-font-weight);
      color: var(--md-sys-color-on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-xs);
      padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
      border-radius: var(--md-sys-shape-corner-full);
      font-family: var(--md-sys-typescale-label-small-font-family);
      font-size: var(--md-sys-typescale-label-small-font-size);
      font-weight: var(--md-sys-typescale-label-small-font-weight);
    }

    .status-badge.needs-migration {
      background: var(--md-sys-color-warning-container);
      color: var(--md-sys-color-on-warning-container);
    }

    .status-badge.migrated {
      background: var(--md-sys-color-success-container);
      color: var(--md-sys-color-on-success-container);
    }

    .status-badge.in-progress {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }

    .item-details {
      display: flex;
      gap: var(--md-sys-spacing-lg);
      flex-wrap: wrap;
    }

    .detail-item {
      display: flex;
      gap: var(--md-sys-spacing-xs);
    }

    .detail-label {
      font-family: var(--md-sys-typescale-body-small-font-family);
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .detail-value {
      font-family: var(--md-sys-typescale-body-small-font-family);
      font-size: var(--md-sys-typescale-body-small-font-size);
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }

    .detail-item.error .detail-value {
      color: var(--md-sys-color-error);
    }

    .item-actions {
      display: flex;
      gap: var(--md-sys-spacing-sm);
      flex-shrink: 0;
    }

    /* Migration Help */
    .migration-help {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: var(--md-sys-spacing-xl);
      box-shadow: var(--md-sys-elevation-level1);
    }

    .migration-help h3 {
      margin: 0 0 var(--md-sys-spacing-lg) 0;
      color: var(--md-sys-color-on-surface);
    }

    .help-content {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-md);
    }

    .help-item {
      display: flex;
      gap: var(--md-sys-spacing-md);
      align-items: flex-start;
    }

    .help-item .material-icons {
      color: var(--md-sys-color-primary);
      margin-top: 2px;
    }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .migration-item {
        flex-direction: column;
        align-items: stretch;
      }

      .item-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--md-sys-spacing-sm);
      }

      .item-actions {
        justify-content: center;
      }
    }
  `]
})
export class WallMigrationComponent implements OnInit {
  isLoading = signal(false);
  migrationList = signal<MigrationStatus[]>([]);
  migrationStats = signal<{
    totalWalls: number;
    wallsNeedingMigration: number;
    wallsAlreadyMigrated: number;
    newWalls: number;
  } | null>(null);

  constructor(private wallService: WallService) {}

  ngOnInit(): void {
    this.loadMigrationStatus();
  }

  loadMigrationStatus(): void {
    this.isLoading.set(true);
    
    this.wallService.getAllWalls().subscribe({
      next: (walls) => {
        const migrationStatuses = walls.map(wall => this.createMigrationStatus(wall));
        this.migrationList.set(migrationStatuses);
        this.calculateStats(migrationStatuses);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading walls for migration:', error);
        this.isLoading.set(false);
      }
    });
  }

  private createMigrationStatus(wall: Wall): MigrationStatus {
    const hasLegacyFields = !!(wall.fields && wall.fields.length > 0);
    const hasObjectTypes = !!(wall.objectTypes && wall.objectTypes.length > 0);
    const needsMigration = hasLegacyFields && !hasObjectTypes;

    return {
      wallId: wall.id,
      wallName: wall.name,
      needsMigration,
      hasLegacyFields,
      hasObjectTypes,
      legacyFieldCount: wall.fields?.length || 0,
      objectTypeCount: wall.objectTypes?.length || 0,
      migrationInProgress: false,
      migrationComplete: hasObjectTypes,
      migrationError: undefined
    };
  }

  private calculateStats(migrationStatuses: MigrationStatus[]): void {
    const totalWalls = migrationStatuses.length;
    const wallsNeedingMigration = migrationStatuses.filter(s => s.needsMigration).length;
    const wallsAlreadyMigrated = migrationStatuses.filter(s => s.hasObjectTypes && s.hasLegacyFields).length;
    const newWalls = migrationStatuses.filter(s => s.hasObjectTypes && !s.hasLegacyFields).length;

    this.migrationStats.set({
      totalWalls,
      wallsNeedingMigration,
      wallsAlreadyMigrated,
      newWalls
    });
  }

  refreshMigrationStatus(): void {
    this.loadMigrationStatus();
  }

  migrateWall(item: MigrationStatus): void {
    // Update UI to show migration in progress
    this.updateMigrationStatus(item.wallId, {
      migrationInProgress: true,
      migrationError: undefined
    });

    this.wallService.migrateLegacyWall(item.wallId).subscribe({
      next: (migratedWall) => {
        this.updateMigrationStatus(item.wallId, {
          migrationInProgress: false,
          migrationComplete: true,
          hasObjectTypes: true,
          objectTypeCount: migratedWall.objectTypes?.length || 0
        });
        
        // Recalculate stats
        this.calculateStats(this.migrationList());
      },
      error: (error) => {
        this.updateMigrationStatus(item.wallId, {
          migrationInProgress: false,
          migrationError: error.message || 'Migration failed'
        });
      }
    });
  }

  batchMigrateAll(): void {
    const wallsToMigrate = this.migrationList().filter(item => item.needsMigration);
    
    if (wallsToMigrate.length === 0) {
      return;
    }

    // Mark all walls as migration in progress
    wallsToMigrate.forEach(wall => {
      this.updateMigrationStatus(wall.wallId, {
        migrationInProgress: true,
        migrationError: undefined
      });
    });

    this.wallService.batchMigrateLegacyWalls().subscribe({
      next: (results) => {
        results.forEach(result => {
          this.updateMigrationStatus(result.wallId, {
            migrationInProgress: false,
            migrationComplete: result.success,
            migrationError: result.error
          });
        });
        
        // Refresh the full status to get updated object type counts
        this.loadMigrationStatus();
      },
      error: (error) => {
        console.error('Batch migration error:', error);
        
        // Reset all in-progress states
        wallsToMigrate.forEach(wall => {
          this.updateMigrationStatus(wall.wallId, {
            migrationInProgress: false,
            migrationError: 'Batch migration failed'
          });
        });
      }
    });
  }

  private updateMigrationStatus(wallId: string, updates: Partial<MigrationStatus>): void {
    const currentList = this.migrationList();
    const updatedList = currentList.map(item => 
      item.wallId === wallId ? { ...item, ...updates } : item
    );
    this.migrationList.set(updatedList);
  }

  hasWallsToMigrate(): boolean {
    return this.migrationList().some(item => item.needsMigration);
  }

  getStatusIcon(item: MigrationStatus): string {
    if (item.migrationInProgress) return 'hourglass_empty';
    if (item.migrationComplete) return 'check_circle';
    if (item.needsMigration) return 'upgrade';
    if (item.migrationError) return 'error';
    return 'new_releases';
  }

  getStatusText(item: MigrationStatus): string {
    if (item.migrationInProgress) return 'Migrating...';
    if (item.migrationError) return 'Migration Failed';
    if (item.migrationComplete) return 'Migrated';
    if (item.needsMigration) return 'Needs Migration';
    return 'New Format';
  }

  trackByWallId(index: number, item: MigrationStatus): string {
    return item.wallId;
  }
}