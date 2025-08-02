import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable, from, map, catchError, of, throwError, switchMap } from 'rxjs';
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
import { Wall } from '../../../shared/models/wall.model';
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
          const wallData = {
            ...wall,
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
    return runInInjectionContext(this.injector, () => {
      const wallDoc = doc(this.firestore, this.collectionName, id);
      const updateData = {
        ...wallUpdate,
        updatedAt: serverTimestamp()
      };
      
      return from(updateDoc(wallDoc, updateData)).pipe(
        catchError(error => {
          console.error('Error updating wall:', error);
          throw error;
        })
      );
    });
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
}