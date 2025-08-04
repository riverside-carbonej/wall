import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WallTheme } from '../models/wall.model';

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
  // Wall-specific theme enhancement
  isWallTheme?: boolean;
  wallTheme?: WallTheme;
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
    
    // Reset Material Design container variables to default values when not in wall context
    if (!theme.isWallTheme) {
      const primaryTint = this.hexToRgba(theme.primary, 0.08);
      const surfaceTint = this.hexToRgba(theme.surface, 0.05);
      
      root.style.setProperty('--md-sys-color-primary-container', primaryTint);
      root.style.setProperty('--md-sys-color-surface-container-low', surfaceTint);
      root.style.setProperty('--md-sys-color-surface-container', theme.surfaceVariant);
    }

    // Apply theme class to body
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme.mode === 'dark' ? 'dark' : 'light'}-theme`);
  }

  // Apply wall-specific theme
  applyWallTheme(wallTheme: WallTheme): void {
    // First remove any existing wall-specific styling to prevent conflicts
    this.removeWallSpecificCSS();
    
    const currentMode = this.currentTheme$.value.mode;
    const isDark = currentMode === 'dark';
    
    const adaptedTheme: AppTheme = {
      mode: currentMode,
      primary: wallTheme.primaryColor,
      secondary: wallTheme.secondaryColor,
      surface: this.adjustColorForMode(wallTheme.surfaceColor, isDark),
      background: this.adjustColorForMode(wallTheme.backgroundColor, isDark),
      onSurface: wallTheme.bodyTextColor || wallTheme.textColor || '#2d2d2d',
      onBackground: wallTheme.bodyTextColor || wallTheme.textColor || '#2d2d2d',
      outline: this.generateOutlineColor(wallTheme.primaryColor, isDark),
      surfaceVariant: this.generateSurfaceVariant(wallTheme.surfaceColor, isDark),
      isWallTheme: true,
      wallTheme
    };
    
    this.currentTheme$.next(adaptedTheme);
    this.applyThemeToDocument(adaptedTheme);
    this.applyWallSpecificCSS(wallTheme);
  }
  
  // Clear wall theme and return to app default
  clearWallTheme(): void {
    // First remove wall-specific CSS
    this.removeWallSpecificCSS();
    
    // Get the saved theme mode and ensure we reset to pure app theme
    const savedMode = localStorage.getItem(this.THEME_KEY) as ThemeMode || 'dark';
    const appTheme = this.getThemeForMode(savedMode);
    
    // Explicitly reset the theme state to app theme (not wall theme)
    this.currentTheme$.next({
      ...appTheme,
      isWallTheme: false,
      wallTheme: undefined
    });
    
    // Apply the theme to the document
    this.applyThemeToDocument(appTheme);
  }
  
  private adjustColorForMode(color: string, isDark: boolean): string {
    // For dark mode, darken the colors; for light mode, use as-is or lighten
    if (isDark) {
      return this.darkenColor(color, 0.3);
    }
    return color;
  }
  
  private generateOutlineColor(primaryColor: string, isDark: boolean): string {
    // Generate a subtle outline color based on primary
    const opacity = isDark ? 0.2 : 0.12;
    return this.hexToRgba(primaryColor, opacity);
  }
  
  private generateSurfaceVariant(surfaceColor: string, isDark: boolean): string {
    // Generate surface variant by slightly modifying the surface color
    return isDark ? this.lightenColor(surfaceColor, 0.1) : this.darkenColor(surfaceColor, 0.05);
  }
  
  private applyWallSpecificCSS(wallTheme: WallTheme): void {
    const root = document.documentElement;
    
    // Apply wall-specific CSS variables
    root.style.setProperty('--wall-primary', wallTheme.primaryColor);
    root.style.setProperty('--wall-secondary', wallTheme.secondaryColor);
    root.style.setProperty('--wall-surface', wallTheme.surfaceColor);
    root.style.setProperty('--wall-card', wallTheme.cardColor);
    
    // Apply tinted variations for UI elements
    const primaryTint = this.hexToRgba(wallTheme.primaryColor, 0.1);
    const primaryTintStrong = this.hexToRgba(wallTheme.primaryColor, 0.15);
    
    root.style.setProperty('--md-sys-color-primary-container', primaryTint);
    root.style.setProperty('--md-sys-color-surface-container-low', primaryTint);
    root.style.setProperty('--md-sys-color-surface-container', primaryTintStrong);
    
    // Add wall theme class
    document.body.classList.add('wall-themed');
  }
  
  private removeWallSpecificCSS(): void {
    const root = document.documentElement;
    
    // Remove wall-specific CSS variables
    root.style.removeProperty('--wall-primary');
    root.style.removeProperty('--wall-secondary');
    root.style.removeProperty('--wall-surface');
    root.style.removeProperty('--wall-card');
    root.style.removeProperty('--wall-primary-tint');
    root.style.removeProperty('--wall-secondary-tint');
    
    // Remove overridden Material Design variables that wall themes modify
    root.style.removeProperty('--md-sys-color-primary-container');
    root.style.removeProperty('--md-sys-color-surface-container-low');
    root.style.removeProperty('--md-sys-color-surface-container');
    
    // Remove wall theme class
    document.body.classList.remove('wall-themed');
    
    // Remove any custom CSS from wall themes if they exist
    const existingWallStyle = document.getElementById('wall-theme-custom-css');
    if (existingWallStyle) {
      existingWallStyle.remove();
    }
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
  
  // Color utility methods
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  private darkenColor(hex: string, factor: number): string {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor));
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor));
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  private lightenColor(hex: string, factor: number): string {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * factor);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * factor);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // Generate a default wall theme if none exists
  generateDefaultWallTheme(primaryColor: string = '#d4af37'): WallTheme {
    return {
      id: 'default',
      name: 'Default',
      description: 'Default wall theme',
      primaryColor,
      secondaryColor: '#6b7280',
      tertiaryColor: '#059669',
      backgroundColor: '#fafafa',
      surfaceColor: '#ffffff',
      cardColor: '#ffffff',
      titleColor: '#202124',
      bodyTextColor: '#374151',
      secondaryTextColor: '#6b7280',
      captionTextColor: '#9ca3af',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
      successColor: '#10b981',
      cardStyle: 'elevated',
      layout: 'grid',
      spacing: 'comfortable',
      cornerRadius: 'medium',
      elevation: 'medium',
      font: 'system',
      textScale: 1,
      contrast: 'normal',
      animations: true,
      customCss: ''
    };
  }
}