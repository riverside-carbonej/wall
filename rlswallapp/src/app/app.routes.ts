import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/walls', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./auth/components/login.component').then(m => m.LoginComponent) },
  { 
    path: 'walls', 
    loadComponent: () => import('./features/walls/components/wall-list/wall-list.component').then(m => m.WallListComponent),
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
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/:id', 
    loadComponent: () => import('./features/walls/components/wall-viewer/wall-viewer.component').then(m => m.WallViewerComponent),
    canActivate: [AuthGuard]
  },
  
  // Wall Item Management Routes
  { 
    path: 'walls/:wallId/items', 
    loadComponent: () => import('./features/wall-items/pages/wall-item-list/wall-item-list.component').then(m => m.WallItemListComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/:wallId/items/add', 
    loadComponent: () => import('./features/wall-items/pages/wall-item-add-page/wall-item-add-page.component').then(m => m.WallItemAddPageComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/:wallId/items/:itemId', 
    loadComponent: () => import('./features/wall-items/pages/generic-wall-item-page/generic-wall-item-page.component').then(m => m.GenericWallItemPageComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'walls/:wallId/items/:itemId/edit', 
    loadComponent: () => import('./features/wall-items/pages/generic-wall-item-page/generic-wall-item-page.component').then(m => m.GenericWallItemPageComponent),
    canActivate: [AuthGuard]
  },
  
  // Map View Route
  { 
    path: 'walls/:wallId/map', 
    loadComponent: () => import('./features/maps/components/map-view/map-view.component').then(m => m.MapViewComponent),
    canActivate: [AuthGuard]
  },
  
  // Placeholder routes for future admin features
  // TODO: Create these components in Phase 4.3+
  { 
    path: 'firebase-test', 
    loadComponent: () => import('./shared/components/firebase-test.component').then(m => m.FirebaseTestComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/walls' }
];
