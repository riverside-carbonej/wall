import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Observable, from, map, catchError, of, BehaviorSubject } from 'rxjs';
import { 
  Auth, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from '@angular/fire/auth';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AppUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private auth: Auth, private injector: Injector) {
    // Listen for auth state changes within injection context
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          const appUser: AppUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          this.currentUserSubject.next(appUser);
        } else {
          this.currentUserSubject.next(null);
        }
      });
    });
  }

  get currentUser(): AppUser | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Email/Password Sign In
  signInWithEmail(email: string, password: string): Observable<AppUser> {
    return runInInjectionContext(this.injector, () => {
      return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
        map(credential => ({
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: credential.user.displayName,
          photoURL: credential.user.photoURL
        } as AppUser)),
        catchError(error => {
          console.error('Email sign in error:', error);
          throw error;
        })
      );
    });
  }

  // Email/Password Sign Up
  signUpWithEmail(email: string, password: string, displayName?: string): Observable<AppUser> {
    return runInInjectionContext(this.injector, () => {
      return from(
        createUserWithEmailAndPassword(this.auth, email, password).then(async (credential) => {
          // Update display name if provided
          if (displayName && credential.user) {
            await updateProfile(credential.user, { displayName });
          }
          return {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: displayName || credential.user.displayName,
            photoURL: credential.user.photoURL
          } as AppUser;
        })
      ).pipe(
        catchError(error => {
          console.error('Email sign up error:', error);
          throw error;
        })
      );
    });
  }

  // Google Sign In
  signInWithGoogle(): Observable<AppUser> {
    return runInInjectionContext(this.injector, () => {
      return from(signInWithPopup(this.auth, new GoogleAuthProvider())).pipe(
        map(credential => ({
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: credential.user.displayName,
          photoURL: credential.user.photoURL
        } as AppUser)),
        catchError(error => {
          console.error('Google sign in error:', error);
          throw error;
        })
      );
    });
  }

  // Sign Out
  signOut(): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      return from(signOut(this.auth)).pipe(
        catchError(error => {
          console.error('Sign out error:', error);
          throw error;
        })
      );
    });
  }

  // Get user token (for API calls if needed)
  getIdToken(): Observable<string | null> {
    return runInInjectionContext(this.injector, () => {
      if (this.auth.currentUser) {
        return from(this.auth.currentUser.getIdToken());
      }
      return of(null);
    });
  }
}