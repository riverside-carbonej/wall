import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, switchMap, filter, take } from 'rxjs/operators';

import { WallService } from '../../features/walls/services/wall.service';
import { WallItemService } from '../../features/wall-items/services/wall-item.service';
import { NavigationService } from '../../shared/services/navigation.service';
import { ThemeService } from '../../shared/services/theme.service';
import { AuthService } from '../services/auth.service';
import { WallPermissionHelper } from '../../shared/models/wall.model';

/**
 * Public Wall Context Guard - Handles wall context for both public and authenticated users
 * Allows public wall access without authentication while maintaining context
 */
export const publicWallContextGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean> => {
  const wallService = inject(WallService);
  const wallItemService = inject(WallItemService);
  const navigationService = inject(NavigationService);
  const themeService = inject(ThemeService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const wallId = route.paramMap.get('id') || route.paramMap.get('wallId');
  console.log(`publicWallContextGuard: route params:`, route.paramMap.keys.map(key => `${key}=${route.paramMap.get(key)}`));
  console.log(`publicWallContextGuard: extracted wallId: ${wallId}`);
  
  if (!wallId) {
    console.warn('publicWallContextGuard: No wallId found in route params, redirecting to /walls');
    router.navigate(['/walls']);
    return of(false);
  }

  // First get the wall to check its visibility
  return wallService.getWallById(wallId).pipe(
    take(1),
    switchMap(wall => {
      console.log(`publicWallContextGuard: wallId=${wallId}, wall=${!!wall}`);
      
      if (!wall) {
        console.warn('publicWallContextGuard: Wall not found, redirecting to /walls');
        router.navigate(['/walls']);
        return of(false);
      }

      // Check if wall is public
      const isPublicWall = wall.visibility.isPublished && !wall.visibility.requiresLogin;
      
      // For public walls, we can proceed without authentication
      if (isPublicWall) {
        console.log('publicWallContextGuard: Public wall, proceeding without auth check');
        
        // Get wall items count
        return wallItemService.getWallItems(wallId).pipe(
          map(items => {
            const itemCount = items?.length || 0;
            // Update navigation context for public viewing (no edit/admin permissions)
            navigationService.updateWallContext(wall, false, false, itemCount);

            // Apply wall theme
            if (wall.theme) {
              themeService.applyWallTheme(wall.theme);
            }

            return true;
          }),
          catchError(itemError => {
            console.warn('publicWallContextGuard: Error loading items, continuing with 0 count', itemError);
            // Update navigation context with 0 items
            navigationService.updateWallContext(wall, false, false, 0);

            // Apply wall theme
            if (wall.theme) {
              themeService.applyWallTheme(wall.theme);
            }

            return of(true);
          })
        );
      }

      // For non-public walls, wait for auth state and check permissions
      return authService.authStateReady$.pipe(
        filter(ready => ready),
        take(1),
        switchMap(() => authService.currentUser$),
        take(1),
        switchMap(user => {
          console.log(`publicWallContextGuard: Non-public wall, user=${!!user}`);
          
          if (!user) {
            // Non-public wall requires authentication
            console.warn('publicWallContextGuard: Non-public wall requires authentication, redirecting to /login');
            router.navigate(['/login']);
            return of(false);
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
            console.warn('publicWallContextGuard: User cannot view this wall, redirecting to /walls');
            router.navigate(['/walls']);
            return of(false);
          }

          // Check edit and admin permissions
          const canEdit = WallPermissionHelper.canEditWall(wall, userProfile);
          const canAdmin = wall.permissions.owner === user.uid || 
                          (wall.permissions.managers && wall.permissions.managers.includes(user.uid));

          // Get wall items count
          return wallItemService.getWallItems(wallId).pipe(
            map(items => {
              const itemCount = items?.length || 0;
              // Update navigation context with proper permissions
              navigationService.updateWallContext(wall, canEdit, canAdmin, itemCount);

              // Apply wall theme
              if (wall.theme) {
                themeService.applyWallTheme(wall.theme);
              }

              return true;
            }),
            catchError(itemError => {
              console.warn('publicWallContextGuard: Error loading items, continuing with 0 count', itemError);
              // Update navigation context with 0 items
              navigationService.updateWallContext(wall, canEdit, canAdmin, 0);

              // Apply wall theme
              if (wall.theme) {
                themeService.applyWallTheme(wall.theme);
              }

              return of(true);
            })
          );
        })
      );
    }),
    catchError(error => {
      console.error('publicWallContextGuard: Error occurred, redirecting to /walls', error);
      router.navigate(['/walls']);
      return of(false);
    })
  );
};