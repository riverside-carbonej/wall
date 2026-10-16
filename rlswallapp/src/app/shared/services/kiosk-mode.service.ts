import { Injectable, computed, signal } from '@angular/core';

export type KioskSetting = 'on' | 'off' | 'auto';

/**
 * Decides whether the app is running on a kiosk, which turns on the on-screen keyboard.
 *
 * Priority:
 * 1. `?kiosk=on|off|auto` in the URL — saved to localStorage so it sticks on that machine.
 * 2. A previously saved setting.
 * 3. Auto-detect: a full-screen window on a touch-only screen (no mouse or trackpad).
 */
@Injectable({
  providedIn: 'root'
})
export class KioskModeService {
  private readonly STORAGE_KEY = 'riverside-wall-kiosk-mode';

  private readonly setting = signal<KioskSetting>(this.loadSetting());
  private readonly detected = signal(this.detectKiosk());

  /** True when the on-screen keyboard should be used. */
  readonly enabled = computed(() => {
    const setting = this.setting();
    return setting === 'auto' ? this.detected() : setting === 'on';
  });

  constructor() {
    if (typeof window === 'undefined') return;

    // Re-check auto-detection when the window or input devices change
    const recheck = () => this.detected.set(this.detectKiosk());
    window.addEventListener('resize', recheck);
    document.addEventListener('fullscreenchange', recheck);
    window.matchMedia('(any-pointer: fine)').addEventListener('change', recheck);
  }

  get currentSetting(): KioskSetting {
    return this.setting();
  }

  setSetting(setting: KioskSetting): void {
    this.setting.set(setting);
    try {
      if (setting === 'auto') {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        localStorage.setItem(this.STORAGE_KEY, setting);
      }
    } catch (error) {
      console.warn('Failed to save kiosk mode to localStorage:', error);
    }
  }

  private loadSetting(): KioskSetting {
    if (typeof window === 'undefined') return 'auto';

    const fromUrl = new URLSearchParams(window.location.search).get('kiosk')?.toLowerCase();
    if (fromUrl === 'on' || fromUrl === 'off' || fromUrl === 'auto') {
      try {
        if (fromUrl === 'auto') {
          localStorage.removeItem(this.STORAGE_KEY);
        } else {
          localStorage.setItem(this.STORAGE_KEY, fromUrl);
        }
      } catch (error) {
        console.warn('Failed to save kiosk mode to localStorage:', error);
      }
      return fromUrl;
    }

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'on' || saved === 'off') return saved;
    } catch (error) {
      console.warn('Failed to load kiosk mode from localStorage:', error);
    }
    return 'auto';
  }

  /**
   * Browsers can't report "kiosk mode" or "keyboard disabled", so this looks for the
   * combination a kiosk has: touch input, no fine pointer, and a window filling the screen.
   */
  private detectKiosk(): boolean {
    if (typeof window === 'undefined') return false;

    const hasTouch = navigator.maxTouchPoints > 0;
    const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;
    const isFullscreen =
      window.matchMedia('(display-mode: fullscreen)').matches ||
      !!document.fullscreenElement ||
      (window.innerWidth >= screen.width - 1 && window.innerHeight >= screen.height - 1);

    return hasTouch && !hasFinePointer && isFullscreen;
  }
}
