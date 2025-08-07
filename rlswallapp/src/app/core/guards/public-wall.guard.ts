import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { WallService } from '../../features/walls/services/wall.service';
import { WallPermissionHelper } from '../../shared/models/wall.model';

/**
 * Public Wall Guard - Allows access to walls based on their visibility settings
 * - Public/External walls: Anyone can view (no login required)
 * - Internal walls: Any logged-in user can view
 * - Unpublished/Draft walls: Only explicit access (owner, editors, viewers)
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

  console.log('🔍 publicWallGuard: Checking access for wall:', wallId);

  // First, try to get the wall without authentication
  // Firebase security rules will allow this for published external walls
  console.log('🔍 publicWallGuard: Attempting to fetch wall without auth');
  return wallService.getWallByIdPublic(wallId).pipe(
    take(1),
    switchMap(wall => {
      // Wall was fetched successfully
      if (wall) {
        console.log('✅ publicWallGuard: Wall fetched without auth:', {
          wallId: wall.id,
          wallName: wall.name,
          isPublished: wall.visibility?.isPublished,
          requiresLogin: wall.visibility?.requiresLogin,
          permissions: wall.permissions
        });

        // Check if this is a published external wall (anyone can view)
        if (wall.visibility?.isPublished && !wall.visibility?.requiresLogin) {
          console.log('✅ publicWallGuard: External published wall, allowing access');
          return of(true);
        }

        // Wall exists but needs further permission checks
        // Check if user is authenticated
        return authService.authStateReady$.pipe(
          take(1),
          map(() => {
            const user = authService.currentUser;
            
            if (!user) {
              // Wall requires authentication but user is not logged in
              console.log('❌ publicWallGuard: Wall requires authentication');
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
              console.log('❌ publicWallGuard: User cannot view this wall');
              router.navigate(['/walls']);
              return false;
            }

            console.log('✅ publicWallGuard: User has access to wall');
            return true;
          })
        );
      }

      // Wall not fetched - could be permission denied or not found
      // Check if user is authenticated and try again with auth
      console.log('⚠️ publicWallGuard: Could not fetch wall without auth, checking user status');
      
      return authService.authStateReady$.pipe(
        take(1),
        switchMap(() => {
          const user = authService.currentUser;
          
          if (!user) {
            // No user and couldn't fetch wall - it's either not found or requires auth
            console.log('❌ publicWallGuard: No user and no public access');
            router.navigate(['/login']);
            return of(false);
          }

          // User is authenticated, try to get wall with auth
          console.log('🔄 publicWallGuard: Retrying with authenticated user');
          return wallService.getWallById(wallId).pipe(
            take(1),
            map(authWall => {
              if (!authWall) {
                console.log('❌ publicWallGuard: Wall not found even with auth');
                router.navigate(['/walls']);
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
              const canView = WallPermissionHelper.canViewWall(authWall, userProfile);
              
              if (!canView) {
                console.log('❌ publicWallGuard: User cannot view this wall');
                router.navigate(['/walls']);
                return false;
              }

              console.log('✅ publicWallGuard: User has access to wall (with auth)');
              return true;
            }),
            catchError(error => {
              console.error('❌ publicWallGuard: Error getting wall with auth:', error);
              router.navigate(['/walls']);
              return of(false);
            })
          );
        })
      );
    }),
    catchError(error => {
      console.error('❌ publicWallGuard: Unexpected error:', error);
      router.navigate(['/walls']);
      return of(false);
    })
  );
};