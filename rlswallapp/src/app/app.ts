import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './shared/services/theme.service';
import { UserAvatarComponent } from './shared/components/user-avatar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, UserAvatarComponent],
  template: `
    <div class="app-container">
      <header class="google-header">
        <div class="header-left">
          <a routerLink="/" class="logo">
            <img src="assets/images/beaver-logo.png" alt="Riverside Schools Logo" class="logo-icon">
            <span class="logo-text">RLS Wall</span>
          </a>
        </div>
        <div class="header-center">
          <div class="search-container">
            <span class="material-icons md-20 search-icon">search</span>
            <input type="text" placeholder="Search" class="search-input">
          </div>
        </div>
        <div class="header-right">
          <button class="header-button theme-toggle" (click)="toggleTheme()" [title]="currentTheme().mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            <!-- Light mode icon (sun) - shown in dark mode -->
            <span *ngIf="currentTheme().mode === 'dark'" class="material-icons md-20 theme-icon">light_mode</span>
            <!-- Dark mode icon (moon) - shown in light mode -->
            <span *ngIf="currentTheme().mode === 'light'" class="material-icons md-20 theme-icon">dark_mode</span>
          </button>
          <button class="header-button apps-button">
            <span class="material-icons md-20">apps</span>
          </button>
          <div class="profile-button">
            <app-user-avatar [size]="32" [clickable]="true"></app-user-avatar>
          </div>
        </div>
      </header>
      <main class="app-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--md-sys-color-background);
    }

    .google-header {
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-outline);
      padding: 8px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .header-left {
      display: flex;
      align-items: center;
      min-width: 272px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #202124;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      margin-right: 4px;
    }

    .logo-text {
      font-size: 22px;
      font-weight: 400;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', sans-serif;
    }

    .header-center {
      flex: 1;
      max-width: 720px;
      margin: 0 auto;
    }

    .search-container {
      position: relative;
      max-width: 600px;
      margin: 0 auto;
    }

    .search-input {
      width: 100%;
      height: 48px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 24px;
      padding: 0 52px 0 16px;
      font-size: 16px;
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface);
      transition: all 0.2s;
      outline: none;
    }

    .search-input:focus {
      background: var(--md-sys-color-surface);
      box-shadow: var(--md-sys-elevation-2);
      border-color: var(--md-sys-color-primary);
    }

    .search-icon {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--md-sys-color-on-surface-variant);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 272px;
      justify-content: flex-end;
    }

    .header-button {
      background: none;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .header-button:hover {
      background-color: var(--md-sys-color-primary-container);
    }

    .theme-icon {
      color: var(--md-sys-color-on-surface);
    }

    .profile-button {
      margin-left: 8px;
    }

    /* Profile circle styles removed - now using UserAvatarComponent */

    .app-main {
      flex: 1;
      background-color: var(--md-sys-color-background);
    }

    @media (max-width: 768px) {
      .google-header {
        padding: 8px 16px;
        height: auto;
        flex-wrap: wrap;
        gap: 8px;
      }

      .header-left {
        min-width: auto;
        flex: 1;
      }

      .header-center {
        order: 3;
        flex-basis: 100%;
        margin: 8px 0 0 0;
      }

      .header-right {
        min-width: auto;
      }

      .search-input {
        height: 40px;
        font-size: 14px;
      }
    }
  `]
})
export class App implements OnInit {
  protected readonly title = signal('RLS Wall App');
  private themeService = inject(ThemeService);
  protected currentTheme = signal(this.themeService.getCurrentThemeSync());

  ngOnInit(): void {
    this.themeService.getCurrentTheme().subscribe(theme => {
      this.currentTheme.set(theme);
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
