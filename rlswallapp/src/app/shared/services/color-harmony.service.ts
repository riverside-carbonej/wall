import { Injectable } from '@angular/core';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  cardColor: string;
  textColor: string;
  titleColor: string;
  errorColor: string;
  warningColor: string;
  successColor: string;
}

export interface HarmonyOptions {
  mode: 'light' | 'dark';
  contrast: 'normal' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class ColorHarmonyService {
  
  /**
   * Generate a complete theme palette from a single color
   */
  generatePalette(baseColor: string, options: HarmonyOptions = { mode: 'light', contrast: 'normal' }): ColorPalette {
    const hsl = this.hexToHsl(baseColor);
    
    if (options.mode === 'light') {
      return this.generateLightPalette(hsl, options.contrast);
    } else {
      return this.generateDarkPalette(hsl, options.contrast);
    }
  }

  private generateLightPalette(baseHsl: { h: number; s: number; l: number }, contrast: string): ColorPalette {
    // For light mode, we want:
    // - Light backgrounds (high lightness)
    // - Dark text (low lightness)
    // - Vibrant colors for accents
    
    const primary = this.hslToHex(baseHsl);
    const primaryHue = baseHsl.h;
    
    // Calculate complementary and analogous colors
    const complementaryHue = (primaryHue + 180) % 360;
    const analogous1 = (primaryHue + 30) % 360;
    const analogous2 = (primaryHue - 30 + 360) % 360;
    
    // Ensure primary is not too light for visibility
    const primarySaturation = Math.max(baseHsl.s, 0.5);
    const primaryLightness = Math.min(baseHsl.l, 0.6);
    
    return {
      primary: this.hslToHex({ h: primaryHue, s: primarySaturation, l: primaryLightness }),
      secondary: this.hslToHex({ h: analogous1, s: 0.4, l: 0.45 }),
      accent: this.hslToHex({ h: complementaryHue, s: 0.6, l: 0.5 }),
      background: '#fafafa',
      surface: '#ffffff',
      cardColor: '#ffffff',
      textColor: contrast === 'high' ? '#000000' : '#212121',
      titleColor: this.hslToHex({ h: primaryHue, s: primarySaturation * 0.8, l: primaryLightness * 0.7 }),
      errorColor: '#d32f2f',
      warningColor: '#f57c00',
      successColor: '#388e3c'
    };
  }

  private generateDarkPalette(baseHsl: { h: number; s: number; l: number }, contrast: string): ColorPalette {
    // For dark mode, we want:
    // - Dark backgrounds (low lightness)
    // - Light text (high lightness)
    // - Slightly muted colors to avoid eye strain
    
    const primaryHue = baseHsl.h;
    
    // Calculate complementary and analogous colors
    const complementaryHue = (primaryHue + 180) % 360;
    const analogous1 = (primaryHue + 30) % 360;
    const analogous2 = (primaryHue - 30 + 360) % 360;
    
    // Ensure primary is not too dark and has good visibility
    const primarySaturation = Math.max(baseHsl.s * 0.8, 0.4);
    const primaryLightness = Math.max(Math.min(baseHsl.l, 0.7), 0.5);
    
    return {
      primary: this.hslToHex({ h: primaryHue, s: primarySaturation, l: primaryLightness }),
      secondary: this.hslToHex({ h: analogous1, s: 0.3, l: 0.6 }),
      accent: this.hslToHex({ h: complementaryHue, s: 0.5, l: 0.6 }),
      background: '#121212',
      surface: '#1e1e1e',
      cardColor: '#2a2a2a',
      textColor: contrast === 'high' ? '#ffffff' : '#e0e0e0',
      titleColor: this.hslToHex({ h: primaryHue, s: primarySaturation, l: primaryLightness + 0.1 }),
      errorColor: '#cf6679',
      warningColor: '#ffb74d',
      successColor: '#81c784'
    };
  }

  /**
   * Check if a color combination meets WCAG contrast requirements
   */
  checkContrast(foreground: string, background: string): { ratio: number; passes: { aa: boolean; aaa: boolean } } {
    const l1 = this.getLuminance(foreground);
    const l2 = this.getLuminance(background);
    
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    return {
      ratio,
      passes: {
        aa: ratio >= 4.5,  // WCAG AA for normal text
        aaa: ratio >= 7    // WCAG AAA for normal text
      }
    };
  }

  /**
   * Adjust a color to ensure it meets contrast requirements against a background
   */
  ensureContrast(foreground: string, background: string, targetRatio: number = 4.5): string {
    const currentContrast = this.checkContrast(foreground, background);
    
    if (currentContrast.ratio >= targetRatio) {
      return foreground;
    }
    
    // Convert to HSL for easier manipulation
    const fgHsl = this.hexToHsl(foreground);
    const bgLuminance = this.getLuminance(background);
    
    // Determine if we need to make the foreground lighter or darker
    if (bgLuminance > 0.5) {
      // Light background - make foreground darker
      while (fgHsl.l > 0 && this.checkContrast(this.hslToHex(fgHsl), background).ratio < targetRatio) {
        fgHsl.l -= 0.05;
      }
    } else {
      // Dark background - make foreground lighter
      while (fgHsl.l < 1 && this.checkContrast(this.hslToHex(fgHsl), background).ratio < targetRatio) {
        fgHsl.l += 0.05;
      }
    }
    
    return this.hslToHex(fgHsl);
  }

  /**
   * Generate a color scheme based on color theory
   */
  generateColorScheme(baseColor: string, scheme: 'complementary' | 'triadic' | 'analogous' | 'monochromatic'): string[] {
    const hsl = this.hexToHsl(baseColor);
    const colors: string[] = [baseColor];
    
    switch (scheme) {
      case 'complementary':
        colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 180) % 360 }));
        break;
        
      case 'triadic':
        colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 120) % 360 }));
        colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 240) % 360 }));
        break;
        
      case 'analogous':
        colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 30) % 360 }));
        colors.push(this.hslToHex({ ...hsl, h: (hsl.h - 30 + 360) % 360 }));
        break;
        
      case 'monochromatic':
        colors.push(this.hslToHex({ ...hsl, l: Math.min(hsl.l + 0.2, 1) }));
        colors.push(this.hslToHex({ ...hsl, l: Math.max(hsl.l - 0.2, 0) }));
        colors.push(this.hslToHex({ ...hsl, s: Math.max(hsl.s - 0.2, 0) }));
        break;
    }
    
    return colors;
  }

  /**
   * Convert hex color to HSL
   */
  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const rgb = this.hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: (h || 0) * 360, s, l };
  }

  /**
   * Convert HSL to hex color
   */
  private hslToHex(hsl: { h: number; s: number; l: number }): string {
    const h = hsl.h / 360;
    const s = hsl.s;
    const l = hsl.l;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Calculate relative luminance of a color
   */
  private getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    
    const channel = (c: number) => {
      const sRGB = c / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };
    
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }
}