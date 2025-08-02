import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../services/user.service';
import { WallUserEntity } from '../models/user.model';

export interface PermissionDirectiveContext {
  user: WallUserEntity | null;
  wallId?: string;
}

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;
  private context: PermissionDirectiveContext = { user: null };

  @Input() set appHasPermission(condition: (user: WallUserEntity, wallId?: string) => boolean) {
    this.permissionCheck = condition;
    this.updateView();
  }

  @Input() set appHasPermissionWallId(wallId: string) {
    this.wallId = wallId;
    this.context.wallId = wallId;
    this.updateView();
  }

  @Input() set appHasPermissionElse(templateRef: TemplateRef<any>) {
    this.elseTemplate = templateRef;
    this.updateView();
  }

  private permissionCheck?: (user: WallUserEntity, wallId?: string) => boolean;
  private wallId?: string;
  private elseTemplate?: TemplateRef<any>;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.context.user = user;
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const hasPermission = this.checkPermission();

    if (hasPermission && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef, this.context);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
      
      if (this.elseTemplate) {
        this.viewContainer.createEmbeddedView(this.elseTemplate, this.context);
      }
    } else if (!hasPermission && !this.hasView && this.elseTemplate) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.elseTemplate, this.context);
    }
  }

  private checkPermission(): boolean {
    if (!this.permissionCheck || !this.context.user) {
      return false;
    }

    if (!this.context.user.active) {
      return false;
    }

    return this.permissionCheck(this.context.user, this.wallId);
  }
}

// Convenience directive for common permission checks
@Directive({
  selector: '[appCanEdit]',
  standalone: true
})
export class CanEditDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appCanEdit(resourceType: 'wall' | 'items' | 'users' | 'objectTypes') {
    this.resourceType = resourceType;
    this.updateView();
  }

  @Input() set appCanEditWallId(wallId: string) {
    this.wallId = wallId;
    this.updateView();
  }

  private resourceType?: 'wall' | 'items' | 'users' | 'objectTypes';
  private wallId?: string;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const canEdit = this.checkCanEdit();

    if (canEdit && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!canEdit && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkCanEdit(): boolean {
    const user = this.userService.getCurrentUser();
    if (!user || !user.active || !this.wallId || !this.resourceType) {
      return false;
    }

    switch (this.resourceType) {
      case 'wall':
        return user.canEditWall(this.wallId);
      case 'items':
        return user.canEditWallItems(this.wallId);
      case 'users':
        return user.canEditWallUsers(this.wallId);
      case 'objectTypes':
        return user.canEditObjectTypes(this.wallId);
      default:
        return false;
    }
  }
}

// Convenience directive for checking if user can add resources
@Directive({
  selector: '[appCanAdd]',
  standalone: true
})
export class CanAddDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appCanAdd(resourceType: 'items' | 'users' | 'objectTypes') {
    this.resourceType = resourceType;
    this.updateView();
  }

  @Input() set appCanAddWallId(wallId: string) {
    this.wallId = wallId;
    this.updateView();
  }

  private resourceType?: 'items' | 'users' | 'objectTypes';
  private wallId?: string;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const canAdd = this.checkCanAdd();

    if (canAdd && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!canAdd && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkCanAdd(): boolean {
    const user = this.userService.getCurrentUser();
    if (!user || !user.active || !this.wallId || !this.resourceType) {
      return false;
    }

    switch (this.resourceType) {
      case 'items':
        return user.canAddWallItems(this.wallId);
      case 'users':
        return user.canInviteUsers(this.wallId);
      case 'objectTypes':
        return user.canAddObjectTypes(this.wallId);
      default:
        return false;
    }
  }
}

// Directive to check if user owns a specific item
@Directive({
  selector: '[appOwnsItem]',
  standalone: true
})
export class OwnsItemDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appOwnsItem(item: { createdBy?: string }) {
    this.item = item;
    this.updateView();
  }

  @Input() set appOwnsItemWallId(wallId: string) {
    this.wallId = wallId;
    this.updateView();
  }

  @Input() set appOwnsItemAction(action: 'edit' | 'delete') {
    this.action = action;
    this.updateView();
  }

  private item?: { createdBy?: string };
  private wallId?: string;
  private action: 'edit' | 'delete' = 'edit';

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const canPerformAction = this.checkItemPermission();

    if (canPerformAction && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!canPerformAction && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkItemPermission(): boolean {
    const user = this.userService.getCurrentUser();
    if (!user || !user.active || !this.wallId || !this.item) {
      return false;
    }

    switch (this.action) {
      case 'edit':
        return user.canEditItem(this.wallId, this.item);
      case 'delete':
        return user.canDeleteItem(this.wallId, this.item);
      default:
        return false;
    }
  }
}