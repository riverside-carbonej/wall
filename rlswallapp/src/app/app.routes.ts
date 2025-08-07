import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { wallContextGuard } from './core/guards/wall-context.guard';
import { wallContextSimpleGuard } from './core/guards/wall-context-simple.guard';
import { publicWallGuard } from './core/guards/public-wall.guard';
import { publicWallContextGuard } from './core/guards/public-wall-context.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/walls', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./auth/components/login.component').then(m => m.LoginComponent) },
  {
    path: 'admin/bugs',
    loadComponent: () => import('./features/admin/bug-reports-dashboard.component').then(m => m.BugReportsDashboardComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls', 
    loadComponent: () => import('./features/walls/components/wall-list/wall-list.component').then(m => m.WallListComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/recycle', 
    loadComponent: () => import('./features/walls/components/recycle-bin/recycle-bin.component').then(m => m.RecycleBinComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/create', 
    loadComponent: () => import('./features/walls/components/wall-form/wall-form.component').then(m => m.WallFormComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/:id/edit', 
    loadComponent: () => import('./features/walls/components/wall-form/wall-form.component').then(m => m.WallFormComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:id', 
    loadComponent: () => import('./features/walls/components/wall-home/wall-home.component').then(m => m.WallHomeComponent),
    canActivate: [publicWallGuard, publicWallContextGuard]
  },
  { 
    path: 'walls/:id/overview', 
    loadComponent: () => import('./features/walls/components/wall-overview/wall-overview.component').then(m => m.WallOverviewComponent),
    canActivate: [publicWallGuard, publicWallContextGuard]
  },
  { 
    path: 'walls/:id/presets', 
    loadComponent: () => import('./features/walls/components/wall-item-presets/wall-item-presets.component').then(m => m.WallItemPresetsComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:id/presets/add', 
    loadComponent: () => import('./features/walls/pages/add-preset/add-preset.component').then(m => m.AddPresetComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:id/presets/:presetId/edit', 
    loadComponent: () => import('./features/walls/pages/edit-preset/edit-preset.component').then(m => m.EditPresetComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:id/permissions', 
    loadComponent: () => import('./features/walls/components/users-permissions/users-permissions-v2.component').then(m => m.UsersPermissionsV2Component),
    canActivate: [AuthGuard, wallContextGuard]
  },
  
  // Preset-based Wall Item Management Routes
  { 
    path: 'walls/:wallId/preset/:presetId/items', 
    loadComponent: () => import('./features/wall-items/pages/preset-item-list/preset-item-list.component').then(m => m.PresetItemListComponent),
    canActivate: [publicWallGuard, publicWallContextGuard]
  },
  { 
    path: 'walls/:wallId/preset/:presetId/items/add', 
    loadComponent: () => import('./features/wall-items/pages/preset-item-add/preset-item-add.component').then(m => m.PresetItemAddComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:wallId/preset/:presetId/items/:itemId', 
    loadComponent: () => import('./features/wall-items/pages/preset-item-page/preset-item-page.component').then(m => m.PresetItemPageComponent),
    canActivate: [publicWallGuard, publicWallContextGuard]
  },
  { 
    path: 'walls/:wallId/preset/:presetId/items/:itemId/edit', 
    loadComponent: () => import('./features/wall-items/pages/preset-item-page/preset-item-page.component').then(m => m.PresetItemPageComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  
  // Legacy Wall Item Management Routes (kept for backwards compatibility)
  { 
    path: 'walls/:wallId/items', 
    loadComponent: () => import('./features/wall-items/pages/wall-item-list/wall-item-list.component').then(m => m.WallItemListComponent),
    canActivate: [publicWallGuard, publicWallContextGuard]
  },
  { 
    path: 'walls/:wallId/items/select-type', 
    loadComponent: () => import('./features/wall-items/pages/object-type-selection-page/object-type-selection-page.component').then(m => m.ObjectTypeSelectionPageComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:wallId/items/add', 
    loadComponent: () => import('./features/wall-items/pages/wall-item-add-page/wall-item-add-page.component').then(m => m.WallItemAddPageComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  { 
    path: 'walls/:wallId/items/:itemId', 
    loadComponent: () => import('./features/wall-items/pages/generic-wall-item-page/generic-wall-item-page.component').then(m => m.GenericWallItemPageComponent),
    canActivate: [publicWallGuard, publicWallContextGuard]
  },
  { 
    path: 'walls/:wallId/items/:itemId/edit', 
    loadComponent: () => import('./features/wall-items/pages/generic-wall-item-page/generic-wall-item-page.component').then(m => m.GenericWallItemPageComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  
  // Map View Route
  { 
    path: 'walls/:wallId/map', 
    loadComponent: () => import('./features/maps/components/map-view/map-view.component').then(m => m.MapViewComponent),
    canActivate: [AuthGuard, wallContextGuard]
  },
  
  // Placeholder routes for future admin features
  // TODO: Create these components in Phase 4.3+
  { 
    path: 'firebase-test', 
    loadComponent: () => import('./shared/components/firebase-test.component').then(m => m.FirebaseTestComponent),
    canActivate: [AuthGuard]
  },
  // Short link route - must be second to last to avoid catching other routes
  {
    path: ':shortId',
    loadComponent: () => import('./core/components/short-link-redirect/short-link-redirect.component').then(m => m.ShortLinkRedirectComponent)
  },
  { path: '**', redirectTo: '/walls' }
];
