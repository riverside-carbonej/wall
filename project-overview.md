# Riverside Wall App - Project Overview

## Project Description
A collaborative wall application for Riverside Schools that allows staff to create, share, and manage digital walls for posting content and information.

## Core Features

### Authentication & Access
- Google OAuth integration with Riverside Schools domain restriction
- Role-based access control
- Department-based permissions

### Wall Management
- Create and edit digital walls
- Customizable themes and layouts
- Field definitions for structured content
- Publishing controls (draft/published states)

### Content Management
- Add items to walls with custom fields
- Rich content support (text, dates, URLs, etc.)
- Real-time collaborative editing
- Version control and history

### Sharing & Permissions
- Owner/editor permission system
- Department-level access controls
- Public/private wall visibility
- Shareable wall links

## Technology Stack

### Frontend
- Angular 18 (standalone components)
- TypeScript
- Angular Material Design System
- Material Icons
- Reactive Forms
- RxJS for state management

### Backend
- Firebase Authentication
- Firestore (NoSQL database)
- Firebase Hosting
- Firebase Security Rules

### Development Tools
- Angular CLI
- Firebase CLI
- Git version control
- Chrome DevTools

## Project Structure
```
src/
├── app/
│   ├── auth/                   # Authentication components
│   ├── core/                   # Core services and guards
│   ├── features/               # Feature modules
│   │   ├── walls/              # Wall management
│   │   └── wall-items/         # Wall content items
│   ├── shared/                 # Shared components and models
│   └── environments/           # Environment configuration
├── assets/                     # Static assets
└── styles.css                  # Global styles
```

## Current Status
- ✅ Authentication system working
- ✅ Firebase integration complete
- ✅ Basic wall CRUD operations
- ✅ Material Design UI
- 🚧 Wall content management (in progress)
- 🚧 Advanced permissions (in progress)
- ⏳ Theme customization (planned)
- ⏳ Real-time collaboration (planned)

## Next Steps
1. Complete wall content item management
2. Implement advanced theme system
3. Add real-time collaboration features
4. User testing and feedback
5. Production deployment