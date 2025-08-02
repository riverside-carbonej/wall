import { Injectable } from '@angular/core';
import { Observable, map, switchMap, of, BehaviorSubject, combineLatest } from 'rxjs';
import { EntityService } from './entity.service';
import { 
  WallUser, 
  WallUserEntity, 
  WallUserResultModel, 
  WallUserPermissions, 
  WallUserInvite, 
  WallRole, 
  WallPermission, 
  SystemPermission 
} from '../models/user.model';

export interface UserManagementOptions {
  includeInactiveUsers?: boolean;
  roleFilter?: string[];
  permissionLevel?: 'viewer' | 'contributor' | 'moderator' | 'admin';
}

export interface UserSearchOptions {
  searchTerm?: string;
  wallId?: string;
  activeOnly?: boolean;
  sortBy?: 'name' | 'email' | 'lastLogin' | 'role';
  sortDirection?: 'asc' | 'desc';
}

export interface InviteUserRequest {
  wallId: string;
  email: string;
  permissions: WallUserPermissions;
  roleId?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly USERS_COLLECTION = 'users';
  private readonly INVITES_COLLECTION = 'user_invites';
  private readonly ROLES_COLLECTION = 'wall_roles';
  
  private currentUserSubject = new BehaviorSubject<WallUserEntity | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private entityService: EntityService) {}

  // Current User Management
  setCurrentUser(user: WallUserEntity | null): void {
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): WallUserEntity | null {
    return this.currentUserSubject.value;
  }

  loadCurrentUser(userId: string): Observable<WallUserEntity | null> {
    return this.getUserById(userId).pipe(
      map(user => {
        this.setCurrentUser(user);
        return user;
      })
    );
  }

  // User CRUD Operations
  getUserById(id: string): Observable<WallUserEntity | null> {
    return this.entityService.getEntityById<WallUserResultModel>(this.USERS_COLLECTION, id).pipe(
      map(result => result ? WallUserEntity.fromResult(result) : null)
    );
  }

  getUserByEmail(email: string): Observable<WallUserEntity | null> {
    return this.entityService.getEntities<WallUserResultModel>(this.USERS_COLLECTION, {
      filters: [{ field: 'email', operator: '==', value: email }],
      limitCount: 1
    }).pipe(
      map(results => results.length > 0 ? WallUserEntity.fromResult(results[0]) : null)
    );
  }

  getAllUsers(options: UserSearchOptions = {}): Observable<WallUserEntity[]> {
    const queryOptions: any = {
      orderByField: options.sortBy || 'firstName',
      orderDirection: options.sortDirection || 'asc'
    };

    // Add filters
    const filters: any[] = [];
    if (options.activeOnly !== false) {
      filters.push({ field: 'active', operator: '==', value: true });
    }
    if (filters.length > 0) {
      queryOptions.filters = filters;
    }

    return this.entityService.getEntities<WallUserResultModel>(this.USERS_COLLECTION, queryOptions).pipe(
      map(results => results.map(result => WallUserEntity.fromResult(result))),
      map(users => {
        // Apply client-side filtering for complex criteria
        let filtered = users;
        
        if (options.searchTerm) {
          const searchLower = options.searchTerm.toLowerCase();
          filtered = filtered.filter(user => 
            user.firstName.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
          );
        }

        if (options.wallId) {
          filtered = filtered.filter(user => user.canAccessWall(options.wallId!));
        }

        return filtered;
      })
    );
  }

  getWallUsers(wallId: string, options: UserManagementOptions = {}): Observable<WallUserEntity[]> {
    return this.getAllUsers({ activeOnly: !options.includeInactiveUsers }).pipe(
      map(users => {
        let filtered = users.filter(user => user.canAccessWall(wallId));

        if (options.permissionLevel) {
          filtered = filtered.filter(user => {
            const roleLevel = user.getWallRoleLevel(wallId);
            switch (options.permissionLevel) {
              case 'viewer': return ['viewer', 'contributor', 'moderator', 'admin'].includes(roleLevel);
              case 'contributor': return ['contributor', 'moderator', 'admin'].includes(roleLevel);
              case 'moderator': return ['moderator', 'admin'].includes(roleLevel);
              case 'admin': return roleLevel === 'admin';
              default: return true;
            }
          });
        }

        return filtered;
      })
    );
  }

  createUser(user: Omit<WallUser, 'id'>): Observable<string> {
    const userData = {
      ...user,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return this.entityService.createEntity<WallUser>(this.USERS_COLLECTION, userData);
  }

  updateUser(userId: string, updates: Partial<WallUser>): Observable<void> {
    return this.entityService.updateEntity<WallUser>(this.USERS_COLLECTION, userId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  updateUserPermissions(userId: string, wallId: string, permissions: WallUserPermissions): Observable<void> {
    return this.getUserById(userId).pipe(
      switchMap(user => {
        if (!user) throw new Error('User not found');
        
        const updatedPermissions = {
          ...user.wallPermissions,
          [wallId]: permissions
        };
        
        return this.updateUser(userId, { wallPermissions: updatedPermissions });
      })
    );
  }

  activateUser(userId: string): Observable<void> {
    return this.updateUser(userId, { active: true });
  }

  deactivateUser(userId: string): Observable<void> {
    return this.updateUser(userId, { active: false });
  }

  // Permission Management
  hasPermission(userId: string, wallId: string, permissionCheck: (user: WallUserEntity) => boolean): Observable<boolean> {
    return this.getUserById(userId).pipe(
      map(user => user ? permissionCheck(user) : false)
    );
  }

  checkWallAccess(userId: string, wallId: string): Observable<boolean> {
    return this.hasPermission(userId, wallId, user => user.canAccessWall(wallId));
  }

  checkCanEditItems(userId: string, wallId: string): Observable<boolean> {
    return this.hasPermission(userId, wallId, user => user.canEditWallItems(wallId));
  }

  checkCanManageUsers(userId: string, wallId: string): Observable<boolean> {
    return this.hasPermission(userId, wallId, user => user.canEditWallUsers(wallId));
  }

  // User Invitations
  inviteUser(request: InviteUserRequest): Observable<string> {
    const invite: Omit<WallUserInvite, 'id'> = {
      wallId: request.wallId,
      email: request.email.toLowerCase(),
      permissions: request.permissions,
      invitedBy: this.getCurrentUser()?.id || '',
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending'
    };

    return this.entityService.createEntity<WallUserInvite>(this.INVITES_COLLECTION, invite);
  }

  getWallInvites(wallId: string): Observable<WallUserInvite[]> {
    return this.entityService.getEntitiesByWallId<WallUserInvite>(this.INVITES_COLLECTION, wallId, {
      orderByField: 'invitedAt',
      orderDirection: 'desc'
    });
  }

  getUserInvites(email: string): Observable<WallUserInvite[]> {
    return this.entityService.getEntities<WallUserInvite>(this.INVITES_COLLECTION, {
      filters: [
        { field: 'email', operator: '==', value: email.toLowerCase() },
        { field: 'status', operator: '==', value: 'pending' }
      ],
      orderByField: 'invitedAt',
      orderDirection: 'desc'
    });
  }

  acceptInvite(inviteId: string, userId: string): Observable<void> {
    return this.entityService.getEntityById<WallUserInvite>(this.INVITES_COLLECTION, inviteId).pipe(
      switchMap(invite => {
        if (!invite || invite.status !== 'pending') {
          throw new Error('Invalid or expired invite');
        }

        if (new Date() > invite.expiresAt) {
          throw new Error('Invite has expired');
        }

        // Update user permissions and mark invite as accepted
        return combineLatest([
          this.updateUserPermissions(userId, invite.wallId, invite.permissions),
          this.entityService.updateEntity(this.INVITES_COLLECTION, inviteId, {
            status: 'accepted',
            acceptedAt: new Date()
          })
        ]).pipe(map(() => {}));
      })
    );
  }

  revokeInvite(inviteId: string): Observable<void> {
    return this.entityService.updateEntity(this.INVITES_COLLECTION, inviteId, {
      status: 'revoked'
    });
  }

  // Role Management
  createRole(role: Omit<WallRole, 'id'>): Observable<string> {
    const roleData = {
      ...role,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return this.entityService.createEntity<WallRole>(this.ROLES_COLLECTION, roleData);
  }

  getWallRoles(wallId: string): Observable<WallRole[]> {
    return this.entityService.getEntitiesByWallId<WallRole>(this.ROLES_COLLECTION, wallId, {
      orderByField: 'name',
      orderDirection: 'asc'
    });
  }

  updateRole(roleId: string, updates: Partial<WallRole>): Observable<void> {
    return this.entityService.updateEntity<WallRole>(this.ROLES_COLLECTION, roleId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  deleteRole(roleId: string): Observable<void> {
    // TODO: Check if any users are assigned this role
    return this.entityService.deleteEntity(this.ROLES_COLLECTION, roleId);
  }

  assignRoleToUser(userId: string, roleId: string): Observable<void> {
    return combineLatest([
      this.getUserById(userId),
      this.entityService.getEntityById<WallRole>(this.ROLES_COLLECTION, roleId)
    ]).pipe(
      switchMap(([user, role]) => {
        if (!user || !role) throw new Error('User or role not found');
        
        return this.updateUserPermissions(userId, role.wallId, role.permissions);
      })
    );
  }

  // Bulk Operations
  bulkUpdatePermissions(userIds: string[], wallId: string, permissions: WallUserPermissions): Observable<void[]> {
    const updatePromises = userIds.map(userId => 
      this.updateUserPermissions(userId, wallId, permissions)
    );
    
    return combineLatest(updatePromises);
  }

  bulkInviteUsers(requests: InviteUserRequest[]): Observable<string[]> {
    const inviteObservables = requests.map(request => this.inviteUser(request));
    return combineLatest(inviteObservables);
  }

  // Utility Methods
  getDefaultPermissions(roleLevel: 'viewer' | 'contributor' | 'moderator' | 'admin'): WallUserPermissions {
    const basePermissions: WallUserPermissions = {
      wallAccess: WallPermission.None,
      wallItems: WallPermission.None,
      wallSettings: WallPermission.None,
      wallUsers: WallPermission.None,
      objectTypes: WallPermission.None,
      system: SystemPermission.None,
      ownItems: WallPermission.None,
      allItems: WallPermission.None,
      dataExport: false,
      dataImport: false,
      analytics: false
    };

    switch (roleLevel) {
      case 'viewer':
        return {
          ...basePermissions,
          wallAccess: WallPermission.View,
          wallItems: WallPermission.View,
          ownItems: WallPermission.View
        };
      
      case 'contributor':
        return {
          ...basePermissions,
          wallAccess: WallPermission.View,
          wallItems: WallPermission.View | WallPermission.Add,
          ownItems: WallPermission.All
        };
      
      case 'moderator':
        return {
          ...basePermissions,
          wallAccess: WallPermission.View,
          wallItems: WallPermission.All,
          allItems: WallPermission.All,
          dataExport: true
        };
      
      case 'admin':
        return {
          wallAccess: WallPermission.All,
          wallItems: WallPermission.All,
          wallSettings: WallPermission.All,
          wallUsers: WallPermission.All,
          objectTypes: WallPermission.All,
          system: SystemPermission.View,
          ownItems: WallPermission.All,
          allItems: WallPermission.All,
          dataExport: true,
          dataImport: true,
          analytics: true
        };
      
      default:
        return basePermissions;
    }
  }

  getUserStats(wallId?: string): Observable<{
    totalUsers: number;
    activeUsers: number;
    pendingInvites: number;
    roleDistribution: { [role: string]: number };
  }> {
    const usersQuery = wallId 
      ? this.getWallUsers(wallId)
      : this.getAllUsers();

    const invitesQuery = wallId
      ? this.getWallInvites(wallId)
      : this.entityService.getEntities<WallUserInvite>(this.INVITES_COLLECTION, {
          filters: [{ field: 'status', operator: '==', value: 'pending' }]
        });

    return combineLatest([usersQuery, invitesQuery]).pipe(
      map(([users, invites]) => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.active).length;
        const pendingInvites = invites.filter(i => i.status === 'pending').length;
        
        const roleDistribution: { [role: string]: number } = {};
        users.forEach(user => {
          const role = wallId ? user.getWallRoleLevel(wallId) : 'system';
          roleDistribution[role] = (roleDistribution[role] || 0) + 1;
        });

        return { totalUsers, activeUsers, pendingInvites, roleDistribution };
      })
    );
  }
}