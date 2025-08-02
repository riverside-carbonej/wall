import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable, map, switchMap, of, from, catchError, BehaviorSubject } from 'rxjs';
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
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint
} from '@angular/fire/firestore';

export interface EntityQueryOptions {
  filters?: { field: string; operator: any; value: any }[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  startAfterDoc?: DocumentSnapshot;
}

export interface EntityBatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data?: Partial<T>;
  id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EntityService {
  
  constructor(
    private firestore: Firestore,
    private injector: Injector
  ) {}

  /**
   * Get all entities from a collection with optional filtering and pagination
   */
  getEntities<T>(
    collectionName: string, 
    options: EntityQueryOptions = {}
  ): Observable<T[]> {
    return runInInjectionContext(this.injector, () => {
      const entityCollection = collection(this.firestore, collectionName);
      const constraints: QueryConstraint[] = [];

      // Add filters
      if (options.filters) {
        options.filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });
      }

      // Add ordering
      if (options.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
      }

      // Add pagination
      if (options.startAfterDoc) {
        constraints.push(startAfter(options.startAfterDoc));
      }

      if (options.limitCount) {
        constraints.push(limit(options.limitCount));
      }

      const q = query(entityCollection, ...constraints);
      
      return from(getDocs(q)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: this.timestampToDate(doc.data()['createdAt']),
            updatedAt: this.timestampToDate(doc.data()['updatedAt'])
          } as T))
        ),
        catchError(error => {
          console.error(`Error getting entities from ${collectionName}:`, error);
          return of([]);
        })
      );
    });
  }

  /**
   * Get entities by wall ID (common pattern in wall system)
   */
  getEntitiesByWallId<T>(
    collectionName: string, 
    wallId: string,
    options: EntityQueryOptions = {}
  ): Observable<T[]> {
    const enhancedOptions: EntityQueryOptions = {
      ...options,
      filters: [
        { field: 'wallId', operator: '==', value: wallId },
        ...(options.filters || [])
      ]
    };
    
    return this.getEntities<T>(collectionName, enhancedOptions);
  }

  /**
   * Get single entity by ID
   */
  getEntityById<T>(collectionName: string, id: string): Observable<T | null> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, collectionName, id);
      
      return from(getDoc(docRef)).pipe(
        map(docSnap => {
          if (docSnap.exists()) {
            return {
              id: docSnap.id,
              ...docSnap.data(),
              createdAt: this.timestampToDate(docSnap.data()['createdAt']),
              updatedAt: this.timestampToDate(docSnap.data()['updatedAt'])
            } as T;
          }
          return null;
        }),
        catchError(error => {
          console.error(`Error getting entity from ${collectionName}:`, error);
          return of(null);
        })
      );
    });
  }

  /**
   * Create new entity
   */
  createEntity<T>(collectionName: string, entity: Omit<T, 'id'>): Observable<string> {
    return runInInjectionContext(this.injector, () => {
      const entityCollection = collection(this.firestore, collectionName);
      const cleanEntity = this.cleanUndefinedValues(entity);
      const entityData = {
        ...cleanEntity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      return from(addDoc(entityCollection, entityData)).pipe(
        map(docRef => docRef.id),
        catchError(error => {
          console.error(`Error creating entity in ${collectionName}:`, error);
          throw error;
        })
      );
    });
  }

  /**
   * Update existing entity
   */
  updateEntity<T>(collectionName: string, id: string, updates: Partial<T>): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, collectionName, id);
      const cleanUpdates = this.cleanUndefinedValues(updates);
      const updateData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      };
      
      return from(updateDoc(docRef, updateData)).pipe(
        catchError(error => {
          console.error(`Error updating entity in ${collectionName}:`, error);
          throw error;
        })
      );
    });
  }

  /**
   * Delete entity
   */
  deleteEntity(collectionName: string, id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, collectionName, id);
      
      return from(deleteDoc(docRef)).pipe(
        catchError(error => {
          console.error(`Error deleting entity from ${collectionName}:`, error);
          throw error;
        })
      );
    });
  }

  /**
   * Batch operations for multiple entities
   */
  batchOperations<T>(
    collectionName: string, 
    operations: EntityBatchOperation<T>[]
  ): Observable<string[]> {
    // For simplicity, we'll process operations sequentially
    // In production, consider using Firestore batch operations
    const results: string[] = [];
    let currentIndex = 0;
    
    const processNext = (): Observable<string[]> => {
      if (currentIndex >= operations.length) {
        return of(results);
      }
      
      const operation = operations[currentIndex];
      let operationObs: Observable<string | void>;
      
      switch (operation.operation) {
        case 'create':
          operationObs = this.createEntity(collectionName, operation.data! as Omit<T, 'id'>);
          break;
        case 'update':
          operationObs = this.updateEntity(collectionName, operation.id!, operation.data!);
          break;
        case 'delete':
          operationObs = this.deleteEntity(collectionName, operation.id!);
          break;
        default:
          operationObs = of('unknown');
      }
      
      return operationObs.pipe(
        switchMap(result => {
          if (typeof result === 'string') {
            results.push(result);
          } else {
            results.push(operation.id || 'completed');
          }
          currentIndex++;
          return processNext();
        })
      );
    };
    
    return processNext();
  }

  /**
   * Search entities by text in multiple fields
   */
  searchEntities<T>(
    collectionName: string,
    searchTerm: string,
    searchFields: string[],
    options: EntityQueryOptions = {}
  ): Observable<T[]> {
    // Simple client-side search implementation
    // For production, consider using Algolia, Elasticsearch, or Firestore's full-text search
    return this.getEntities<T>(collectionName, options).pipe(
      map(entities => entities.filter(entity => {
        const searchLower = searchTerm.toLowerCase();
        return searchFields.some(field => {
          const fieldValue = this.getNestedProperty(entity, field);
          return fieldValue && String(fieldValue).toLowerCase().includes(searchLower);
        });
      }))
    );
  }

  /**
   * Get count of entities matching criteria
   */
  getEntityCount(
    collectionName: string,
    options: EntityQueryOptions = {}
  ): Observable<number> {
    return this.getEntities(collectionName, options).pipe(
      map(entities => entities.length)
    );
  }

  /**
   * Export entities to various formats
   */
  exportEntities<T>(
    collectionName: string,
    format: 'json' | 'csv',
    options: EntityQueryOptions = {}
  ): Observable<Blob> {
    return this.getEntities<T>(collectionName, options).pipe(
      map(entities => {
        if (format === 'json') {
          const jsonData = JSON.stringify(entities, null, 2);
          return new Blob([jsonData], { type: 'application/json' });
        } else if (format === 'csv') {
          const csvData = this.convertToCSV(entities);
          return new Blob([csvData], { type: 'text/csv' });
        }
        throw new Error('Unsupported export format');
      })
    );
  }

  /**
   * Create observable cache for entity collections
   */
  createEntityCache<T>(
    collectionName: string,
    options: EntityQueryOptions = {}
  ): Observable<T[]> {
    const cache = new BehaviorSubject<T[]>([]);
    
    // Load initial data
    this.getEntities<T>(collectionName, options).subscribe(entities => {
      cache.next(entities);
    });
    
    return cache.asObservable();
  }

  // Utility methods
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

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private convertToCSV<T>(data: T[]): string {
    if (data.length === 0) return '';

    // Get all unique keys from the data
    const allKeys = new Set<string>();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = this.getNestedProperty(item, header) || '';
        // Escape CSV values that contain commas or quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}