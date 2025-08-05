import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { WallService } from '../../services/wall.service';
import { Wall } from '../../../../shared/models/wall.model';
import { ButtonGroupComponent, ButtonGroupItem } from '../../../../shared/components/button-group/button-group.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';
import { UserActivityService } from '../../../../shared/services/user-activity.service';
import { WallPermissionsService } from '../../../../core/services/wall-permissions.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NavigationService } from '../../../../shared/services/navigation.service';

@Component({
  selector: 'app-wall-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ThemedButtonComponent, MaterialIconComponent, ButtonGroupComponent],
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
              <span class="material-icons md-56">add_circle_outline</span>
            </div>
            <span class="template-label">Blank</span>
          </div>
          
          <div class="template-item" (click)="createFromTemplate('alumni')">
            <div class="template-icon" 
                 [style.background]="getTemplateColors('alumni').background"
                 [style.box-shadow]="getTemplateColors('alumni').shadow"
                 [style.border]="getTemplateColors('alumni').border">
              <span class="material-icons md-32" [style.color]="getTemplateColors('alumni').icon">school</span>
            </div>
            <span class="template-label">Alumni Directory</span>
          </div>

          <div class="template-item" (click)="createFromTemplate('veterans')">
            <div class="template-icon" 
                 [style.background]="getTemplateColors('veterans').background"
                 [style.box-shadow]="getTemplateColors('veterans').shadow"
                 [style.border]="getTemplateColors('veterans').border">
              <span class="material-icons md-32" [style.color]="getTemplateColors('veterans').icon">military_tech</span>
            </div>
            <span class="template-label">Veterans Registry</span>
          </div>

          <div class="template-item" (click)="createFromTemplate('team')">
            <div class="template-icon" 
                 [style.background]="getTemplateColors('team').background"
                 [style.box-shadow]="getTemplateColors('team').shadow"
                 [style.border]="getTemplateColors('team').border">
              <span class="material-icons md-32" [style.color]="getTemplateColors('team').icon">groups</span>
            </div>
            <span class="template-label">Team Directory</span>
          </div>
        </div>
      </section>

      <!-- Recent Walls -->
      <section class="recent-section">
        <div class="section-header">
          <h2>Recent walls</h2>
          <app-button-group
            [items]="viewModeItems"
            [activeId]="viewMode"
            (selectionChange)="onViewModeChange($event)">
          </app-button-group>
        </div>


        <!-- Empty State (centered) -->
        @if ((filteredWalls$ | async)?.length === 0 && !isLoading) {
          <div class="empty-state-centered">
            <div class="empty-illustration">
              <svg viewBox="0 0 200 120" width="140" height="84" class="empty-svg">
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
            <p>Create your first wall to get started</p>
            <button class="primary-button" (click)="createBlankWall()">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
              Create wall
            </button>
          </div>
        } @else {
          <div class="walls-container" [class.list-view]="viewMode === 'list'" [class.grid-view]="viewMode === 'grid'">
            @if (filteredWalls$ | async; as walls) {
              @for (wall of walls; track trackByWallId($index, wall)) {
                <div class="wall-item" [class.menu-open]="openMenuId === wall.id" (click)="openWall(wall.id!)">
                  <div class="wall-thumbnail">
                    <div class="wall-preview" [style.background]="getWallGradient(wall)">
                      <div class="preview-content">
                        <div class="preview-dots">
                          <div class="dot" [style.background-color]="getDotColor(wall)"></div>
                          <div class="dot" [style.background-color]="getDotColor(wall)"></div>
                          <div class="dot" [style.background-color]="getDotColor(wall)"></div>
                        </div>
                        <div class="preview-lines">
                          <div class="line long" [style.background-color]="getLineColor(wall)"></div>
                          <div class="line medium" [style.background-color]="getLineColor(wall)"></div>
                          <div class="line short" [style.background-color]="getLineColor(wall)"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="wall-info">
                    <h3 class="wall-title">{{ wall.name }}</h3>
                    <div class="wall-meta">
                      <span class="wall-date">{{ getFormattedDate(wall.updatedAt) }}</span>
                    </div>
                  </div>
                  <div class="wall-menu">
                    <button class="menu-button" (click)="toggleMenu(wall.id!, $event)">
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
                      </svg>
                    </button>
                    @if (openMenuId === wall.id) {
                      <div class="menu-dropdown" (click)="$event.stopPropagation()">
                        <button (click)="openWall(wall.id!)">Open</button>
                        <button (click)="editWall(wall.id!)">Edit</button>
                        <button (click)="duplicateWall(wall.id!)">Make a copy</button>
                        <button (click)="deleteWall(wall.id!)" class="delete-option">Delete</button>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }

        @if (isLoading) {
          <div class="loading-state">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p>Loading your walls...</p>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    /* Enhanced Material 3 Mobile-First Wall List */
    .docs-homepage {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--md-sys-spacing-8) var(--md-sys-spacing-6);
      background-color: var(--md-sys-color-background);
      min-height: 100vh;
    }

    /* Enhanced Template Section */
    .template-section {
      margin-bottom: var(--md-sys-spacing-12);
    }

    .section-header {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: var(--md-sys-spacing-6);
      padding-bottom: var(--md-sys-spacing-4);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      flex-direction: column;
      gap: var(--md-sys-spacing-4);
    }

    .section-header h2 {
      font-size: var(--md-sys-typescale-title-large-size);
      line-height: var(--md-sys-typescale-title-large-line-height);
      font-weight: var(--md-sys-typescale-title-large-weight);
      color: var(--md-sys-color-on-background);
      margin: 0;
      font-family: 'Google Sans', sans-serif;
    }

    .template-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--md-sys-spacing-4);
      padding: var(--md-sys-spacing-2) 0;
      perspective: 1500px; /* Add perspective for more distant camera effect */
    }

    .template-item {
      /* Material 3 Card with enhanced touch targets */
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: var(--md-sys-touch-target-large);
      padding: var(--md-sys-spacing-5);
      border-radius: var(--md-sys-shape-corner-large);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      background-color: var(--md-sys-color-surface-container);
      border: 1px solid var(--md-sys-color-outline-variant);
      position: relative;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .template-item:hover {
      box-shadow: var(--md-sys-elevation-3);
      transform: translateY(-2px) scale(1.02);
      border-color: var(--md-sys-color-primary);
      background-color: var(--md-sys-color-surface-container-high);
    }

    .template-item:active {
      transform: translateY(0) scale(1);
      transition-duration: 0.1s;
    }

    .blank-template {
      border: 2px dashed var(--md-sys-color-primary);
      background: linear-gradient(135deg, 
        var(--md-sys-color-primary-container),
        var(--md-sys-color-surface-container));
    }

    .blank-template:hover {
      background: linear-gradient(135deg, 
        var(--md-sys-color-primary-container),
        var(--md-sys-color-primary-container));
    }


    .template-icon {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--md-sys-shape-corner-medium);
      margin-bottom: var(--md-sys-spacing-3);
      background: linear-gradient(135deg, 
        var(--md-sys-color-surface-variant),
        var(--md-sys-color-surface-container));
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .template-item:hover .template-icon {
      transform: scale(1.03);
      background: linear-gradient(135deg, 
        var(--md-sys-color-primary-container),
        var(--md-sys-color-tertiary-container));
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }


    .template-label {
      font-size: var(--md-sys-typescale-label-large-size);
      line-height: var(--md-sys-typescale-label-large-line-height);
      font-weight: var(--md-sys-typescale-label-large-weight);
      color: var(--md-sys-color-on-surface);
      text-align: center;
      font-family: 'Google Sans', sans-serif;
    }

    /* Enhanced Recent Section */
    .recent-section {
      margin-bottom: var(--md-sys-spacing-8);
    }


    /* Enhanced Walls Container */
    .walls-container {
      margin-top: var(--md-sys-spacing-6);
    }

    .grid-view {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--md-sys-spacing-5);
    }

    .list-view {
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-3);
    }

    .wall-item {
      /* Enhanced Material 3 Card */
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      border: 1px solid var(--md-sys-color-outline-variant);
      overflow: visible; /* Changed to visible to allow dropdown */
      position: relative;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .wall-item:hover {
      box-shadow: var(--md-sys-elevation-3);
      transform: translateY(-2px);
      border-color: var(--md-sys-color-primary);
      background-color: var(--md-sys-color-surface-container-high);
    }

    .wall-item:active {
      transform: translateY(-1px);
      transition-duration: 0.1s;
    }

    .wall-item.menu-open {
      z-index: 10;
      position: relative;
    }

    .grid-view .wall-item {
      display: flex;
      flex-direction: column;
      min-height: 240px;
    }

    .list-view .wall-item {
      display: flex;
      align-items: center;
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-5);
      min-height: var(--md-sys-touch-target-large);
    }

    .wall-thumbnail {
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }

    .grid-view .wall-thumbnail {
      height: 140px;
      border-radius: var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0 0;
      overflow: hidden;
    }

    .list-view .wall-thumbnail {
      width: var(--md-sys-touch-target-min);
      height: var(--md-sys-touch-target-min);
      margin-right: var(--md-sys-spacing-4);
      border-radius: var(--md-sys-shape-corner-medium);
    }

    .wall-preview {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, 
        var(--md-sys-color-primary-container),
        var(--md-sys-color-tertiary-container));
    }

    .preview-content {
      padding: var(--md-sys-spacing-5);
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-3);
      position: relative;
    }

    .list-view .preview-content {
      padding: var(--md-sys-spacing-2);
      gap: var(--md-sys-spacing-1);
    }

    .preview-dots {
      display: flex;
      gap: var(--md-sys-spacing-2);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--md-sys-color-on-surface-variant);
      opacity: 0.4;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .wall-item:hover .dot {
      opacity: 0.8;
      transform: scale(1.2);
    }

    .list-view .dot {
      width: 4px;
      height: 4px;
    }

    .preview-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--md-sys-spacing-1);
    }

    .line {
      height: 6px;
      background-color: var(--md-sys-color-on-surface-variant);
      opacity: 0.3;
      border-radius: var(--md-sys-shape-corner-small);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .wall-item:hover .line {
      opacity: 0.6;
    }

    .list-view .line {
      height: 3px;
    }

    .line.long { width: 85%; }
    .line.medium { width: 65%; }
    .line.short { width: 45%; }

    .wall-info {
      padding: var(--md-sys-spacing-5);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .list-view .wall-info {
      padding: 0;
    }

    .wall-title {
      font-size: var(--md-sys-typescale-title-medium-size);
      line-height: var(--md-sys-typescale-title-medium-line-height);
      font-weight: var(--md-sys-typescale-title-medium-weight);
      color: var(--md-sys-color-on-surface);
      margin: 0 0 var(--md-sys-spacing-2) 0;
      font-family: 'Google Sans', sans-serif;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .list-view .wall-title {
      font-size: var(--md-sys-typescale-body-large-size);
      margin: 0 0 var(--md-sys-spacing-1) 0;
    }

    .wall-meta {
      display: flex;
      gap: var(--md-sys-spacing-3);
      font-size: var(--md-sys-typescale-label-medium-size);
      line-height: var(--md-sys-typescale-label-medium-line-height);
      color: var(--md-sys-color-on-surface-variant);
      font-family: 'Google Sans', sans-serif;
    }

    .list-view .wall-meta {
      gap: var(--md-sys-spacing-2);
    }

    .wall-menu {
      position: absolute;
      top: var(--md-sys-spacing-2);
      right: var(--md-sys-spacing-2);
      z-index: 5;
    }

    .menu-button {
      background-color: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 50%;
      width: var(--md-sys-touch-target-min);
      height: var(--md-sys-touch-target-min);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      backdrop-filter: blur(8px);
      box-shadow: var(--md-sys-elevation-2);
    }

    .menu-button:hover {
      background-color: var(--md-sys-color-surface-container-high);
      color: var(--md-sys-color-on-surface);
      transform: scale(1.1);
      box-shadow: var(--md-sys-elevation-3);
    }

    .menu-dropdown {
      position: absolute;
      top: calc(100% + var(--md-sys-spacing-2));
      right: 0;
      background-color: var(--md-sys-color-surface-container-high);
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-sys-elevation-4);
      padding: var(--md-sys-spacing-2) 0;
      min-width: 140px;
      z-index: 1000; /* Increased z-index */
      animation: fadeInUp 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .menu-dropdown button {
      background: none;
      border: none;
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-4);
      width: 100%;
      text-align: left;
      cursor: pointer;
      font-size: var(--md-sys-typescale-body-medium-size);
      color: var(--md-sys-color-on-surface);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
      font-family: 'Google Sans', sans-serif;
      min-height: var(--md-sys-touch-target-min);
      display: flex;
      align-items: center;
    }

    .menu-dropdown button:hover {
      background-color: var(--md-sys-color-primary-container);
    }

    .menu-dropdown .delete-option {
      color: var(--md-sys-color-error);
    }

    .menu-dropdown .delete-option:hover {
      background-color: var(--md-sys-color-error-container);
    }

    /* Centered Empty State */
    .empty-state-centered {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-height: 30vh;
      color: var(--md-sys-color-on-surface-variant);
      padding: var(--md-sys-spacing-6);
    }

    /* Enhanced Empty State (legacy) */
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
      opacity: 0.8;
    }

    .empty-state-centered .empty-illustration {
      margin-bottom: var(--md-sys-spacing-3);
      opacity: 0.4;
    }

    .empty-state h3,
    .empty-state-centered h3 {
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
      margin: 0 0 var(--md-sys-spacing-6) 0;
      font-family: 'Google Sans', sans-serif;
    }

    .empty-state-centered p {
      font-size: var(--md-sys-typescale-body-medium-size);
      line-height: var(--md-sys-typescale-body-medium-line-height);
      margin: 0 0 var(--md-sys-spacing-4) 0;
      font-family: 'Google Sans', sans-serif;
      max-width: 280px;
      opacity: 0.8;
    }

    .primary-button {
      /* Material 3 Filled Button */
      background-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      border-radius: var(--md-sys-shape-corner-full);
      padding: var(--md-sys-spacing-4) var(--md-sys-spacing-6);
      min-height: var(--md-sys-touch-target-min);
      font-size: var(--md-sys-typescale-label-large-size);
      font-weight: var(--md-sys-typescale-label-large-weight);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      box-shadow: var(--md-sys-elevation-1);
      font-family: 'Google Sans', sans-serif;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .primary-button:hover {
      background-color: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
      transform: translateY(-2px);
      box-shadow: var(--md-sys-elevation-3);
    }

    .primary-button:active {
      transform: translateY(0);
      transition-duration: 0.1s;
    }

    /* Enhanced Loading State */
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

    .loading-state p {
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-body-large-size);
      margin: 0;
      font-family: 'Google Sans', sans-serif;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Enhanced SVG Theme Support */
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

    .svg-dot-1 { opacity: 0.4; }
    .svg-dot-2 { opacity: 0.7; }
    .svg-dot-3 { opacity: 1; }

    /* Enhanced Mobile-First Responsive Design */
    @media (min-width: 769px) {
      .template-gallery {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: var(--md-sys-spacing-5);
      }
    }

    @media (max-width: 768px) {
      .docs-homepage {
        padding: var(--md-sys-spacing-6) var(--md-sys-spacing-4);
      }

      .template-gallery {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--md-sys-spacing-3);
      }

      .template-item {
        padding: var(--md-sys-spacing-4);
      }

      .template-icon {
        width: 64px;
        height: 64px;
      }

      .grid-view {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: var(--md-sys-spacing-4);
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--md-sys-spacing-4);
      }

      .view-controls {
        align-self: flex-end;
      }

      .wall-info {
        padding: var(--md-sys-spacing-4);
      }
    }

    @media (max-width: 480px) {
      .docs-homepage {
        padding: var(--md-sys-spacing-4) var(--md-sys-spacing-3);
      }

      .template-gallery {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--md-sys-spacing-2);
      }

      .template-item {
        padding: var(--md-sys-spacing-3);
      }

      .template-icon {
        width: 56px;
        height: 56px;
      }

      .template-label {
        font-size: var(--md-sys-typescale-label-medium-size);
      }

      .grid-view {
        grid-template-columns: 1fr;
        gap: var(--md-sys-spacing-3);
      }

      .section-header h2 {
        font-size: var(--md-sys-typescale-title-medium-size);
      }

      .wall-item:hover {
        transform: none; /* Disable hover transforms on mobile */
      }
    }

    /* Accessibility enhancements */
    @media (prefers-reduced-motion: reduce) {
      .template-item,
      .wall-item,
      .view-toggle,
      .primary-button,
      .menu-button {
        transition: none;
      }

      .template-item:hover,
      .wall-item:hover {
        transform: none;
      }

      .loading-spinner {
        animation: none;
      }
    }

    /* Focus indicators for keyboard navigation */
    .template-item:focus,
    .wall-item:focus,
    .view-toggle:focus,
    .menu-button:focus,
    .primary-button:focus {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }

    .template-item:focus:not(:focus-visible),
    .wall-item:focus:not(:focus-visible),
    .view-toggle:focus:not(:focus-visible),
    .menu-button:focus:not(:focus-visible),
    .primary-button:focus:not(:focus-visible) {
      outline: none;
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
  
  viewModeItems: ButtonGroupItem[] = [
    { id: 'grid', label: 'Grid', icon: 'grid_view' },
    { id: 'list', label: 'List', icon: 'view_list' }
  ];
  openMenuId: string | null = null;

  constructor(
    private wallService: WallService, 
    private router: Router,
    private confirmationDialog: ConfirmationDialogService,
    private userActivityService: UserActivityService,
    private wallPermissionsService: WallPermissionsService,
    private authService: AuthService,
    private navigationService: NavigationService
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
    // Clear wall context when entering the main walls list
    this.navigationService.clearWallContext();
    
    this.loadWalls();
    
    // Close menu when clicking outside
    document.addEventListener('click', () => {
      this.openMenuId = null;
    });
  }

  loadWalls(): void {
    this.isLoading = true;
    
    // Get all walls user has access to, plus recently visited walls
    combineLatest([
      this.userActivityService.getRecentWallIds(),
      this.wallService.getAllWalls()
    ]).subscribe({
      next: ([recentWallIds, allWalls]) => {
        // Show walls that are either:
        // 1. Owned by the user (always visible)
        // 2. User is an editor (always visible) 
        // 3. Recently visited and user has access
        const currentUser = this.authService.currentUser;
        const visibleWalls = allWalls.filter(wall => {
          const isOwnerOrEditor = currentUser && (
            wall.permissions?.owner === currentUser.uid ||
            wall.permissions?.editors?.includes(currentUser.uid)
          );
          const isRecentlyVisited = recentWallIds.includes(wall.id!);
          return isOwnerOrEditor || isRecentlyVisited;
        });
        
        // Sort: owned/editor walls first, then by recent activity
        const sortedWalls = visibleWalls.sort((a, b) => {
          const aIsOwnerOrEditor = currentUser && (
            a.permissions?.owner === currentUser.uid ||
            a.permissions?.editors?.includes(currentUser.uid)
          );
          const bIsOwnerOrEditor = currentUser && (
            b.permissions?.owner === currentUser.uid ||
            b.permissions?.editors?.includes(currentUser.uid)
          );
          
          // Owned/editor walls come first
          if (aIsOwnerOrEditor && !bIsOwnerOrEditor) return -1;
          if (!aIsOwnerOrEditor && bIsOwnerOrEditor) return 1;
          
          // Among owned/editor walls, sort by last modified
          if (aIsOwnerOrEditor && bIsOwnerOrEditor) {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }
          
          // Among recently visited walls, sort by visit order
          const aIndex = recentWallIds.indexOf(a.id!);
          const bIndex = recentWallIds.indexOf(b.id!);
          return aIndex - bIndex; // Lower index = more recent
        });
        
        this.walls$.next(sortedWalls);
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
    this.confirmationDialog.confirmDelete('this wall').subscribe(confirmed => {
      if (confirmed) {
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
    });
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

  onViewModeChange(item: ButtonGroupItem): void {
    this.setViewMode(item.id as 'grid' | 'list');
  }

  openWall(id: string): void {
    // Find the wall to get its name for tracking
    const wall = this.walls$.value.find(w => w.id === id);
    if (wall) {
      this.userActivityService.trackWallVisit(id, wall.name);
    }
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
    const primary = wall.theme.primaryColor || '#d4af37';
    const secondary = wall.theme.secondaryColor || primary;
    const surface = wall.theme.surfaceColor || '#ffffff';
    
    // Create a more representative gradient using theme colors
    return `linear-gradient(135deg, ${surface}, ${primary}20, ${secondary}15)`;
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

  getDotColor(wall: Wall): string {
    return wall.theme.primaryColor || '#d4af37';
  }

  getLineColor(wall: Wall): string {
    return wall.theme.textColor || wall.theme.secondaryColor || '#6b7280';
  }

  getTemplateColors(templateId: string): { background: string; icon: string; shadow: string; border: string } {
    switch (templateId) {
      case 'alumni':
        return { 
          background: '#121212',
          icon: '#ffd700',
          shadow: '0 4px 8px rgba(255, 215, 0, 0.3)',
          border: '2px solid #ffd700'
        };
      case 'veterans':
        return { 
          background: '#0d1421',
          icon: '#ffffff',
          shadow: '0 4px 8px rgba(220, 53, 69, 0.4)',
          border: '2px solid #dc3545'
        };
      case 'team':
        return { 
          background: '#fafafa',
          icon: '#2196f3',
          shadow: '0 4px 8px rgba(33, 150, 243, 0.3)',
          border: '2px solid #2196f3'
        };
      default:
        return { 
          background: 'var(--md-sys-color-surface-container)',
          icon: 'var(--md-sys-color-primary)',
          shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--md-sys-color-outline-variant)'
        };
    }
  }
}