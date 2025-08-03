# Ultimate Riverside Wall App Guidelines

This document serves as the definitive reference for implementing, maintaining, and improving the Riverside Wall App. It consolidates all requirements, patterns, and standards.

## Table of Contents
1. [Core Architecture & Patterns](#core-architecture--patterns)
2. [Data Structure & Terminology](#data-structure--terminology)
3. [User Experience Requirements](#user-experience-requirements)
4. [Technical Implementation Standards](#technical-implementation-standards)
5. [Feature Completeness Checklist](#feature-completeness-checklist)
6. [Quality Assurance Standards](#quality-assurance-standards)

---

## Core Architecture & Patterns

### 1. Technology Stack (MUST BE CONSISTENT)
- **Frontend**: Angular 20+ with standalone components, no NgModules
- **UI**: Angular Material 20+ with Material Design 3 tokens
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Maps**: Leaflet integration for location-based features
- **State**: Angular services with RxJS, NO external state management
- **Styling**: CSS with Material Design 3 custom properties

### 2. Component Architecture Pattern
```typescript
// REQUIRED PATTERN for all components
@Component({
  selector: 'app-[feature-name]',
  standalone: true,
  imports: [CommonModule, /* specific Material modules */],
  template: `...`,
  styles: [`...`]
})
```

### 3. Service Pattern (CRITICAL)
```typescript
@Injectable({ providedIn: 'root' })
export class [Feature]Service {
  // MUST use observables for async operations
  // MUST handle errors properly
  // MUST follow Firebase integration patterns
}
```

---

## Data Structure & Terminology

### 1. CORRECT TERMINOLOGY (User-Specified)
- **Wall Item Presets** = Object Types (templates/schemas for data)
- **Wall Items** = Actual data instances based on presets
- **Walls** = Containers that hold presets and items

### 2. Core Data Hierarchy
```
Wall
├── Object Types (Wall Item Presets)
│   ├── Field Definitions
│   ├── Display Settings
│   └── Validation Rules
└── Wall Items (Data Instances)
    ├── Field Data (based on preset)
    ├── Images
    └── Metadata
```

### 3. Navigation Context Pattern
- **App Home**: `/walls` (list all walls)
- **Wall Home**: `/walls/:id` (animated home for specific wall)
- **Wall Management**: `/walls/:id/manage` (object types/presets)
- **Wall Settings**: `/walls/:id/edit` (wall configuration)
- **User Permissions**: `/walls/:id/permissions` (access control)

---

## User Experience Requirements

### 1. Navigation Behavior (CRITICAL)
- **Home button** MUST be context-aware:
  - In app context: goes to `/walls`
  - In wall context: goes to `/walls/:id`
- **Sidebar navigation** MUST show:
  - Main section: Home, Wall Overview, All Items, Map View (if location data exists)
  - Content Types section: Dynamic list of object types
  - Administration section: Wall Item Presets, Wall Settings, Users & Permissions

### 2. Empty States (REQUIRED)
- **No walls**: Show onboarding with "Create Wall" action
- **No object types**: Show "Create Wall Item Preset" with explanation
- **No wall items**: Show "Add Item" with guidance
- **NEVER** show "coming soon" or broken states

### 3. Progressive Disclosure
- **Basic users**: See simplified interface
- **Editors**: See content management tools
- **Admins**: See full configuration options

### 4. Animation Requirements
- **Wall home page**: MUST have 3D perspective animations like veteran app
- **Transitions**: Smooth between pages
- **Loading states**: Proper Material Design progress indicators

---

## Technical Implementation Standards

### 1. Form Patterns
```typescript
// REQUIRED pattern for all forms
export class [Component]Component {
  form = this.fb.group({
    // Use reactive forms ALWAYS
    // Include proper validation
    // Handle errors gracefully
  });
}
```

### 2. Observable Patterns
```typescript
// REQUIRED pattern for data loading
ngOnInit() {
  this.data$ = this.route.paramMap.pipe(
    switchMap(params => this.service.getData(params.get('id')!)),
    filter(data => data !== null),
    takeUntil(this.destroy$)
  ) as Observable<DataType>;
}
```

### 3. Error Handling (MANDATORY)
- ALL Firebase operations MUST handle errors
- User-friendly error messages via MatSnackBar
- Graceful degradation for offline scenarios
- Retry mechanisms for failed operations

### 4. TypeScript Standards
- Strict mode enabled
- No `any` types except for legitimate dynamic scenarios
- Proper interface definitions for all data models
- Generic types where appropriate

---

## Feature Completeness Checklist

### 1. Authentication System ✅
- [x] Firebase Auth with Google OAuth
- [x] Domain restrictions (@riversideschools.net)
- [x] Route guards
- [x] Session persistence

### 2. Wall Management
- [x] Create/edit walls
- [x] Wall themes (5 default themes)
- [x] Permission system (owner/editors/departments)
- [x] Publishing controls (draft/published)
- [ ] **MISSING**: Wall templates/presets for quick setup
- [ ] **MISSING**: Wall duplication functionality
- [ ] **MISSING**: Wall deletion with confirmation

### 3. Wall Item Presets (Object Types)
- [x] Created management page
- [ ] **MISSING**: Object type builder is referenced but not fully connected
- [ ] **MISSING**: Field type implementations:
  - [ ] Relationship fields
  - [ ] File upload fields
  - [ ] Rich text fields
  - [ ] Date range fields
  - [ ] Multi-select fields
- [ ] **MISSING**: Object type templates/library
- [ ] **MISSING**: Validation and constraints system

### 4. Wall Items (Data Instances)
- [x] Basic wall item list component
- [ ] **MISSING**: Dynamic form generation based on object types
- [ ] **MISSING**: Add/edit wall item flow
- [ ] **MISSING**: Proper empty states
- [ ] **MISSING**: Bulk operations
- [ ] **MISSING**: Search and filtering
- [ ] **MISSING**: Item relationship management

### 5. User Management & Permissions
- [x] Created permissions management page
- [ ] **MISSING**: User service Firebase integration
- [ ] **MISSING**: User invitation system
- [ ] **MISSING**: Role-based permissions (currently only basic)
- [ ] **MISSING**: Department management
- [ ] **MISSING**: Activity logging

### 6. Maps Integration
- [x] Leaflet integration completed
- [ ] **MISSING**: Location picker in add/edit forms
- [ ] **MISSING**: Map view filtering by object type
- [ ] **MISSING**: Clustering for multiple items

### 7. Theme System
- [x] 5 default themes defined
- [ ] **MISSING**: Theme application service
- [ ] **MISSING**: Custom theme creator
- [ ] **MISSING**: Theme preview functionality

### 8. Real-time Features
- [ ] **MISSING**: Live updates via Firebase listeners
- [ ] **MISSING**: Collaborative editing indicators
- [ ] **MISSING**: Conflict resolution

### 9. Search & Discovery
- [ ] **MISSING**: Wall search functionality
- [ ] **MISSING**: Content search within walls
- [ ] **MISSING**: Filtering systems
- [ ] **MISSING**: Tagging system

### 10. Mobile Experience
- [x] Responsive design patterns established
- [ ] **MISSING**: Mobile-optimized navigation
- [ ] **MISSING**: Touch-friendly interactions
- [ ] **MISSING**: PWA capabilities

---

## Quality Assurance Standards

### 1. Build Requirements
- ✅ TypeScript compilation MUST succeed
- ⚠️ Bundle size warnings acceptable but monitor
- ❌ NO runtime errors permitted
- ❌ NO console errors in production

### 2. Code Quality
- **Consistency**: Follow established patterns exactly
- **Documentation**: All public methods documented
- **Testing**: Unit tests for services, component tests for UI
- **Performance**: Lazy loading, OnPush change detection where applicable

### 3. User Testing Criteria
- **Navigation**: Every button/link must work
- **Forms**: All validation working, error states handled
- **Data Flow**: Create → Read → Update → Delete operations complete
- **Permissions**: Access control working correctly

### 4. Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast support

---

## Immediate Action Items (Priority Order)

### HIGH PRIORITY (Must Fix Now)
1. **Connect Object Type Builder** - The page exists but builder isn't functional
2. **Implement Add Wall Item Flow** - Core functionality missing
3. **Fix Wall Item List Empty States** - Currently shows "no items" without guidance
4. **Complete User Service Firebase Integration** - Currently using mocks
5. **Add Location Picker Integration** - Maps exist but not connected to forms

### MEDIUM PRIORITY (Next Phase)
1. **Implement Theme Application** - Themes defined but not applied
2. **Add Search Functionality** - Core discovery feature
3. **Create Wall Templates** - Quick setup for common use cases
4. **Implement Real-time Updates** - Firebase listeners
5. **Add Bulk Operations** - User efficiency features

### LOW PRIORITY (Future Enhancement)
1. **PWA Features** - Offline capability
2. **Advanced Analytics** - Usage tracking
3. **External Integrations** - Google Workspace, etc.
4. **Advanced Permissions** - Granular role-based access

---

## Critical Patterns to Follow

### 1. File Organization
```
src/app/
├── features/[feature]/
│   ├── components/[component]/
│   ├── pages/[page]/
│   └── services/[service].service.ts
├── shared/
│   ├── components/[reusable]/
│   ├── models/[interfaces].model.ts
│   └── services/[shared].service.ts
└── core/
    ├── guards/
    └── services/
```

### 2. Import Standards
```typescript
// Angular imports first
import { Component } from '@angular/core';
// Third-party imports
import { Observable } from 'rxjs';
// Local imports last
import { WallService } from './services/wall.service';
```

### 3. Error Handling Pattern
```typescript
.subscribe({
  next: (data) => { /* success */ },
  error: (error) => {
    console.error('Operation failed:', error);
    this.snackBar.open('Operation failed. Please try again.', 'Close', { duration: 3000 });
  }
});
```

---

## Success Metrics

### Technical Success
- [ ] Zero TypeScript compilation errors
- [ ] Zero runtime console errors
- [ ] All routes functional
- [ ] All forms working with validation
- [ ] All CRUD operations complete

### User Experience Success
- [ ] Intuitive navigation (no user confusion)
- [ ] Fast performance (< 2s initial load)
- [ ] Mobile-friendly interface
- [ ] Accessible design
- [ ] No broken features or dead ends

### Business Success
- [ ] Teachers can create walls
- [ ] Staff can add content
- [ ] Administrators can manage permissions
- [ ] Content is discoverable
- [ ] System scales with usage

---

This document should be the single source of truth for all development decisions. When in doubt, refer to these guidelines and ensure consistency with established patterns.