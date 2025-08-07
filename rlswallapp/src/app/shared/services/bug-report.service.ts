import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface BugReport {
  userEmail?: string;
  userName?: string;
  userId?: string;
  description: string;
  currentUrl: string;
  userAgent: string;
  screenResolution: string;
  timestamp: string;
  consoleLogs: ConsoleLog[];
  localStorageData: any;
  sessionStorageData: any;
  networkStatus: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  platform: string;
  language: string;
  cookiesEnabled: boolean;
  wallContext?: {
    wallId?: string;
    wallName?: string;
  };
}

export interface ConsoleLog {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  stack?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BugReportService {
  private consoleLogs: ConsoleLog[] = [];
  private maxLogEntries = 100;
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initializeConsoleCapture();
  }

  private initializeConsoleCapture(): void {
    // Capture console.log
    console.log = (...args: any[]) => {
      this.captureLog('log', args);
      this.originalConsole.log.apply(console, args);
    };

    // Capture console.warn
    console.warn = (...args: any[]) => {
      this.captureLog('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    // Capture console.error
    console.error = (...args: any[]) => {
      this.captureLog('error', args);
      this.originalConsole.error.apply(console, args);
    };

    // Capture console.info
    console.info = (...args: any[]) => {
      this.captureLog('info', args);
      this.originalConsole.info.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('error', [`Unhandled error: ${event.message}`], event.error?.stack);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [`Unhandled promise rejection: ${event.reason}`]);
    });
  }

  private captureLog(type: ConsoleLog['type'], args: any[], stack?: string): void {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const log: ConsoleLog = {
      type,
      message: message.substring(0, 5000), // Limit message length
      timestamp: new Date().toISOString()
    };

    if (stack) {
      log.stack = stack.substring(0, 2000); // Limit stack trace length
    }

    this.consoleLogs.push(log);

    // Keep only the most recent logs
    if (this.consoleLogs.length > this.maxLogEntries) {
      this.consoleLogs.shift();
    }
  }

  private getLocalStorageData(): any {
    const data: any = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.includes('firebase') && !key.includes('auth')) {
          // Don't include sensitive auth data
          const value = localStorage.getItem(key);
          if (value && value.length < 1000) {
            // Only include small values
            data[key] = value;
          }
        }
      }
    } catch (error) {
      data.error = 'Failed to read localStorage';
    }
    return data;
  }

  private getSessionStorageData(): any {
    const data: any = {};
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !key.includes('firebase') && !key.includes('auth')) {
          // Don't include sensitive auth data
          const value = sessionStorage.getItem(key);
          if (value && value.length < 1000) {
            // Only include small values
            data[key] = value;
          }
        }
      }
    } catch (error) {
      data.error = 'Failed to read sessionStorage';
    }
    return data;
  }

  private getWallContext(): { wallId?: string; wallName?: string } | undefined {
    // Try to get wall context from URL
    const urlMatch = window.location.pathname.match(/\/walls\/([^\/]+)/);
    if (urlMatch) {
      return {
        wallId: urlMatch[1],
        wallName: document.querySelector('.wall-title')?.textContent || undefined
      };
    }
    return undefined;
  }

  collectBugReport(description: string): BugReport {
    const currentUser = this.authService.currentUser;
    const nav = navigator as any;

    const report: BugReport = {
      userEmail: currentUser?.email || undefined,
      userName: currentUser?.displayName || undefined,
      userId: currentUser?.uid || undefined,
      description,
      currentUrl: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString(),
      consoleLogs: [...this.consoleLogs], // Copy the logs
      localStorageData: this.getLocalStorageData(),
      sessionStorageData: this.getSessionStorageData(),
      networkStatus: navigator.onLine,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      wallContext: this.getWallContext()
    };

    return report;
  }

  submitBugReport(description: string): Observable<any> {
    const report = this.collectBugReport(description);
    
    // Call Firebase Cloud Function - using the Cloud Run URL from deployment
    const functionUrl = 'https://sendbugreport-6hj52hzj4a-uc.a.run.app';
    
    return this.http.post(functionUrl, report);
  }

  // Method to get recent console logs for display
  getRecentLogs(count: number = 10): ConsoleLog[] {
    return this.consoleLogs.slice(-count);
  }

  // Method to clear captured logs
  clearLogs(): void {
    this.consoleLogs = [];
  }
}