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
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from '@angular/fire/firestore';
import { Wall, WallObjectType, FieldDefinition } from '../../../shared/models/wall.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class WallService {
  private readonly collectionName = 'walls';

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private injector: Injector
  ) {}

  getDeletedWalls(): Observable<Wall[]> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user;
      }),
      switchMap(user => {
        return runInInjectionContext(this.injector, () => {
          const wallsCollection = collection(this.firestore, this.collectionName);
          
          // Query for walls owned by the user
          // We can't query deletedAt directly due to index limitations
          const ownedQuery = query(
            wallsCollection,
            where('permissions.owner', '==', user.uid),
            limit(100)
          );
          
          // Also query legacy owned walls
          const legacyOwnedQuery = query(
            wallsCollection,
            where('ownerId', '==', user.email || user.uid),
            limit(100)
          );
          
          console.log('Fetching deleted walls for user:', user.uid);
          
          return from(Promise.all([
            getDocs(ownedQuery).catch(() => ({ docs: [] })),
            getDocs(legacyOwnedQuery).catch(() => ({ docs: [] }))
          ])).pipe(
            map(results => ({ results, user }))
          );
        });
      }),
      map(({ results, user }) => {
        // Combine results from both queries
        const allDocs = [...results[0].docs, ...results[1].docs];
        
        // Map all documents to walls
        const allWalls = allDocs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: this.timestampToDate(doc.data()['createdAt']),
          updatedAt: this.timestampToDate(doc.data()['updatedAt']),
          deletedAt: doc.data()['deletedAt'] ? this.timestampToDate(doc.data()['deletedAt']) : undefined
        } as Wall));
        
        // Filter for deleted walls only and remove duplicates
        const seenIds = new Set<string>();
        const deletedWalls = allWalls.filter(wall => {
          // Must be deleted
          if (!wall.deletedAt) return false;
          
          // Avoid duplicates
          if (seenIds.has(wall.id!)) return false;
          seenIds.add(wall.id!);
          
          return true;
        });
        
        // Sort by deletedAt desc
        return deletedWalls.sort((a, b) => {
          const aTime = a.deletedAt?.getTime() || 0;
          const bTime = b.deletedAt?.getTime() || 0;
          return bTime - aTime;
        });
      }),
      catchError(error => {
        console.error('Error getting deleted walls:', error);
        return of([]);
      })
    );
  }

  getAllWalls(): Observable<Wall[]> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user;
      }),
      switchMap(user => {
        return runInInjectionContext(this.injector, () => {
          const wallsCollection = collection(this.firestore, this.collectionName);
          
          // Simple query to get all walls, then filter client-side
          // Remove orderBy to avoid index requirements and permission issues
          const allWallsQuery = query(
            wallsCollection,
            limit(100) // Limit to prevent loading too many documents
          );
          
          console.log('Fetching walls for user:', user.uid, user.email);
          
          return from(getDocs(allWallsQuery)).pipe(
            map(snapshot => ({ snapshot, user }))
          );
        });
      }),
      map(({ snapshot, user }) => {
        // Map and filter walls client-side
        const allWalls = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: this.timestampToDate(doc.data()['createdAt']),
          updatedAt: this.timestampToDate(doc.data()['updatedAt']),
          deletedAt: doc.data()['deletedAt'] ? this.timestampToDate(doc.data()['deletedAt']) : undefined
        } as Wall));
        
        // Filter walls the user can view and exclude soft-deleted
        const filteredWalls = allWalls.filter(wall => {
          // Exclude soft-deleted walls
          if (wall.deletedAt) return false;
          
          // Check new permissions structure
          if (wall.permissions) {
            if (wall.permissions.owner === user.uid) return true;
            if (wall.permissions.editors?.includes(user.uid)) return true;
          }
          
          // Check legacy structure
          if (wall.ownerId === user.email || wall.ownerId === user.uid) return true;
          if (wall.sharedWith?.includes(user.email!) || wall.sharedWith?.includes(user.uid)) return true;
          
          // Check if wall is published and public
          if (wall.visibility?.isPublished && !wall.visibility?.requiresLogin) return true;
          if (wall.isPublic) return true; // Legacy public walls
          
          return false;
        });
        
        // Sort by updatedAt desc (since we removed orderBy from query)
        return filteredWalls.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
        return user;
      }),
      switchMap(user => {
        return runInInjectionContext(this.injector, () => {
          const wallDoc = doc(this.firestore, this.collectionName, id);
          return from(getDoc(wallDoc)).pipe(
            map(docSnap => ({ docSnap, user }))
          );
        });
      }),
      map(({ docSnap, user }) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const wall = {
            id: docSnap.id,
            ...data,
            createdAt: this.timestampToDate(data['createdAt']),
            updatedAt: this.timestampToDate(data['updatedAt'])
          } as Wall;
          
          // Check permissions - both old and new format
          if (wall.permissions) {
            // New permissions format
            if (wall.permissions.owner === user.uid || 
                wall.permissions.editors?.includes(user.uid)) {
              return wall;
            }
          }
          
          // Legacy permissions check
          if (wall.ownerId === user.email || wall.ownerId === user.uid ||
              wall.sharedWith?.includes(user.email!) || wall.sharedWith?.includes(user.uid)) {
            return wall;
          }
          
          // Check if wall is public
          if (wall.visibility?.isPublished && !wall.visibility?.requiresLogin) {
            return wall;
          }
          if (wall.isPublic) {
            return wall;
          }
          
          console.warn('User does not have access to this wall');
          return null;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting wall:', error);
        return of(null);
      })
    );
  }

  /**
   * Watch wall for real-time changes
   */
  watchWallById(id: string): Observable<Wall | null> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return user;
      }),
      switchMap(user => {
        return new Observable<Wall | null>(subscriber => {
          const unsubscribe = runInInjectionContext(this.injector, () => {
            const wallDoc = doc(this.firestore, this.collectionName, id);
            return onSnapshot(wallDoc, 
              (docSnap) => {
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  const wall = {
                    id: docSnap.id,
                    ...data,
                    createdAt: this.timestampToDate(data['createdAt']),
                    updatedAt: this.timestampToDate(data['updatedAt'])
                  } as Wall;
                  
                  // Check permissions - both old and new format
                  if (wall.permissions) {
                    // New permissions format
                    if (wall.permissions.owner === user.uid || 
                        wall.permissions.editors?.includes(user.uid)) {
                      subscriber.next(wall);
                      return;
                    }
                  }
                  
                  // Legacy permissions check
                  if (wall.ownerId === user.email || wall.ownerId === user.uid ||
                      wall.sharedWith?.includes(user.email!) || wall.sharedWith?.includes(user.uid)) {
                    subscriber.next(wall);
                    return;
                  }
                  
                  // Check if wall is public
                  if (wall.visibility?.isPublished && !wall.visibility?.requiresLogin) {
                    subscriber.next(wall);
                    return;
                  }
                  if (wall.isPublic) {
                    subscriber.next(wall);
                    return;
                  }
                  
                  console.warn('User does not have access to this wall');
                  subscriber.next(null);
                } else {
                  subscriber.next(null);
                }
              },
              (error) => {
                console.error('Error watching wall:', error);
                subscriber.error(error);
              }
            );
          });

          // Return cleanup function
          return () => unsubscribe();
        });
      }),
      catchError(error => {
        console.error('Error setting up wall watcher:', error);
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
        return user;
      }),
      switchMap(user => {
        return runInInjectionContext(this.injector, () => {
          const wallsCollection = collection(this.firestore, this.collectionName);
          // Clean up undefined values for Firestore
          const cleanWall = this.cleanUndefinedValues(wall);
          
          // Ensure permissions are set correctly with UID
          if (cleanWall.permissions) {
            cleanWall.permissions.owner = user.uid;
          }
          
          const wallData = {
            ...cleanWall,
            name: cleanWall.name || 'Untitled Wall',
            ownerId: cleanWall.ownerId || user.email, // Keep legacy field for compatibility
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
        return user;
      }),
      switchMap(user => {
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

  // Soft delete - marks wall as deleted
  deleteWall(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const wallDoc = doc(this.firestore, this.collectionName, id);
      const updateData = {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      return from(updateDoc(wallDoc, updateData)).pipe(
        catchError(error => {
          console.error('Error soft deleting wall:', error);
          throw error;
        })
      );
    });
  }

  // Restore soft-deleted wall
  restoreWall(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const wallDoc = doc(this.firestore, this.collectionName, id);
      const updateData = {
        deletedAt: null,
        updatedAt: serverTimestamp()
      };
      
      return from(updateDoc(wallDoc, updateData)).pipe(
        catchError(error => {
          console.error('Error restoring wall:', error);
          throw error;
        })
      );
    });
  }

  // Permanently delete wall
  permanentlyDeleteWall(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const wallDoc = doc(this.firestore, this.collectionName, id);
      
      return from(deleteDoc(wallDoc)).pipe(
        catchError(error => {
          console.error('Error permanently deleting wall:', error);
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
    // Create object types based on template
    let objectTypes: WallObjectType[];
    
    switch (template) {
      case 'veteran':
        objectTypes = this.getVeteranRegistryTemplate('placeholder');
        break;
      case 'alumni':
        objectTypes = this.getAlumniDirectoryTemplate('placeholder');
        break;
      default:
        objectTypes = this.getDefaultObjectTypes('placeholder');
    }
    
    const wallWithObjectTypes = { ...wallData, objectTypes };
    return this.createWall(wallWithObjectTypes).pipe(
      map(wallId => {
        // Update object types with actual wallId
        const updatedObjectTypes = objectTypes.map(ot => ({ ...ot, wallId }));
        return { wallId, objectTypes: updatedObjectTypes };
      }),
      switchMap(result => {
        // Update wall with corrected wallIds in object types
        return this.updateWall(result.wallId, { objectTypes: result.objectTypes }).pipe(
          map(() => result)
        );
      })
    );
  }

  /**
   * Get wall with its object types populated (walls already contain object types)
   */
  getWallWithObjectTypes(wallId: string): Observable<Wall | null> {
    return this.getWallById(wallId);
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
          // Create legacy object type directly
          const objectType: WallObjectType = {
            id: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            wallId: wallId,
            name: 'Wall Items',
            description: 'Migrated from legacy field system',
            icon: 'article',
            color: '#6366f1',
            fields: wall.fields,
            relationships: [],
            displaySettings: {
              cardLayout: 'detailed',
              showOnMap: false,
              primaryField: wall.fields[0]?.id || '',
              secondaryField: wall.fields[1]?.id,
              imageField: undefined
            },
            isActive: true,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };

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
    return this.getWallById(wallId).pipe(
      switchMap(wall => {
        if (!wall) {
          return throwError(() => new Error('Wall not found'));
        }

        // Generate a unique ID for the object type
        const objectTypeId = `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newObjectType: WallObjectType = {
          ...objectType,
          id: objectTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingObjectTypes = wall.objectTypes || [];
        const updatedObjectTypes = [...existingObjectTypes, newObjectType];

        return this.updateWall(wallId, { objectTypes: updatedObjectTypes }).pipe(
          map(() => newObjectType)
        );
      })
    );
  }

  /**
   * Update object type in wall
   */
  updateObjectTypeInWall(wallId: string, objectTypeId: string, updates: Partial<WallObjectType>): Observable<void> {
    return this.getWallById(wallId).pipe(
      switchMap(wall => {
        if (!wall || !wall.objectTypes) {
          return throwError(() => new Error('Wall or object types not found'));
        }

        const updatedObjectTypes = wall.objectTypes.map(ot => 
          ot.id === objectTypeId ? { ...ot, ...updates, updatedAt: new Date() } : ot
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

        return this.updateWall(wallId, { objectTypes: updatedObjectTypes });
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

  /**
   * Update wall permissions
   */
  updateWallPermissions(wallId: string, permissions: Partial<any>): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const wallDoc = doc(this.firestore, this.collectionName, wallId);
      const updateData = {
        'permissions.editors': permissions['editors'],
        'permissions.department': permissions['department'],
        'permissions.allowDepartmentEdit': permissions['allowDepartmentEdit'],
        updatedAt: serverTimestamp()
      };
      
      return from(updateDoc(wallDoc, updateData));
    });
  }

  /**
   * Get default object type templates
   */
  private getDefaultObjectTypes(wallId: string): WallObjectType[] {
    return [
      {
        id: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wallId,
        name: 'General Items',
        description: 'General purpose items for any content',
        icon: 'description',
        color: '#6366f1',
        fields: [
          {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            placeholder: 'Enter title...'
          },
          {
            id: 'description',
            name: 'Description',
            type: 'longtext',
            required: false,
            placeholder: 'Enter description...'
          },
          {
            id: 'date',
            name: 'Date',
            type: 'date',
            required: false
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'detailed',
          showOnMap: false,
          primaryField: 'title',
          secondaryField: 'description'
        },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Get veteran registry template
   */
  private getVeteranRegistryTemplate(wallId: string): WallObjectType[] {
    return [
      {
        id: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wallId,
        name: 'Veteran',
        description: 'Service member information',
        icon: 'military_tech',
        color: '#059669',
        fields: [
          {
            id: 'name',
            name: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter full name...'
          },
          {
            id: 'rank',
            name: 'Rank',
            type: 'text',
            required: false,
            placeholder: 'Enter rank...'
          },
          {
            id: 'branch',
            name: 'Service Branch',
            type: 'text',
            required: true,
            placeholder: 'Army, Navy, Air Force, Marines, Coast Guard...'
          },
          {
            id: 'serviceYears',
            name: 'Years of Service',
            type: 'text',
            required: false,
            placeholder: 'e.g., 1998-2018'
          },
          {
            id: 'bio',
            name: 'Biography',
            type: 'longtext',
            required: false,
            placeholder: 'Enter biography...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'detailed',
          showOnMap: false,
          primaryField: 'name',
          secondaryField: 'rank'
        },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Add other veteran registry object types as needed
    ];
  }

  /**
   * Get alumni directory template
   */
  private getAlumniDirectoryTemplate(wallId: string): WallObjectType[] {
    return [
      {
        id: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wallId,
        name: 'Alumnus',
        description: 'Alumni information',
        icon: 'school',
        color: '#2563eb',
        fields: [
          {
            id: 'name',
            name: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter full name...'
          },
          {
            id: 'graduationYear',
            name: 'Graduation Year',
            type: 'number',
            required: true,
            placeholder: 'Enter graduation year...'
          },
          {
            id: 'degree',
            name: 'Degree',
            type: 'text',
            required: false,
            placeholder: 'Enter degree...'
          },
          {
            id: 'currentPosition',
            name: 'Current Position',
            type: 'text',
            required: false,
            placeholder: 'Enter current position...'
          },
          {
            id: 'email',
            name: 'Email',
            type: 'email',
            required: false,
            placeholder: 'Enter email address...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'detailed',
          showOnMap: false,
          primaryField: 'name',
          secondaryField: 'currentPosition'
        },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Add other alumni directory object types as needed
    ];
  }
}