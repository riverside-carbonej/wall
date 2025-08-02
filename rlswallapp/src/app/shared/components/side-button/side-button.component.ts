import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-side-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-flat-button
      class="side-button"
      [attr.Selected]="selected"
      (click)="handleClick()"
      [disabled]="disabled">
      
      <mat-icon>{{ icon }}</mat-icon>
      {{ title }}
      
      <div *ngIf="badge" class="badge">{{ badge }}</div>
    </button>
  `,
  styles: [`
    :host {
      display: block;
      border-radius: 200px;
      overflow: hidden;
      margin: 0.125em 0;
    }
    
    .side-button {
      width: 100%;
      height: 4em;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      padding: 0 2em;
      font-size: 14px;
      white-space: nowrap;
      gap: 12px;
      background: transparent;
      border: none;
      color: var(--md-sys-color-on-surface);
      text-align: left;
      cursor: pointer;
      border-radius: 200px;
    }

    @media (max-width: 800px) {
      .side-button {
        justify-content: center;
        text-align: center;
        height: 5em;
        font-size: 16px;
      }
    }

    .side-button:hover:not(:disabled) {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary) 15%,
        transparent
      );
      color: var(--md-sys-color-primary);
    }

    .side-button[Selected='true'] {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary) 30%,
        transparent
      );
      color: var(--md-sys-color-primary);
      font-weight: 500;
    }

    .side-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .side-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: inherit; /* Icons inherit text color */
    }

    .badge {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      min-width: 20px;
      text-align: center;
      margin-left: auto;
    }

    .side-button[Selected='true'] .badge {
      background: var(--md-sys-color-on-primary-container);
      color: var(--md-sys-color-primary-container);
    }

    .side-button:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 2px;
    }
  `]
})
export class SideButtonComponent {
  @Input() title: string = '';
  @Input() icon: string = '';
  @Input() selected: boolean = false;
  @Input() disabled: boolean = false;
  @Input() badge?: string | number;
  
  @Output() buttonClick = new EventEmitter<void>();

  handleClick() {
    if (!this.disabled) {
      this.buttonClick.emit();
    }
  }
}