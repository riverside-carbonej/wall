import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface AppTheme {
  mode: ThemeMode;
  primary: string;
  secondary: string;
  surface: string;
  background: string;
  onSurface: string;
  onBackground: string;
  outline: string;
  surfaceVariant: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'rls-wall-theme';
  private currentTheme$ = new BehaviorSubject<AppTheme>(this.getDefaultTheme());

  constructor() {
    this.loadTheme();
    this.setupSystemThemeListener();
  }

  private getDefaultTheme(): AppTheme {
    return this.getDarkTheme();
  }

  private getLightTheme(): AppTheme {
    return {
      mode: 'light',
      primary: '#d4af37',
      secondary: '#6b7280',
      surface: '#ffffff',
      background: '#fafafa',
      onSurface: '#202124',
      onBackground: '#202124',
      outline: '#dadce0',
      surfaceVariant: '#f8f9fa'
    };
  }

  private getDarkTheme(): AppTheme {
    return {
      mode: 'dark',
      primary: '#d4af37',
      secondary: '#9ca3af',
      surface: '#1f1f1f',
      background: '#121212',
      onSurface: '#e5e5e5',
      onBackground: '#e5e5e5',
      outline: '#404040',
      surfaceVariant: '#2d2d2d'
    };
  }

  getCurrentTheme(): Observable<AppTheme> {
    return this.currentTheme$.asObservable();
  }

  getCurrentThemeSync(): AppTheme {
    return this.currentTheme$.value;
  }

  setThemeMode(mode: ThemeMode): void {
    const theme = this.getThemeForMode(mode);
    this.currentTheme$.next(theme);
    this.saveTheme(mode);
    this.applyThemeToDocument(theme);
  }

  toggleTheme(): void {
    const currentMode = this.currentTheme$.value.mode;
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    this.setThemeMode(newMode);
  }

  private getThemeForMode(mode: ThemeMode): AppTheme {
    if (mode === 'auto') {
      return this.getSystemPreferredTheme();
    }
    return mode === 'dark' ? this.getDarkTheme() : this.getLightTheme();
  }

  private getSystemPreferredTheme(): AppTheme {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? this.getDarkTheme() : this.getLightTheme();
  }

  private loadTheme(): void {
    const savedMode = localStorage.getItem(this.THEME_KEY) as ThemeMode;
    if (savedMode) {
      const theme = this.getThemeForMode(savedMode);
      this.currentTheme$.next(theme);
      this.applyThemeToDocument(theme);
    } else {
      // Default to dark theme
      this.setThemeMode('dark');
    }
  }

  private saveTheme(mode: ThemeMode): void {
    localStorage.setItem(this.THEME_KEY, mode);
  }

  private setupSystemThemeListener(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.currentTheme$.value.mode === 'auto') {
        const theme = this.getSystemPreferredTheme();
        this.currentTheme$.next(theme);
        this.applyThemeToDocument(theme);
      }
    });
  }

  private applyThemeToDocument(theme: AppTheme): void {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--md-sys-color-primary', theme.primary);
    root.style.setProperty('--md-sys-color-secondary', theme.secondary);
    root.style.setProperty('--md-sys-color-surface', theme.surface);
    root.style.setProperty('--md-sys-color-background', theme.background);
    root.style.setProperty('--md-sys-color-on-surface', theme.onSurface);
    root.style.setProperty('--md-sys-color-on-background', theme.onBackground);
    root.style.setProperty('--md-sys-color-outline', theme.outline);
    root.style.setProperty('--md-sys-color-surface-variant', theme.surfaceVariant);

    // Apply theme class to body
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme.mode === 'dark' ? 'dark' : 'light'}-theme`);
  }

  // Helper method to generate Material 3 tints for wall themes
  generateMaterial3Tints(baseColor: string, isDark: boolean = false): {
    primary: string;
    primaryContainer: string;
    onPrimary: string;
    onPrimaryContainer: string;
    surface: string;
    onSurface: string;
  } {
    // Simple tint generation - in a real app, you'd use Material 3's HCT color system
    const opacity = isDark ? 0.12 : 0.08;
    const containerOpacity = isDark ? 0.16 : 0.12;
    
    return {
      primary: baseColor,
      primaryContainer: `${baseColor}${Math.round(containerOpacity * 255).toString(16).padStart(2, '0')}`,
      onPrimary: isDark ? '#000000' : '#ffffff',
      onPrimaryContainer: isDark ? '#ffffff' : '#000000',
      surface: isDark ? '#1f1f1f' : '#ffffff',
      onSurface: isDark ? '#e5e5e5' : '#202124'
    };
  }
}