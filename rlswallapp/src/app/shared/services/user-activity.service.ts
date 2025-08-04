import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

interface WallActivity {
  wallId: string;
  wallName: string;
  lastVisited: Date;
  visitCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserActivityService {
  private readonly STORAGE_KEY = 'wall_user_activity';
  private readonly MAX_RECENT_WALLS = 10;
  
  private recentWalls$ = new BehaviorSubject<WallActivity[]>([]);

  constructor(private authService: AuthService) {
    this.loadRecentWalls();
    
    // Clear activity when user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadRecentWalls();
      } else {
        this.clearActivity();
      }
    });
  }

  /**
   * Track that a user visited a wall
   */
  trackWallVisit(wallId: string, wallName: string): void {
    if (!wallId || !wallName) return;
    
    const currentActivity = this.recentWalls$.value;
    const existingIndex = currentActivity.findIndex(activity => activity.wallId === wallId);
    
    const now = new Date();
    
    if (existingIndex >= 0) {
      // Update existing activity
      currentActivity[existingIndex] = {
        ...currentActivity[existingIndex],
        wallName, // Update name in case it changed
        lastVisited: now,
        visitCount: currentActivity[existingIndex].visitCount + 1
      };
    } else {
      // Add new activity
      const newActivity: WallActivity = {
        wallId,
        wallName,
        lastVisited: now,
        visitCount: 1
      };
      currentActivity.unshift(newActivity);
    }
    
    // Sort by last visited (most recent first)
    currentActivity.sort((a, b) => b.lastVisited.getTime() - a.lastVisited.getTime());
    
    // Keep only the most recent walls
    const limitedActivity = currentActivity.slice(0, this.MAX_RECENT_WALLS);
    
    this.recentWalls$.next(limitedActivity);
    this.saveRecentWalls(limitedActivity);
  }

  /**
   * Get recently visited walls
   */
  getRecentWalls(): Observable<WallActivity[]> {
    return this.recentWalls$.asObservable();
  }

  /**
   * Get recently visited wall IDs (for easy filtering)
   */
  getRecentWallIds(): Observable<string[]> {
    return new Observable(observer => {
      this.recentWalls$.subscribe(activities => {
        observer.next(activities.map(activity => activity.wallId));
      });
    });
  }

  /**
   * Remove a wall from recent activity (e.g., when deleted)
   */
  removeWallFromActivity(wallId: string): void {
    const currentActivity = this.recentWalls$.value;
    const filteredActivity = currentActivity.filter(activity => activity.wallId !== wallId);
    
    this.recentWalls$.next(filteredActivity);
    this.saveRecentWalls(filteredActivity);
  }

  /**
   * Clear all user activity
   */
  clearActivity(): void {
    this.recentWalls$.next([]);
    this.removeFromStorage();
  }

  /**
   * Load recent walls from localStorage
   */
  private loadRecentWalls(): void {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        this.recentWalls$.next([]);
        return;
      }

      const storageKey = `${this.STORAGE_KEY}_${currentUser.uid}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const activities: WallActivity[] = parsed.map((item: any) => ({
          ...item,
          lastVisited: new Date(item.lastVisited) // Convert string back to Date
        }));
        
        // Filter out old activities (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivities = activities.filter(activity => 
          activity.lastVisited > thirtyDaysAgo
        );
        
        this.recentWalls$.next(recentActivities);
        
        // Save back if we filtered anything
        if (recentActivities.length !== activities.length) {
          this.saveRecentWalls(recentActivities);
        }
      } else {
        this.recentWalls$.next([]);
      }
    } catch (error) {
      console.error('Error loading recent walls:', error);
      this.recentWalls$.next([]);
    }
  }

  /**
   * Save recent walls to localStorage
   */
  private saveRecentWalls(activities: WallActivity[]): void {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) return;

      const storageKey = `${this.STORAGE_KEY}_${currentUser.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving recent walls:', error);
    }
  }

  /**
   * Remove activity from storage
   */
  private removeFromStorage(): void {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) return;

      const storageKey = `${this.STORAGE_KEY}_${currentUser.uid}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error removing activity from storage:', error);
    }
  }
}