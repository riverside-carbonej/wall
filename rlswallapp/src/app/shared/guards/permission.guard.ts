import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, map, switchMap } from 'rxjs';
import { UserService } from '../services/user.service';
import { WallUserEntity } from '../models/user.model';

export interface PermissionConfig {
  wallPermission?: (user: WallUserEntity, wallId: string) => boolean;
  systemPermission?: (user: WallUserEntity) => boolean;
  requiresAuth?: boolean;
  redirectTo?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate, CanActivateChild {

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkPermissions(route, state);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkPermissions(childRoute, state);
  }

  private checkPermissions(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const config = route.data['permissions'] as PermissionConfig;
    const currentUser = this.userService.getCurrentUser();

    // If no permission config, allow access
    if (!config) {
      return of(true);
    }

    // Check if authentication is required
    if (config.requiresAuth !== false && !currentUser) {
      this.handleUnauthorized(config, state.url);
      return of(false);
    }

    // If no user but auth not required, allow access
    if (!currentUser) {
      return of(true);
    }

    // Check if user is active
    if (!currentUser.active) {
      this.handleUnauthorized(config, state.url, 'Your account is inactive. Please contact an administrator.');
      return of(false);
    }

    // System-level permission check
    if (config.systemPermission) {
      if (!config.systemPermission(currentUser)) {
        this.handleUnauthorized(config, state.url, 'You do not have sufficient system permissions.');
        return of(false);
      }
    }

    // Wall-level permission check
    if (config.wallPermission) {
      const wallId = route.params['wallId'] || route.parent?.params['wallId'];
      
      if (!wallId) {
        console.error('Wall permission check requires wallId parameter in route');
        this.handleUnauthorized(config, state.url, 'Wall ID not found in route.');
        return of(false);
      }

      if (!config.wallPermission(currentUser, wallId)) {
        this.handleUnauthorized(config, state.url, 'You do not have permission to access this wall resource.');
        return of(false);
      }
    }

    return of(true);
  }

  private handleUnauthorized(config: PermissionConfig, attemptedUrl: string, customMessage?: string): void {
    const message = customMessage || config.errorMessage || 'Access denied';
    
    // TODO: Show error message to user (toast, snackbar, etc.)
    console.warn('Access denied:', message);

    // Redirect to specified route or default
    const redirectTo = config.redirectTo || '/';
    this.router.navigate([redirectTo], { 
      queryParams: { 
        returnUrl: attemptedUrl,
        error: message 
      }
    });
  }
}

// Permission factory functions for common use cases
export class PermissionFactories {
  
  // Wall access permissions
  static canAccessWall(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canAccessWall(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have access to this wall.'
    };
  }

  static canEditWall(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canEditWall(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to edit this wall.'
    };
  }

  // Wall items permissions
  static canViewWallItems(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canViewWallItems(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to view items in this wall.'
    };
  }

  static canAddWallItems(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canAddWallItems(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to add items to this wall.'
    };
  }

  static canEditWallItems(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canEditWallItems(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to edit items in this wall.'
    };
  }

  static canDeleteWallItems(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canDeleteWallItems(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to delete items in this wall.'
    };
  }

  // Object type permissions
  static canManageObjectTypes(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canEditObjectTypes(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to manage object types in this wall.'
    };
  }

  // User management permissions
  static canManageUsers(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canEditWallUsers(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to manage users in this wall.'
    };
  }

  static canInviteUsers(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canInviteUsers(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to invite users to this wall.'
    };
  }

  // Data operations permissions
  static canExportData(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canExportData(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to export data from this wall.'
    };
  }

  static canImportData(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canImportData(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to import data to this wall.'
    };
  }

  static canViewAnalytics(): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: (user: WallUserEntity, wallId: string) => user.canViewAnalytics(wallId),
      redirectTo: '/walls',
      errorMessage: 'You do not have permission to view analytics for this wall.'
    };
  }

  // System permissions
  static canAccessAdmin(): PermissionConfig {
    return {
      requiresAuth: true,
      systemPermission: (user: WallUserEntity) => user.canViewSystem(),
      redirectTo: '/',
      errorMessage: 'You do not have system administration permissions.'
    };
  }

  static canManageSystem(): PermissionConfig {
    return {
      requiresAuth: true,
      systemPermission: (user: WallUserEntity) => user.canAdminSystem(),
      redirectTo: '/',
      errorMessage: 'You do not have system management permissions.'
    };
  }

  // Authentication only
  static requiresAuth(): PermissionConfig {
    return {
      requiresAuth: true,
      redirectTo: '/login',
      errorMessage: 'You must be logged in to access this page.'
    };
  }

  // Custom permission check
  static custom(
    check: (user: WallUserEntity, wallId?: string) => boolean,
    options: Partial<PermissionConfig> = {}
  ): PermissionConfig {
    return {
      requiresAuth: true,
      wallPermission: check,
      redirectTo: '/walls',
      errorMessage: 'Access denied.',
      ...options
    };
  }
}