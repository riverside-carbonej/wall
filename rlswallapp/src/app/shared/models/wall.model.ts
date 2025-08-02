export interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'longtext' | 'date' | 'number' | 'email' | 'url';
  required: boolean;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface WallTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  cardStyle: 'minimal' | 'bordered' | 'elevated' | 'rounded';
  layout: 'grid' | 'list' | 'masonry' | 'timeline';
  spacing: 'compact' | 'comfortable' | 'spacious';
  font: 'system' | 'serif' | 'mono' | 'custom';
  customCSS?: string;
}

export interface WallPermissions {
  owner: string;           // User ID of wall creator
  editors: string[];       // Array of user IDs with edit access
  department?: string;     // Department name for department-wide access
  allowDepartmentEdit: boolean; // Enable/disable department editing
}

export interface WallVisibility {
  isPublished: boolean;     // Is wall published?
  requiresLogin: boolean;   // Requires authentication to view?
  publishedAt?: Date;       // When was it published?
  publishedBy?: string;     // Who published it?
  scheduledUnpublish?: Date; // Auto-unpublish date (future feature)
}

export interface Wall {
  id: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
  theme: WallTheme;
  createdAt: Date;
  updatedAt: Date;
  
  // New permission system
  permissions: WallPermissions;
  
  // New visibility system
  visibility: WallVisibility;
  
  // Legacy fields (for backward compatibility during migration)
  ownerId?: string; // Will be moved to permissions.owner
  isPublic?: boolean; // Will be moved to visibility system
  sharedWith?: string[]; // Will be moved to permissions.editors
}

export interface WallItem {
  id: string;
  wallId: string;
  data: { [fieldId: string]: any };
  createdAt: Date;
  updatedAt: Date;
}

export interface WallViewMode {
  mode: 'preview' | 'edit';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  department?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date;
}

// Helper functions for wall permissions
export class WallPermissionHelper {
  static canEditWall(wall: Wall, user: UserProfile): boolean {
    if (!user) return false;
    
    return (
      wall.permissions.owner === user.uid ||
      wall.permissions.editors.includes(user.uid) ||
      (wall.permissions.allowDepartmentEdit && 
       user.department && 
       wall.permissions.department === user.department) ||
      user.role === 'admin'
    );
  }
  
  static canViewWall(wall: Wall, user?: UserProfile): boolean {
    // Draft walls - only editors can view
    if (!wall.visibility.isPublished) {
      return user ? this.canEditWall(wall, user) : false;
    }
    
    // Published public walls - anyone can view
    if (!wall.visibility.requiresLogin) {
      return true;
    }
    
    // Published login-required walls - authenticated users only
    return !!user;
  }
  
  static getWallStatusText(wall: Wall): string {
    if (!wall.visibility.isPublished) {
      return 'Draft';
    }
    
    return wall.visibility.requiresLogin 
      ? 'Published (Login Required)' 
      : 'Published (Public)';
  }
  
  static getWallStatusIcon(wall: Wall): string {
    if (!wall.visibility.isPublished) {
      return '🔒';
    }
    
    return wall.visibility.requiresLogin ? '👥' : '🌐';
  }
}

export const DEFAULT_THEMES: WallTheme[] = [
  {
    id: 'clean',
    name: 'Clean',
    primaryColor: '#3b82f6',
    secondaryColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    cardStyle: 'minimal',
    layout: 'grid',
    spacing: 'comfortable',
    font: 'system'
  },
  {
    id: 'dark',
    name: 'Dark',
    primaryColor: '#6366f1',
    secondaryColor: '#374151',
    backgroundColor: '#111827',
    textColor: '#f9fafb',
    cardStyle: 'elevated',
    layout: 'grid',
    spacing: 'comfortable',
    font: 'system'
  },
  {
    id: 'professional',
    name: 'Professional',
    primaryColor: '#059669',
    secondaryColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    textColor: '#1f2937',
    cardStyle: 'bordered',
    layout: 'list',
    spacing: 'compact',
    font: 'serif'
  }
];