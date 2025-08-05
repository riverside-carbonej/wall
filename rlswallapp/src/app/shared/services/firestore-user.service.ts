import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of, forkJoin } from 'rxjs';
import { Firestore, doc, getDoc, query, collection, where, getDocs, limit } from '@angular/fire/firestore';

export interface FirestoreUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreUserService {

  constructor(private firestore: Firestore) {}

  /**
   * Get user profile data by UID from Firestore users collection
   */
  getUserByUid(uid: string): Observable<FirestoreUser | null> {
    const userDocRef = doc(this.firestore, 'users', uid);
    
    return from(getDoc(userDocRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as FirestoreUser;
          return {
            ...data,
            uid: docSnap.id
          };
        }
        return null;
      }),
      catchError(error => {
        console.warn('Error fetching user from Firestore:', uid, error);
        return of(null);
      })
    );
  }

  /**
   * Get multiple users by their UIDs
   */
  getUsersByUids(uids: string[]): Observable<FirestoreUser[]> {
    if (uids.length === 0) return of([]);
    
    // Get all users in parallel using forkJoin
    const userObservables = uids.map(uid => 
      this.getUserByUid(uid).pipe(
        catchError(() => of(null))
      )
    );
    
    return forkJoin(userObservables).pipe(
      map(users => users.filter(user => user !== null) as FirestoreUser[])
    );
  }

  /**
   * Search users by email (partial match)
   */
  searchUsersByEmail(searchTerm: string): Observable<FirestoreUser[]> {
    if (searchTerm.length < 2) return of([]);
    
    const usersRef = collection(this.firestore, 'users');
    
    // Firestore doesn't support partial string matching, so we'll do range queries
    // This searches for emails that start with the search term
    const q = query(
      usersRef,
      where('email', '>=', searchTerm.toLowerCase()),
      where('email', '<=', searchTerm.toLowerCase() + '\uf8ff'),
      where('active', '==', true),
      limit(10)
    );
    
    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const users: FirestoreUser[] = [];
        querySnapshot.forEach(doc => {
          users.push({
            ...doc.data() as FirestoreUser,
            uid: doc.id
          });
        });
        return users;
      }),
      catchError(error => {
        console.warn('Error searching users:', error);
        return of([]);
      })
    );
  }

  /**
   * Search users by display name (partial match)
   */
  searchUsersByDisplayName(searchTerm: string): Observable<FirestoreUser[]> {
    if (searchTerm.length < 2) return of([]);
    
    const usersRef = collection(this.firestore, 'users');
    
    const q = query(
      usersRef,
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      where('active', '==', true),
      limit(10)
    );
    
    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const users: FirestoreUser[] = [];
        querySnapshot.forEach(doc => {
          users.push({
            ...doc.data() as FirestoreUser,
            uid: doc.id
          });
        });
        return users;
      }),
      catchError(error => {
        console.warn('Error searching users by display name:', error);
        return of([]);
      })
    );
  }

  /**
   * General search that combines email and display name search
   */
  searchUsers(searchTerm: string): Observable<FirestoreUser[]> {
    if (searchTerm.length < 2) return of([]);
    
    // Search both by email and display name using forkJoin
    return forkJoin([
      this.searchUsersByEmail(searchTerm),
      this.searchUsersByDisplayName(searchTerm)
    ]).pipe(
      map(([emailResults, nameResults]) => {
        const allResults = [...emailResults, ...nameResults];
        
        // Remove duplicates based on UID
        const uniqueResults = allResults.filter((user, index, array) => 
          array.findIndex(u => u.uid === user.uid) === index
        );
        
        // Sort by relevance (exact matches first, then partial matches)
        return uniqueResults.sort((a, b) => {
          const aEmailMatch = a.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
          const bEmailMatch = b.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
          const aNameMatch = a.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
          const bNameMatch = b.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
          
          // Prioritize email matches, then name matches
          if (aEmailMatch && !bEmailMatch) return -1;
          if (!aEmailMatch && bEmailMatch) return 1;
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
          
          return 0;
        });
      })
    );
  }
}