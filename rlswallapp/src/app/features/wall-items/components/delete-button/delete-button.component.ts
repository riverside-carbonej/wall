import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <button 
      mat-outlined-button 
      color="warn"
      (click)="confirmDelete()"
      class="delete-button">
      <mat-icon>delete</mat-icon>
      Delete {{ name }}
    </button>
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

  constructor(private dialog: MatDialog) {}

  confirmDelete() {
    const confirmed = window.confirm(`Are you sure you want to delete this ${this.name}?`);
    if (confirmed && this.deleteItem) {
      this.deleteItem();
    }
  }
}