# Technical Architecture

## System Overview

The Riverside Wall App is built as a modern single-page application (SPA) using Angular and Firebase, designed for real-time collaboration and scalability.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Angular App   │───▶│   Firebase      │───▶│   Google Cloud  │
│                 │    │   Services      │    │   Infrastructure│
│  - Components   │    │                 │    │                 │
│  - Services     │    │  - Auth         │    │  - OAuth        │
│  - Guards       │    │  - Firestore    │    │  - Storage      │
│  - Routing      │    │  - Hosting      │    │  - Functions    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture

### Angular 18 Structure
```
src/app/
├── auth/                       # Authentication module
│   ├── components/
│   │   └── login.component.ts
│   └── models/
├── core/                       # Core application services
│   ├── guards/
│   │   └── auth.guard.ts       # Route protection
│   └── services/
│       ├── auth.service.ts     # Authentication logic
│       └── wall-permissions.service.ts
├── features/                   # Feature modules
│   ├── walls/
│   │   ├── components/
│   │   │   ├── wall-list/
│   │   │   ├── wall-form/
│   │   │   └── wall-viewer/
│   │   └── services/
│   │       └── wall.service.ts
│   └── wall-items/
│       ├── components/
│       └── services/
└── shared/                     # Shared components and utilities
    ├── components/
    │   ├── user-avatar.component.ts
    │   └── firebase-test.component.ts
    ├── models/
    │   └── wall.model.ts
    └── services/
        └── appbase.service.ts
```

### Design Patterns

#### Reactive Programming
- RxJS observables for state management
- Reactive forms for user input
- Observable streams for real-time data

#### Dependency Injection
- Angular's built-in DI system
- Service-based architecture
- Proper injection contexts for Firebase

#### Component Architecture
- Standalone components (Angular 18)
- Smart/container vs. dumb/presentational components
- Reusable component library

## Backend Architecture

### Firebase Services

#### Authentication
```typescript
// Google OAuth with domain restrictions
GoogleAuthProvider + @riversideschools.net domain
│
├── Authentication state management
├── Route guards for protected pages
└── User profile management
```

#### Firestore Database
```
riverside-wall-app (database)
├── walls/                      # Wall documents
│   ├── {wallId}/
│   │   ├── id: string
│   │   ├── name: string
│   │   ├── description: string
│   │   ├── ownerId: string     # User email
│   │   ├── permissions: WallPermissions
│   │   ├── visibility: WallVisibility
│   │   ├── fields: FieldDefinition[]
│   │   ├── theme: WallTheme
│   │   ├── createdAt: Timestamp
│   │   └── updatedAt: Timestamp
│
├── wall_items/                 # Wall content items
│   ├── {itemId}/
│   │   ├── id: string
│   │   ├── wallId: string      # Reference to parent wall
│   │   ├── data: object        # Key-value pairs for field data
│   │   ├── createdAt: Timestamp
│   │   └── updatedAt: Timestamp
│
└── users/                      # User profiles (future)
    ├── {userId}/
    │   ├── uid: string
    │   ├── email: string
    │   ├── displayName: string
    │   ├── department: string
    │   └── role: string
```

#### Security Rules
```javascript
// Firestore Rules Structure
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users only
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Wall access based on ownership and sharing
    match /walls/{wallId} {
      allow read: if canViewWall(resource.data);
      allow write: if canEditWall(resource.data);
    }
  }
}
```

#### Database Indexes
```
Composite Indexes:
1. walls: ownerId (asc) + updatedAt (desc) + __name__ (asc)
2. walls: sharedWith (array) + updatedAt (desc) + __name__ (asc)
3. wall_items: wallId (asc) + createdAt (desc) + __name__ (asc)
```

## Data Models

### Core Entities

#### Wall Model
```typescript
interface Wall {
  id: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
  theme: WallTheme;
  permissions: WallPermissions;
  visibility: WallVisibility;
  createdAt: Date;
  updatedAt: Date;
  
  // Legacy fields for backward compatibility
  ownerId?: string;
  sharedWith?: string[];
  isPublic?: boolean;
}
```

#### Permission System
```typescript
interface WallPermissions {
  owner: string;           // User ID of wall creator
  editors: string[];       // Array of user IDs with edit access
  department?: string;     // Department name for department-wide access
  allowDepartmentEdit: boolean; // Enable/disable department editing
}

interface WallVisibility {
  isPublished: boolean;     // Is wall published?
  requiresLogin: boolean;   // Requires authentication to view?
  publishedAt?: Date;       // When was it published?
  publishedBy?: string;     // Who published it?
}
```

## State Management

### Service-Based State
- AuthService manages authentication state
- WallService manages wall data
- Reactive streams for real-time updates
- BehaviorSubjects for current state
- Observable patterns for data flow

### Data Flow
```
Component ──┐
            ├─▶ Service ──▶ Firebase ──▶ Firestore
Component ──┘                    │
                                 ▼
Component ◀── Observable ◀───────┘
```

## Security Architecture

### Authentication Flow
1. User clicks "Sign in with Google"
2. OAuth popup/redirect to Google
3. Google validates @riversideschools.net domain
4. Firebase receives OAuth token
5. Angular AuthService updates user state
6. Route guards protect authenticated routes

### Authorization
- Firestore security rules enforce permissions
- Frontend guards provide UI-level protection
- Server-side validation via Firebase rules
- Role-based access control

### Data Validation
- Client-side form validation
- Server-side rules validation
- Input sanitization
- XSS protection

## Performance Considerations

### Frontend Optimization
- Lazy loading for feature modules
- OnPush change detection strategy
- Tree-shaking for smaller bundles
- Service worker for caching (future)

### Backend Optimization
- Firestore query optimization
- Proper indexing strategy
- Pagination for large datasets
- Real-time listeners management

### Caching Strategy
- Browser caching for static assets
- Firebase hosting CDN
- Local storage for user preferences
- Observable caching in services

## Monitoring & Observability

### Error Tracking
- Browser console logging
- Firebase error reporting
- User action tracking
- Performance monitoring

### Analytics
- User engagement metrics
- Feature usage tracking
- Performance metrics
- Error rate monitoring

## Deployment Architecture

### Environments
- Development: Local with Firebase emulators
- Staging: Firebase project (future)  
- Production: Firebase hosting + custom domain

### Development Limitations
- `ng serve` cannot be used in this environment
- Development testing must be done via `ng build` and static serving
- Live reload and hot module replacement not available

### CI/CD Pipeline (Future)
```
GitHub ──▶ Build ──▶ Test ──▶ Deploy ──▶ Firebase Hosting
         │         │        │
         ▼         ▼        ▼
    Code Quality  Unit Tests  Integration Tests
```

## Scalability Considerations

### Database Scaling
- Firestore automatic scaling
- Query optimization
- Index management
- Data archiving strategies

### Application Scaling
- Stateless architecture
- Horizontal scaling via Firebase
- CDN for global distribution
- Microservice readiness

### Performance Targets
- < 2s initial page load
- < 500ms navigation between pages
- 99.9% uptime
- Real-time updates < 100ms latency