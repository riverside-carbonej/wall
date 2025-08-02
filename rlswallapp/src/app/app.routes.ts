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
  { 
    path: 'firebase-test', 
    loadComponent: () => import('./shared/components/firebase-test.component').then(m => m.FirebaseTestComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/walls' }
];
