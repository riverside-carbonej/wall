# Riverside Wall App - Implementation Plan

> **Living Document**: This plan will be updated throughout development to reflect progress, new requirements, and architectural decisions.

## Project Overview

Transform the Riverside Wall App into a flexible, mobile-first, relationship-aware content management system with advanced theming and interactive features.

### Core Vision
- **Mobile-First**: Big, bubbly Material 3 design optimized for touch
- **Flexible Object System**: Support complex relational data (Veterans ↔ Deployments ↔ Units)
- **Advanced Theming**: 7+ customizable color properties per wall theme
- **Interactive Maps**: Location-based object visualization and filtering
- **Real-Time Collaboration**: Live updates and user presence

---

## Phase 1: Enhanced Material 3 UI System (Mobile-First)
**Timeline**: 2-3 weeks | **Status**: 🟡 Planned

### 1.1 Design System Overhaul
- [ ] **Touch Target Standards**: Minimum 48dp for all interactive elements
- [ ] **Typography Scale**: Larger font sizes for mobile readability
- [ ] **Spacing System**: Generous padding/margins (16dp, 24dp, 32dp scale)
- [ ] **Corner Radius**: Consistent rounded corners (16-24dp for cards)
- [ ] **Elevation System**: Proper Material 3 surface elevations

### 1.2 Enhanced Color System
**Target**: Support 7+ customizable theme properties

```typescript
interface EnhancedWallTheme {
  // Core brand colors
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  
  // Surface hierarchy
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  
  // Typography hierarchy
  titleColor: string;
  bodyTextColor: string;
  secondaryTextColor: string;
  captionTextColor: string;
  
  // Semantic colors
  errorColor: string;
  warningColor: string;
  successColor: string;
  
  // Layout properties
  cornerRadius: 'none' | 'small' | 'medium' | 'large';
  elevation: 'flat' | 'low' | 'medium' | 'high';
  spacing: 'compact' | 'comfortable' | 'spacious';
}
```

### 1.3 Component Library Enhancement
- [ ] **Material Symbols Integration**: Replace all custom SVGs
- [ ] **Chip Components**: For tags and categories
- [ ] **Badge Components**: For relationship indicators
- [ ] **Progress Indicators**: Loading states and progress
- [ ] **Snackbar System**: Toast notifications
- [ ] **Bottom Sheets**: Mobile-optimized dialogs
- [ ] **Floating Action Buttons**: Primary actions

### 1.4 Mobile Navigation
- [ ] **Bottom Navigation**: Primary section navigation
- [ ] **Swipe Gestures**: Between wall sections
- [ ] **Pull-to-Refresh**: Data updates
- [ ] **Infinite Scroll**: Large datasets
- [ ] **Back Gesture Support**: Proper navigation stack

---

## Phase 2: Flexible Object System Architecture
**Timeline**: 2-3 weeks | **Status**: 🟡 Planned

### 2.1 Enhanced Data Models

```typescript
interface WallObjectType {
  id: string;
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
  };
}

interface RelationshipDefinition {
  id: string;
  name: string; // "served in", "deployed to", "awarded"
  description: string;
  targetObjectType: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  required: boolean;
  bidirectional: boolean; // Show relationship from both sides
}

interface EnhancedWallItem {
  id: string;
  wallId: string;
  objectTypeId: string;
  data: { [fieldId: string]: any };
  relationships: { [relationshipId: string]: string[] };
  coordinates?: { lat: number; lng: number; address?: string };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

### 2.2 Advanced Field Types
- [ ] **Relationship Fields**: Select from related objects with search
- [ ] **Location Fields**: Map picker with geocoding
- [ ] **Rich Text Fields**: WYSIWYG editor
- [ ] **File Upload Fields**: Images, documents (Firebase Storage)
- [ ] **Date Range Fields**: Start/end date pairs
- [ ] **Multi-Select Fields**: Tags and categories
- [ ] **Number Range Fields**: Min/max values
- [ ] **Color Fields**: Color picker for customization

### 2.3 Relationship Management
- [ ] **Visual Relationship Builder**: Drag-and-drop interface
- [ ] **Relationship Graph View**: Interactive network diagram
- [ ] **Bulk Relationship Editor**: Select multiple items for linking
- [ ] **Relationship Validation**: Prevent circular dependencies
- [ ] **Relationship History**: Track relationship changes

---

## Phase 3: Interactive Map Integration
**Timeline**: 2-3 weeks | **Status**: 🟡 Planned

### 3.1 Map System Architecture
- [ ] **Leaflet Integration**: Lightweight, mobile-friendly mapping
- [ ] **Custom Marker Styles**: Theme-aware markers for object types
- [ ] **Marker Clustering**: Performance with large datasets
- [ ] **Mobile Touch Controls**: Pinch, zoom, pan optimization
- [ ] **Offline Map Caching**: Service worker integration

### 3.2 Location Features
- [ ] **Automatic Map Display**: Show when objects have coordinates
- [ ] **Location-Based Filtering**: "Show items near [location]"
- [ ] **Route Visualization**: Connect related locations
- [ ] **Geocoding Service**: Address ↔ coordinates conversion
- [ ] **Location Search**: Find and add locations to items
- [ ] **GPS Integration**: Current location detection

### 3.3 Map Interactions
- [ ] **Marker Click Actions**: Show item details in popup
- [ ] **Relationship Lines**: Visual connections between related items
- [ ] **Heat Maps**: Density visualization for large datasets
- [ ] **Custom Map Styles**: Match wall theme colors
- [ ] **Export Map Data**: Share locations and routes

---

## Phase 4: Enhanced User Experience
**Timeline**: 2-3 weeks | **Status**: 🟡 Planned

### 4.1 Real-Time Collaboration
- [ ] **WebSocket Integration**: Live updates across users
- [ ] **User Presence**: Show who's viewing/editing
- [ ] **Collaborative Cursors**: Real-time editing indicators
- [ ] **Conflict Resolution**: Handle simultaneous edits
- [ ] **Activity Feed**: Recent changes and notifications

### 4.2 Advanced Search & Filtering
- [ ] **Global Search**: Across all wall content
- [ ] **Faceted Filters**: By object type, relationships, dates
- [ ] **Smart Suggestions**: Autocomplete and recommendations
- [ ] **Saved Searches**: Bookmark frequently used filters
- [ ] **Search History**: Recent searches
- [ ] **Full-Text Search**: In rich text fields

### 4.3 Performance Optimization
- [ ] **Virtual Scrolling**: Large datasets
- [ ] **Image Optimization**: WebP, lazy loading
- [ ] **Caching Strategy**: Service worker, local storage
- [ ] **Bundle Optimization**: Code splitting, tree shaking
- [ ] **Database Indexing**: Optimized Firestore queries

---

## Phase 5: Configuration Templates
**Timeline**: 2-3 weeks | **Status**: 🟡 Planned

### 5.1 Predefined Templates

#### Veteran Registry Template
```typescript
const veteranTemplate: WallTemplate = {
  name: "Veteran Registry",
  description: "Honor and track veteran service members",
  objectTypes: [
    {
      name: "Veteran",
      fields: ["name", "rank", "branch", "serviceYears", "photo"],
      relationships: ["deployments", "units", "awards"]
    },
    {
      name: "Deployment", 
      fields: ["name", "location", "startDate", "endDate", "description"],
      relationships: ["veterans", "coordinates"]
    },
    {
      name: "Unit",
      fields: ["name", "branch", "description", "logo"],
      relationships: ["veterans", "deployments"]
    },
    {
      name: "Award",
      fields: ["name", "description", "image", "criteria"],
      relationships: ["veterans"]
    }
  ],
  theme: "military" // Predefined color scheme
};
```

#### Alumni Directory Template
```typescript
const alumniTemplate: WallTemplate = {
  name: "Alumni Directory",
  description: "Connect alumni and track achievements",
  objectTypes: [
    {
      name: "Alumnus",
      fields: ["name", "graduationYear", "degree", "currentPosition", "photo"],
      relationships: ["companies", "events", "mentorships"]
    },
    {
      name: "Company",
      fields: ["name", "industry", "location", "website", "logo"],
      relationships: ["alumni", "coordinates"]
    },
    {
      name: "Event",
      fields: ["name", "date", "location", "description", "photos"],
      relationships: ["attendees", "coordinates"]
    }
  ],
  theme: "academic"
};
```

### 5.2 Template System
- [ ] **Template Wizard**: Step-by-step configuration
- [ ] **Field Mapping**: Import existing data
- [ ] **Relationship Builder**: Visual setup interface
- [ ] **Theme Presets**: Matching color schemes
- [ ] **Template Sharing**: Export/import configurations

---

## Technical Architecture

### Database Schema (Firestore)
```
walls/
├── {wallId}/
│   ├── name, description, theme
│   ├── objectTypes: WallObjectType[]
│   ├── permissions, visibility
│   └── settings

wall_items/
├── {itemId}/
│   ├── wallId, objectTypeId
│   ├── data: {fieldId: value}
│   ├── relationships: {relationshipId: itemIds[]}
│   ├── coordinates?, tags[]
│   └── metadata (created, updated, by)

relationships/ (for complex many-to-many)
├── {relationshipId}/
│   ├── wallId, fromItemId, toItemId
│   ├── relationshipType, metadata
│   └── timestamps
```

### Security Considerations & Access Policy

#### **Wall Access Policy**
- **Wall-Level Permissions**:
  - Owner: Full access to wall and all content within it
  - Shared Users: Delegated roles by owner
    - Editor: Can view and edit the wall and all items/content within it
    - Viewer: Can see all content in the wall but cannot edit anything

- **Content Access Rules**:
  - All content within a wall (items, images, data) inherits the wall's access permissions
  - If you can access the wall, you can access all content inside it
  - Content cannot have separate permissions from its parent wall

- **Published Wall Access**:
  - When a wall is published: It becomes read-only with two visibility options:
    - Internal Published: Must be logged in to view the published wall
    - External Published: Anyone can view without being logged in
  - Published walls are always read-only: No editing allowed, pure preview/view mode

#### **Implementation Requirements**
- [ ] **Wall-Level Permissions**: Implement owner/editor/viewer roles
- [ ] **Content Inheritance**: All content inherits wall permissions
- [ ] **Published Wall Modes**: Internal (login required) vs External (public)
- [ ] **Data Validation**: Server-side validation rules
- [ ] **Rate Limiting**: Prevent abuse
- [ ] **Audit Logging**: Track all changes

### Performance Targets
- [ ] **Initial Load**: <2 seconds for wall list
- [ ] **Wall Rendering**: <1 second for typical wall (100 items)
- [ ] **Map Performance**: Smooth 60fps with 1000+ markers
- [ ] **Search Response**: <500ms for typical queries
- [ ] **Real-time Updates**: <100ms latency

---

## Success Metrics

### User Experience
- [ ] **Mobile Usability**: All touch targets ≥48dp
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **Performance**: Core Web Vitals "Good" rating
- [ ] **Responsiveness**: Smooth 60fps animations

### Functionality
- [ ] **Theme Flexibility**: 7+ customizable color properties
- [ ] **Object Complexity**: Support 5+ object types per wall
- [ ] **Relationship Depth**: 3+ levels of interconnected objects
- [ ] **Data Scale**: Handle 1000+ items per wall efficiently

### Business Value
- [ ] **Template Usage**: 80% of walls use predefined templates
- [ ] **User Adoption**: Increased active user engagement
- [ ] **Data Quality**: Rich, interconnected content creation
- [ ] **Mobile Usage**: 60%+ of interactions on mobile devices

---

## Current Status: Phase 1 Foundation Ready
✅ Authentication system working  
✅ Basic wall CRUD operations  
✅ Firebase integration stable  
✅ Material Icons implemented  
✅ Responsive base layout  

**Next**: Begin Phase 1 - Material 3 UI overhaul

---

## Notes & Decisions
- **Map Library**: Leaflet chosen over Google Maps for cost and flexibility
- **Real-time**: WebSockets via Firebase Realtime Database for collaboration
- **File Storage**: Firebase Storage with image optimization
- **Search**: Client-side filtering for now, consider Algolia for complex search later
- **Offline**: Progressive enhancement, core features work offline

---

*Last Updated: [Current Date]*  
*Next Review: After Phase 1 completion*