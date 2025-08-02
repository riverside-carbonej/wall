import { Component } from '@angular/core';
import { GenericWallItemPageComponent } from '../generic-wall-item-page/generic-wall-item-page.component';

@Component({
  selector: 'app-wall-item-add-page',
  standalone: true,
  imports: [GenericWallItemPageComponent],
  template: `
    <app-generic-wall-item-page
      [editing]="true"
      [title]="'Add New Item'"
      [isNewItem]="true">
    </app-generic-wall-item-page>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class WallItemAddPageComponent {}