# RLS Wall App - Project Documentation

## Overview

RLS Wall App is a modern, Google Docs-inspired web application built with Angular 20+ and Firebase Firestore. It provides a flexible platform for creating and managing "walls" - customizable data displays with dynamic field schemas. Think of it as a cross between Google Sheets, Airtable, and Pinterest for organizing structured data.

## What It Does

### Core Functionality
- **Dynamic Wall Creation**: Users can create walls with custom field schemas
- **Template System**: Pre-built templates for common use cases (Alumni, Veterans, Team directories)
- **Real-time Data Management**: Add, edit, and organize wall items with custom fields
- **Theme Customization**: Material 3 design system with dark/light modes and custom wall themes
- **Responsive Design**: Works seamlessly across desktop and mobile devices

### Key Features
- **Google Docs-style Homepage**: Template gallery with recent walls
- **Dual-mode Interface**: Preview and edit modes for different use cases
- **Advanced Search & Filtering**: Find specific wall items quickly
- **Export Capabilities**: Download data in JSON and CSV formats
- **Real-time Sync**: Changes are saved automatically via Firebase

## How It Behaves

### User Journey
1. **Homepage**: Users see a template gallery and recent walls
2. **Wall Creation**: Choose from templates or create blank walls
3. **Field Configuration**: Define custom fields (text, email, date, etc.)
4. **Content Management**: Add and organize wall items
5. **Sharing**: Make walls public for viewing

### Technical Behavior
- **Offline-first**: Works with intermittent connectivity
- **Real-time Updates**: Multiple users can collaborate
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Accessibility**: WCAG 2.1 compliant design

## Architecture

### Frontend (Angular 20+)
- **Vertical Slice Architecture**: Feature-based organization
- **Standalone Components**: Modern Angular approach
- **Reactive Forms**: Type-safe form handling
- **RxJS**: Reactive programming patterns
- **Material 3**: Modern design system

### Backend (Firebase)
- **Firestore**: NoSQL document database
- **Authentication**: User management
- **Security Rules**: Data access control
- **Cloud Functions**: Server-side logic

### File Structure
```
src/
├── app/
│   ├── features/
│   │   ├── walls/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── models/
│   │   └── wall-items/
│   ├── shared/
│   │   ├── services/
│   │   ├── models/
│   │   └── components/
│   └── core/
└── assets/
```

## Development Status

### Completed Features ✅
- Firebase Firestore integration
- Material 3 theming with dark/light mode
- Template system with preset fields
- Wall creation and management
- Custom SVG logo
- Responsive homepage design

### In Progress 🚧
- Firestore security rules
- In-place editing for wall items
- Bulk operations (delete, export)

### Planned Features 📋
- Real-time collaboration
- Advanced search and filtering
- Wall sharing and permissions
- Mobile app (Ionic/Capacitor)
- Analytics and insights

## Getting Started

### Prerequisites
- Node.js 18+
- Angular CLI 20+
- Firebase account

### Installation
```bash
npm install
ng serve
```

### Configuration
1. Create Firebase project
2. Add configuration to `src/environments/`
3. Enable Firestore and Authentication
4. Deploy security rules

## Deployment

### Development
```bash
ng serve
```

### Production
```bash
ng build --prod
firebase deploy
```

## Contributing

### Code Style
- Material 3 design principles
- Google Sans typography
- CSS custom properties for theming
- TypeScript strict mode
- Reactive programming patterns

### Testing
```bash
ng test          # Unit tests
ng e2e           # End-to-end tests
npm run lint     # Code linting
```

## License

MIT License - see LICENSE file for details

---

*Last updated: January 2025*