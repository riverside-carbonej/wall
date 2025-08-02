# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm start` - Start development server on port 4301
- `npm run build` - Build for production
- `npm run watch` - Build with watch mode for development
- `npm test` - Run tests with Karma and Jasmine

### Working Directory
All development commands should be run from the `rlswallapp/` directory, not the repository root.

## Architecture Overview

### Technology Stack
- **Framework**: Angular 20+ with standalone components
- **UI Framework**: Angular Material 20+ with Material Design 3
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Maps**: Leaflet for mapping functionality
- **State Management**: Angular services with RxJS
- **Styling**: CSS with Material Design tokens and custom variables

### Project Structure

#### Core Application (`src/app/`)
- **`app.ts`** - Main application component with complex header, navigation, and theming
- **`app.routes.ts`** - Route configuration with lazy-loaded components and AuthGuard protection
- **`app.config.ts`** - Angular providers and Firebase configuration

#### Feature Modules
- **`features/walls/`** - Wall management (CRUD, theming, permissions)
- **`features/wall-items/`** - Dynamic items within walls with field-based system
- **`features/maps/`** - Leaflet integration for location-based features
- **`features/object-types/`** - Dynamic object type configuration system

#### Core Services (`core/`)
- **`auth.service.ts`** - Firebase Authentication with Google and email/password
- **`auth.guard.ts`** - Route protection requiring authentication

#### Shared Infrastructure (`shared/`)
- **`models/wall.model.ts`** - Complex data models with themes, permissions, and object types
- **`services/theme.service.ts`** - Theme management with wall-specific theming
- **`services/navigation.service.ts`** - Navigation state and menu management
- **`components/`** - Reusable UI components

### Key Features

#### Dynamic Object System
The application uses a flexible object-type system where walls can define custom object types with:
- Custom fields (text, date, location, relationships, files, etc.)
- Field validation and configuration
- Relationships between object types
- Display settings and theming

#### Theme System
- Global app themes (light/dark mode)
- Wall-specific themes with extensive customization
- Material Design 3 integration with CSS custom properties
- Default themes: Riverside Gold, Clean Modern, Dark Professional, Warm Academic, Vibrant Creative

#### Permission System
- Wall owners and editors
- Department-based permissions
- Draft/published visibility states
- Authentication-required walls

### Firebase Integration

#### Services Used
- **Authentication**: Email/password and Google Sign-In
- **Firestore**: Document-based data storage for walls, items, and user data
- **Storage**: File uploads for wall item images

#### Key Collections
- `walls` - Wall documents with embedded object types and themes
- `wall-items` - Individual items belonging to walls
- `users` - User profiles and permissions

### Development Patterns

#### Component Architecture
- Standalone components (no NgModules)
- Signal-based reactive state where applicable
- Material Design components with custom theming
- Lazy-loaded route components

#### Service Patterns
- Injectable services with `providedIn: 'root'`
- RxJS observables for async operations
- Firebase SDK integration with Angular Fire

#### Styling Approach
- CSS custom properties for theming
- Material Design 3 design tokens
- Component-scoped styles
- Responsive design with mobile-first approach

### Testing
- Jasmine and Karma for unit tests
- Component testing with Angular Testing utilities

### Code Conventions
- TypeScript strict mode
- Prettier formatting with HTML parser for Angular templates
- Material Icons for iconography
- Single quotes in TypeScript, double quotes in templates