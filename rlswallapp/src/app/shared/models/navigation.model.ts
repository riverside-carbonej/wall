export interface WallMenuItem {
  title: string;
  icon: string;
  path: string | string[];
  condition: (wallId?: string) => boolean;
  params?: { name: string; value: string }[];
  requiresAuth?: boolean;
  permissions?: string[];
}

export interface WallNavigationContext {
  wallId: string;
  wallName: string;
  objectTypes: WallObjectTypeNav[];
  canEdit: boolean;
  canAdmin: boolean;
  totalItemCount?: number;
  hasLocationEnabledTypes?: boolean;
}

export interface WallObjectTypeNav {
  id: string;
  name: string;
  icon: string;
  pluralName: string;
  itemCount: number;
}

export enum AddMode {
  WallItem = 'wall-item',
  ObjectType = 'object-type', 
  Wall = 'wall'
}