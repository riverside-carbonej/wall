export interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'longtext' | 'date' | 'number' | 'email' | 'url' | 'relationship' | 'location' | 'richtext' | 'file' | 'daterange' | 'multiselect' | 'numberrange' | 'color' | 'boolean';
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  // Enhanced field configuration
  relationshipConfig?: {
    targetObjectTypeId: string;
    relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
    allowMultiple: boolean;
  };
  multiselectConfig?: {
    options: string[];
    allowCustom: boolean;
  };
  fileConfig?: {
    allowedTypes: string[];
    maxSize: number; // in MB
    multiple: boolean;
  };
}

export interface RelationshipDefinition {
  id: string;
  name: string; // "served in", "deployed to", "awarded"
  description: string;
  fromObjectTypeId: string;
  toObjectTypeId: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  required: boolean;
  bidirectional: boolean; // Show relationship from both sides
  cascadeDelete: boolean; // Delete related items when parent is deleted
}

export interface WallObjectType {
  id: string;
  wallId: string; // Wall this object type belongs to
  name: string; // "Veteran", "Deployment", "Unit", "Award"
  description: string;
  icon: string; // Material Symbol name
  color: string; // Theme color for this object type
  fields: FieldDefinition[];
  relationships: RelationshipDefinition[];
  displaySettings: {
    cardLayout: 'compact' | 'detailed' | 'timeline';
    showOnMap: boolean;
    primaryField: string; // Field ID for card titles
    secondaryField?: string; // Field ID for card subtitles
    imageField?: string; // Field ID for card images
  };
  defaultImage?: {
    url: string;
    altText?: string;
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WallTheme {
  id: string;
  name: string;
  description?: string;
  mode?: 'light' | 'dark';
  
  // Core brand colors (required)
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor?: string;
  accentColor?: string;
  
  // Surface hierarchy colors
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  
  // Typography hierarchy colors
  titleColor?: string;
  bodyTextColor?: string;
  secondaryTextColor?: string;
  captionTextColor?: string;
  textColor?: string;  // General text color option
  
  // Semantic colors
  errorColor: string;
  warningColor: string;
  successColor: string;
  
  // Layout and appearance options
  cardStyle: 'minimal' | 'bordered' | 'elevated' | 'rounded';
  layout: 'grid' | 'list' | 'masonry' | 'timeline';
  spacing: 'compact' | 'comfortable' | 'spacious';
  cornerRadius: 'none' | 'small' | 'medium' | 'large' | 'extra-large';
  elevation: 'flat' | 'low' | 'medium' | 'high';
  
  // Typography options
  font: 'system' | 'serif' | 'mono' | 'custom';
  customFontFamily?: string;
  textScale: number;
  contrast: 'low' | 'normal' | 'high';
  
  // Advanced customization
  animations: boolean;
  customCss: string;
  gradient?: {
    enabled: boolean;
    direction: 'linear' | 'radial';
    colors: string[];
  };
  
  // Theme metadata
  isCustom?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  
  // Branding
  logoUrl?: string;
  organizationName?: string;
  organizationSubtitle?: string; // Configurable subtitle (defaults to "Riverside Local Schools")
  organizationLogoUrl?: string; // Configurable organization logo (defaults to Riverside logo)
  galleryImages?: WallItemImage[]; // Gallery images for the overview page
  
  // Enhanced object-based system (Phase 2)
  objectTypes: WallObjectType[];
  relationshipDefinitions?: RelationshipDefinition[]; // Relationship definitions for this wall
  wallTemplate?: string; // Optional template ID for predefined configurations
  
  // Theme system
  theme: WallTheme;
  
  // Permission system
  permissions: WallPermissions;
  
  // Visibility system
  visibility: WallVisibility;
  
  // Wall settings
  settings: {
    allowComments: boolean;
    allowRatings: boolean;
    enableNotifications: boolean;
    autoSave: boolean;
    maxItemsPerUser?: number;
    moderationRequired: boolean;
    inactivityTimeout: number; // in minutes, default 5
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  deletedAt?: Date; // Soft delete timestamp
  
  // Legacy fields (for backward compatibility during migration)
  fields?: FieldDefinition[]; // Will be migrated to objectTypes system
  ownerId?: string; // Will be moved to permissions.owner
  isPublic?: boolean; // Will be moved to visibility system
  sharedWith?: string[]; // Will be moved to permissions.editors
}

export interface WallItemImage {
  id: string;
  url: string;
  thumbnailUrl?: string; // Thumbnail URL for gallery previews
  fileName: string;
  filename?: string; // Legacy compatibility
  size: number; // in bytes
  mimeType: string;
  description?: string;
  caption?: string; // Legacy compatibility
  altText?: string; // Legacy compatibility
  isPrimary?: boolean; // Legacy compatibility
  uploadedAt: Date;
  uploadedBy?: string; // Legacy compatibility
  storagePath?: string; // Firebase Storage path for deletion
}

// Type alias for consistency with services
export type WallImage = WallItemImage;

export interface WallItem {
  id: string;
  wallId: string;
  objectTypeId: string; // Required for Phase 2 object types
  fieldData: { [fieldId: string]: any }; // Renamed from 'data' for clarity
  images?: WallItemImage[];
  primaryImageIndex?: number; // Index of primary image in images array
  coordinates?: { lat: number; lng: number; address?: string };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  
  // Legacy fields (for backward compatibility)
  data?: { [fieldId: string]: any }; // Will be migrated to fieldData
  primaryImageId?: string; // Legacy - will be migrated to primaryImageIndex
  fields?: any; // Will be migrated to objectTypeId system
}

export interface EnhancedWallItem extends WallItem {
  relationshipCount: number;
  relationships: any[]; // Array of ObjectRelationship objects
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
  role: 'user' | 'admin' | 'teacher';
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
    id: 'riverside-gold',
    name: 'Riverside Gold',
    description: 'Official Riverside school colors with warm gold accents',
    
    // Core brand colors
    primaryColor: '#d4af37',
    secondaryColor: '#8b7d3a',
    tertiaryColor: '#f4e4a6',
    
    // Surface hierarchy
    backgroundColor: '#fefefe',
    surfaceColor: '#ffffff',
    cardColor: '#ffffff',
    
    // Typography hierarchy
    titleColor: '#1a1a1a',
    bodyTextColor: '#2d2d2d',
    secondaryTextColor: '#6b6b6b',
    captionTextColor: '#8b7d3a',
    
    // Semantic colors
    errorColor: '#dc2626',
    warningColor: '#d97706',
    successColor: '#059669',
    
    // Layout options
    cardStyle: 'elevated',
    layout: 'grid',
    spacing: 'comfortable',
    cornerRadius: 'medium',
    elevation: 'medium',
    font: 'system',
    textScale: 1,
    contrast: 'normal',
    animations: true,
    customCss: '',
    
    isCustom: false
  },
  {
    id: 'clean-modern',
    name: 'Clean Modern',
    description: 'Minimalist design with crisp lines and spacious layout',
    
    // Core brand colors
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    tertiaryColor: '#e0e7ff',
    
    // Surface hierarchy
    backgroundColor: '#ffffff',
    surfaceColor: '#f9fafb',
    cardColor: '#ffffff',
    
    // Typography hierarchy
    titleColor: '#111827',
    bodyTextColor: '#374151',
    secondaryTextColor: '#6b7280',
    captionTextColor: '#9ca3af',
    
    // Semantic colors
    errorColor: '#ef4444',
    warningColor: '#f59e0b',
    successColor: '#10b981',
    
    // Layout options
    cardStyle: 'minimal',
    layout: 'grid',
    spacing: 'spacious',
    cornerRadius: 'small',
    elevation: 'low',
    font: 'system',
    textScale: 1,
    contrast: 'normal',
    animations: true,
    customCss: '',
    
    isCustom: false
  },
  {
    id: 'dark-professional',
    name: 'Dark Professional',
    description: 'Sophisticated dark theme for focused work environments',
    
    // Core brand colors
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#c4b5fd',
    
    // Surface hierarchy
    backgroundColor: '#0f0f23',
    surfaceColor: '#1e1e3f',
    cardColor: '#2a2a5a',
    
    // Typography hierarchy
    titleColor: '#f8fafc',
    bodyTextColor: '#e2e8f0',
    secondaryTextColor: '#cbd5e1',
    captionTextColor: '#94a3b8',
    
    // Semantic colors
    errorColor: '#f87171',
    warningColor: '#fbbf24',
    successColor: '#4ade80',
    
    // Layout options
    cardStyle: 'elevated',
    layout: 'grid',
    spacing: 'comfortable',
    cornerRadius: 'large',
    elevation: 'high',
    font: 'system',
    textScale: 1,
    contrast: 'normal',
    animations: true,
    customCss: '',
    
    isCustom: false
  },
  {
    id: 'warm-academic',
    name: 'Warm Academic',
    description: 'Scholarly theme with warm earth tones and serif typography',
    
    // Core brand colors
    primaryColor: '#92400e',
    secondaryColor: '#b45309',
    tertiaryColor: '#fed7aa',
    
    // Surface hierarchy
    backgroundColor: '#fffbeb',
    surfaceColor: '#fef3c7',
    cardColor: '#ffffff',
    
    // Typography hierarchy
    titleColor: '#451a03',
    bodyTextColor: '#78350f',
    secondaryTextColor: '#92400e',
    captionTextColor: '#b45309',
    
    // Semantic colors
    errorColor: '#dc2626',
    warningColor: '#d97706',
    successColor: '#059669',
    
    // Layout options
    cardStyle: 'bordered',
    layout: 'list',
    spacing: 'compact',
    cornerRadius: 'small',
    elevation: 'low',
    font: 'serif',
    textScale: 1,
    contrast: 'normal',
    animations: true,
    customCss: '',
    
    isCustom: false
  },
  {
    id: 'vibrant-creative',
    name: 'Vibrant Creative',
    description: 'Energetic theme with bold colors for creative projects',
    
    // Core brand colors
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#06b6d4',
    
    // Surface hierarchy
    backgroundColor: '#fdf2f8',
    surfaceColor: '#ffffff',
    cardColor: '#fef7ff',
    
    // Typography hierarchy
    titleColor: '#831843',
    bodyTextColor: '#be185d',
    secondaryTextColor: '#db2777',
    captionTextColor: '#ec4899',
    
    // Semantic colors
    errorColor: '#ef4444',
    warningColor: '#f59e0b',
    successColor: '#10b981',
    
    // Layout options
    cardStyle: 'rounded',
    layout: 'masonry',
    spacing: 'comfortable',
    cornerRadius: 'large',
    elevation: 'medium',
    font: 'system',
    textScale: 1,
    contrast: 'normal',
    animations: true,
    customCss: '',
    
    gradient: {
      enabled: true,
      direction: 'linear',
      colors: ['#ec4899', '#8b5cf6']
    },
    
    isCustom: false
  }
];