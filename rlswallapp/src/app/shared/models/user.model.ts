// Base permission flags using bitwise operations (following veteran app pattern)
export enum WallPermission {
  None = 0,
  View = 1,
  Edit = 2,
  Add = 4,
  Delete = 8,
  All = View | Edit | Add | Delete
}

export enum SystemPermission {
  None = 0,
  View = 1,
  Edit = 2,
  Add = 4,
  Delete = 8,
  Admin = 16,
  All = View | Edit | Add | Delete | Admin
}

export interface WallUserPermissions {
  // Wall-level permissions
  wallAccess: WallPermission;           // General wall access
  wallItems: WallPermission;            // Wall items management
  wallSettings: WallPermission;         // Wall configuration
  wallUsers: WallPermission;            // User management within wall
  objectTypes: WallPermission;          // Object type management
  
  // System-level permissions  
  system: SystemPermission;             // System administration
  
  // Resource-specific permissions
  ownItems: WallPermission;             // Items created by this user
  allItems: WallPermission;             // All items in wall
  
  // Advanced permissions
  dataExport: boolean;                  // Can export wall data
  dataImport: boolean;                  // Can import wall data
  analytics: boolean;                   // Can view analytics
}

export interface WallUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  profilePicture?: string;
  active: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  
  // Permissions - per wall
  wallPermissions: { [wallId: string]: WallUserPermissions };
  
  // Global system permissions
  systemPermissions: SystemPermission;
  
  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    emailNotifications: boolean;
  };
}

export interface WallUserInvite {
  id: string;
  wallId: string;
  email: string;
  permissions: WallUserPermissions;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptedAt?: Date;
}

export interface WallRole {
  id: string;
  wallId: string;
  name: string;
  description: string;
  permissions: WallUserPermissions;
  isDefault: boolean;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Result models for API responses
export interface WallUserResultModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  profilePicture?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  wallPermissions: { [wallId: string]: WallUserPermissionsModel };
  systemPermissions: number;
  preferences: any;
}

export interface WallUserPermissionsModel {
  wallAccess: number;
  wallItems: number;
  wallSettings: number;
  wallUsers: number;
  objectTypes: number;
  system: number;
  ownItems: number;
  allItems: number;
  dataExport: boolean;
  dataImport: boolean;
  analytics: boolean;
}

// User class with permission checking methods (following veteran app pattern)
export class WallUserEntity implements WallUser {
  id = '';
  email = '';
  firstName = '';
  lastName = '';
  displayName?: string;
  profilePicture?: string;
  active = false;
  createdAt = new Date();
  updatedAt = new Date();
  lastLoginAt?: Date;
  wallPermissions: { [wallId: string]: WallUserPermissions } = {};
  systemPermissions = SystemPermission.None;
  preferences = {
    theme: 'auto' as const,
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true
  };

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get displayNameOrFull(): string {
    return this.displayName || this.fullName;
  }

  // Create from API result
  static fromResult(result: WallUserResultModel): WallUserEntity {
    const user = new WallUserEntity();
    user.id = result.id;
    user.email = result.email;
    user.firstName = result.firstName;
    user.lastName = result.lastName;
    user.displayName = result.displayName;
    user.profilePicture = result.profilePicture;
    user.active = result.active;
    user.createdAt = new Date(result.createdAt);
    user.updatedAt = new Date(result.updatedAt);
    user.lastLoginAt = result.lastLoginAt ? new Date(result.lastLoginAt) : undefined;
    user.systemPermissions = result.systemPermissions;
    user.preferences = result.preferences;

    // Convert permissions models to permissions objects
    user.wallPermissions = {};
    Object.entries(result.wallPermissions).forEach(([wallId, perms]) => {
      user.wallPermissions[wallId] = WallUserEntity.convertPermissionsFromModel(perms);
    });

    return user;
  }

  private static convertPermissionsFromModel(model: WallUserPermissionsModel): WallUserPermissions {
    return {
      wallAccess: model.wallAccess,
      wallItems: model.wallItems,
      wallSettings: model.wallSettings,
      wallUsers: model.wallUsers,
      objectTypes: model.objectTypes,
      system: model.system,
      ownItems: model.ownItems,
      allItems: model.allItems,
      dataExport: model.dataExport,
      dataImport: model.dataImport,
      analytics: model.analytics
    };
  }

  // Core permission checking method (bitwise operations like veteran app)
  private hasPermission(permission: number, match: number): boolean {
    if (!this.active) return false;
    return (permission & match) === match;
  }

  private hasWallPermission(wallId: string, permissionType: keyof WallUserPermissions, match: number): boolean {
    const wallPerms = this.wallPermissions[wallId];
    if (!wallPerms) return false;
    
    const permission = wallPerms[permissionType] as number;
    return this.hasPermission(permission, match);
  }

  // System permissions
  canViewSystem(): boolean {
    return this.hasPermission(this.systemPermissions, SystemPermission.View);
  }

  canEditSystem(): boolean {
    return this.hasPermission(this.systemPermissions, SystemPermission.Edit);
  }

  canAdminSystem(): boolean {
    return this.hasPermission(this.systemPermissions, SystemPermission.Admin);
  }

  // Wall access permissions
  canAccessWall(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallAccess', WallPermission.View);
  }

  canEditWall(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallSettings', WallPermission.Edit);
  }

  canDeleteWall(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallSettings', WallPermission.Delete) || this.canAdminSystem();
  }

  // Wall items permissions
  canViewWallItems(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallItems', WallPermission.View) ||
           this.hasWallPermission(wallId, 'ownItems', WallPermission.View);
  }

  canAddWallItems(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallItems', WallPermission.Add) ||
           this.hasWallPermission(wallId, 'ownItems', WallPermission.Add);
  }

  canEditWallItems(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallItems', WallPermission.Edit);
  }

  canEditOwnItems(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'ownItems', WallPermission.Edit);
  }

  canDeleteWallItems(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallItems', WallPermission.Delete);
  }

  canDeleteOwnItems(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'ownItems', WallPermission.Delete);
  }

  // Object types permissions
  canViewObjectTypes(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'objectTypes', WallPermission.View) || this.canEditWall(wallId);
  }

  canEditObjectTypes(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'objectTypes', WallPermission.Edit);
  }

  canAddObjectTypes(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'objectTypes', WallPermission.Add);
  }

  canDeleteObjectTypes(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'objectTypes', WallPermission.Delete);
  }

  // User management permissions
  canViewWallUsers(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallUsers', WallPermission.View);
  }

  canInviteUsers(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallUsers', WallPermission.Add);
  }

  canEditWallUsers(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallUsers', WallPermission.Edit);
  }

  canRemoveWallUsers(wallId: string): boolean {
    return this.hasWallPermission(wallId, 'wallUsers', WallPermission.Delete);
  }

  // Data operations permissions
  canExportData(wallId: string): boolean {
    const wallPerms = this.wallPermissions[wallId];
    return wallPerms?.dataExport || false;
  }

  canImportData(wallId: string): boolean {
    const wallPerms = this.wallPermissions[wallId];
    return wallPerms?.dataImport || false;
  }

  canViewAnalytics(wallId: string): boolean {
    const wallPerms = this.wallPermissions[wallId];
    return wallPerms?.analytics || false;
  }

  // Item ownership checking
  canEditItem(wallId: string, item: { createdBy?: string }): boolean {
    if (this.canEditWallItems(wallId)) return true;
    if (item.createdBy === this.id && this.canEditOwnItems(wallId)) return true;
    return false;
  }

  canDeleteItem(wallId: string, item: { createdBy?: string }): boolean {
    if (this.canDeleteWallItems(wallId)) return true;
    if (item.createdBy === this.id && this.canDeleteOwnItems(wallId)) return true;
    return false;
  }

  // Helper method to get user's role level in a wall
  getWallRoleLevel(wallId: string): 'none' | 'viewer' | 'contributor' | 'moderator' | 'admin' {
    const perms = this.wallPermissions[wallId];
    if (!perms) return 'none';

    if (this.hasWallPermission(wallId, 'wallUsers', WallPermission.Edit)) return 'admin';
    if (this.hasWallPermission(wallId, 'wallItems', WallPermission.Delete)) return 'moderator';
    if (this.hasWallPermission(wallId, 'wallItems', WallPermission.Add)) return 'contributor';
    if (this.hasWallPermission(wallId, 'wallItems', WallPermission.View)) return 'viewer';
    
    return 'none';
  }

  // Get all walls this user has access to
  getAccessibleWallIds(): string[] {
    return Object.keys(this.wallPermissions).filter(wallId => this.canAccessWall(wallId));
  }
}