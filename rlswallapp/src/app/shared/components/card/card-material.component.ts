import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mat-card">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mat-card {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-sys-elevation-1);
      padding: 24px;
      margin: 16px 0;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
    }
    
    .mat-card:hover {
      box-shadow: var(--md-sys-elevation-2);
    }
  `]
})
export class CardMaterialComponent {}

@Component({
  selector: 'mat-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card-header"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-bottom: 16px;
    }
  `]
})
export class CardHeaderComponent {}

@Component({
  selector: 'mat-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `<h2 class="mat-card-title"><ng-content></ng-content></h2>`,
  styles: [`
    .mat-card-title {
      font-size: var(--md-sys-typescale-headline-small-size);
      font-weight: var(--md-sys-typescale-headline-small-weight);
      margin: 0;
      color: var(--md-sys-color-on-surface);
    }
  `]
})
export class CardTitleComponent {}

@Component({
  selector: 'mat-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card-content"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card-content {
      display: block;
      font-size: var(--md-sys-typescale-body-medium-size);
      color: var(--md-sys-color-on-surface-variant);
    }
  `]
})
export class CardContentComponent {}

@Component({
  selector: 'mat-card-actions',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="mat-card-actions"><ng-content></ng-content></div>`,
  styles: [`
    .mat-card-actions {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin: 8px 0;
      gap: 8px;
    }
  `]
})
export class CardActionsComponent {}

export const MatCardModule = CardMaterialComponent;