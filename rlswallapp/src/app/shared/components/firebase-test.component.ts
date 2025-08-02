import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallService } from '../../features/walls/services/wall.service';
import { Wall, DEFAULT_THEMES } from '../models/wall.model';
import { WallPermissionsService } from '../../core/services/wall-permissions.service';

@Component({
  selector: 'app-firebase-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="firebase-test">
      <h2>🔥 Firebase Connection Test</h2>
      
      <div class="test-section">
        <h3>Test Results:</h3>
        <div class="status" [class]="connectionStatus">
          {{ connectionMessage }}
        </div>
      </div>

      <div class="test-section">
        <h3>Actions:</h3>
        <button (click)="testConnection()" [disabled]="testing" class="test-button">
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
        <button (click)="createTestWall()" [disabled]="testing" class="test-button">
          Create Test Wall
        </button>
        <button (click)="loadWalls()" [disabled]="testing" class="test-button">
          Load All Walls
        </button>
      </div>

      <div class="test-section" *ngIf="walls.length > 0">
        <h3>Walls in Database ({{ walls.length }}):</h3>
        <div class="wall-list">
          <div *ngFor="let wall of walls" class="wall-item">
            <strong>{{ wall.name }}</strong>
            <span class="wall-info">{{ wall.fields.length }} fields</span>
            <span class="wall-date">{{ wall.createdAt | date:'short' }}</span>
            <button (click)="deleteWall(wall.id)" class="delete-btn">Delete</button>
          </div>
        </div>
      </div>

      <div class="test-section" *ngIf="error">
        <h3>❌ Error:</h3>
        <pre class="error">{{ error }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .firebase-test {
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
      font-family: 'Google Sans', sans-serif;
    }

    .test-section {
      margin: 20px 0;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }

    .status {
      padding: 12px;
      border-radius: 6px;
      font-weight: 500;
    }

    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .status.testing {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .test-button {
      margin: 5px;
      padding: 10px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .test-button:hover:not(:disabled) {
      background: #0056b3;
    }

    .test-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .wall-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .wall-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      margin: 5px 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .wall-info {
      color: #666;
      font-size: 12px;
    }

    .wall-date {
      color: #888;
      font-size: 11px;
    }

    .delete-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }

    .delete-btn:hover {
      background: #c82333;
    }

    .error {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      color: #dc3545;
      font-size: 12px;
      overflow-x: auto;
    }

    h2 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }

    h3 {
      color: #555;
      margin-top: 0;
    }
  `]
})
export class FirebaseTestComponent implements OnInit {
  connectionStatus = 'testing';
  connectionMessage = 'Initializing...';
  testing = false;
  walls: Wall[] = [];
  error: string = '';

  constructor(
    private wallService: WallService, 
    private wallPermissions: WallPermissionsService
  ) {}

  ngOnInit() {
    this.testConnection();
  }

  testConnection() {
    this.testing = true;
    this.connectionStatus = 'testing';
    this.connectionMessage = 'Testing Firebase connection...';
    this.error = '';

    this.wallService.getAllWalls().subscribe({
      next: (walls) => {
        this.walls = walls;
        this.connectionStatus = 'success';
        this.connectionMessage = `✅ Connected! Found ${walls.length} walls in database.`;
        this.testing = false;
      },
      error: (error) => {
        this.connectionStatus = 'error';
        this.connectionMessage = '❌ Connection failed!';
        this.error = JSON.stringify(error, null, 2);
        this.testing = false;
        console.error('Firebase connection test failed:', error);
      }
    });
  }

  createTestWall() {
    this.testing = true;
    
    // Create proper permissions and visibility using the service
    const permissions = this.wallPermissions.createDefaultPermissions('firebase-test');
    const visibility = this.wallPermissions.createDefaultVisibility();
    
    const testWall: Omit<Wall, 'id'> = {
      name: `Test Wall ${new Date().toLocaleTimeString()}`,
      description: 'This is a test wall created by Firebase test component',
      fields: [
        {
          id: 'test-field-1',
          name: 'Test Field',
          type: 'text',
          required: true,
          placeholder: 'Enter test data'
        }
      ],
      theme: DEFAULT_THEMES[0],
      permissions,
      visibility,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Legacy fields for backward compatibility
      isPublic: false,
      ownerId: 'firebase-test',
      sharedWith: []
    };

    this.wallService.createWall(testWall).subscribe({
      next: (id) => {
        console.log('Test wall created with ID:', id);
        this.loadWalls();
        this.testing = false;
      },
      error: (error) => {
        this.error = 'Failed to create test wall: ' + JSON.stringify(error, null, 2);
        this.testing = false;
        console.error('Create test wall failed:', error);
      }
    });
  }

  loadWalls() {
    this.testing = true;
    this.wallService.getAllWalls().subscribe({
      next: (walls) => {
        this.walls = walls;
        this.testing = false;
      },
      error: (error) => {
        this.error = 'Failed to load walls: ' + JSON.stringify(error, null, 2);
        this.testing = false;
        console.error('Load walls failed:', error);
      }
    });
  }

  deleteWall(id: string) {
    this.wallService.deleteWall(id).subscribe({
      next: () => {
        console.log('Wall deleted:', id);
        this.loadWalls();
      },
      error: (error) => {
        this.error = 'Failed to delete wall: ' + JSON.stringify(error, null, 2);
        console.error('Delete wall failed:', error);
      }
    });
  }
}