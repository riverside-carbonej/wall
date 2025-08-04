import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { catchError } from 'rxjs/operators';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface SearchUsersResponse {
  users: AuthUser[];
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthSearchService {

  constructor(private functions: Functions) {}

  /**
   * Search Firebase Auth users using a Cloud Function
   * Falls back to empty results if Cloud Function is not deployed yet
   */
  searchUsers(searchTerm: string): Observable<AuthUser[]> {
    const searchUsersFunction = httpsCallable<{ searchTerm: string }, SearchUsersResponse>(
      this.functions, 
      'searchUsers'
    );

    return from(
      searchUsersFunction({ searchTerm }).then(result => result.data.users)
    ).pipe(
      catchError(error => {
        console.warn('Cloud Function not available, falling back to empty results:', error);
        // Return empty array if Cloud Function is not deployed
        return from([[]]);
      })
    );
  }
}