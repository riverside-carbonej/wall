import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { Wall } from '../../../../shared/models/wall.model';
import { ButtonGroupComponent, ButtonGroupItem } from '../../../../shared/components/button-group/button-group.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';
import { PageLayoutComponent, PageAction } from '../../../../shared/components/page-layout/page-layout.component';

@Component({
  selector: 'app-recycle-bin',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ThemedButtonComponent, 
    MaterialIconComponent, 
    ButtonGroupComponent,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout [title]="'Recycle Bin'" [subtitle]="'Restore deleted walls'" [showBackButton]="true" [actions]="pageActions">
      <div class="recycle-bin-container">
        
        @if (isLoading) {
          <div class="loading-state">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p>Loading deleted walls...</p>
            </div>
          </div>
        } @else if ((filteredWalls$ | async)?.length === 0) {
          <div class="empty-state">
            <div class="empty-illustration">
              <span class="material-icons md-64">delete_outline</span>
            </div>
            <h3>Recycle bin is empty</h3>
            <p>Deleted walls will appear here and can be restored at any time.</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="walls-table">
              <thead>
                <tr>
                  <th>Wall Name</th>
                  <th>Deleted Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (wall of filteredWalls$ | async; track wall.id) {
                  <tr class="deleted-wall-row">
                    <td class="wall-name">{{ wall.name }}</td>
                    <td class="deleted-date">{{ getFormattedDate(wall.deletedAt!) }}</td>
                    <td class="wall-actions">
                      <app-themed-button
                        variant="basic"
                        icon="restore"
                        (click)="restoreWall(wall.id!)"
                        [disabled]="isProcessing">
                        Restore
                      </app-themed-button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </app-page-layout>
  `,
  styles: [`
    .recycle-bin-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--md-sys-spacing-6);
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: var(--md-sys-spacing-16) var(--md-sys-spacing-8);
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-extra-large);
      margin: var(--md-sys-spacing-6) 0;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--md-sys-spacing-4);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--md-sys-color-outline-variant);
      border-top-color: var(--md-sys-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state p {
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-body-large-size);
      margin: 0;
      font-family: 'Google Sans', sans-serif;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: var(--md-sys-spacing-16) var(--md-sys-spacing-8);
      color: var(--md-sys-color-on-surface-variant);
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-extra-large);
      margin: var(--md-sys-spacing-6) 0;
    }

    .empty-illustration {
      margin-bottom: var(--md-sys-spacing-6);
      opacity: 0.4;
    }

    .empty-illustration .material-icons {
      color: var(--md-sys-color-on-surface-variant);
    }

    .empty-state h3 {
      font-size: var(--md-sys-typescale-headline-small-size);
      line-height: var(--md-sys-typescale-headline-small-line-height);
      font-weight: var(--md-sys-typescale-headline-small-weight);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 var(--md-sys-spacing-2) 0;
      font-family: 'Google Sans', sans-serif;
    }

    .empty-state p {
      font-size: var(--md-sys-typescale-body-large-size);
      line-height: var(--md-sys-typescale-body-large-line-height);
      margin: 0;
      font-family: 'Google Sans', sans-serif;
      max-width: 400px;
      margin: 0 auto;
    }

    /* Table Container */
    .table-container {
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      border: 1px solid var(--md-sys-color-outline-variant);
      overflow: hidden;
    }

    .walls-table {
      width: 100%;
      border-collapse: collapse;
    }

    .walls-table th {
      background-color: var(--md-sys-color-surface-container-high);
      color: var(--md-sys-color-on-surface);
      font-size: var(--md-sys-typescale-title-small-size);
      font-weight: var(--md-sys-typescale-title-small-weight);
      font-family: 'Google Sans', sans-serif;
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-6);
      text-align: left;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }


    .deleted-wall-row {
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .deleted-wall-row:hover {
      background-color: var(--md-sys-color-surface-container-high);
    }

    .deleted-wall-row:not(:last-child) {
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .walls-table td {
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-6);
      vertical-align: middle;
    }

    .wall-name {
      font-size: var(--md-sys-typescale-body-large-size);
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
    }

    .deleted-date {
      font-size: var(--md-sys-typescale-body-medium-size);
      color: var(--md-sys-color-on-surface-variant);
      font-family: 'Google Sans', sans-serif;
    }


    .wall-actions {
      display: flex;
      justify-content: flex-start;
      gap: var(--md-sys-spacing-3);
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .recycle-bin-container {
        padding: var(--md-sys-spacing-4);
      }

      .walls-table th,
      .walls-table td {
        padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      }

      .walls-table th {
        font-size: var(--md-sys-typescale-label-large-size);
      }

      .wall-name {
        font-size: var(--md-sys-typescale-body-medium-size);
      }

      .deleted-date {
        font-size: var(--md-sys-typescale-body-small-size);
      }
    }

    @media (max-width: 480px) {
      .walls-table th:nth-child(2),
      .walls-table td:nth-child(2) {
        display: none;
      }

      .wall-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class RecycleBinComponent implements OnInit {
  walls$ = new BehaviorSubject<Wall[]>([]);
  searchTerm$ = new BehaviorSubject<string>('');
  filteredWalls$: Observable<Wall[]>;
  isLoading = true;
  isProcessing = false;
  searchTerm = '';

  pageActions: PageAction[] = [];

  constructor(
    private wallService: WallService, 
    private router: Router,
    private confirmationDialog: ConfirmationDialogService
  ) {
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
    this.loadDeletedWalls();
  }

  loadDeletedWalls(): void {
    this.isLoading = true;
    this.wallService.getDeletedWalls().subscribe({
      next: (walls) => {
        this.walls$.next(walls);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading deleted walls:', error);
        this.isLoading = false;
      }
    });
  }

  restoreWall(id: string): void {
    this.confirmationDialog.confirm({
      title: 'Restore Wall',
      message: 'Are you sure you want to restore this wall?',
      confirmText: 'Restore',
      cancelText: 'Cancel'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.isProcessing = true;
        this.wallService.restoreWall(id).subscribe({
          next: () => {
            const currentWalls = this.walls$.value;
            this.walls$.next(currentWalls.filter(wall => wall.id !== id));
            this.isProcessing = false;
          },
          error: (error) => {
            console.error('Error restoring wall:', error);
            alert('Failed to restore wall. Please try again.');
            this.isProcessing = false;
          }
        });
      }
    });
  }


  getFormattedDate(date: Date): string {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    
    return new Date(date).toLocaleDateString();
  }

}