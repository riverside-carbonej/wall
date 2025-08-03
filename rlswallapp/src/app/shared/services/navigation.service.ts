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
  private _currentAddMode = new BehaviorSubject<AddMode>(AddMode.None);

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
  updateWallContext(wall: Wall, canEdit: boolean = false, canAdmin: boolean = false, itemCount: number = 0) {
    const objectTypes: WallObjectTypeNav[] = (wall.objectTypes || []).map(ot => ({
      id: ot.id,
      name: ot.name,
      icon: ot.icon || 'category',
      pluralName: this.generatePluralName(ot.name),
      itemCount: 0 // TODO: Get actual count from service per object type
    }));

    const context: WallNavigationContext = {
      wallId: wall.id!,
      wallName: wall.name,
      objectTypes,
      canEdit,
      canAdmin,
      totalItemCount: itemCount,
      hasLocationEnabledTypes: this.hasLocationEnabledObjectTypes(wall.objectTypes || [])
    };

    this._currentContext.next(context);
    this.updateAddMode();
  }

  // Check if any object types have location fields
  private hasLocationEnabledObjectTypes(objectTypes: WallObjectType[]): boolean {
    return objectTypes.some(ot => 
      ot.fields?.some(field => field.type === 'location') ||
      ot.displaySettings?.showOnMap === true
    );
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
    this._currentAddMode.next(AddMode.None);
  }

  // Update add mode based on current route
  updateAddMode() {
    const url = this.router.url;
    if (url.includes('/walls') && url.includes('/items')) {
      this._currentAddMode.next(AddMode.WallItem);
    } else if (url.includes('/walls') && url.includes('/object-types')) {
      this._currentAddMode.next(AddMode.ObjectType);
    } else if (url.includes('/walls') && url.includes('/item-presets')) {
      this._currentAddMode.next(AddMode.Preset);
    } else if (url.match(/\/walls\/[^\/]+\/?$/)) {
      // Wall home route (e.g., /walls/123 or /walls/123/)
      this._currentAddMode.next(AddMode.WallItem);
    } else if (url === '/walls' || url === '/walls/') {
      // Walls list page
      this._currentAddMode.next(AddMode.Wall);
    } else {
      // Default: no add button
      this._currentAddMode.next(AddMode.None);
    }
  }

  // Get menu items based on current context
  getMenuItems(): WallMenuItem[] {
    const context = this.currentContext;
    
    const baseMenuItems: WallMenuItem[] = [
      {
        title: 'Home',
        icon: 'home',
        path: context ? `/walls/${context.wallId}` : '/',
        condition: () => true
      }
    ];

    // If no wall context, add "All Walls" and return basic menu
    if (!context) {
      baseMenuItems.push({
        title: 'All Walls',
        icon: 'dashboard', 
        path: '/walls',
        condition: () => true
      });
      return baseMenuItems;
    }

    // Wall-specific menu items (conditionally shown)
    const wallMenuItems: WallMenuItem[] = [
      {
        title: 'Overview',
        icon: 'view_quilt',
        path: `/walls/${context.wallId}/overview`,
        condition: () => true
      }
    ];

    // Only show "All Items" if there are items or object types configured
    if ((context.totalItemCount && context.totalItemCount > 0) || (context.objectTypes && context.objectTypes.length > 0)) {
      wallMenuItems.push({
        title: 'All Items',
        icon: 'view_list',
        path: `/walls/${context.wallId}/items`,
        condition: () => true
      });
    }

    // Only show "Map View" if there are object types with location fields and items exist
    if (context.hasLocationEnabledTypes && context.totalItemCount && context.totalItemCount > 0) {
      wallMenuItems.push({
        title: 'Map View',
        icon: 'map',
        path: `/walls/${context.wallId}/map`,
        condition: () => true
      });
    }

    // Add object type specific menu items (only if they have items)
    const objectTypeMenuItems: WallMenuItem[] = context.objectTypes
      .filter(ot => ot.itemCount > 0) // Only show object types that have items
      .map(ot => ({
        title: ot.pluralName,
        icon: ot.icon,
        path: `/walls/${context.wallId}/items`,
        condition: () => true,
        params: [{ name: 'objectType', value: ot.id }]
      }));

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
      // Split both URLs to compare segments more precisely
      const currentSegments = currentUrl.split('?')[0].split('/').filter(s => s);
      const pathSegments = path.split('/').filter(s => s);
      
      // For exact path matches only
      const isExactMatch = currentSegments.length === pathSegments.length && 
                          pathSegments.every((segment, index) => segment === currentSegments[index]);
      
      if (!isExactMatch) {
        return false;
      }
      
      // Check query params if item has them
      if (item.params) {
        // Parse query params from current URL instead of relying on activatedRoute
        const urlParts = currentUrl.split('?');
        const queryParams: { [key: string]: string } = {};
        
        if (urlParts.length > 1) {
          const searchParams = new URLSearchParams(urlParts[1]);
          searchParams.forEach((value, key) => {
            queryParams[key] = value;
          });
        }
        
        const paramsMatch = item.params.every(param => 
          queryParams[param.name] === param.value
        );
        return paramsMatch;
      }
      
      // If item has no params, ensure current URL doesn't have conflicting query params
      const hasQueryParams = currentUrl.includes('?');
      return !hasQueryParams;
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
        
      case AddMode.Preset:
        if (context) {
          // Navigate to preset page and let the component handle the creation
          this.router.navigate([`/walls/${context.wallId}/item-presets`]);
          // The preset page will handle creating a new preset via its createNewPreset() method
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
        
      case AddMode.Preset:
        return 'Add Preset';
        
      case AddMode.None:
      default:
        return '';
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
        
      case AddMode.Preset:
        return context?.canAdmin ?? false;
        
      case AddMode.None:
      default:
        return false;
    }
  }
}