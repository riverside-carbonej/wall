import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

export interface ButtonGroupItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-button-group',
  standalone: true,
  imports: [CommonModule, ThemedButtonComponent, MaterialIconComponent],
  template: `
    <div class="button-group-container">
      <button 
        class="button-group-item"
        [class.active]="item.id === activeId"
        [disabled]="item.disabled"
        (click)="onItemClick(item)"
        *ngFor="let item of items; trackBy: trackByFn">
        <mat-icon *ngIf="item.icon" [icon]="item.icon"></mat-icon>
        {{ item.label }}
      </button>
    </div>
  `,
  styles: [`
    .button-group-container {
      display: flex;
      border-radius: 100px;
      background: var(--md-sys-color-surface-container-low);
      padding: 6px;
      gap: 6px;
      max-width: fit-content;
    }

    .button-group-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      border-radius: 100px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      font-size: 0.875rem;
      font-weight: 500;
      min-height: 44px;
      white-space: nowrap;
    }

    .button-group-item:hover {
      background: var(--md-sys-color-surface-container);
    }

    .button-group-item.active {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
    }

    .button-group-item:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .button-group-item mat-icon {
      color: currentColor;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .button-group-container {
        gap: 4px;
        padding: 4px;
      }
      
      .button-group-item {
        padding: 10px 16px;
        min-height: 40px;
        gap: 8px;
      }
    }
  `]
})
export class ButtonGroupComponent {
  @Input() items: ButtonGroupItem[] = [];
  @Input() activeId: string = '';
  @Input() variant: 'default' | 'compact' = 'default';
  
  @Output() selectionChange = new EventEmitter<ButtonGroupItem>();

  onItemClick(item: ButtonGroupItem): void {
    if (!item.disabled) {
      this.selectionChange.emit(item);
    }
  }

  trackByFn(index: number, item: ButtonGroupItem): string {
    return item.id;
  }
}