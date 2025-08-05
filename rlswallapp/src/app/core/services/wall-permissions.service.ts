import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Wall, WallPermissionHelper, UserProfile } from '../../shared/models/wall.model';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WallPermissionsService {
  constructor(private authService: AuthService) {}

  /**
   * Check if current user can edit a wall (UI helper only - server enforces real security)
   */
  canEditWall(wall: Wall): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        
        // Convert AppUser to UserProfile for compatibility
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || undefined,
          department: undefined, // TODO: Add department to auth service
          role: 'user', // TODO: Add role management
          createdAt: new Date(),
          lastLoginAt: new Date()
        };
        
        return WallPermissionHelper.canEditWall(wall, userProfile);
      })
    );
  }

  /**
   * Check if current user can view a wall (UI helper only - server enforces real security)
   */
  canViewWall(wall: Wall): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          // Anonymous users can only view published public walls
          return WallPermissionHelper.canViewWall(wall, undefined);
        }
        
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || undefined,
          department: undefined,
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date()
        };
        
        return WallPermissionHelper.canViewWall(wall, userProfile);
      })
    );
  }

  /**
   * Check if current user is the owner of a wall
   */
  isWallOwner(wall: Wall): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => user?.uid === wall.permissions.owner)
    );
  }

  /**
   * Check if current user can admin a wall (owner or manager)
   */
  canAdminWall(wall: Wall): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        
        // Check if user is owner
        if (user.uid === wall.permissions.owner) {
          return true;
        }
        
        // Check if user is a manager
        if (wall.permissions.managers && wall.permissions.managers.includes(user.uid)) {
          return true;
        }
        
        return false;
      })
    );
  }

  /**
   * Get wall status for UI display
   */
  getWallStatus(wall: Wall): { text: string; icon: string; color: string } {
    const text = WallPermissionHelper.getWallStatusText(wall);
    const icon = WallPermissionHelper.getWallStatusIcon(wall);
    
    let color = 'gray';
    if (wall.visibility.isPublished) {
      color = wall.visibility.requiresLogin ? 'blue' : 'green';
    }
    
    return { text, icon, color };
  }

  /**
   * Create default permissions for a new wall
   */
  createDefaultPermissions(ownerId: string, department?: string): Wall['permissions'] {
    return {
      owner: ownerId,
      editors: [],
      managers: [],
      viewers: [],
      department: department,
      allowDepartmentEdit: false
    };
  }

  /**
   * Create default visibility for a new wall (draft)
   */
  createDefaultVisibility(): Wall['visibility'] {
    return {
      isPublished: false,
      requiresLogin: true // Default to login-required when published
    };
  }

  /**
   * Publish a wall with specified visibility settings
   */
  getPublishSettings(isPublic: boolean): Partial<Wall['visibility']> {
    return {
      isPublished: true,
      requiresLogin: !isPublic,
      publishedAt: new Date()
      // publishedBy will be set by the calling service with current user ID
    };
  }

  /**
   * Unpublish a wall (make it draft)
   */
  getUnpublishSettings(): Partial<Wall['visibility']> {
    return {
      isPublished: false,
      publishedAt: undefined,
      publishedBy: undefined
    };
  }

  /**
   * Add an editor to a wall (returns updated permissions)
   */
  addEditor(wall: Wall, editorId: string): Wall['permissions'] {
    if (wall.permissions.editors.includes(editorId)) {
      return wall.permissions; // Already an editor
    }
    
    return {
      ...wall.permissions,
      editors: [...wall.permissions.editors, editorId]
    };
  }

  /**
   * Remove an editor from a wall (returns updated permissions)
   */
  removeEditor(wall: Wall, editorId: string): Wall['permissions'] {
    return {
      ...wall.permissions,
      editors: wall.permissions.editors.filter(id => id !== editorId)
    };
  }

  /**
   * Toggle department access for a wall (returns updated permissions)
   */
  toggleDepartmentAccess(wall: Wall, allow: boolean): Wall['permissions'] {
    return {
      ...wall.permissions,
      allowDepartmentEdit: allow
    };
  }

  /**
   * Check if a wall can be shared publicly (UI validation)
   */
  canSharePublicly(wall: Wall): boolean {
    // Add any business rules for public sharing
    // For example: certain departments, content types, etc.
    return true; // For now, all walls can be shared publicly
  }

  /**
   * Get sharing URL for a wall
   */
  getSharingUrl(wall: Wall): string {
    const baseUrl = window.location.origin;
    
    if (!wall.visibility.isPublished) {
      return `${baseUrl}/walls/${wall.id}/edit`; // Edit URL for drafts
    }
    
    // URL stays the same regardless of visibility settings
    // Firebase security rules enforce access control based on wall settings
    return `${baseUrl}/walls/${wall.id}`;
  }

  /**
   * Get appropriate sharing message for a wall
   */
  getSharingMessage(wall: Wall): string {
    const url = this.getSharingUrl(wall);
    
    if (!wall.visibility.isPublished) {
      return `Collaborate on "${wall.name}": ${url}`;
    }
    
    if (wall.visibility.requiresLogin) {
      return `Check out "${wall.name}" (Riverside login required): ${url}`;
    }
    
    return `Check out "${wall.name}": ${url}`;
  }
}