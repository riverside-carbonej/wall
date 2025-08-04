import { Injectable } from '@angular/core';
import { WallTheme } from '../models/wall.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeApplicationService {

  constructor() { }

  /**
   * Apply a wall theme to the document by injecting CSS custom properties
   */
  applyTheme(theme: WallTheme, scope: 'global' | 'wall' = 'wall'): void {
    const root = document.documentElement;
    const prefix = scope === 'global' ? '--md-sys-color' : '--wall-theme';

    // Apply core brand colors
    root.style.setProperty(`${prefix}-primary`, theme.primaryColor);
    root.style.setProperty(`${prefix}-secondary`, theme.secondaryColor);
    root.style.setProperty(`${prefix}-tertiary`, theme.tertiaryColor || theme.primaryColor);

    // Apply surface hierarchy
    root.style.setProperty(`${prefix}-background`, theme.backgroundColor);
    root.style.setProperty(`${prefix}-surface`, theme.surfaceColor);
    root.style.setProperty(`${prefix}-card`, theme.cardColor);

    // Apply typography hierarchy
    root.style.setProperty(`${prefix}-title`, theme.titleColor || theme.textColor || '#1a1a1a');
    root.style.setProperty(`${prefix}-body-text`, theme.bodyTextColor || theme.textColor || '#2d2d2d');
    root.style.setProperty(`${prefix}-secondary-text`, theme.secondaryTextColor || theme.textColor || '#6b6b6b');
    root.style.setProperty(`${prefix}-caption-text`, theme.captionTextColor || theme.textColor || '#8b7d3a');

    // Apply semantic colors
    root.style.setProperty(`${prefix}-error`, theme.errorColor);
    root.style.setProperty(`${prefix}-warning`, theme.warningColor);
    root.style.setProperty(`${prefix}-success`, theme.successColor);

    // Apply layout properties
    root.style.setProperty(`${prefix}-corner-radius`, this.getCornerRadiusValue(theme.cornerRadius));
    root.style.setProperty(`${prefix}-elevation`, this.getElevationValue(theme.elevation));
    root.style.setProperty(`${prefix}-spacing`, this.getSpacingValue(theme.spacing));

    // Apply font family
    if (theme.font === 'custom' && theme.customFontFamily) {
      root.style.setProperty(`${prefix}-font-family`, theme.customFontFamily);
    } else {
      root.style.setProperty(`${prefix}-font-family`, this.getFontFamilyValue(theme.font));
    }

    // Apply gradient if enabled
    if (theme.gradient?.enabled) {
      const gradientCSS = this.generateGradientCSS(theme.gradient);
      root.style.setProperty(`${prefix}-gradient`, gradientCSS);
    }

    // Apply custom CSS if provided
    if (theme.customCss) {
      this.injectCustomCSS(theme.customCss, theme.id);
    }
  }

  /**
   * Remove theme from the document
   */
  removeTheme(themeId: string, scope: 'global' | 'wall' = 'wall'): void {
    const root = document.documentElement;
    const prefix = scope === 'global' ? '--md-sys-color' : '--wall-theme';

    // Remove all theme-related CSS custom properties
    const properties = [
      'primary', 'secondary', 'tertiary',
      'background', 'surface', 'card',
      'title', 'body-text', 'secondary-text', 'caption-text',
      'error', 'warning', 'success',
      'corner-radius', 'elevation', 'spacing', 'font-family', 'gradient'
    ];

    properties.forEach(prop => {
      root.style.removeProperty(`${prefix}-${prop}`);
    });

    // Remove custom CSS
    this.removeCustomCSS(themeId);
  }

  /**
   * Generate CSS for wall container with theme
   */
  generateWallCSS(theme: WallTheme): string {
    const css = `
      .wall-container {
        background-color: ${theme.backgroundColor};
        color: ${theme.bodyTextColor};
        font-family: ${this.getFontFamilyValue(theme.font)};
      }
      
      .wall-card {
        background-color: ${theme.cardColor};
        border-radius: ${this.getCornerRadiusValue(theme.cornerRadius)};
        box-shadow: ${this.getElevationValue(theme.elevation)};
      }
      
      .wall-title {
        color: ${theme.titleColor};
      }
      
      .wall-text {
        color: ${theme.bodyTextColor};
      }
      
      .wall-secondary-text {
        color: ${theme.secondaryTextColor};
      }
      
      .wall-caption {
        color: ${theme.captionTextColor};
      }
      
      .wall-primary-button {
        background-color: ${theme.primaryColor};
        color: ${this.getContrastColor(theme.primaryColor)};
      }
      
      .wall-secondary-button {
        background-color: ${theme.secondaryColor};
        color: ${this.getContrastColor(theme.secondaryColor)};
      }
    `;

    if (theme.gradient?.enabled) {
      const gradientCSS = this.generateGradientCSS(theme.gradient);
      return css + `
        .wall-gradient-bg {
          background: ${gradientCSS};
        }
      `;
    }

    return css;
  }

  /**
   * Get theme preview CSS for theme selector
   */
  getThemePreviewCSS(theme: WallTheme): string {
    return `
      background: ${theme.backgroundColor};
      border: 2px solid ${theme.primaryColor};
      border-radius: ${this.getCornerRadiusValue(theme.cornerRadius)};
      box-shadow: ${this.getElevationValue(theme.elevation)};
      color: ${theme.bodyTextColor};
    `;
  }

  private getCornerRadiusValue(radius: WallTheme['cornerRadius']): string {
    const radiusMap = {
      'none': '0px',
      'small': 'var(--md-sys-shape-corner-small)',
      'medium': 'var(--md-sys-shape-corner-medium)',
      'large': 'var(--md-sys-shape-corner-large)',
      'extra-large': 'var(--md-sys-shape-corner-extra-large)'
    };
    return radiusMap[radius] || radiusMap['medium'];
  }

  private getElevationValue(elevation: WallTheme['elevation']): string {
    const elevationMap = {
      'flat': 'var(--md-sys-elevation-0)',
      'low': 'var(--md-sys-elevation-1)',
      'medium': 'var(--md-sys-elevation-2)',
      'high': 'var(--md-sys-elevation-4)'
    };
    return elevationMap[elevation] || elevationMap['medium'];
  }

  private getSpacingValue(spacing: WallTheme['spacing']): string {
    const spacingMap = {
      'compact': 'var(--md-sys-spacing-3)',
      'comfortable': 'var(--md-sys-spacing-4)',
      'spacious': 'var(--md-sys-spacing-6)'
    };
    return spacingMap[spacing] || spacingMap['comfortable'];
  }

  private getFontFamilyValue(font: WallTheme['font']): string {
    const fontMap = {
      'system': "'Google Sans', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      'serif': "'Georgia', 'Times New Roman', serif",
      'mono': "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      'custom': 'inherit'
    };
    return fontMap[font] || fontMap['system'];
  }

  private generateGradientCSS(gradient: NonNullable<WallTheme['gradient']>): string {
    const colors = gradient.colors.join(', ');
    
    if (gradient.direction === 'linear') {
      return `linear-gradient(135deg, ${colors})`;
    } else if (gradient.direction === 'radial') {
      return `radial-gradient(circle, ${colors})`;
    }
    
    return `linear-gradient(135deg, ${colors})`;
  }

  private injectCustomCSS(css: string, themeId: string): void {
    // Remove existing custom CSS for this theme
    this.removeCustomCSS(themeId);

    // Create new style element
    const styleElement = document.createElement('style');
    styleElement.id = `theme-custom-css-${themeId}`;
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  private removeCustomCSS(themeId: string): void {
    const existingStyle = document.getElementById(`theme-custom-css-${themeId}`);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  private getContrastColor(backgroundColor: string): string {
    // Simple contrast calculation - in production, use a more sophisticated algorithm
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * Validate theme colors for accessibility
   */
  validateThemeAccessibility(theme: WallTheme): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check contrast ratios
    const titleContrast = this.calculateContrastRatio(
      theme.titleColor || theme.textColor || '#1a1a1a', 
      theme.backgroundColor
    );
    const bodyContrast = this.calculateContrastRatio(
      theme.bodyTextColor || theme.textColor || '#2d2d2d', 
      theme.backgroundColor
    );
    const cardContrast = this.calculateContrastRatio(
      theme.bodyTextColor || theme.textColor || '#2d2d2d', 
      theme.cardColor
    );

    if (titleContrast < 4.5) {
      warnings.push('Title text contrast ratio is below WCAG AA standards');
    }

    if (bodyContrast < 4.5) {
      warnings.push('Body text contrast ratio is below WCAG AA standards');
    }

    if (cardContrast < 4.5) {
      warnings.push('Card text contrast ratio is below WCAG AA standards');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  private calculateContrastRatio(foreground: string, background: string): number {
    // Simplified contrast ratio calculation
    // In production, use a proper color library like chroma.js
    const getLuminance = (color: string): number => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const sRGB = [r, g, b].map(val => {
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
}