import { Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { KioskModeService } from '../../services/kiosk-mode.service';

type KeyAction = 'char' | 'backspace' | 'enter' | 'shift' | 'space' | 'left' | 'right' | 'hide' | 'layer';
type Layer = 'letters' | 'symbols' | 'symbols2' | 'numeric';
type ShiftState = 'off' | 'once' | 'lock';

interface Key {
  action: KeyAction;
  label?: string;
  icon?: string;
  /** Text inserted for 'char' keys, or the layer to switch to for 'layer' keys */
  value?: string;
  /** Relative width; each row adds up to the same total */
  width?: number;
}

// Input types that take typed text. Date, color, range, etc. already work by touch.
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

const chars = (text: string): Key[] => text.split(' ').map(c => ({ action: 'char' as const, value: c }));

const BACKSPACE: Key = { action: 'backspace', icon: 'backspace', width: 2 };
const ENTER: Key = { action: 'enter', icon: 'keyboard_return', width: 2 };
const SPACE: Key = { action: 'space', label: 'space', width: 8 };

// Toolbar above the keys: cursor arrows on the left, close on the right
const LEFT: Key = { action: 'left', icon: 'arrow_back' };
const RIGHT: Key = { action: 'right', icon: 'arrow_forward' };
const CLOSE: Key = { action: 'hide', icon: 'close' };

// Dragging the toolbar down past this share of the keyboard's height (or flicking it) closes it
const DRAG_DISMISS_RATIO = 0.25;
const DRAG_DISMISS_VELOCITY = 0.5; // px per ms

/**
 * On-screen keyboard for kiosks without a physical keyboard.
 *
 * Only active while kiosk mode is on. It opens whenever a text field anywhere in the app gets
 * focus, and types into that field the way a real keyboard would (inserting at the cursor and
 * firing `input` events), so Angular forms, validation and live search keep working unchanged.
 */
@Component({
  selector: 'app-on-screen-keyboard',
  standalone: true,
  template: `
    @if (kioskMode.enabled()) {
      <div
        class="osk"
        [class.open]="isOpen()"
        [class.numeric]="layer() === 'numeric'"
        aria-hidden="true">
        <div class="osk-toolbar" (pointerdown)="onDragStart($event)">
          <div class="osk-toolbar-group">
            @for (key of toolbarStart; track key.action) {
              <div
                class="osk-icon-button"
                [class.disabled]="isKeyDisabled(key)"
                (pointerdown)="onKeyDown(key, $event)">
                <span class="material-icons">{{ key.icon }}</span>
              </div>
            }
          </div>
          <div class="osk-drag-handle"></div>
          <div class="osk-toolbar-group end">
            <div class="osk-icon-button tonal" (pointerdown)="onKeyDown(closeKey, $event)">
              <span class="material-icons">{{ closeKey.icon }}</span>
            </div>
          </div>
        </div>
        <div class="osk-rows">
          @for (row of rows(); track $index) {
            <div class="osk-row">
              @for (key of row; track $index) {
                <div
                  class="osk-key"
                  [class.char]="key.action === 'char'"
                  [class.space]="key.action === 'space'"
                  [class.action]="key.action !== 'char' && key.action !== 'space'"
                  [attr.data-preview]="key.action === 'char' ? keyLabel(key) : null"
                  [class.enter]="key.action === 'enter'"
                  [class.active]="isKeyActive(key)"
                  [class.disabled]="isKeyDisabled(key)"
                  [style.flex-grow]="key.width || 1"
                  (pointerdown)="onKeyDown(key, $event)">
                  @if (key.icon) {
                    <span class="material-icons">{{ keyIcon(key) }}</span>
                  } @else {
                    <span class="osk-label">{{ keyLabel(key) }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    /*
     * Colors are mixed from the Material theme tokens, so the keyboard follows light/dark mode
     * and each wall's own primary and secondary colors.
     */
    .osk {
      --osk-panel: color-mix(in srgb, var(--md-sys-color-secondary) 6%, var(--md-sys-color-surface-container));
      --osk-key: color-mix(in srgb, var(--md-sys-color-secondary) 4%, var(--md-sys-color-surface-container-highest));
      --osk-key-text: var(--md-sys-color-on-surface);
      --osk-key-secondary: color-mix(in srgb, var(--md-sys-color-secondary) 28%, var(--md-sys-color-surface-container-high));
      --osk-key-secondary-text: color-mix(in srgb, var(--md-sys-color-secondary) 45%, var(--md-sys-color-on-surface));
      /* Tonal primary: readable in light and dark, whatever primary color a wall uses */
      --osk-key-primary: color-mix(in srgb, var(--md-sys-color-primary) 38%, var(--osk-key));
      --osk-key-primary-text: color-mix(in srgb, var(--md-sys-color-primary) 35%, var(--md-sys-color-on-surface));
      --osk-state-layer: color-mix(in srgb, var(--md-sys-color-on-surface) 14%, transparent);

      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100000;
      padding: 4px 12px calc(14px + env(safe-area-inset-bottom, 0px));
      background: var(--osk-panel);
      border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0;
      box-shadow: 0 -4px 24px color-mix(in srgb, var(--md-sys-color-shadow, #000) 18%, transparent);
      transform: translateY(100%);
      visibility: hidden;
      transition: transform 260ms cubic-bezier(0.2, 0, 0, 1), visibility 0s linear 260ms;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .osk.open {
      transform: translateY(0);
      visibility: visible;
      transition: transform 260ms cubic-bezier(0.05, 0.7, 0.1, 1), visibility 0s;
    }

    /* Toolbar: cursor arrows, drag handle, close */
    .osk-toolbar {
      position: relative;
      max-width: 1200px;
      height: 52px;
      margin: 0 auto 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: grab;
    }

    .osk.numeric .osk-toolbar {
      max-width: 480px;
    }

    .osk-toolbar-group {
      display: flex;
      gap: 4px;
    }

    /* Material 3 bottom sheet drag handle */
    .osk-drag-handle {
      position: absolute;
      left: 50%;
      top: 8px;
      width: 32px;
      height: 4px;
      transform: translateX(-50%);
      border-radius: var(--md-sys-shape-corner-full);
      background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 40%, transparent);
      pointer-events: none;
    }

    /* Material 3 icon buttons */
    .osk-icon-button {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--md-sys-shape-corner-full);
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      transition: border-radius 120ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1);
    }

    .osk-icon-button.tonal {
      background: var(--osk-key-secondary);
      color: var(--osk-key-secondary-text);
    }

    .osk-icon-button::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--osk-state-layer);
      opacity: 0;
      transition: opacity 120ms;
    }

    .osk-icon-button.pressed::before {
      opacity: 1;
    }

    .osk-icon-button.pressed {
      border-radius: var(--md-sys-shape-corner-medium);
      transform: scale(0.94);
    }

    .osk-icon-button.disabled {
      opacity: 0.38;
      pointer-events: none;
    }

    .osk-icon-button .material-icons {
      font-size: 24px;
    }

    .osk-rows {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .osk.numeric .osk-rows {
      max-width: 480px;
    }

    .osk-row {
      display: flex;
      gap: 10px;
    }

    .osk-key {
      position: relative;
      flex: 1 1 0;
      min-width: 0;
      height: clamp(48px, 7vh, 72px);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--osk-key);
      color: var(--osk-key-text);
      box-shadow: 0 1px 0 color-mix(in srgb, var(--md-sys-color-shadow, #000) 22%, transparent);
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: clamp(18px, 2.6vh, 26px);
      cursor: pointer;
      transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), border-radius 120ms, background-color 120ms;
    }

    /* Material state layer for the pressed look */
    .osk-key::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--osk-state-layer);
      opacity: 0;
      transition: opacity 120ms;
    }

    .osk-key.pressed::before {
      opacity: 1;
    }

    .osk-key.pressed {
      z-index: 1;
      transform: scale(0.95);
      border-radius: var(--md-sys-shape-corner-large);
    }

    .osk-key.action {
      background: var(--osk-key-secondary);
      color: var(--osk-key-secondary-text);
      font-size: clamp(15px, 2vh, 20px);
      font-weight: 500;
    }

    .osk-key.enter,
    .osk-key.active {
      background: var(--osk-key-primary);
      color: var(--osk-key-primary-text);
    }

    .osk-key.enter {
      border-radius: var(--md-sys-shape-corner-full);
    }

    .osk-key.space .osk-label {
      font-size: 0.6em;
      letter-spacing: 0.08em;
      color: color-mix(in srgb, var(--osk-key-text) 45%, transparent);
    }

    /* Letter preview that pops up above the key while it's held */
    .osk-key.char.pressed::after {
      content: attr(data-preview);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      transform: translateX(-50%);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--osk-key-primary);
      color: var(--osk-key-primary-text);
      font-size: 1.4em;
      text-align: center;
      box-shadow: var(--md-sys-elevation-2);
      pointer-events: none;
      animation: osk-pop 120ms cubic-bezier(0.05, 0.7, 0.1, 1);
    }

    @keyframes osk-pop {
      from { opacity: 0; transform: translate(-50%, 6px) scale(0.85); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }

    .osk-key.disabled {
      opacity: 0.38;
      pointer-events: none;
    }

    .osk-key .material-icons {
      font-size: clamp(22px, 3vh, 30px);
    }

    @media (prefers-reduced-motion: reduce) {
      .osk,
      .osk.open,
      .osk-key,
      .osk-icon-button {
        transition: none;
      }
      .osk-key.char.pressed::after {
        animation: none;
      }
    }
  `]
})
export class OnScreenKeyboardComponent implements OnInit, OnDestroy {
  protected kioskMode = inject(KioskModeService);
  private host = inject(ElementRef<HTMLElement>);
  private router = inject(Router);

  protected isOpen = signal(false);
  protected layer = signal<Layer>('letters');
  protected shift = signal<ShiftState>('off');
  private inputKind = signal<'text' | 'email' | 'number'>('text');
  private canMoveCursor = signal(true);

  private target: HTMLInputElement | HTMLTextAreaElement | null = null;
  private originalInputMode: string | null = null;
  /** Text typed into a number input; the input itself drops partial values like "-" or "1." */
  private numberBuffer = '';
  private pressing = false;
  private lastShiftTap = 0;
  private repeatTimeout?: number;
  private repeatInterval?: number;
  private hideTimeout?: number;
  private liftedElement: HTMLElement | null = null;
  private routerSub?: Subscription;

  protected readonly toolbarStart: Key[] = [LEFT, RIGHT];
  protected readonly closeKey = CLOSE;

  private dragStartY = 0;
  private dragStartTime = 0;
  private dragOffset = 0;

  protected rows = computed<Key[][]>(() => {
    switch (this.layer()) {
      case 'numeric':
        return [
          [...chars('1 2 3'), { ...BACKSPACE, width: 1 }],
          [...chars('4 5 6 -')],
          [...chars('7 8 9 .')],
          [{ action: 'char', value: '0', width: 2 }, { ...ENTER, width: 2 }]
        ];
      case 'symbols':
        return [
          [...chars('1 2 3 4 5 6 7 8 9 0'), BACKSPACE],
          [...chars('@ # $ % & - + ( ) /'), ENTER],
          [{ action: 'layer', value: 'symbols2', label: '=\\<', width: 2 }, ...chars('* " \' : ; ! ? _ , .')],
          [{ action: 'layer', value: 'letters', label: 'abc', width: 2 }, { ...SPACE, width: 10 }]
        ];
      case 'symbols2':
        return [
          [...chars('~ ` | \\ ^ { } [ ] °'), BACKSPACE],
          [...chars('< > = € £ ¥ © ® ™ ¢'), ENTER],
          [{ action: 'layer', value: 'symbols', label: '?123', width: 2 }, ...chars('¡ ¿ « » § · • – — …')],
          [{ action: 'layer', value: 'letters', label: 'abc', width: 2 }, { ...SPACE, width: 10 }]
        ];
      default: {
        const isEmail = this.inputKind() === 'email';
        return [
          [...chars('q w e r t y u i o p'), BACKSPACE],
          [...chars('a s d f g h j k l'), ...chars(isEmail ? '_' : "'"), ENTER],
          [{ action: 'shift', icon: 'arrow_upward', width: 2 }, ...chars('z x c v b n m'), ...chars(isEmail ? '- + !' : '- ! ?')],
          isEmail
            ? [{ action: 'layer', value: 'symbols', label: '?123', width: 2 }, ...chars('@'), { ...SPACE, width: 6 }, ...chars('.'), { action: 'char', value: '.com', width: 2 }]
            : [{ action: 'layer', value: 'symbols', label: '?123', width: 2 }, ...chars(','), SPACE, ...chars('.')]
        ];
      }
    }
  });

  private readonly onFocusIn = (event: FocusEvent) => {
    if (!this.kioskMode.enabled()) return;
    const element = event.target;
    if (this.isTextField(element)) {
      this.attach(element);
    }
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    if (event.target !== this.target) return;

    // A key press should never take focus away from the field, but if the browser does, take it back
    if (this.pressing) {
      const field = this.target;
      setTimeout(() => field?.focus({ preventScroll: true }));
      return;
    }

    // Wait a tick so focus moving straight to another field doesn't close and reopen the keyboard
    clearTimeout(this.hideTimeout);
    this.hideTimeout = window.setTimeout(() => {
      if (!this.isTextField(document.activeElement)) {
        this.close();
      }
    });
  };

  private readonly onPointerEnd = () => {
    this.pressing = false;
    this.stopRepeat();
    // Linger briefly so quick taps still show the press and letter preview
    const pressed = this.host.nativeElement.querySelectorAll('.pressed');
    setTimeout(() => pressed.forEach((el: Element) => el.classList.remove('pressed')), 90);
  };

  // Cancelling touchstart stops the browser from moving focus off the field. Angular can't
  // register non-passive listeners from a template, so this is added by hand.
  private readonly onTouchStart = (event: TouchEvent) => {
    if ((event.target as HTMLElement).closest?.('.osk')) {
      event.preventDefault();
    }
  };

  private readonly onResize = () => this.updateHeight();

  private readonly onMouseDown = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest?.('.osk')) {
      event.preventDefault();
    }
  };

  constructor() {
    // Turning kiosk mode off while the keyboard is open closes it
    effect(() => {
      if (!this.kioskMode.enabled()) {
        this.close();
      }
    });
  }

  ngOnInit(): void {
    document.addEventListener('focusin', this.onFocusIn, true);
    document.addEventListener('focusout', this.onFocusOut, true);
    document.addEventListener('pointerup', this.onPointerEnd, true);
    document.addEventListener('pointercancel', this.onPointerEnd, true);
    this.host.nativeElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.host.nativeElement.addEventListener('mousedown', this.onMouseDown);

    // Key sizes depend on the window height, so keep --osk-height in sync
    window.addEventListener('resize', this.onResize);

    // A route change (including the kiosk inactivity reset) can remove the field without a blur
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.target && !this.target.isConnected) {
          this.close();
        }
      });
  }

  ngOnDestroy(): void {
    document.removeEventListener('focusin', this.onFocusIn, true);
    document.removeEventListener('focusout', this.onFocusOut, true);
    document.removeEventListener('pointerup', this.onPointerEnd, true);
    document.removeEventListener('pointercancel', this.onPointerEnd, true);
    this.host.nativeElement.removeEventListener('touchstart', this.onTouchStart);
    this.host.nativeElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('resize', this.onResize);
    this.routerSub?.unsubscribe();
    this.close();
  }

  protected keyLabel(key: Key): string {
    if (key.action === 'char' && key.value) {
      return this.shift() !== 'off' ? key.value.toUpperCase() : key.value;
    }
    return key.label ?? '';
  }

  protected keyIcon(key: Key): string {
    if (key.action === 'shift' && this.shift() === 'lock') {
      return 'keyboard_capslock';
    }
    return key.icon ?? '';
  }

  protected isKeyActive(key: Key): boolean {
    return key.action === 'shift' && this.shift() !== 'off';
  }

  protected isKeyDisabled(key: Key): boolean {
    return (key.action === 'left' || key.action === 'right') && !this.canMoveCursor();
  }

  protected onKeyDown(key: Key, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.pressing = true;
    (event.currentTarget as HTMLElement).classList.add('pressed');

    if (!this.target || !this.target.isConnected) {
      this.close();
      return;
    }

    this.press(key);

    // Holding backspace keeps deleting, like a real keyboard
    if (key.action === 'backspace') {
      this.repeatTimeout = window.setTimeout(() => {
        this.repeatInterval = window.setInterval(() => this.press(key), 60);
      }, 450);
    }
  }

  private press(key: Key): void {
    switch (key.action) {
      case 'char':
        this.insert(this.shift() !== 'off' ? key.value!.toUpperCase() : key.value!);
        if (this.shift() === 'once') this.shift.set('off');
        break;
      case 'space':
        this.insert(' ');
        break;
      case 'backspace':
        this.backspace();
        break;
      case 'enter':
        this.enter();
        break;
      case 'shift':
        this.toggleShift();
        break;
      case 'left':
        this.moveCursor(-1);
        break;
      case 'right':
        this.moveCursor(1);
        break;
      case 'hide':
        this.dismiss();
        break;
      case 'layer':
        this.layer.set(key.value as Layer);
        this.shift.set('off');
        break;
    }
  }

  /** Drag the toolbar down to dismiss, like a Material bottom sheet */
  protected onDragStart(event: PointerEvent): void {
    event.preventDefault();
    this.pressing = true;
    this.dragStartY = event.clientY;
    this.dragStartTime = event.timeStamp;
    this.dragOffset = 0;

    const panel = this.panel();
    if (!panel) return;
    panel.style.transition = 'none';
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    document.addEventListener('pointermove', this.onDragMove);
    document.addEventListener('pointerup', this.onDragEnd);
    document.addEventListener('pointercancel', this.onDragEnd);
  }

  private readonly onDragMove = (event: PointerEvent) => {
    this.dragOffset = Math.max(0, event.clientY - this.dragStartY);
    const panel = this.panel();
    if (panel) panel.style.transform = `translateY(${this.dragOffset}px)`;
  };

  private readonly onDragEnd = (event: PointerEvent) => {
    document.removeEventListener('pointermove', this.onDragMove);
    document.removeEventListener('pointerup', this.onDragEnd);
    document.removeEventListener('pointercancel', this.onDragEnd);

    const panel = this.panel();
    if (!panel) return;
    const velocity = this.dragOffset / Math.max(1, event.timeStamp - this.dragStartTime);
    const shouldDismiss =
      this.dragOffset > panel.offsetHeight * DRAG_DISMISS_RATIO ||
      (this.dragOffset > 24 && velocity > DRAG_DISMISS_VELOCITY);

    if (shouldDismiss) {
      this.dismiss();
      // Clear the drag position after the panel loses .open, so it slides down from where it was
      requestAnimationFrame(() => {
        panel.style.transition = '';
        panel.style.transform = '';
      });
    } else {
      panel.style.transition = '';
      panel.style.transform = '';
    }
  };

  private panel(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.osk');
  }

  private attach(field: HTMLInputElement | HTMLTextAreaElement): void {
    clearTimeout(this.hideTimeout);
    if (field === this.target && this.isOpen()) return;

    this.restoreField();
    this.target = field;

    // Stops Windows from also showing its own touch keyboard
    this.originalInputMode = field.getAttribute('inputmode');
    field.setAttribute('inputmode', 'none');

    const type = field instanceof HTMLInputElement ? field.type : 'textarea';
    this.inputKind.set(type === 'email' ? 'email' : type === 'number' ? 'number' : 'text');
    this.canMoveCursor.set(this.supportsSelection(field));
    this.numberBuffer = field.value;
    this.layer.set(type === 'number' || type === 'tel' ? 'numeric' : 'letters');
    this.shift.set('off');
    this.isOpen.set(true);

    // Measure once the keyboard has rendered so the layout can make room for it
    setTimeout(() => this.updateHeight());
    // Let the layout make room for the keyboard, then make sure the field is visible
    setTimeout(() => this.revealField(), 220);
  }

  private close(): void {
    clearTimeout(this.hideTimeout);
    this.stopRepeat();
    this.restoreField();
    this.target = null;
    this.isOpen.set(false);
    this.updateHeight();
  }

  private restoreField(): void {
    if (this.target) {
      if (this.originalInputMode === null) {
        this.target.removeAttribute('inputmode');
      } else {
        this.target.setAttribute('inputmode', this.originalInputMode);
      }
    }
    this.originalInputMode = null;
    if (this.liftedElement) {
      this.liftedElement.style.translate = '';
      this.liftedElement = null;
    }
  }

  private updateHeight(): void {
    const panel = this.host.nativeElement.querySelector('.osk') as HTMLElement | null;
    const height = this.isOpen() && panel ? panel.offsetHeight : 0;
    document.documentElement.style.setProperty('--osk-height', `${height}px`);
  }

  /**
   * Scroll the field above the keyboard. Fields inside pop-ups that are pinned to the screen
   * can't scroll there, so the pop-up itself is lifted instead.
   */
  private revealField(): void {
    const field = this.target;
    if (!field || !this.isOpen()) return;

    this.updateHeight();
    const keyboardTop = window.innerHeight - (this.host.nativeElement.querySelector('.osk') as HTMLElement).offsetHeight;
    const margin = 16;

    if (field.getBoundingClientRect().bottom > keyboardTop - margin) {
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    setTimeout(() => {
      if (field !== this.target) return;
      const overlap = field.getBoundingClientRect().bottom - (keyboardTop - margin);
      if (overlap <= 0) return;

      const pinned = this.findFixedAncestor(field);
      if (pinned) {
        pinned.style.translate = `0 ${-overlap}px`;
        this.liftedElement = pinned;
      }
    }, 300);
  }

  private findFixedAncestor(element: HTMLElement): HTMLElement | null {
    for (let el = element.parentElement; el && el !== document.body; el = el.parentElement) {
      if (getComputedStyle(el).position === 'fixed') return el;
    }
    return null;
  }

  private insert(text: string): void {
    const field = this.target;
    if (!field) return;

    if (field instanceof HTMLInputElement && field.type === 'number') {
      this.numberBuffer += text;
      field.value = this.numberBuffer;
    } else if (this.supportsSelection(field)) {
      const start = field.selectionStart ?? field.value.length;
      const end = field.selectionEnd ?? start;
      if (field.maxLength >= 0 && field.value.length - (end - start) + text.length > field.maxLength) return;
      field.setRangeText(text, start, end, 'end');
    } else {
      if (field.maxLength >= 0 && field.value.length + text.length > field.maxLength) return;
      field.value += text;
    }

    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  private backspace(): void {
    const field = this.target;
    if (!field) return;

    if (field instanceof HTMLInputElement && field.type === 'number') {
      this.numberBuffer = (this.numberBuffer || field.value).slice(0, -1);
      field.value = this.numberBuffer;
    } else if (this.supportsSelection(field)) {
      const start = field.selectionStart ?? field.value.length;
      const end = field.selectionEnd ?? start;
      if (start !== end) {
        field.setRangeText('', start, end, 'end');
      } else if (start > 0) {
        field.setRangeText('', start - 1, start, 'end');
      } else {
        return;
      }
    } else {
      if (!field.value) return;
      field.value = field.value.slice(0, -1);
    }

    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  }

  private enter(): void {
    const field = this.target;
    if (!field) return;

    if (field instanceof HTMLTextAreaElement) {
      this.insert('\n');
      return;
    }

    // Fire the same key events a real Enter would, so (keydown.enter) handlers run
    const init: KeyboardEventInit = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true } as KeyboardEventInit;
    const notCancelled = field.dispatchEvent(new KeyboardEvent('keydown', init));
    if (notCancelled && field.form) {
      field.form.requestSubmit();
    }
    field.dispatchEvent(new KeyboardEvent('keyup', init));

    this.dismiss();
  }

  /** Close the keyboard and leave the field, without the focus-keeping logic pulling focus back */
  private dismiss(): void {
    this.pressing = false;
    this.target?.blur();
    this.close();
  }

  private toggleShift(): void {
    const now = Date.now();
    const isDoubleTap = now - this.lastShiftTap < 350;
    this.lastShiftTap = now;

    if (this.shift() === 'lock') {
      this.shift.set('off');
    } else if (isDoubleTap) {
      this.shift.set('lock');
    } else {
      this.shift.set(this.shift() === 'once' ? 'off' : 'once');
    }
  }

  private moveCursor(delta: number): void {
    const field = this.target;
    if (!field || !this.supportsSelection(field)) return;

    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    const position = start !== end
      ? (delta < 0 ? start : end)
      : Math.max(0, Math.min(field.value.length, start + delta));
    field.setSelectionRange(position, position);
  }

  private stopRepeat(): void {
    clearTimeout(this.repeatTimeout);
    clearInterval(this.repeatInterval);
  }

  /** Email and number inputs don't expose a cursor position, so text is appended instead */
  private supportsSelection(field: HTMLInputElement | HTMLTextAreaElement): boolean {
    try {
      return field.selectionStart !== null;
    } catch {
      return false;
    }
  }

  private isTextField(element: unknown): element is HTMLInputElement | HTMLTextAreaElement {
    if (element instanceof HTMLTextAreaElement) {
      return !element.readOnly && !element.disabled;
    }
    if (element instanceof HTMLInputElement) {
      return TEXT_INPUT_TYPES.has(element.type) && !element.readOnly && !element.disabled;
    }
    return false;
  }
}
