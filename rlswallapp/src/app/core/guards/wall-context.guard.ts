import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, tap, switchMap, filter, take } from 'rxjs/operators';

import { WallService } from '../../features/walls/services/wall.service';
import { WallItemService } from '../../features/wall-items/services/wall-item.service';
import { NavigationService } from '../../shared/services/navigation.service';
import { ThemeService } from '../../shared/services/theme.service';
import { AuthService } from '../services/auth.service';
import { WallPermissionHelper } from '../../shared/models/wall.model';

/**
 * Wall Context Guard - Pre-loads wall data and sets navigation context BEFORE route activates
 * This prevents navigation menu flashing by setting context before any components load
 */
export const wallContextGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean> => {
  const wallService = inject(WallService);
  const wallItemService = inject(WallItemService);
  const navigationService = inject(NavigationService);
  const themeService = inject(ThemeService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const wallId = route.paramMap.get('id') || route.paramMap.get('wallId');
  console.log(`wallContextGuard: route params:`, route.paramMap.keys.map(key => `${key}=${route.paramMap.get(key)}`));
  console.log(`wallContextGuard: extracted wallId: ${wallId}`);
  
  if (!wallId) {
    console.warn('wallContextGuard: No wallId found in route params, redirecting to /walls');
    router.navigate(['/walls']);
    return of(false);
  }

  // Wait for auth to be ready, then load wall data and set navigation context
  return authService.authStateReady$.pipe(
    filter(ready => ready), // Wait until auth state is determined
    take(1),
    switchMap(() => combineLatest([
      wallService.getWallById(wallId),
      authService.currentUser$
    ])),
    switchMap(([wall, user]) => {
      console.log(`wallContextGuard: wallId=${wallId}, wall=${!!wall}, user=${!!user}`);
      
      if (!wall) {
        console.warn('wallContextGuard: Wall not found, redirecting to /walls');
        router.navigate(['/walls']);
        return of(false);
      }

      if (!user) {
        console.warn('wallContextGuard: User not authenticated, redirecting to /login');
        router.navigate(['/login']);
        return of(false);
      }

      // Convert to UserProfile for permission checking
      const userProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        department: undefined, // TODO: Add department to auth service
        role: 'user' as const, // TODO: Add role management
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      // Check permissions
      const canEdit = WallPermissionHelper.canEditWall(wall, userProfile);
      const canAdmin = wall.permissions.owner === user.uid || 
                       (wall.permissions.managers && wall.permissions.managers.includes(user.uid));


      // Get wall items count - but don't fail if this errors
      return wallItemService.getWallItems(wallId).pipe(
        map(items => {
          const itemCount = items?.length || 0;
          // Update navigation context BEFORE component loads
          navigationService.updateWallContext(wall, canEdit, canAdmin, itemCount);

          // Apply wall theme BEFORE component loads to prevent theme flashing
          if (wall.theme) {
            themeService.applyWallTheme(wall.theme);
          }

          // Allow navigation to proceed - context is now set
          return true;
        }),
        catchError(itemError => {
          // Update navigation context with 0 items
          navigationService.updateWallContext(wall, canEdit, canAdmin, 0);

          // Apply wall theme
          if (wall.theme) {
            themeService.applyWallTheme(wall.theme);
          }

          return of(true);
        })
      );
    }),
    catchError(error => {
      console.error('wallContextGuard: Error occurred, redirecting to /walls', error);
      router.navigate(['/walls']);
      return of(false);
    })
  );
};