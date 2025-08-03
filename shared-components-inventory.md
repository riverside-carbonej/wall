# Shared Components Inventory

## Existing Shared Components

### Button Components

#### ButtonGroupComponent ✅ **Actively Used**
- **Description**: Segmented button control with multiple buttons
- **Current Usage**:
  - `template-library.component.ts` (lines 91-95) - View mode toggle
  - `wall-form.component.ts` (lines 29-33) - Tab navigation
  - `wall-list.component.ts` (lines 59-63) - View mode switch
- **Import Count**: 3 files

#### ThemedButtonComponent ✅ **Used**
- **Description**: All Material button variants (raised, flat, stroked, icon, fab)
- **Current Usage**:
  - `page-layout.component.ts` (lines 24-29, 42-50) - Header action buttons
- **Import Count**: 1 file
- **Opportunity**: Could be used more widely for consistent theming

#### SideButtonComponent ✅ **Heavily Used**
- **Description**: Specialized side navigation button
- **Current Usage**:
  - `navigation-menu.component.ts` (multiple instances, lines 45-103) - Main navigation
  - `wall-item-presets.component.ts` (lines 36-52) - Preset selection
  - `wall-overview.component.ts` (lines 37-54) - Wall actions
- **Import Count**: 3 files with multiple instances

### Layout Components

#### PageLayoutComponent ❌ **Not Used**
- **Description**: Page structure with header, actions, and content
- **Current Usage**: None
- **Opportunity**: Could standardize page layouts across:
  - Wall form pages
  - Item list pages
  - Settings pages
  - All feature pages

#### IconContainerComponent ❌ **Not Used**
- **Description**: Icon wrapper with size/color/shape variants
- **Current Usage**: None
- **Opportunity**: Could standardize icon display in:
  - Empty states
  - Card headers
  - List items
  - Navigation items

### State Components

#### EmptyStateComponent ✅ **Heavily Used**
- **Description**: Empty state with icon, message, and actions
- **Current Usage**:
  - `object-type-selector.component.ts` (lines 91-96)
  - `map-view.component.ts` (lines 87-92)
  - `wall-item-list.component.ts` (lines 69-84)
  - `wall-item-presets.component.ts` (lines 107-112)
  - `wall-overview.component.ts` (lines 71-77, 157-163)
- **Import Count**: 6 files

#### LoadingStateComponent ✅ **Well Used**
- **Description**: Loading indicators (spinner/bar) with overlay
- **Current Usage**:
  - `map-view.component.ts` (lines 69-74)
  - `wall-item-list.component.ts` (lines 59-62)
  - `object-type-selection-page.component.ts` (lines 22-25)
  - `generic-wall-item-page.component.ts` (lines 237-241)
- **Import Count**: 4 files

#### ErrorDialogComponent ✅ **Used**
- **Description**: Error display with retry and technical details
- **Current Usage**:
  - `generic-wall-item-page.component.ts` (lines 438, 525)
- **Import Count**: 1 file
- **Opportunity**: Could be used more widely for error handling

### Navigation Components

#### NavigationMenuComponent ✅ **Used**
- **Description**: Side navigation menu
- **Current Usage**:
  - `app.ts` (line 166) - Main application navigation
- **Import Count**: 1 file (app root)

#### UserAvatarComponent ✅ **Used**
- **Description**: User profile avatar
- **Current Usage**:
  - `app.ts` (lines 119-123) - Header user display
- **Import Count**: 1 file

### Data Display Components

#### StatsItemComponent ❌ **Not Used**
- **Description**: Icon + text statistics display
- **Current Usage**: None
- **Opportunity**: Could be used for:
  - Wall statistics
  - Dashboard metrics
  - Overview pages

## Proposed Shared Components

### High Priority

#### 1. Card Component
- **Purpose**: Unified card layout for all card-based displays
- **Variants**: wall-item, object-type, template, simple
- **Features**: Thumbnail, metadata, actions, hover states, click handling
- **Potential Usage**:
  - `template-library.component.ts` (lines 102-213) - Template cards
  - `object-type-builder.component.ts` (lines 52-353) - Section cards
  - `relationship-manager.component.ts` (lines 56-373) - Manager cards
  - `wall-item-presets.component.ts` (lines 72-103) - Preset cards
  - `field-configurator.component.ts` (lines 56+) - Configuration cards
- **Pattern**: Replace `mat-card` with consistent header/content/actions

#### 2. Confirmation Dialog Component
- **Purpose**: Replace window.confirm() with consistent Material dialog
- **Features**: Title, message, confirm/cancel actions, color variants
- **Potential Usage**:
  - `delete-button.component.ts` (line 37) - Delete confirmations
  - Any `window.confirm()` usage throughout the app
- **Pattern**: Replace `window.confirm()` calls

#### 3. Search Input Component
- **Purpose**: Standardized search with suggestions
- **Features**: Placeholder, clear button, search suggestions, debouncing
- **Potential Usage**:
  - `app.ts` (lines 77, 135) - Header search
  - `template-library.component.ts` (lines 70-71) - Template search
  - Any search functionality in lists
- **Pattern**: Replace `mat-form-field` with search icon patterns

#### 4. Form Field Wrapper Component
- **Purpose**: Consistent form field presentation
- **Features**: Label, required indicator, error display, hint text
- **Potential Usage**:
  - `dynamic-field-renderer.component.html` (lines 42-355) - All dynamic fields
  - `object-type-builder.component.ts` - Form fields
  - `field-configurator.component.ts` - Configuration fields
  - `wall-form.component.ts` - Wall form fields
  - Any form with `mat-form-field`
- **Pattern**: Wrap `mat-form-field` with consistent styling/behavior

#### 5. Tab Navigation Component
- **Purpose**: Reusable tab navigation
- **Features**: Tab items, active state, change events
- **Potential Usage**:
  - Already well-served by ButtonGroupComponent
  - `field-configurator.component.ts` - Uses MatTabs
- **Note**: Lower priority since ButtonGroupComponent handles most cases

### Medium Priority

#### 6. List Item Component
- **Purpose**: Generic list item display
- **Features**: Avatar, primary/secondary text, action buttons
- **Potential Usage**:
  - User lists
  - Simple item lists without cards
  - Navigation items
- **Pattern**: Standardize list item layouts

#### 7. Action Menu Component
- **Purpose**: Dropdown menu for actions
- **Features**: Three-dots trigger, positioned menu, action items
- **Potential Usage**:
  - Wall cards overflow menus
  - Item cards action menus
  - Any `mat-menu` with trigger button
- **Pattern**: Replace `mat-menu` boilerplate

#### 8. Breadcrumb Component
- **Purpose**: Navigation breadcrumbs
- **Features**: Clickable items, separators, responsive behavior
- **Potential Usage**:
  - `app.ts` - Header navigation context
  - Deep navigation pages
- **Pattern**: Standardize breadcrumb navigation

#### 9. Chip/Tag Component
- **Purpose**: Small labeled elements
- **Features**: Label, removable, color variants
- **Potential Usage**:
  - Field type indicators
  - Tag lists
  - Selected filters
- **Pattern**: Enhance `mat-chip` with theming

#### 10. Progress Indicator Component
- **Purpose**: Multi-step process indicator
- **Features**: Steps, current step, clickable navigation
- **Potential Usage**:
  - Wall creation wizard
  - Multi-step forms
  - Onboarding flows
- **Pattern**: Step-by-step progress display

### Lower Priority

#### 11. Data Table Component
- **Purpose**: Standardized data tables
- **Features**: Sorting, pagination, selection, actions
- **Potential Usage**:
  - Admin panels
  - User management
  - Audit logs
- **Current State**: Not currently needed

#### 12. File Upload Component
- **Purpose**: Consistent file upload interface
- **Features**: Drag-drop, preview, progress, validation
- **Potential Usage**:
  - `dynamic-field-renderer.component.html` (lines 239-281) - File fields
  - Image upload services
  - Wall item attachments
- **Pattern**: Replace hidden input + button patterns

#### 13. Date Picker Component
- **Purpose**: Consistent date selection
- **Features**: Calendar, time selection, range selection
- **Potential Usage**:
  - `dynamic-field-renderer.component.html` (lines 123-145)
- **Note**: Material datepicker is sufficient

#### 14. Toggle/Switch Component
- **Purpose**: Binary on/off controls
- **Features**: Label, disabled state, form integration
- **Potential Usage**:
  - 17 files using `mat-slide-toggle`
  - Settings toggles
  - Permission switches
- **Pattern**: Themed wrapper for consistency

#### 15. Tooltip Component
- **Purpose**: Consistent tooltips
- **Features**: Positioning, delay, mobile support
- **Potential Usage**:
  - 7 files using `matTooltip`
  - Help text
  - Truncated content
- **Note**: Material tooltips may be sufficient

## Usage Summary

### Most Used Components
1. **EmptyStateComponent** - 6 files
2. **LoadingStateComponent** - 4 files  
3. **SideButtonComponent** - 3 files (multiple instances)
4. **ButtonGroupComponent** - 3 files

### Unused Components (Opportunities)
1. **PageLayoutComponent** - Could standardize all page layouts
2. **IconContainerComponent** - Could standardize icon displays
3. **StatsItemComponent** - Could be used for metrics/dashboards

### Highest Impact New Components
1. **Card Component** - Would replace 5+ different card implementations
2. **Form Field Wrapper** - Would standardize hundreds of form fields
3. **File Upload Component** - Would unify file handling patterns
4. **Search Input Component** - Would standardize all search patterns

## Implementation Priority

### ✅ Phase 1 - Maximum Impact (COMPLETED)
1. **Card Component** - ✅ Created and implemented in template library
2. **Form Field Wrapper** - ✅ Created and implemented in dynamic field renderer
3. **PageLayoutComponent** - ✅ Implemented in object type selection page

### ✅ Phase 2 - Improve Consistency (COMPLETED)  
1. **Search Input Component** - ✅ Created with full Material 3 support
2. **Confirmation Dialog Component** - ✅ Created with service and implemented in delete button
3. **Action Menu Component** - ✅ Created and integrated with Card Component

### Phase 3 - Future Enhancements
1. **File Upload Component** - Would unify file handling patterns
2. **Themed Toggle Component** - Would standardize toggle styling
3. Implement **IconContainerComponent** usage
4. Implement **StatsItemComponent** usage
5. Additional components as needed

## ✅ COMPLETED IMPLEMENTATIONS

### New Components Created
1. **CardComponent** - Material 3 compliant card with variants, actions, and menu support
2. **FormFieldComponent** - Wrapper for consistent form field styling and behavior
3. **SearchInputComponent** - Advanced search with autocomplete, suggestions, and voice support
4. **ConfirmationDialogComponent** - Material 3 confirmation dialogs with service
5. **ConfirmationDialogService** - Easy-to-use service for common confirmations
6. **ActionMenuComponent** - Flexible action menus with three-dots and button triggers

### Replacements Completed
1. **Template Library Cards** - Replaced with CardComponent (5+ implementations unified)
2. **Delete Button** - Replaced window.confirm() with ConfirmationDialogService
3. **Dynamic Field Renderer** - Text and textarea fields now use FormFieldComponent
4. **Object Type Selection Page** - Now uses PageLayoutComponent
5. **Card Menu Systems** - Integrated ActionMenuComponent for consistent overflow menus

## Migration Strategy

### For New Components
1. Create component in shared/components
2. Add to shared/components/index.ts
3. Replace usage incrementally
4. Update affected tests

### For Unused Existing Components
1. Identify all potential usage locations
2. Create migration plan
3. Update components to use shared version
4. Remove duplicated code

## Component Categories

### Layout Components
- Page layouts (header + content variations)
- Grid layouts
- Flex layouts
- Sidebar layouts
- Split-pane layouts

### Form Components
- Text inputs (with variations)
- Select dropdowns
- Checkboxes and radio buttons
- File uploads
- Date/time pickers
- Form sections/groups

### Navigation Components
- Headers
- Sidebars
- Breadcrumbs
- Tabs
- Steppers
- Pagination

### Display Components
- Cards
- Lists
- Tables
- Accordions
- Chips/tags
- Badges

### Feedback Components
- Alerts/notifications
- Toasts/snackbars
- Progress indicators
- Loading states
- Empty states
- Error states

### Interactive Components
- Buttons (all variants)
- Menus
- Dialogs/modals
- Tooltips
- Popovers

### Data Entry Components
- Search inputs
- Filters
- Sorting controls
- Pagination controls

## Design System Considerations

### Spacing System
- Consistent padding/margin scales
- Component spacing presets

### Color System
- Theme-aware components
- Dark/light mode support
- Brand color integration

### Typography System
- Consistent text styles
- Responsive font sizes

### Icon System
- Material Icons integration
- Custom icon support
- Icon sizing standards

### Animation System
- Consistent transitions
- Loading animations
- Hover/focus states

## Implementation Guidelines

### Component Structure
```typescript
@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [CommonModule, MaterialModules],
  template: `...`,
  styles: [`...`]
})
export class ComponentNameComponent {
  // Input/Output properties
  // Component logic
}
```

### Theming Support
- Use CSS custom properties
- Support Material Design 3 tokens
- Allow theme overrides

### Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

### Mobile Responsiveness
- Touch-friendly targets
- Responsive layouts
- Mobile-specific variants

### Testing
- Unit tests for logic
- Component tests for rendering
- Accessibility tests
- Visual regression tests