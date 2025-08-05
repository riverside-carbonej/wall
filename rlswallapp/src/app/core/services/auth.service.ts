import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, map, catchError, of, BehaviorSubject, switchMap } from 'rxjs';
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
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';

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
  
  private authStateReadySubject = new BehaviorSubject<boolean>(false);
  public authStateReady$ = this.authStateReadySubject.asObservable();

  constructor(private auth: Auth, private firestore: Firestore, private injector: Injector, private router: Router) {
    // Listen for auth state changes within injection context
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, (user) => {
        console.log('Auth state changed:', user?.email || 'No user');
        if (user) {
          const appUser: AppUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          console.log('Setting current user:', appUser.email);
          this.currentUserSubject.next(appUser);
        } else {
          console.log('Setting current user to null');
          this.currentUserSubject.next(null);
        }
        
        // Mark auth state as ready after first callback
        if (!this.authStateReadySubject.value) {
          console.log('Auth state ready');
          this.authStateReadySubject.next(true);
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

          // Create user document in Firestore
          const userDoc = {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: displayName || credential.user.displayName,
            photoURL: credential.user.photoURL,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await setDoc(doc(this.firestore, 'users', credential.user.uid), userDoc);

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

  // Google Sign In with Popup
  signInWithGoogle(): Observable<AppUser> {
    return runInInjectionContext(this.injector, () => {
      console.log('Initiating Google sign-in popup...');
      const provider = new GoogleAuthProvider();
      return from(signInWithPopup(this.auth, provider)).pipe(
        switchMap(async credential => {
          console.log('Popup sign-in successful:', credential.user.email);
          
          // Create or update user document in Firestore
          const userDoc = {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: credential.user.displayName,
            photoURL: credential.user.photoURL,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await setDoc(doc(this.firestore, 'users', credential.user.uid), userDoc, { merge: true });

          return {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: credential.user.displayName,
            photoURL: credential.user.photoURL
          } as AppUser;
        }),
        catchError(error => {
          console.error('Google sign in popup error:', error);
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