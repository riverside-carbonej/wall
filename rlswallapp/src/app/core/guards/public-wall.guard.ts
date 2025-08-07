import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { WallService } from '../../features/walls/services/wall.service';
import { WallPermissionHelper } from '../../shared/models/wall.model';

/**
 * Public Wall Guard - Allows access to public walls without authentication
 * For other walls, requires authentication
 */
export const publicWallGuard: CanActivateFn = (route): Observable<boolean> => {
  const authService = inject(AuthService);
  const wallService = inject(WallService);
  const router = inject(Router);
  
  const wallId = route.paramMap.get('id') || route.paramMap.get('wallId');
  
  if (!wallId) {
    console.warn('publicWallGuard: No wallId found in route params');
    router.navigate(['/walls']);
    return of(false);
  }

  // First, try to get the wall to check its visibility
  return wallService.getWallById(wallId).pipe(
    take(1),
    switchMap(wall => {
      if (!wall) {
        console.warn('publicWallGuard: Wall not found');
        router.navigate(['/walls']);
        return of(false);
      }

      // Check if wall is public (published and doesn't require login)
      const isPublicWall = wall.visibility.isPublished && !wall.visibility.requiresLogin;
      
      if (isPublicWall) {
        console.log('publicWallGuard: Public wall, allowing access');
        return of(true);
      }

      // For non-public walls, check authentication
      return authService.authStateReady$.pipe(
        take(1),
        map(() => {
          const user = authService.currentUser;
          
          if (!user) {
            console.log('publicWallGuard: Non-public wall requires authentication');
            router.navigate(['/login']);
            return false;
          }

          // Convert to UserProfile for permission checking
          const userProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || undefined,
            department: undefined,
            role: 'user' as const,
            createdAt: new Date(),
            lastLoginAt: new Date()
          };

          // Check if user can view the wall
          const canView = WallPermissionHelper.canViewWall(wall, userProfile);
          
          if (!canView) {
            console.log('publicWallGuard: User cannot view this wall');
            router.navigate(['/walls']);
            return false;
          }

          return true;
        })
      );
    }),
    catchError(error => {
      console.error('publicWallGuard: Error checking wall access', error);
      router.navigate(['/walls']);
      return of(false);
    })
  );
};