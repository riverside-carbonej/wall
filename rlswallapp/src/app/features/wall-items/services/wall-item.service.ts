import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable, map, switchMap, of, from, catchError } from 'rxjs';
import { 
  Firestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { WallItem } from '../../../shared/models/wall.model';

@Injectable({
  providedIn: 'root'
})
export class WallItemService {
  private readonly collectionName = 'wall_items';

  constructor(
    private firestore: Firestore,
    private injector: Injector
  ) {}

  getWallItems(wallId: string): Observable<WallItem[]> {
    return runInInjectionContext(this.injector, () => {
      const wallItemsCollection = collection(this.firestore, this.collectionName);
      const q = query(
        wallItemsCollection,
        where('wallId', '==', wallId),
        orderBy('createdAt', 'desc')
      );
      
      return from(getDocs(q)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: this.timestampToDate(doc.data()['createdAt']),
            updatedAt: this.timestampToDate(doc.data()['updatedAt'])
          } as WallItem))
        ),
        catchError(error => {
          console.error('Error getting wall items:', error);
          return of([]);
        })
      );
    });
  }

  getWallItemsByObjectType(wallId: string, objectTypeId: string): Observable<WallItem[]> {
    return runInInjectionContext(this.injector, () => {
      const wallItemsCollection = collection(this.firestore, this.collectionName);
      const q = query(
        wallItemsCollection,
        where('wallId', '==', wallId),
        where('objectTypeId', '==', objectTypeId),
        orderBy('createdAt', 'desc')
      );
      
      return from(getDocs(q)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: this.timestampToDate(doc.data()['createdAt']),
            updatedAt: this.timestampToDate(doc.data()['updatedAt'])
          } as WallItem))
        ),
        catchError(error => {
          console.error('Error getting wall items by object type:', error);
          return of([]);
        })
      );
    });
  }

  getWallItemById(id: string): Observable<WallItem | null> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, this.collectionName, id);
      
      return from(getDoc(docRef)).pipe(
        map(docSnap => {
          if (docSnap.exists()) {
            return {
              id: docSnap.id,
              ...docSnap.data(),
              createdAt: this.timestampToDate(docSnap.data()['createdAt']),
              updatedAt: this.timestampToDate(docSnap.data()['updatedAt'])
            } as WallItem;
          }
          return null;
        }),
        catchError(error => {
          console.error('Error getting wall item:', error);
          return of(null);
        })
      );
    });
  }

  createWallItem(wallItem: Omit<WallItem, 'id'>): Observable<string> {
    return runInInjectionContext(this.injector, () => {
      const wallItemsCollection = collection(this.firestore, this.collectionName);
      const cleanWallItem = this.cleanUndefinedValues(wallItem);
      const wallItemData = {
        ...cleanWallItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      return from(addDoc(wallItemsCollection, wallItemData)).pipe(
        map(docRef => docRef.id),
        catchError(error => {
          console.error('Error creating wall item:', error);
          throw error;
        })
      );
    });
  }

  updateWallItem(id: string, wallItem: Partial<WallItem>): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, this.collectionName, id);
      const cleanUpdate = this.cleanUndefinedValues(wallItem);
      const updateData = {
        ...cleanUpdate,
        updatedAt: serverTimestamp()
      };
      
      return from(updateDoc(docRef, updateData)).pipe(
        catchError(error => {
          console.error('Error updating wall item:', error);
          throw error;
        })
      );
    });
  }

  deleteWallItem(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, this.collectionName, id);
      
      return from(deleteDoc(docRef)).pipe(
        catchError(error => {
          console.error('Error deleting wall item:', error);
          throw error;
        })
      );
    });
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
        const itemData = item.fieldData || item.data || {};
        return Object.values(itemData).some(value => 
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
      
      return this.createWallItem(wallItems[currentIndex]).pipe(
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
      return this.updateWallItem(update.id, update.data).pipe(
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
      
      return this.deleteWallItem(itemIds[currentIndex]).pipe(
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
      const itemData = item.fieldData || item.data || {};
      Object.keys(itemData).forEach(key => fieldKeys.add(key));
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
          const itemData = item.fieldData || item.data || {};
          const value = itemData[key] || '';
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

  private timestampToDate(timestamp: any): Date {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
    }
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return timestamp || new Date();
  }

  private cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(obj[key]);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
}