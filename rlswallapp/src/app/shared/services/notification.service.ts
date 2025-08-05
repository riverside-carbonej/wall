import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor() {}

  private showNotification(message: string, type: string, duration: number) {
    // For now, use console and alert as fallback
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // In production, this would integrate with a proper toast/snackbar library
    // For critical messages, show alert
    if (type === 'error') {
      alert(message);
    }
  }

  success(message: string, duration: number = 3000) {
    this.showNotification(message, 'success', duration);
  }

  error(message: string, duration: number = 5000) {
    this.showNotification(message, 'error', duration);
  }

  info(message: string, duration: number = 3000) {
    this.showNotification(message, 'info', duration);
  }

  warning(message: string, duration: number = 4000) {
    this.showNotification(message, 'warning', duration);
  }
}