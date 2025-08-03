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
        <mat-icon *ngIf="item.icon">{{ item.icon }}</mat-icon>
        {{ item.label }}
      </button>
    </div>
  `,
  styles: [`
    .button-group-container {
      display: flex;
      gap: 12px;
      padding: 8px;
      background: var(--md-sys-color-surface-container);
      border-radius: calc(var(--md-sys-shape-corner-full) + 8px);
      border: 1px solid var(--md-sys-color-outline-variant);
      max-width: fit-content;
      box-shadow: var(--md-sys-elevation-1);
    }

    .button-group-item {
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--md-sys-shape-corner-full);
      padding: 12px 20px !important;
      min-height: 44px;
      white-space: nowrap;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
    }

    .button-group-item.active {
      background-color: var(--md-sys-color-primary) !important;
      color: var(--md-sys-color-on-primary) !important;
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
        gap: 8px;
        padding: 6px;
      }
      
      .button-group-item {
        padding: 10px 16px !important;
        min-height: 40px;
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