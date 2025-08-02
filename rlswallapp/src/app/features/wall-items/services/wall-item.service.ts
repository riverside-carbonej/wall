import { Injectable } from '@angular/core';
import { Observable, map, switchMap, of, from } from 'rxjs';
import { FirestoreService } from '../../../shared/services/appbase.service';
import { WallItem } from '../../../shared/models/wall.model';

@Injectable({
  providedIn: 'root'
})
export class WallItemService {
  private readonly collection = 'wall_items';

  constructor(private firestore: FirestoreService) {}

  getWallItems(wallId: string): Observable<WallItem[]> {
    return this.firestore.getWhere(this.collection, 'wallId', '==', wallId);
  }

  getWallItemById(id: string): Observable<WallItem | null> {
    return this.firestore.getById(this.collection, id);
  }

  createWallItem(wallItem: Omit<WallItem, 'id'>): Observable<string> {
    return this.firestore.create(this.collection, wallItem);
  }

  updateWallItem(id: string, wallItem: Partial<WallItem>): Observable<void> {
    return this.firestore.update(this.collection, id, wallItem);
  }

  deleteWallItem(id: string): Observable<void> {
    return this.firestore.delete(this.collection, id);
  }

  deleteWallItems(wallId: string): Observable<void> {
    // First get all items for this wall, then delete them using bulk delete
    return this.getWallItems(wallId).pipe(
      switchMap((items: WallItem[]) => {
        if (items.length > 0) {
          const itemIds = items.map(item => item.id!);
          return this.bulkDeleteWallItems(itemIds);
        }
        return of(void 0);
      })
    );
  }

  searchWallItems(wallId: string, searchTerm: string): Observable<WallItem[]> {
    // Simple implementation - get all wall items and filter client-side
    // For production, consider implementing server-side search
    return this.getWallItems(wallId).pipe(
      map(items => items.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return Object.values(item.data).some(value => 
          String(value).toLowerCase().includes(searchLower)
        );
      }))
    );
  }

  bulkCreateWallItems(wallItems: Omit<WallItem, 'id'>[]): Observable<string[]> {
    // Create items sequentially and collect IDs
    const results: string[] = [];
    let currentIndex = 0;
    
    const createNext = (): Observable<string[]> => {
      if (currentIndex >= wallItems.length) {
        return of(results);
      }
      
      return this.firestore.create(this.collection, wallItems[currentIndex]).pipe(
        switchMap(id => {
          results.push(id);
          currentIndex++;
          return createNext();
        })
      );
    };
    
    return createNext();
  }

  bulkUpdateWallItems(updates: { id: string; data: Partial<WallItem> }[]): Observable<void> {
    if (updates.length === 0) return of(void 0);
    
    let currentIndex = 0;
    
    const updateNext = (): Observable<void> => {
      if (currentIndex >= updates.length) {
        return of(void 0);
      }
      
      const update = updates[currentIndex];
      return this.firestore.update(this.collection, update.id, update.data).pipe(
        switchMap(() => {
          currentIndex++;
          return updateNext();
        })
      );
    };
    
    return updateNext();
  }

  bulkDeleteWallItems(itemIds: string[]): Observable<void> {
    if (itemIds.length === 0) return of(void 0);
    
    let currentIndex = 0;
    
    const deleteNext = (): Observable<void> => {
      if (currentIndex >= itemIds.length) {
        return of(void 0);
      }
      
      return this.firestore.delete(this.collection, itemIds[currentIndex]).pipe(
        switchMap(() => {
          currentIndex++;
          return deleteNext();
        })
      );
    };
    
    return deleteNext();
  }

  exportWallItems(wallId: string, format: 'json' | 'csv'): Observable<Blob> {
    return this.getWallItems(wallId).pipe(
      map((items: WallItem[]) => {
        if (format === 'json') {
          const jsonData = JSON.stringify(items, null, 2);
          return new Blob([jsonData], { type: 'application/json' });
        } else if (format === 'csv') {
          const csvData = this.convertToCSV(items);
          return new Blob([csvData], { type: 'text/csv' });
        }
        throw new Error('Unsupported export format');
      })
    );
  }

  private convertToCSV(items: WallItem[]): string {
    if (items.length === 0) return '';

    // Get all unique field keys from the data
    const fieldKeys = new Set<string>();
    items.forEach(item => {
      Object.keys(item.data).forEach(key => fieldKeys.add(key));
    });

    const headers = ['id', 'wallId', 'createdAt', 'updatedAt', ...Array.from(fieldKeys)];
    const csvRows = [headers.join(',')];

    items.forEach(item => {
      const row = [
        item.id || '',
        item.wallId,
        item.createdAt.toString(),
        item.updatedAt.toString(),
        ...Array.from(fieldKeys).map(key => {
          const value = item.data[key] || '';
          // Escape CSV values that contain commas or quotes
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        })
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}