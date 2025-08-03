import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions } from '../../../../shared/components/material-stubs';
import { WallObjectType } from '../../../../shared/models/wall.model';
import { EmptyStateComponent, EmptyStateAction } from '../../../../shared/components/empty-state/empty-state.component';
import { CardComponent, CardAction } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-object-type-selector',
  standalone: true,
  imports: [
    CommonModule,
    ThemedButtonComponent,
    MaterialIconComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardActions,
    EmptyStateComponent,
    CardComponent
  ],
  template: `
    <div class="object-type-selector">
      <!-- Header -->
      <div class="selector-header">
        <app-themed-button variant="icon" (click)="onCancel()">
          <mat-icon>arrow_back</mat-icon>
        </app-themed-button>
        <span class="header-title">Choose Item Type</span>
      </div>

      <!-- Content -->
      <div class="selector-content">
        @if (objectTypes.length > 0) {
          <div class="instruction">
            <h2>What type of item would you like to add?</h2>
            <p>Select the type that best matches what you want to create.</p>
          </div>

          <div class="object-types-grid">
            @for (objectType of objectTypes; track objectType.id) {
              <app-card
                variant="elevated"
                size="medium"
                [clickable]="true"
                [avatarIcon]="objectType.icon"
                [title]="objectType.name"
                [description]="objectType.description"
                [metadata]="getObjectTypeMetadata(objectType)"
                [actions]="getObjectTypeActions(objectType)"
                [ariaLabel]="'Create ' + objectType.name + ' item'"
                (cardClick)="onObjectTypeSelected(objectType)"
                class="object-type-card">
                
                <!-- Field Preview in Content Slot -->
                <div class="field-preview">
                  <div class="sample-fields">
                    @for (field of objectType.fields | slice:0:3; track field.id) {
                      <span class="field-name">{{ field.name }}</span>
                    }
                    @if (objectType.fields.length > 3) {
                      <span class="more-fields">+{{ objectType.fields.length - 3 }} more</span>
                    }
                  </div>
                </div>
              </app-card>
            }
          </div>

          <div class="actions-section">
            <app-themed-button variant="stroked" (click)="onManageTypes()">
              <mat-icon>settings</mat-icon>
              Manage Item Types
            </app-themed-button>
          </div>
        } @else {
          <app-empty-state
            icon="category"
            title="No Item Types Available"
            message="This wall doesn't have any item types yet. Create a Wall Item Preset first to define what kind of items can be added."
            [actions]="emptyStateActions">
          </app-empty-state>
        }
      </div>
    </div>
  `,
  styles: [`
    .object-type-selector {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--md-sys-color-background);
    }

    .selector-header {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      flex-shrink: 0;
    }

    .header-title {
      font-size: 1.25rem;
      font-weight: 500;
      margin-left: 16px;
    }

    .selector-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .instruction {
      text-align: center;
      margin-bottom: 32px;
    }

    .instruction h2 {
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
      font-size: 1.5rem;
      font-weight: 500;
    }

    .instruction p {
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      font-size: 1rem;
    }

    .object-types-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .object-type-card {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .object-type-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-color: var(--md-sys-color-primary);
    }

    .card-header {
      display: flex;
      justify-content: center;
      padding: 24px 16px 16px;
    }

    .object-type-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .object-type-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    mat-card-content h3 {
      color: var(--md-sys-color-on-surface);
      margin: 0 0 8px 0;
      font-size: 1.25rem;
      font-weight: 500;
      text-align: center;
    }

    .description {
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }

    .field-preview {
      border-top: 1px solid var(--md-sys-color-outline-variant);
      padding-top: 16px;
    }

    .field-count {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 0.875rem;
    }

    .field-count mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .sample-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .field-name {
      background: var(--md-sys-color-secondary-container);
      color: var(--md-sys-color-on-secondary-container);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .more-fields {
      background: var(--md-sys-color-outline-variant);
      color: var(--md-sys-color-on-surface-variant);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-style: italic;
    }

    mat-card-actions {
      padding: 16px;
      justify-content: center;
    }

    .actions-section {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .object-types-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .selector-content {
        padding: 16px;
      }
      
      .instruction h2 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class ObjectTypeSelectorComponent implements OnInit {
  @Input() objectTypes: WallObjectType[] = [];
  @Output() objectTypeSelected = new EventEmitter<WallObjectType>();
  @Output() cancel = new EventEmitter<void>();
  @Output() manageTypes = new EventEmitter<void>();

  emptyStateActions: EmptyStateAction[] = [
    {
      label: 'Create Wall Item Preset',
      icon: 'category',
      primary: true,
      action: () => this.onManageTypes()
    }
  ];

  ngOnInit(): void {
    // Component initialized
  }

  onObjectTypeSelected(objectType: WallObjectType): void {
    this.objectTypeSelected.emit(objectType);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onManageTypes(): void {
    this.manageTypes.emit();
  }

  // Helper methods for CardComponent
  getObjectTypeMetadata(objectType: WallObjectType): Array<{key: string; value: string; icon?: string}> {
    return [
      { key: 'fields', value: `${objectType.fields.length} fields`, icon: 'view_list' }
    ];
  }

  getObjectTypeActions(objectType: WallObjectType): CardAction[] {
    return [
      {
        label: `Create ${objectType.name}`,
        icon: 'add',
        primary: true,
        action: () => this.onObjectTypeSelected(objectType)
      }
    ];
  }
}