import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Unsubscribe } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { MaterialIconComponent } from '../../shared/components/material-icon/material-icon.component';
import { ThemedButtonComponent } from '../../shared/components/themed-button/themed-button.component';

interface BugReport {
  id?: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
  description: string;
  currentUrl?: string;
  userAgent?: string;
  screenResolution?: string;
  platform?: string;
  language?: string;
  timestamp?: string;
  createdAt: string;
  status: 'new' | 'reviewing' | 'resolved' | 'error';
  read: boolean;
  consoleLogs?: any[];
  wallContext?: {
    wallId?: string;
    wallName?: string;
  };
}

@Component({
  selector: 'app-bug-reports-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent, ThemedButtonComponent],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <mat-icon [icon]="'bug_report'" class="header-icon"></mat-icon>
          <h1>Bug Reports Dashboard</h1>
          <span class="badge">{{ unreadCount }} new</span>
        </div>
        <div class="header-actions">
          <app-themed-button
            [icon]="'refresh'"
            [label]="'Refresh'"
            [variant]="'basic'"
            (buttonClick)="refresh()">
          </app-themed-button>
        </div>
      </div>

      <!-- Unauthorized message -->
      @if (!isAuthorized) {
        <div class="unauthorized">
          <mat-icon [icon]="'lock'" class="lock-icon"></mat-icon>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      }

      <!-- Loading state -->
      @if (isAuthorized && loading) {
        <div class="loading">
          <mat-icon [icon]="'hourglass_empty'" class="loading-icon"></mat-icon>
          <p>Loading bug reports...</p>
        </div>
      }

      <!-- Reports list -->
      @if (isAuthorized && !loading) {
        <div class="reports-container">
          @if (reports.length === 0) {
            <div class="no-reports">
              <mat-icon [icon]="'check_circle'" class="success-icon"></mat-icon>
              <h2>No Bug Reports</h2>
              <p>Everything is running smoothly!</p>
            </div>
          }

          @for (report of reports; track report.id) {
            <div class="report-card" [class.unread]="!report.read" [class.expanded]="expandedReports.has(report.id!)">
              <!-- Report header -->
              <div class="report-header" (click)="toggleReport(report.id!)">
                <div class="report-info">
                  <div class="report-status">
                    <mat-icon [icon]="getStatusIcon(report.status)" [class]="'status-' + report.status"></mat-icon>
                    @if (!report.read) {
                      <span class="new-badge">NEW</span>
                    }
                  </div>
                  <div class="report-meta">
                    <strong>{{ report.userEmail || 'Anonymous' }}</strong>
                    <span class="timestamp">{{ formatDate(report.createdAt) }}</span>
                  </div>
                </div>
                <mat-icon [icon]="expandedReports.has(report.id!) ? 'expand_less' : 'expand_more'" class="expand-icon"></mat-icon>
              </div>

              <!-- Report summary -->
              <div class="report-summary">
                <p>{{ report.description.substring(0, 150) }}{{ report.description.length > 150 ? '...' : '' }}</p>
              </div>

              <!-- Expanded details -->
              @if (expandedReports.has(report.id!)) {
                <div class="report-details">
                  <div class="detail-section">
                    <h3>Full Description</h3>
                    <p class="description-full">{{ report.description }}</p>
                  </div>

                  @if (report.currentUrl) {
                    <div class="detail-section">
                      <h3>URL</h3>
                      <p><a [href]="report.currentUrl" target="_blank">{{ report.currentUrl }}</a></p>
                    </div>
                  }

                  @if (report.wallContext) {
                    <div class="detail-section">
                      <h3>Wall Context</h3>
                      <p>Wall: {{ report.wallContext.wallName || report.wallContext.wallId || 'Unknown' }}</p>
                    </div>
                  }

                  <div class="detail-section">
                    <h3>Device Info</h3>
                    <ul class="device-info">
                      <li>Platform: {{ report.platform || 'Unknown' }}</li>
                      <li>Screen: {{ report.screenResolution || 'Unknown' }}</li>
                      <li>Language: {{ report.language || 'Unknown' }}</li>
                    </ul>
                  </div>

                  @if (report.consoleLogs && report.consoleLogs.length > 0) {
                    <div class="detail-section">
                      <h3>Console Logs ({{ report.consoleLogs.length }} entries)</h3>
                      <div class="console-logs">
                        @for (log of report.consoleLogs.slice(-10); track $index) {
                          <div class="log-entry" [class.error]="log.type === 'error'" [class.warn]="log.type === 'warn'">
                            <span class="log-type">[{{ log.type.toUpperCase() }}]</span>
                            <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                            <span class="log-message">{{ log.message }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="report-actions">
                    <app-themed-button
                      [icon]="'done'"
                      [label]="'Mark Resolved'"
                      [variant]="'raised'"
                      [color]="'primary'"
                      (buttonClick)="markResolved(report)">
                    </app-themed-button>
                    <app-themed-button
                      [icon]="'delete'"
                      [label]="'Delete'"
                      [variant]="'basic'"
                      [color]="'warn'"
                      (buttonClick)="deleteReport(report)">
                    </app-themed-button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: var(--md-sys-color-surface);
      padding: 20px;
    }

    /* Header */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: var(--md-sys-color-surface-container);
      border-radius: 16px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 32px;
      color: var(--md-sys-color-primary);
    }

    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
    }

    .badge {
      background: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
    }

    /* Unauthorized */
    .unauthorized {
      text-align: center;
      padding: 80px 20px;
    }

    .lock-icon {
      font-size: 80px;
      color: var(--md-sys-color-outline);
      margin-bottom: 20px;
    }

    .unauthorized h2 {
      color: var(--md-sys-color-on-surface);
      margin-bottom: 10px;
    }

    .unauthorized p {
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 80px 20px;
    }

    .loading-icon {
      font-size: 48px;
      color: var(--md-sys-color-primary);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* No reports */
    .no-reports {
      text-align: center;
      padding: 80px 20px;
    }

    .success-icon {
      font-size: 80px;
      color: var(--md-sys-color-primary);
      margin-bottom: 20px;
    }

    /* Reports list */
    .reports-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Report card */
    .report-card {
      background: var(--md-sys-color-surface-container);
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline-variant);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .report-card.unread {
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }

    .report-card.expanded {
      box-shadow: var(--md-sys-elevation-2);
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      cursor: pointer;
      user-select: none;
    }

    .report-header:hover {
      background: var(--md-sys-color-surface-container-high);
    }

    .report-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .report-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-new { color: var(--md-sys-color-primary); }
    .status-reviewing { color: var(--md-sys-color-tertiary); }
    .status-resolved { color: var(--md-sys-color-outline); }
    .status-error { color: var(--md-sys-color-error); }

    .new-badge {
      background: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .report-meta {
      display: flex;
      flex-direction: column;
    }

    .timestamp {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant);
    }

    .expand-icon {
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Report summary */
    .report-summary {
      padding: 0 16px 16px;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Report details */
    .report-details {
      padding: 16px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface);
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 8px;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .description-full {
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .device-info {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .device-info li {
      padding: 4px 0;
      color: var(--md-sys-color-on-surface-variant);
    }

    /* Console logs */
    .console-logs {
      background: var(--md-sys-color-surface-container);
      border-radius: 8px;
      padding: 12px;
      max-height: 300px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    }

    .log-entry {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }

    .log-entry:last-child {
      border-bottom: none;
    }

    .log-entry.error {
      color: var(--md-sys-color-error);
    }

    .log-entry.warn {
      color: var(--md-sys-color-tertiary);
    }

    .log-type {
      font-weight: 600;
      min-width: 60px;
    }

    .log-time {
      color: var(--md-sys-color-outline);
      min-width: 80px;
    }

    .log-message {
      flex: 1;
      word-break: break-word;
    }

    /* Report actions */
    .report-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 16px;
      }

      .header-content {
        flex-direction: column;
        text-align: center;
      }

      .report-actions {
        flex-direction: column;
      }
    }
  `]
})
export class BugReportsDashboardComponent implements OnInit, OnDestroy {
  reports: BugReport[] = [];
  loading = true;
  isAuthorized = false;
  unreadCount = 0;
  expandedReports = new Set<string>();
  private unsubscribe?: Unsubscribe;

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is authorized (Jack's user ID)
    const currentUser = this.authService.currentUser;
    this.isAuthorized = currentUser?.uid === 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';

    if (!this.isAuthorized) {
      this.loading = false;
      return;
    }

    // Subscribe to bug reports
    this.loadReports();
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadReports() {
    const reportsRef = collection(this.firestore, 'bug-reports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BugReport));

      this.unreadCount = this.reports.filter(r => !r.read).length;
      this.loading = false;
    });
  }

  toggleReport(reportId: string) {
    if (this.expandedReports.has(reportId)) {
      this.expandedReports.delete(reportId);
    } else {
      this.expandedReports.add(reportId);
      // Mark as read when expanded
      const report = this.reports.find(r => r.id === reportId);
      if (report && !report.read) {
        this.markAsRead(report);
      }
    }
  }

  async markAsRead(report: BugReport) {
    if (!report.id) return;
    const reportRef = doc(this.firestore, 'bug-reports', report.id);
    await updateDoc(reportRef, { read: true });
  }

  async markResolved(report: BugReport) {
    if (!report.id) return;
    const reportRef = doc(this.firestore, 'bug-reports', report.id);
    await updateDoc(reportRef, { 
      status: 'resolved',
      read: true,
      resolvedAt: new Date().toISOString()
    });
  }

  async deleteReport(report: BugReport) {
    if (!report.id) return;
    if (confirm('Are you sure you want to delete this bug report?')) {
      const reportRef = doc(this.firestore, 'bug-reports', report.id);
      await deleteDoc(reportRef);
    }
  }

  refresh() {
    this.loading = true;
    this.loadReports();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} min ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatLogTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'new': return 'fiber_new';
      case 'reviewing': return 'visibility';
      case 'resolved': return 'check_circle';
      case 'error': return 'error';
      default: return 'bug_report';
    }
  }
}