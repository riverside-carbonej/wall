import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private timeoutId?: number;
  private activitySubscription?: Subscription;
  private currentWallId?: string;
  private timeoutMinutes: number = 5; // default

  constructor(private router: Router) {}

  /**
   * Start monitoring user activity for a specific wall
   * @param wallId The wall ID to monitor
   * @param timeoutMinutes Minutes of inactivity before redirect (default 5)
   */
  startMonitoring(wallId: string, timeoutMinutes: number = 5): void {
    // Clear any existing monitoring
    this.stopMonitoring();

    this.currentWallId = wallId;
    this.timeoutMinutes = timeoutMinutes;

    // Set up activity listeners
    const activityEvents$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
      fromEvent(window, 'resize')
    );

    // Reset timer on any activity
    this.activitySubscription = activityEvents$
      .pipe(
        debounceTime(1000), // Debounce to avoid too many resets
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.resetTimer();
      });

    // Start the initial timer
    this.resetTimer();
  }

  /**
   * Stop monitoring user activity
   */
  stopMonitoring(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = undefined;
    }

    this.currentWallId = undefined;
  }

  /**
   * Reset the inactivity timer
   */
  private resetTimer(): void {
    // Clear existing timer
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Set new timer
    this.timeoutId = window.setTimeout(() => {
      this.handleTimeout();
    }, this.timeoutMinutes * 60 * 1000);
  }

  /**
   * Handle timeout - navigate to wall home page
   */
  private handleTimeout(): void {
    if (this.currentWallId) {
      console.log(`Inactivity timeout reached for wall ${this.currentWallId}. Redirecting to home page.`);
      // Navigate to the wall's home page
      this.router.navigate(['/walls', this.currentWallId]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopMonitoring();
  }
}