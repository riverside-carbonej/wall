import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { WallMenuItem, WallNavigationContext, AddMode, WallObjectTypeNav } from '../models/navigation.model';
import { Wall, WallObjectType } from '../models/wall.model';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private _isMenuOpen = new BehaviorSubject<boolean>(false);
  private _currentContext = new BehaviorSubject<WallNavigationContext | null>(null);
  private _currentAddMode = new BehaviorSubject<AddMode>(AddMode.WallItem);

  public isMenuOpen$ = this._isMenuOpen.asObservable();
  public currentContext$ = this._currentContext.asObservable();
  public currentAddMode$ = this._currentAddMode.asObservable();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  get isMenuOpen(): boolean {
    return this._isMenuOpen.value;
  }

  set isMenuOpen(value: boolean) {
    this._isMenuOpen.next(value);
  }

  get currentContext(): WallNavigationContext | null {
    return this._currentContext.value;
  }

  get currentAddMode(): AddMode {
    return this._currentAddMode.value;
  }

  // Update navigation context when user enters a wall
  updateWallContext(wall: Wall, canEdit: boolean = false, canAdmin: boolean = false) {
    const objectTypes: WallObjectTypeNav[] = (wall.objectTypes || []).map(ot => ({
      id: ot.id,
      name: ot.name,
      icon: ot.icon || 'category',
      pluralName: this.generatePluralName(ot.name),
      itemCount: 0 // TODO: Get actual count from service
    }));

    const context: WallNavigationContext = {
      wallId: wall.id!,
      wallName: wall.name,
      objectTypes,
      canEdit,
      canAdmin
    };

    this._currentContext.next(context);
    this.updateAddMode();
  }
  
  // Generate plural names intelligently
  private generatePluralName(singular: string): string {
    // Handle common irregular plurals
    const irregulars: { [key: string]: string } = {
      'person': 'people',
      'child': 'children',
      'man': 'men',
      'woman': 'women',
      'foot': 'feet',
      'tooth': 'teeth',
      'mouse': 'mice',
      'goose': 'geese'
    };
    
    const lower = singular.toLowerCase();
    if (irregulars[lower]) {
      return irregulars[lower];
    }
    
    // Handle regular plural rules
    if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
      return singular.slice(0, -1) + 'ies';
    }
    if (lower.endsWith('s') || lower.endsWith('sh') || lower.endsWith('ch') || lower.endsWith('x') || lower.endsWith('z')) {
      return singular + 'es';
    }
    if (lower.endsWith('f')) {
      return singular.slice(0, -1) + 'ves';
    }
    if (lower.endsWith('fe')) {
      return singular.slice(0, -2) + 'ves';
    }
    
    // Default: just add 's'
    return singular + 's';
  }

  // Clear context when leaving wall
  clearWallContext() {
    this._currentContext.next(null);
    this._currentAddMode.next(AddMode.Wall);
  }

  // Update add mode based on current route
  updateAddMode() {
    const url = this.router.url;
    if (url.includes('/walls') && url.includes('/items')) {
      this._currentAddMode.next(AddMode.WallItem);
    } else if (url.includes('/walls') && url.includes('/object-types')) {
      this._currentAddMode.next(AddMode.ObjectType);
    } else {
      this._currentAddMode.next(AddMode.Wall);
    }
  }

  // Get menu items based on current context
  getMenuItems(): WallMenuItem[] {
    const context = this.currentContext;
    
    const baseMenuItems: WallMenuItem[] = [
      {
        title: 'Home',
        icon: 'home',
        path: '/',
        condition: () => true
      }
    ];

    // Only show "All Walls" when NOT in a wall context
    if (!context) {
      baseMenuItems.push({
        title: 'All Walls',
        icon: 'dashboard',
        path: '/walls',
        condition: () => true
      });
      return baseMenuItems;
    }

    // Wall-specific menu items (only show when object types exist)
    const wallMenuItems: WallMenuItem[] = context.objectTypes.length > 0 ? [
      {
        title: 'Wall Overview',
        icon: 'view_quilt',
        path: `/walls/${context.wallId}`,
        condition: () => true
      },
      {
        title: 'All Items',
        icon: 'view_list',
        path: `/walls/${context.wallId}/items`,
        condition: () => true
      },
      {
        title: 'Map View',
        icon: 'map',
        path: `/walls/${context.wallId}/map`,
        condition: () => true
      }
    ] : [];

    // Add object type specific menu items
    const objectTypeMenuItems: WallMenuItem[] = context.objectTypes.map(ot => ({
      title: ot.pluralName,
      icon: ot.icon,
      path: `/walls/${context.wallId}/items`,
      condition: () => true,
      params: [{ name: 'objectType', value: ot.id }]
    }));

    // Admin menu items
    const adminMenuItems: WallMenuItem[] = [];
    if (context.canAdmin) {
      adminMenuItems.push(
        {
          title: 'Object Types',
          icon: 'category',
          path: `/walls/${context.wallId}/object-types`,
          condition: () => true
        },
        {
          title: 'Wall Settings',
          icon: 'settings',
          path: `/walls/${context.wallId}/settings`,
          condition: () => true
        },
        {
          title: 'Users & Permissions',
          icon: 'people',
          path: `/walls/${context.wallId}/users`,
          condition: () => true
        }
      );
    }

    return [
      ...baseMenuItems,
      ...wallMenuItems,
      ...objectTypeMenuItems
    ];
  }

  // Get active menu items (filtered by conditions)
  getActiveMenuItems(): WallMenuItem[] {
    return this.getMenuItems().filter(item => item.condition(this.currentContext?.wallId));
  }

  // Check if menu item is currently selected
  isMenuItemSelected(item: WallMenuItem): boolean {
    const currentUrl = this.router.url;
    const paths = Array.isArray(item.path) ? item.path : [item.path];
    
    return paths.some(path => {
      // Check if path matches
      const pathMatches = (currentUrl.includes(path) && path !== '' && path !== '/') || 
                         (currentUrl === path && (path === '' || path === '/'));
      
      // Check if query params match
      const queryParams = this.activatedRoute.snapshot.queryParams;
      const paramsMatch = item.params?.every(param => 
        queryParams[param.name] === param.value
      ) ?? true;
      
      // If item has no params, ensure no unexpected query params
      const noUnexpectedParams = !item.params || Object.keys(queryParams).length === 0;
      
      return pathMatches && paramsMatch && (item.params || noUnexpectedParams);
    });
  }

  // Navigate to menu item
  navigateToMenuItem(item: WallMenuItem) {
    const path = Array.isArray(item.path) ? item.path[0] : item.path;
    const queryParams: any = {};
    
    if (item.params) {
      item.params.forEach(param => {
        queryParams[param.name] = param.value;
      });
    }

    this.isMenuOpen = false;
    this.router.navigate([path], { queryParams });
  }

  // Navigate to add page based on current mode
  navigateToAddPage(objectTypeId?: string) {
    const context = this.currentContext;
    
    switch (this.currentAddMode) {
      case AddMode.Wall:
        this.router.navigate(['/walls/add']);
        break;
        
      case AddMode.WallItem:
        if (context && objectTypeId) {
          this.router.navigate([`/walls/${context.wallId}/items/add`], {
            queryParams: { objectType: objectTypeId }
          });
        } else if (context && context.objectTypes.length === 1) {
          // Auto-select single object type
          this.router.navigate([`/walls/${context.wallId}/items/add`], {
            queryParams: { objectType: context.objectTypes[0].id }
          });
        } else if (context) {
          // Let user choose object type
          this.router.navigate([`/walls/${context.wallId}/items/add`]);
        }
        break;
        
      case AddMode.ObjectType:
        if (context) {
          this.router.navigate([`/walls/${context.wallId}/object-types/add`]);
        }
        break;
    }
    
    this.isMenuOpen = false;
  }

  // Get add button text
  getAddButtonText(): string {
    const context = this.currentContext;
    
    switch (this.currentAddMode) {
      case AddMode.Wall:
        return 'Add Wall';
        
      case AddMode.WallItem:
        if (context && context.objectTypes.length === 1) {
          return `Add ${context.objectTypes[0].name}`;
        }
        return 'Add Item';
        
      case AddMode.ObjectType:
        return 'Add Object Type';
        
      default:
        return 'Add';
    }
  }

  // Check if user can add in current context
  canAdd(): boolean {
    const context = this.currentContext;
    
    switch (this.currentAddMode) {
      case AddMode.Wall:
        return true; // TODO: Check global permissions
        
      case AddMode.WallItem:
        return context?.canEdit ?? false;
        
      case AddMode.ObjectType:
        return context?.canAdmin ?? false;
        
      default:
        return false;
    }
  }
}