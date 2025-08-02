import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable, from, map, catchError, of, throwError, switchMap, forkJoin } from 'rxjs';
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
  orderBy, 
  where,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { Wall, WallObjectType, FieldDefinition } from '../../../shared/models/wall.model';
import { AuthService } from '../../../core/services/auth.service';
import { ObjectTypeService } from './object-type.service';

@Injectable({
  providedIn: 'root'
})
export class WallService {
  private readonly collectionName = 'walls';

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private objectTypeService: ObjectTypeService,
    private injector: Injector
  ) {}

  getAllWalls(): Observable<Wall[]> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user.email!;
      }),
      switchMap(userEmail => {
        return runInInjectionContext(this.injector, () => {
          const wallsCollection = collection(this.firestore, this.collectionName);
          // Get walls where user is owner or shared with user
          const ownedQuery = query(
            wallsCollection,
            where('ownerId', '==', userEmail),
            orderBy('updatedAt', 'desc')
          );
          const sharedQuery = query(
            wallsCollection,
            where('sharedWith', 'array-contains', userEmail),
            orderBy('updatedAt', 'desc')
          );
          
          // Execute both queries and combine results
          console.log('Executing owned query for user:', userEmail);
          console.log('Executing shared query for user:', userEmail);
          return from(Promise.all([getDocs(ownedQuery), getDocs(sharedQuery)]));
        });
      }),
      map(([ownedSnapshot, sharedSnapshot]) => {
        const ownedWalls = ownedSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: this.timestampToDate(doc.data()['createdAt']),
          updatedAt: this.timestampToDate(doc.data()['updatedAt'])
        } as Wall));
        
        const sharedWalls = sharedSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: this.timestampToDate(doc.data()['createdAt']),
          updatedAt: this.timestampToDate(doc.data()['updatedAt'])
        } as Wall));
        
        // Combine and deduplicate walls (in case user owns a wall that's also shared with them)
        const allWalls = [...ownedWalls, ...sharedWalls];
        const uniqueWalls = allWalls.filter((wall, index, self) => 
          index === self.findIndex(w => w.id === wall.id)
        );
        
        // Sort by updatedAt desc
        return uniqueWalls.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      }),
      catchError(error => {
        console.error('Error getting walls:', error);
        return of([]);
      })
    );
  }

  getWallById(id: string): Observable<Wall | null> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user.email!;
      }),
      switchMap(userEmail => {
        return runInInjectionContext(this.injector, () => {
          const wallDoc = doc(this.firestore, this.collectionName, id);
          return from(getDoc(wallDoc)).pipe(
            map(docSnap => ({ docSnap, userEmail }))
          );
        });
      }),
      map(({ docSnap, userEmail }) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const wall = {
            id: docSnap.id,
            ...data,
            createdAt: this.timestampToDate(data['createdAt']),
            updatedAt: this.timestampToDate(data['updatedAt'])
          } as Wall;
          
          // Check if user has access to this wall
          if (wall.ownerId === userEmail || wall.sharedWith?.includes(userEmail)) {
            return wall;
          } else {
            console.warn('User does not have access to this wall');
            return null;
          }
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting wall:', error);
        return of(null);
      })
    );
  }

  createWall(wall: Omit<Wall, 'id'>): Observable<string> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user.email!;
      }),
      switchMap(userEmail => {
        return runInInjectionContext(this.injector, () => {
          const wallsCollection = collection(this.firestore, this.collectionName);
          // Clean up undefined values for Firestore
          const cleanWall = this.cleanUndefinedValues(wall);
          const wallData = {
            ...cleanWall,
            name: cleanWall.name || 'Untitled Wall',
            ownerId: userEmail,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          return from(addDoc(wallsCollection, wallData));
        });
      }),
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error creating wall:', error);
        throw error;
      })
    );
  }

  updateWall(id: string, wallUpdate: Partial<Wall>): Observable<void> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user.email!;
      }),
      switchMap(userEmail => {
        return runInInjectionContext(this.injector, () => {
          const wallDoc = doc(this.firestore, this.collectionName, id);
          const cleanUpdate = this.cleanUndefinedValues(wallUpdate);
          
          // Ensure ownerId is preserved - never overwrite it during update
          const { ownerId, ...safeUpdate } = cleanUpdate;
          
          const updateData = {
            ...safeUpdate,
            updatedAt: serverTimestamp()
          };
          
          console.log('Updating wall with safe data:', updateData);
          return from(updateDoc(wallDoc, updateData));
        });
      }),
      catchError(error => {
        console.error('Error updating wall:', error);
        throw error;
      })
    );
  }

  deleteWall(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const wallDoc = doc(this.firestore, this.collectionName, id);
      
      return from(deleteDoc(wallDoc)).pipe(
        catchError(error => {
          console.error('Error deleting wall:', error);
          throw error;
        })
      );
    });
  }

  searchWalls(searchTerm: string): Observable<Wall[]> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user.email!;
      }),
      switchMap(userEmail => {
        return runInInjectionContext(this.injector, () => {
          const wallsCollection = collection(this.firestore, this.collectionName);
          // Note: Firestore doesn't support full-text search natively
          // This is a basic implementation - for production use Algolia or similar
          
          // Search in owned walls
          const ownedQuery = query(
            wallsCollection,
            where('ownerId', '==', userEmail),
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff'),
            orderBy('name')
          );
          
          // Search in shared walls
          const sharedQuery = query(
            wallsCollection,
            where('sharedWith', 'array-contains', userEmail),
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff'),
            orderBy('name')
          );
          
          return from(Promise.all([getDocs(ownedQuery), getDocs(sharedQuery)]));
        });
      }),
      map(([ownedSnapshot, sharedSnapshot]) => {
        const ownedWalls = ownedSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: this.timestampToDate(doc.data()['createdAt']),
          updatedAt: this.timestampToDate(doc.data()['updatedAt'])
        } as Wall));
        
        const sharedWalls = sharedSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: this.timestampToDate(doc.data()['createdAt']),
          updatedAt: this.timestampToDate(doc.data()['updatedAt'])
        } as Wall));
        
        // Combine and deduplicate walls
        const allWalls = [...ownedWalls, ...sharedWalls];
        const uniqueWalls = allWalls.filter((wall, index, self) => 
          index === self.findIndex(w => w.id === wall.id)
        );
        
        return uniqueWalls.sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error searching walls:', error);
        return of([]);
      })
    );
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

  // Object Type Management Methods

  /**
   * Create a new wall with object types (Phase 2+ approach)
   */
  createWallWithObjectTypes(
    wallData: Omit<Wall, 'id' | 'objectTypes'>, 
    template?: 'veteran' | 'alumni' | 'general'
  ): Observable<{ wallId: string; objectTypes: WallObjectType[] }> {
    const wallWithEmptyObjectTypes = { ...wallData, objectTypes: [] };
    return this.createWall(wallWithEmptyObjectTypes).pipe(
      switchMap(wallId => {
        // Create object types based on template
        let objectTypesObservable: Observable<WallObjectType[]>;
        
        switch (template) {
          case 'veteran':
            objectTypesObservable = this.objectTypeService.createVeteranRegistryTemplate(wallId);
            break;
          case 'alumni':
            objectTypesObservable = this.objectTypeService.createAlumniDirectoryTemplate(wallId);
            break;
          default:
            objectTypesObservable = this.objectTypeService.createDefaultObjectTypes(wallId);
        }
        
        return objectTypesObservable.pipe(
          switchMap(objectTypes => {
            // Update wall with object types
            return this.updateWall(wallId, { objectTypes }).pipe(
              map(() => ({ wallId, objectTypes }))
            );
          })
        );
      })
    );
  }

  /**
   * Get wall with its object types populated
   */
  getWallWithObjectTypes(wallId: string): Observable<Wall | null> {
    return forkJoin({
      wall: this.getWallById(wallId),
      objectTypes: this.objectTypeService.getObjectTypesForWall(wallId)
    }).pipe(
      map(({ wall, objectTypes }) => {
        if (!wall) return null;
        
        return {
          ...wall,
          objectTypes
        };
      }),
      catchError(error => {
        console.error('Error getting wall with object types:', error);
        return of(null);
      })
    );
  }

  /**
   * Migrate legacy wall from fields to object types
   */
  migrateLegacyWall(wallId: string): Observable<Wall> {
    return this.getWallById(wallId).pipe(
      switchMap(wall => {
        if (!wall) {
          return throwError(() => new Error('Wall not found'));
        }

        // Check if wall has legacy fields and no object types
        if (wall.fields && wall.fields.length > 0 && (!wall.objectTypes || wall.objectTypes.length === 0)) {
          return this.objectTypeService.migrateLegacyFieldsToObjectType(wallId, wall.fields).pipe(
            switchMap(objectType => {
              // Update wall to use object types
              const updatedWall: Partial<Wall> = {
                objectTypes: [objectType],
                // Keep legacy fields for backup during transition
                fields: wall.fields
              };

              return this.updateWall(wallId, updatedWall).pipe(
                map(() => ({
                  ...wall,
                  objectTypes: [objectType]
                }))
              );
            })
          );
        }

        // Wall is already migrated or doesn't need migration
        return of(wall);
      })
    );
  }

  /**
   * Add object type to existing wall
   */
  addObjectTypeToWall(wallId: string, objectType: Omit<WallObjectType, 'id'>): Observable<WallObjectType> {
    return this.objectTypeService.createObjectType(objectType).pipe(
      switchMap(objectTypeId => {
        const newObjectType: WallObjectType = {
          ...objectType,
          id: objectTypeId
        };

        return this.getWallById(wallId).pipe(
          switchMap(wall => {
            if (!wall) {
              return throwError(() => new Error('Wall not found'));
            }

            const existingObjectTypes = wall.objectTypes || [];
            const updatedObjectTypes = [...existingObjectTypes, newObjectType];

            return this.updateWall(wallId, { objectTypes: updatedObjectTypes }).pipe(
              map(() => newObjectType)
            );
          })
        );
      })
    );
  }

  /**
   * Update object type in wall
   */
  updateObjectTypeInWall(wallId: string, objectTypeId: string, updates: Partial<WallObjectType>): Observable<void> {
    return forkJoin({
      updateObjectType: this.objectTypeService.updateObjectType(objectTypeId, updates),
      wall: this.getWallById(wallId)
    }).pipe(
      switchMap(({ wall }) => {
        if (!wall || !wall.objectTypes) {
          return throwError(() => new Error('Wall or object types not found'));
        }

        const updatedObjectTypes = wall.objectTypes.map(ot => 
          ot.id === objectTypeId ? { ...ot, ...updates } : ot
        );

        return this.updateWall(wallId, { objectTypes: updatedObjectTypes });
      })
    );
  }

  /**
   * Remove object type from wall
   */
  removeObjectTypeFromWall(wallId: string, objectTypeId: string): Observable<void> {
    return this.getWallById(wallId).pipe(
      switchMap(wall => {
        if (!wall || !wall.objectTypes) {
          return throwError(() => new Error('Wall or object types not found'));
        }

        const updatedObjectTypes = wall.objectTypes.filter(ot => ot.id !== objectTypeId);

        return forkJoin({
          updateWall: this.updateWall(wallId, { objectTypes: updatedObjectTypes }),
          deleteObjectType: this.objectTypeService.deleteObjectType(objectTypeId)
        }).pipe(
          map(() => void 0)
        );
      })
    );
  }

  /**
   * Check if wall needs migration from legacy fields
   */
  checkWallMigrationStatus(wallId: string): Observable<{
    needsMigration: boolean;
    hasLegacyFields: boolean;
    hasObjectTypes: boolean;
    legacyFieldCount: number;
    objectTypeCount: number;
  }> {
    return this.getWallById(wallId).pipe(
      map(wall => {
        if (!wall) {
          return {
            needsMigration: false,
            hasLegacyFields: false,
            hasObjectTypes: false,
            legacyFieldCount: 0,
            objectTypeCount: 0
          };
        }

        const hasLegacyFields = !!(wall.fields && wall.fields.length > 0);
        const hasObjectTypes = !!(wall.objectTypes && wall.objectTypes.length > 0);
        const needsMigration = hasLegacyFields && !hasObjectTypes;

        return {
          needsMigration,
          hasLegacyFields,
          hasObjectTypes,
          legacyFieldCount: wall.fields?.length || 0,
          objectTypeCount: wall.objectTypes?.length || 0
        };
      })
    );
  }

  /**
   * Batch migrate multiple walls
   */
  batchMigrateLegacyWalls(): Observable<{ wallId: string; success: boolean; error?: string }[]> {
    return this.getAllWalls().pipe(
      switchMap(walls => {
        const legacyWalls = walls.filter(wall => 
          wall.fields && wall.fields.length > 0 && 
          (!wall.objectTypes || wall.objectTypes.length === 0)
        );

        if (legacyWalls.length === 0) {
          return of([]);
        }

        const migrationObservables = legacyWalls.map(wall =>
          this.migrateLegacyWall(wall.id).pipe(
            map(() => ({ wallId: wall.id, success: true })),
            catchError(error => of({ 
              wallId: wall.id, 
              success: false, 
              error: error.message 
            }))
          )
        );

        return forkJoin(migrationObservables);
      })
    );
  }
}