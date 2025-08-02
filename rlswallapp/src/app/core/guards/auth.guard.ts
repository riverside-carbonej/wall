import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authStateReady$.pipe(
      filter(ready => ready), // Wait until auth state is determined
      take(1),
      map(() => {
        const user = this.authService.currentUser;
        if (user) {
          // User is authenticated
          return true;
        } else {
          // User is not authenticated, redirect to login
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}