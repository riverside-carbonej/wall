import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

import { WallService } from '../../features/walls/services/wall.service';
import { WallItemService } from '../../features/wall-items/services/wall-item.service';
import { NavigationService } from '../../shared/services/navigation.service';
import { ThemeService } from '../../shared/services/theme.service';

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
  const router = inject(Router);

  const wallId = route.paramMap.get('id') || route.paramMap.get('wallId');
  
  console.log('Wall Context Guard - Wall ID:', wallId);
  
  if (!wallId) {
    console.log('No wall ID found, redirecting to /walls');
    router.navigate(['/walls']);
    return of(false);
  }

  // Pre-load wall data and set navigation context before allowing navigation
  return wallService.getWallById(wallId).pipe(
    tap(wall => console.log('Wall loaded:', wall ? 'Success' : 'Not found')),
    switchMap(wall => {
      if (!wall) {
        console.log('Wall not found, redirecting to /walls');
        router.navigate(['/walls']);
        return of(false);
      }

      // Get wall items count - but don't fail if this errors
      return wallItemService.getWallItems(wallId).pipe(
        map(items => {
          const itemCount = items?.length || 0;
          console.log('Wall items loaded:', itemCount);
          
          // TODO: Replace with proper permission checking
          const canEdit = true;
          const canAdmin = true;
          
          // Update navigation context BEFORE component loads
          navigationService.updateWallContext(wall, canEdit, canAdmin, itemCount);

          // Apply wall theme BEFORE component loads to prevent theme flashing
          if (wall.theme) {
            themeService.applyWallTheme(wall.theme);
          }

          console.log('Wall context guard - allowing navigation');
          // Allow navigation to proceed - context is now set
          return true;
        }),
        catchError(itemError => {
          console.warn('Error loading wall items, but allowing navigation:', itemError);
          // Still allow navigation even if items fail to load
          const canEdit = true;
          const canAdmin = true;
          
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
      console.error('Error in wall context guard:', error);
      router.navigate(['/walls']);
      return of(false);
    })
  );
};