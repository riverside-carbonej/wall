import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-wall-item-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wall-item-list">
      <h1>Wall Items</h1>
      <p>Wall ID: {{ wallId }}</p>
      <p>Object Type Filter: {{ objectTypeFilter || 'All' }}</p>
      <p>This component will list all wall items. Coming soon in Phase 4.3!</p>
    </div>
  `,
  styles: [`
    .wall-item-list {
      padding: 24px;
    }
  `]
})
export class WallItemListComponent implements OnInit {
  wallId: string = '';
  objectTypeFilter?: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.wallId = this.route.snapshot.paramMap.get('wallId') || '';
    this.objectTypeFilter = this.route.snapshot.queryParamMap.get('objectType') || undefined;
  }
}