# Development Guide

## Setup & Configuration

### Prerequisites
```bash
# Node.js 18+ required
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Angular CLI
npm install -g @angular/cli@latest
ng version
```

### Project Setup
```bash
# Clone repository
git clone [repository-url]
cd rlswallapp

# Install dependencies
npm install

# Environment configuration
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.prod.example.ts src/environments/environment.prod.ts

# Add Firebase configuration to environment files
```

### Firebase Configuration
1. Create project at https://console.firebase.google.com
2. Enable Firestore Database
3. Enable Authentication (Google, Email/Password)
4. Get config object from Project Settings
5. Add to `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  }
};
```

## Development Workflow

### Local Development
```bash
# Start development server
ng serve

# Run with specific port
ng serve --port 4200

# Open browser automatically
ng serve --open
```

### Code Quality
```bash
# Linting
ng lint

# Fix linting issues
ng lint --fix

# Type checking
ng build --dry-run

# Unit tests
ng test

# E2E tests
ng e2e
```

### Build Process
```bash
# Development build
ng build

# Production build
ng build --configuration production

# Analyze bundle size
ng build --stats-json
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer dist/rlswallapp/stats.json
```

## Code Style & Standards

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Strict null checks
- Consistent naming conventions

### Angular Patterns
```typescript
// Use standalone components
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  // ...
})

// Use signals for state management
export class ExampleComponent {
  data = signal<Data[]>([]);
  loading = signal(false);
}

// Use reactive forms
export class FormComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });
}
```

### CSS Standards
```css
/* Use CSS custom properties */
.component {
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}

/* Follow Material 3 patterns */
.button {
  border-radius: 20px;
  padding: 10px 24px;
  font-family: 'Google Sans', sans-serif;
}

/* Use semantic class names */
.wall-item-card { /* ✅ Good */ }
.blue-box { /* ❌ Avoid */ }
```

### File Organization
```
src/app/
├── features/                 # Feature modules
│   ├── walls/
│   │   ├── components/
│   │   │   ├── wall-list/
│   │   │   ├── wall-form/
│   │   │   └── wall-viewer/
│   │   ├── services/
│   │   │   └── wall.service.ts
│   │   └── models/
│   │       └── wall.model.ts
│   └── wall-items/
├── shared/                   # Shared utilities
│   ├── services/
│   ├── models/
│   └── components/
└── core/                     # Core functionality
    ├── guards/
    ├── interceptors/
    └── services/
```

## Firebase Development

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Walls collection
    match /walls/{wallId} {
      allow read: if resource.data.isPublic == true || 
                     resource.data.ownerId == request.auth.uid;
      allow write: if resource.data.ownerId == request.auth.uid;
    }
    
    // Wall items collection
    match /wall_items/{itemId} {
      allow read, write: if exists(/databases/$(database)/documents/walls/$(resource.data.wallId)) &&
                           get(/databases/$(database)/documents/walls/$(resource.data.wallId)).data.ownerId == request.auth.uid;
    }
  }
}
```

### Data Modeling Best Practices
```typescript
// Use server timestamps
const wall = {
  name: 'My Wall',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

// Structure for queries
const wallItem = {
  wallId: 'wall123',  // For filtering
  data: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  searchableText: 'john doe john@example.com'  // For text search
};
```

### Local Development with Emulators
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Start emulators
firebase emulators:start

# Use emulators in development
export const environment = {
  production: false,
  useEmulators: true,
  firebase: { /* config */ }
};
```

## Testing Strategy

### Unit Testing
```typescript
// Component testing
describe('WallListComponent', () => {
  let component: WallListComponent;
  let fixture: ComponentFixture<WallListComponent>;
  let mockWallService: jasmine.SpyObj<WallService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('WallService', ['getAllWalls']);
    
    TestBed.configureTestingModule({
      imports: [WallListComponent],
      providers: [
        { provide: WallService, useValue: spy }
      ]
    });
    
    fixture = TestBed.createComponent(WallListComponent);
    component = fixture.componentInstance;
    mockWallService = TestBed.inject(WallService) as jasmine.SpyObj<WallService>;
  });

  it('should load walls on init', () => {
    mockWallService.getAllWalls.and.returnValue(of([]));
    component.ngOnInit();
    expect(mockWallService.getAllWalls).toHaveBeenCalled();
  });
});
```

### Integration Testing
```typescript
// Service testing with Firebase
describe('WallService', () => {
  let service: WallService;
  let firestore: Firestore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [provideFirebaseApp(() => initializeApp(environment.firebase))]
    });
    
    service = TestBed.inject(WallService);
    firestore = TestBed.inject(Firestore);
  });

  it('should create wall', async () => {
    const wall = { name: 'Test Wall' };
    const result = await firstValueFrom(service.createWall(wall));
    expect(result).toBeTruthy();
  });
});
```

### E2E Testing
```typescript
// Cypress/Playwright tests
describe('Wall Creation Flow', () => {
  it('should create wall from template', () => {
    cy.visit('/');
    cy.get('[data-cy=alumni-template]').click();
    cy.get('[data-cy=wall-name]').should('have.value', 'Alumni Directory');
    cy.get('[data-cy=save-button]').click();
    cy.url().should('include', '/walls/');
  });
});
```

## Performance Optimization

### Bundle Optimization
```typescript
// Lazy loading
const routes: Routes = [
  {
    path: 'walls',
    loadComponent: () => import('./features/walls/wall-list.component')
  }
];

// Tree shaking
import { map } from 'rxjs/operators';  // ✅ Specific import
import * as rxjs from 'rxjs';          // ❌ Avoid
```

### Change Detection
```typescript
// OnPush strategy
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  // Use signals for reactive updates
  data = signal<Data[]>([]);
}
```

### Image Optimization
```html
<!-- Responsive images -->
<img 
  src="image.jpg"
  srcset="image-320w.jpg 320w, image-640w.jpg 640w"
  sizes="(max-width: 320px) 280px, 640px"
  loading="lazy"
  alt="Description">
```

## Deployment

### Development Deployment
```bash
# Build for staging
ng build --configuration staging

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy with custom message
firebase deploy --only hosting -m "Feature: Add wall templates"
```

### Production Deployment
```bash
# Build for production
ng build --configuration production

# Run production tests
npm run test:prod

# Deploy to production
firebase deploy --only hosting --project production

# Verify deployment
firebase hosting:channel:list
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run build:prod
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

## Debugging

### Development Tools
```typescript
// Environment-based debugging
if (!environment.production) {
  console.log('Debug info:', data);
}

// Firebase debugging
import { connectFirestoreEmulator } from 'firebase/firestore';

if (!environment.production) {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
}
```

### Performance Debugging
```bash
# Angular DevTools
ng add @angular/devtools

# Bundle analysis
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json

# Lighthouse audits
npm install -g lighthouse
lighthouse http://localhost:4200 --output html
```

## Security Considerations

### Input Validation
```typescript
// Sanitize user input
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

sanitizeHtml(html: string) {
  return this.sanitizer.sanitize(SecurityContext.HTML, html);
}
```

### Authentication
```typescript
// Auth guard
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(): Observable<boolean> {
    return authState(this.auth).pipe(
      map(user => {
        if (user) return true;
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
```

---

*Last updated: January 2025*