import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
  icon?: string;
  iconColor?: 'primary' | 'warn' | 'accent' | 'default';
  details?: string;
  destructive?: boolean;
  showCancel?: boolean;
  width?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  /**
   * Opens a confirmation dialog using native browser confirm
   */
  confirm(options: ConfirmationOptions): Observable<boolean> {
    return new Observable<boolean>(observer => {
      const message = `${options.title}\n\n${options.message}`;
      const result = window.confirm(message);
      observer.next(result);
      observer.complete();
    });
  }
  
  /**
   * Quick confirmation dialog for common use cases
   */
  confirmDelete(itemName?: string): Observable<boolean> {
    return this.confirm({
      title: 'Delete Item',
      message: itemName 
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'warn',
      icon: 'delete',
      iconColor: 'warn',
      destructive: true
    });
  }
  
  /**
   * Quick confirmation for unsaved changes
   */
  confirmUnsavedChanges(): Observable<boolean> {
    return this.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving?',
      confirmText: 'Leave',
      cancelText: 'Stay',
      confirmColor: 'warn',
      icon: 'warning',
      iconColor: 'warn',
      destructive: true
    });
  }
  
  /**
   * Quick confirmation for logout
   */
  confirmLogout(): Observable<boolean> {
    return this.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      confirmColor: 'primary',
      icon: 'logout',
      iconColor: 'primary'
    });
  }
  
  /**
   * Quick confirmation for publishing
   */
  confirmPublish(itemName?: string): Observable<boolean> {
    return this.confirm({
      title: 'Publish Item',
      message: itemName 
        ? `Are you sure you want to publish "${itemName}"? It will be visible to all users.`
        : 'Are you sure you want to publish this item? It will be visible to all users.',
      confirmText: 'Publish',
      cancelText: 'Cancel',
      confirmColor: 'primary',
      icon: 'publish',
      iconColor: 'primary'
    });
  }
  
  /**
   * Quick confirmation for archiving
   */
  confirmArchive(itemName?: string): Observable<boolean> {
    return this.confirm({
      title: 'Archive Item',
      message: itemName 
        ? `Are you sure you want to archive "${itemName}"? It will be moved to the archive.`
        : 'Are you sure you want to archive this item? It will be moved to the archive.',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      confirmColor: 'accent',
      icon: 'archive',
      iconColor: 'accent'
    });
  }
  
  /**
   * Quick confirmation for reset/clear operations
   */
  confirmReset(action = 'reset'): Observable<boolean> {
    return this.confirm({
      title: `Reset ${action}`,
      message: `Are you sure you want to ${action}? All current data will be lost.`,
      confirmText: 'Reset',
      cancelText: 'Cancel',
      confirmColor: 'warn',
      icon: 'refresh',
      iconColor: 'warn',
      destructive: true
    });
  }
  
  /**
   * Custom action confirmation
   */
  confirmAction(options: {
    title: string;
    message: string;
    actionText: string;
    dangerous?: boolean;
    icon?: string;
  }): Observable<boolean> {
    return this.confirm({
      title: options.title,
      message: options.message,
      confirmText: options.actionText,
      cancelText: 'Cancel',
      confirmColor: options.dangerous ? 'warn' : 'primary',
      icon: options.icon,
      iconColor: options.dangerous ? 'warn' : 'primary',
      destructive: options.dangerous
    });
  }
}