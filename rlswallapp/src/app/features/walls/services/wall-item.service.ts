import { Injectable } from '@angular/core';
import { Observable, from, throwError, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, limit } from '@angular/fire/firestore';
import { WallItem, EnhancedWallItem, WallObjectType, FieldDefinition } from '../../../shared/models/wall.model';
import { RelationshipService } from './relationship.service';

@Injectable({
  providedIn: 'root'
})
export class WallItemService {
  private readonly COLLECTION_NAME = 'wall_items';

  constructor(
    private firestore: Firestore,
    private relationshipService: RelationshipService
  ) {}

  /**
   * Create a new wall item
   */
  createWallItem(wallItem: Omit<WallItem, 'id'>): Observable<string> {
    const wallItemData = {
      ...wallItem,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return from(addDoc(collection(this.firestore, this.COLLECTION_NAME), wallItemData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error creating wall item:', error);
        return throwError(() => new Error('Failed to create wall item'));
      })
    );
  }

  /**
   * Update an existing wall item
   */
  updateWallItem(id: string, updates: Partial<WallItem>): Observable<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(updateDoc(docRef, updateData)).pipe(
      catchError(error => {
        console.error('Error updating wall item:', error);
        return throwError(() => new Error('Failed to update wall item'));
      })
    );
  }

  /**
   * Delete a wall item and its relationships
   */
  deleteWallItem(id: string): Observable<void> {
    return this.relationshipService.removeAllRelationshipsForItem(id).pipe(
      switchMap(() => {
        const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
        return from(deleteDoc(docRef));
      }),
      catchError(error => {
        console.error('Error deleting wall item:', error);
        return throwError(() => new Error('Failed to delete wall item'));
      })
    );
  }

  /**
   * Get a wall item by ID
   */
  getWallItem(id: string): Observable<WallItem | null> {
    const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          } as WallItem;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting wall item:', error);
        return throwError(() => new Error('Failed to get wall item'));
      })
    );
  }

  /**
   * Get all wall items for a specific wall
   */
  getWallItems(wallId: string): Observable<WallItem[]> {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('wallId', '==', wallId),
      orderBy('createdAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date()
        } as WallItem))
      ),
      catchError(error => {
        console.error('Error getting wall items:', error);
        return throwError(() => new Error('Failed to get wall items'));
      })
    );
  }

  /**
   * Get wall items by object type
   */
  getWallItemsByObjectType(wallId: string, objectTypeId: string): Observable<WallItem[]> {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('wallId', '==', wallId),
      where('objectTypeId', '==', objectTypeId),
      orderBy('createdAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date()
        } as WallItem))
      ),
      catchError(error => {
        console.error('Error getting wall items by object type:', error);
        return throwError(() => new Error('Failed to get wall items by object type'));
      })
    );
  }

  /**
   * Get enhanced wall items with relationship information
   */
  getEnhancedWallItems(wallId: string): Observable<EnhancedWallItem[]> {
    return this.getWallItems(wallId).pipe(
      switchMap(wallItems => {
        if (wallItems.length === 0) {
          return of([]);
        }

        // Get relationship counts for each item
        const enhancedItemObservables = wallItems.map(item =>
          this.relationshipService.getRelationshipsForItem(item.id).pipe(
            map(relationships => ({
              ...item,
              relationshipCount: relationships.length,
              relationships: relationships
            } as EnhancedWallItem)),
            catchError(() => of({
              ...item,
              relationshipCount: 0,
              relationships: []
            } as EnhancedWallItem))
          )
        );

        return forkJoin(enhancedItemObservables);
      })
    );
  }

  /**
   * Search wall items by content
   */
  searchWallItems(wallId: string, searchTerm: string): Observable<WallItem[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation - for production use Algolia or similar
    
    return this.getWallItems(wallId).pipe(
      map(items => items.filter(item => {
        // Search through all field data values (handle both new and legacy formats)
        const fieldData = item.fieldData || item.data || {};
        const searchableText = Object.values(fieldData)
          .join(' ')
          .toLowerCase();
        
        return searchableText.includes(searchTerm.toLowerCase());
      }))
    );
  }

  /**
   * Create wall item from legacy format
   */
  createWallItemFromLegacy(
    wallId: string,
    objectTypeId: string,
    legacyData: { [key: string]: any },
    objectType: WallObjectType
  ): Observable<string> {
    // Map legacy data to new field data format
    const fieldData: { [fieldId: string]: any } = {};
    
    objectType.fields.forEach(field => {
      if (legacyData[field.id] !== undefined) {
        fieldData[field.id] = legacyData[field.id];
      }
    });

    const wallItem: Omit<WallItem, 'id'> = {
      wallId,
      objectTypeId,
      fieldData,
      images: legacyData['images'] || [],
      primaryImageIndex: legacyData['primaryImageIndex'] || 0,
      createdAt: legacyData['createdAt'] || new Date(),
      updatedAt: new Date(),
      createdBy: legacyData['createdBy'] || 'system',
      updatedBy: 'migration-system'
    };

    return this.createWallItem(wallItem);
  }

  /**
   * Bulk create wall items (useful for migration)
   */
  bulkCreateWallItems(wallItems: Omit<WallItem, 'id'>[]): Observable<string[]> {
    const createObservables = wallItems.map(item => this.createWallItem(item));
    return forkJoin(createObservables);
  }

  /**
   * Get wall item statistics
   */
  getWallItemStatistics(wallId: string): Observable<{
    totalItems: number;
    itemsByObjectType: { [objectTypeId: string]: number };
    recentItems: WallItem[];
    totalImages: number;
  }> {
    return this.getWallItems(wallId).pipe(
      map(items => {
        const itemsByObjectType: { [objectTypeId: string]: number } = {};
        let totalImages = 0;

        items.forEach(item => {
          // Count by object type (handle nullable objectTypeId)
          const typeId = item.objectTypeId || 'unknown';
          itemsByObjectType[typeId] = (itemsByObjectType[typeId] || 0) + 1;
          
          // Count images
          totalImages += item.images?.length || 0;
        });

        // Get recent items (last 5)
        const recentItems = items
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 5);

        return {
          totalItems: items.length,
          itemsByObjectType,
          recentItems,
          totalImages
        };
      })
    );
  }

  /**
   * Validate field data against object type definition
   */
  validateFieldData(fieldData: { [fieldId: string]: any }, objectType: WallObjectType): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    objectType.fields.forEach(field => {
      const value = fieldData[field.id];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field.name}' is required`);
        return;
      }

      // Skip validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Validate field types
      switch (field.type) {
        case 'text':
        case 'longtext':
          if (typeof value !== 'string') {
            errors.push(`Field '${field.name}' must be text`);
          }
          break;
        
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`Field '${field.name}' must be a number`);
          }
          break;
        
        case 'date':
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push(`Field '${field.name}' must be a valid date`);
          }
          break;
        
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof value === 'string' && !emailRegex.test(value)) {
            errors.push(`Field '${field.name}' must be a valid email address`);
          }
          break;
        
        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(`Field '${field.name}' must be a valid URL`);
          }
          break;
        
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${field.name}' must be true or false`);
          }
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get wall items with pagination
   */
  getWallItemsPaginated(
    wallId: string, 
    pageSize: number = 20, 
    lastItemId?: string
  ): Observable<{
    items: WallItem[];
    hasMore: boolean;
    lastItemId?: string;
  }> {
    let q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('wallId', '==', wallId),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1) // Get one extra to determine if there are more
    );

    // If lastItemId is provided, start after that document
    if (lastItemId) {
      const startAfterDoc = doc(this.firestore, this.COLLECTION_NAME, lastItemId);
      // Note: In a real implementation, you'd need to get the document first
      // This is a simplified version
    }

    return from(getDocs(q)).pipe(
      map(snapshot => {
        const items = snapshot.docs.slice(0, pageSize).map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date(),
          updatedAt: doc.data()['updatedAt']?.toDate() || new Date()
        } as WallItem));

        const hasMore = snapshot.docs.length > pageSize;
        const newLastItemId = items.length > 0 ? items[items.length - 1].id : undefined;

        return {
          items,
          hasMore,
          lastItemId: newLastItemId
        };
      }),
      catchError(error => {
        console.error('Error getting paginated wall items:', error);
        return throwError(() => new Error('Failed to get paginated wall items'));
      })
    );
  }
}