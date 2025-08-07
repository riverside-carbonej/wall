import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, switchMap, filter, take } from 'rxjs/operators';

import { WallService } from '../../features/walls/services/wall.service';
import { WallItemService } from '../../features/wall-items/services/wall-item.service';
import { NavigationService } from '../../shared/services/navigation.service';
import { ThemeService } from '../../shared/services/theme.service';
import { AuthService } from '../services/auth.service';
import { WallPermissionHelper, Wall } from '../../shared/models/wall.model';

/**
 * Public Wall Context Guard - Sets up wall context for both public and authenticated users
 * Handles navigation context and theming based on wall access level
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
  console.log(`publicWallContextGuard: Checking wall context for wallId: ${wallId}`);
  
  if (!wallId) {
    console.warn('publicWallContextGuard: No wallId found in route params');
    router.navigate(['/walls']);
    return of(false);
  }

  // Helper function to set wall context
  const setWallContext = (wall: Wall, canEdit: boolean, canAdmin: boolean) => {
    // Get wall items count
    return wallItemService.getWallItems(wallId).pipe(
      map(items => {
        const itemCount = items?.length || 0;
        navigationService.updateWallContext(wall, canEdit, canAdmin, itemCount);
        
        // Apply wall theme
        if (wall.theme) {
          themeService.applyWallTheme(wall.theme);
        }
        
        return true;
      }),
      catchError(error => {
        console.warn('publicWallContextGuard: Error loading items, continuing with 0 count', error);
        navigationService.updateWallContext(wall, canEdit, canAdmin, 0);
        
        // Apply wall theme
        if (wall.theme) {
          themeService.applyWallTheme(wall.theme);
        }
        
        return of(true);
      })
    );
  };

  // First try to get the wall without authentication
  return wallService.getWallByIdPublic(wallId).pipe(
    take(1),
    switchMap(wall => {
      if (wall) {
        console.log('publicWallContextGuard: Wall fetched without auth');
        
        // Check if this is a published external wall
        if (wall.visibility?.isPublished && !wall.visibility?.requiresLogin) {
          console.log('publicWallContextGuard: External wall, checking if user has permissions');
          
          // For public walls, always check auth state to see if user has edit permissions
          return authService.authStateReady$.pipe(
            take(1),
            switchMap(ready => {
              const user = authService.currentUser;
              
              if (!user) {
                // No user - public read-only access
                console.log('publicWallContextGuard: No authenticated user, setting public read-only context');
                return setWallContext(wall, false, false);
              }
              
              // User is authenticated - check permissions
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
              
              const canEdit = WallPermissionHelper.canEditWall(wall, userProfile);
              const canAdmin = wall.permissions.owner === user.uid || 
                              (wall.permissions.managers?.includes(user.uid) ?? false);
              
              console.log('🔍 publicWallContextGuard: External wall with authenticated user:', {
                wallId: wall.id,
                userId: user.uid,
                wallOwner: wall.permissions.owner,
                isOwner: wall.permissions.owner === user.uid,
                canEdit,
                canAdmin
              });
              
              return setWallContext(wall, canEdit, canAdmin);
            })
          );
        }

        // Wall needs authentication - check if user is logged in
        return authService.authStateReady$.pipe(
          filter(ready => ready),
          take(1),
          switchMap(() => {
            const user = authService.currentUser;
            
            if (!user) {
              // Wall requires auth but user not logged in
              console.warn('publicWallContextGuard: Wall requires auth but no user');
              router.navigate(['/login']);
              return of(false);
            }

            // Check user permissions
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

            const canView = WallPermissionHelper.canViewWall(wall, userProfile);
            if (!canView) {
              console.warn('publicWallContextGuard: User cannot view wall');
              router.navigate(['/walls']);
              return of(false);
            }

            const canEdit = WallPermissionHelper.canEditWall(wall, userProfile);
            const canAdmin = wall.permissions.owner === user.uid || 
                            (wall.permissions.managers?.includes(user.uid) ?? false);

            console.log('🔍 publicWallContextGuard: Setting context for authenticated user:', {
              wallId: wall.id,
              userId: user.uid,
              wallOwner: wall.permissions.owner,
              isOwner: wall.permissions.owner === user.uid,
              editors: wall.permissions.editors,
              isEditor: wall.permissions.editors?.includes(user.uid),
              canEdit,
              canAdmin
            });

            return setWallContext(wall, canEdit, canAdmin);
          })
        );
      }

      // Could not fetch wall without auth - try with auth if available
      console.log('publicWallContextGuard: Could not fetch wall without auth');
      
      return authService.authStateReady$.pipe(
        filter(ready => ready),
        take(1),
        switchMap(() => {
          const user = authService.currentUser;
          
          if (!user) {
            console.warn('publicWallContextGuard: No user and no public access');
            router.navigate(['/login']);
            return of(false);
          }

          // Try to get wall with authentication
          return wallService.getWallById(wallId).pipe(
            take(1),
            switchMap(authWall => {
              if (!authWall) {
                console.warn('publicWallContextGuard: Wall not found even with auth');
                router.navigate(['/walls']);
                return of(false);
              }

              // Check permissions
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

              const canView = WallPermissionHelper.canViewWall(authWall, userProfile);
              if (!canView) {
                console.warn('publicWallContextGuard: User cannot view wall');
                router.navigate(['/walls']);
                return of(false);
              }

              const canEdit = WallPermissionHelper.canEditWall(authWall, userProfile);
              const canAdmin = authWall.permissions.owner === user.uid || 
                              (authWall.permissions.managers?.includes(user.uid) ?? false);

              console.log('🔍 publicWallContextGuard: Setting context for authenticated user (retry):', {
                wallId: authWall.id,
                userId: user.uid,
                wallOwner: authWall.permissions.owner,
                isOwner: authWall.permissions.owner === user.uid,
                editors: authWall.permissions.editors,
                isEditor: authWall.permissions.editors?.includes(user.uid),
                canEdit,
                canAdmin
              });

              return setWallContext(authWall, canEdit, canAdmin);
            })
          );
        })
      );
    }),
    catchError(error => {
      console.error('publicWallContextGuard: Error occurred', error);
      router.navigate(['/walls']);
      return of(false);
    })
  );
};