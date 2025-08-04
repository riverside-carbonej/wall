import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserMigrationService {

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  /**
   * Create a user document for the current authenticated user
   * This is useful for migrating existing Firebase Auth users to Firestore
   */
  createCurrentUserDocument(): Observable<void> {
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const userDoc = {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    return from(setDoc(doc(this.firestore, 'users', currentUser.uid), userDoc, { merge: true }));
  }

  /**
   * Create test users for development/testing
   */
  createTestUsers(): Observable<void> {
    const testUsers = [
      {
        uid: 'test-user-1',
        email: 'john.doe@riversideschools.net',
        displayName: 'John Doe',
        photoURL: null,
        active: true
      },
      {
        uid: 'test-user-2', 
        email: 'jane.smith@riversideschools.net',
        displayName: 'Jane Smith',
        photoURL: null,
        active: true
      },
      {
        uid: 'test-user-3',
        email: 'bob.johnson@riversideschools.net', 
        displayName: 'Bob Johnson',
        photoURL: null,
        active: true
      },
      {
        uid: 'test-user-4',
        email: 'sarah.wilson@riversideschools.net',
        displayName: 'Sarah Wilson', 
        photoURL: null,
        active: true
      },
      {
        uid: 'test-user-5',
        email: 'mike.davis@riversideschools.net',
        displayName: 'Mike Davis',
        photoURL: null,
        active: true
      }
    ];

    const promises = testUsers.map(user => {
      const userDoc = {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      return setDoc(doc(this.firestore, 'users', user.uid), userDoc);
    });

    return from(Promise.all(promises).then(() => {}));
  }
}