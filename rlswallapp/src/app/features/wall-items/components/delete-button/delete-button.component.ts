import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ConfirmationDialogService } from '../../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-delete-button',
  standalone: true,
  imports: [CommonModule, ThemedButtonComponent, MaterialIconComponent],
  template: `
    <app-themed-button 
      variant="stroked"
      color="warn"
      (click)="confirmDelete()"
      class="delete-button">
      <mat-icon>delete</mat-icon>
      Delete {{ name }}
    </app-themed-button>
  `,
  styles: [`
    .delete-button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
    }
  `]
})
export class DeleteButtonComponent {
  @Input() deleteItem!: () => Promise<any> | void;
  @Input() name = 'item';

  constructor(
    private confirmationService: ConfirmationDialogService
  ) {}

  confirmDelete() {
    this.confirmationService.confirmDelete(this.name).subscribe(confirmed => {
      if (confirmed && this.deleteItem) {
        this.deleteItem();
      }
    });
  }
}