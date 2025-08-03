import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of, combineLatest, EMPTY } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import { WallService } from '../../features/walls/services/wall.service';
import { WallItemService } from '../../features/wall-items/services/wall-item.service';
import { NavigationService } from '../../shared/services/navigation.service';
import { ThemeService } from '../../shared/services/theme.service';
import { AuthService } from '../services/auth.service';
import { Wall } from '../../shared/models/wall.model';

export interface WallContextData {
  wall: Wall;
  itemCount: number;
  canEdit: boolean;
  canAdmin: boolean;
  hasLocationEnabledTypes: boolean;
}

export const wallContextResolver: ResolveFn<WallContextData> = (
  route: ActivatedRouteSnapshot
): Observable<WallContextData> => {
  const wallService = inject(WallService);
  const wallItemService = inject(WallItemService);
  const navigationService = inject(NavigationService);
  const themeService = inject(ThemeService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const wallId = route.paramMap.get('id') || route.paramMap.get('wallId');
  
  if (!wallId) {
    router.navigate(['/walls']);
    return EMPTY;
  }

  return wallService.getWallById(wallId).pipe(
    switchMap(wall => {
      if (!wall) {
        router.navigate(['/walls']);
        return EMPTY;
      }

      // Get wall items count  
      return wallItemService.getWallItems(wallId).pipe(
        map((items) => {
          const itemCount = items?.length || 0;
          
          // TODO: Replace with proper permission checking
          const canEdit = true; // authService.canEditWall(wall, user)
          const canAdmin = true; // authService.canAdminWall(wall, user)
          
          // Check if any object types have location fields
          const hasLocationEnabledTypes = (wall.objectTypes || []).some(ot => 
            ot.fields?.some(field => field.type === 'location') ||
            ot.displaySettings?.showOnMap === true
          );

          const contextData: WallContextData = {
            wall,
            itemCount,
            canEdit,
            canAdmin,
            hasLocationEnabledTypes
          };

          // Update navigation context before component loads
          navigationService.updateWallContext(wall, canEdit, canAdmin, itemCount);

          // Apply wall theme before component loads to prevent theme flashing
          if (wall.theme) {
            themeService.applyWallTheme(wall.theme);
          } else {
            // Apply default theme if no wall theme
            // TODO: Add applyAppTheme method to ThemeService or use default theme
            console.log('No wall theme, using default');
          }

          return contextData;
        })
      );
    }),
    catchError(error => {
      console.error('Error resolving wall context:', error);
      router.navigate(['/walls']);
      return EMPTY;
    })
  );
};