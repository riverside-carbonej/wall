# Wall Permissions System

## Overview
The Riverside Wall App implements a comprehensive permissions system to control who can edit walls and how walls can be viewed when published.

## User Roles

### Authenticated Users
- Any user logged in with a Riverside Schools Google account (`@riverside.k12.ca.us`)
- Can view published walls (both public and login-required)
- Can edit walls they have access to

### Anonymous Users
- Users not logged in
- Can only view published walls marked as "public"
- Cannot edit any walls

## Wall Access Control

### Edit Permissions
Users can edit a wall if they meet ANY of the following criteria:

1. **Wall Owner** - User who created the wall
2. **Explicit Editor** - User added to the wall's editor list
3. **Department Access** - User belongs to the same department as the wall
4. **Admin Role** - User has admin privileges (future enhancement)

### Implementation Strategy
```typescript
interface WallPermissions {
  owner: string;           // User ID of wall creator
  editors: string[];       // Array of user IDs with edit access
  department?: string;     // Department name for department-wide access
  allowDepartmentEdit: boolean; // Enable/disable department editing
}

// Check edit permission
canEditWall(wall: Wall, user: User): boolean {
  return wall.permissions.owner === user.uid ||
         wall.permissions.editors.includes(user.uid) ||
         (wall.permissions.allowDepartmentEdit && 
          user.department === wall.permissions.department);
}
```

## Wall Visibility Options

### Publishing States

#### 1. Draft (Unpublished)
- Only users with edit permissions can view
- Not visible to any other users
- Can be worked on collaboratively by editors

#### 2. Published - Public
- Visible to anyone (logged in or anonymous)
- Read-only for non-editors
- Accessible via direct link without login

#### 3. Published - Login Required
- Visible only to authenticated Riverside users
- Read-only for non-editors
- Requires Google login to view

### Visibility Settings
```typescript
interface WallVisibility {
  isPublished: boolean;
  requiresLogin: boolean;  // true = login required, false = public
  publishedAt?: Date;
  publishedBy?: string;    // User ID who published
}
```

## Database Structure

### Firestore Collections

#### Walls Collection
```typescript
interface Wall {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Permissions
  permissions: {
    owner: string;
    editors: string[];
    department?: string;
    allowDepartmentEdit: boolean;
  };
  
  // Visibility
  visibility: {
    isPublished: boolean;
    requiresLogin: boolean;
    publishedAt?: Date;
    publishedBy?: string;
  };
  
  // Content
  items: WallItem[];
}
```

#### Users Collection (Future Enhancement)
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  department?: string;
  role: 'user' | 'admin';
  createdAt: Date;
}
```

## Security Rules

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Walls collection
    match /walls/{wallId} {
      // Read access
      allow read: if 
        // Draft walls - only editors
        (!resource.data.visibility.isPublished && 
         canEditWall(resource.data, request.auth)) ||
        // Published public walls - anyone
        (resource.data.visibility.isPublished && 
         !resource.data.visibility.requiresLogin) ||
        // Published login-required walls - authenticated users
        (resource.data.visibility.isPublished && 
         resource.data.visibility.requiresLogin && 
         request.auth != null);
      
      // Write access - only editors
      allow write: if canEditWall(resource.data, request.auth);
    }
  }
  
  function canEditWall(wall, auth) {
    return auth != null && (
      wall.permissions.owner == auth.uid ||
      auth.uid in wall.permissions.editors ||
      (wall.permissions.allowDepartmentEdit && 
       auth.token.department == wall.permissions.department)
    );
  }
}
```

## User Interface Considerations

### Wall List View
- Show different indicators for wall states:
  - 🔒 Draft (only visible to editors)
  - 🌐 Published Public
  - 👥 Published Login-Required
  - ✏️ Can Edit indicator

### Wall Editor
- Permission management UI for wall owners
- Add/remove editors functionality
- Department access toggle
- Publish/unpublish controls

### Wall Viewer
- Show edit button only for authorized users
- Display publication status
- Share links (different for public vs login-required)

## Implementation Phases

### Phase 1: Basic Permissions
- Owner-based editing
- Manual editor management
- Simple public/private publishing

### Phase 2: Department Integration
- User department assignment
- Department-based access control
- Bulk permission management

### Phase 3: Advanced Features
- Role-based permissions (admin, teacher, etc.)
- Time-based access (seasonal walls)
- Approval workflows for publishing

## Security Considerations

1. **Client-side validation** - UI convenience only
2. **Server-side enforcement** - Firestore security rules
3. **Authentication required** - All write operations
4. **Audit logging** - Track permission changes (future)
5. **Data privacy** - No sensitive content in walls