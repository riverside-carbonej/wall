import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { ButtonGroupComponent, ButtonGroupItem } from '../../../../shared/components/button-group/button-group.component';
import { ObjectTypeManagementService, ObjectTypeTemplate } from '../../../../shared/services/object-type-management.service';
import { WallObjectType } from '../../../../shared/models/wall.model';

export interface WallTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'education' | 'military' | 'community' | 'personal' | 'custom';
  preview: string;
  objectTypes: Partial<WallObjectType>[];
  relationships: any[];
  useCase: string;
  features: string[];
  complexity: 'simple' | 'intermediate' | 'advanced';
  estimatedSetupTime: string;
}

@Component({
  selector: 'app-template-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTabsModule,
    ButtonGroupComponent,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="template-library">
      <div class="library-header">
        <div class="header-content">
          <h1>
            <mat-icon>library_books</mat-icon>
            Template Library
          </h1>
          <p>Choose from pre-built templates to quickly set up your wall</p>
        </div>
        
        <div class="header-actions">
          <mat-form-field class="search-field">
            <mat-label>Search templates</mat-label>
            <input matInput [(ngModel)]="searchTerm" (input)="onSearch()" 
                   placeholder="Search by name, category, or feature...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          
          <mat-form-field class="filter-field">
            <mat-label>Category</mat-label>
            <mat-select [(ngModel)]="selectedCategory" (selectionChange)="onCategoryFilter()">
              <mat-option value="all">All Categories</mat-option>
              <mat-option value="business">Business</mat-option>
              <mat-option value="education">Education</mat-option>
              <mat-option value="military">Military</mat-option>
              <mat-option value="community">Community</mat-option>
              <mat-option value="personal">Personal</mat-option>
              <mat-option value="custom">Custom</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="template-tabs">
        <app-button-group 
          [items]="tabItems"
          [activeId]="getActiveTabId()"
          (selectionChange)="onTabChange($event)">
        </app-button-group>
        
        <div class="tab-content">
          @if (selectedTab === 0) {
            <div class="featured-tab">
              <div class="templates-grid">
                @for (template of featuredTemplates; track template.id) {
                  <mat-card class="template-card featured" (click)="selectTemplate(template)">
                    <div class="template-header">
                      <div class="template-icon">
                        <mat-icon>{{getTemplateIcon(template.category)}}</mat-icon>
                      </div>
                      <div class="template-badges">
                        <mat-chip class="complexity-chip" [class]="'complexity-' + template.complexity">
                          {{template.complexity}}
                        </mat-chip>
                        @if (template.category === 'military') {
                          <mat-chip class="category-chip military">Military</mat-chip>
                        }
                      </div>
                    </div>
                    
                    <mat-card-content>
                      <h3>{{template.name}}</h3>
                      <p class="template-description">{{template.description}}</p>
                      
                      <div class="template-stats">
                        <div class="stat">
                          <mat-icon>category</mat-icon>
                          <span>{{template.objectTypes.length}} Object Types</span>
                        </div>
                        <div class="stat">
                          <mat-icon>schedule</mat-icon>
                          <span>{{template.estimatedSetupTime}}</span>
                        </div>
                      </div>
                      
                      <div class="template-features">
                        @for (feature of template.features.slice(0, 3); track feature) {
                          <mat-chip class="feature-chip">{{feature}}</mat-chip>
                        }
                        @if (template.features.length > 3) {
                          <mat-chip class="more-chip">+{{template.features.length - 3}} more</mat-chip>
                        }
                      </div>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-button (click)="previewTemplate(template); $event.stopPropagation()">
                        <mat-icon>visibility</mat-icon>
                        Preview
                      </button>
                      <button mat-raised-button color="primary" 
                              (click)="useTemplate(template); $event.stopPropagation()">
                        <mat-icon>add</mat-icon>
                        Use Template
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            </div>
          }

          @if (selectedTab === 1) {
            <div class="all-templates-tab">
              <div class="templates-grid">
                @for (template of filteredTemplates; track template.id) {
                  <mat-card class="template-card" (click)="selectTemplate(template)">
                    <div class="template-header">
                      <div class="template-icon">
                        <mat-icon>{{getTemplateIcon(template.category)}}</mat-icon>
                      </div>
                      <div class="template-badges">
                        <mat-chip class="complexity-chip" [class]="'complexity-' + template.complexity">
                          {{template.complexity}}
                        </mat-chip>
                        <mat-chip class="category-chip" [class]="template.category">
                          {{getCategoryLabel(template.category)}}
                        </mat-chip>
                      </div>
                    </div>
                    
                    <mat-card-content>
                      <h3>{{template.name}}</h3>
                      <p class="template-description">{{template.description}}</p>
                      
                      <div class="template-stats">
                        <div class="stat">
                          <mat-icon>category</mat-icon>
                          <span>{{template.objectTypes.length}} Types</span>
                        </div>
                        <div class="stat">
                          <mat-icon>device_hub</mat-icon>
                          <span>{{template.relationships.length}} Relations</span>
                        </div>
                        <div class="stat">
                          <mat-icon>schedule</mat-icon>
                          <span>{{template.estimatedSetupTime}}</span>
                        </div>
                      </div>
                      
                      <div class="use-case">
                        <strong>Use Case:</strong> {{template.useCase}}
                      </div>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-button (click)="previewTemplate(template); $event.stopPropagation()">
                        <mat-icon>visibility</mat-icon>
                        Preview
                      </button>
                      <button mat-raised-button color="primary" 
                              (click)="useTemplate(template); $event.stopPropagation()">
                        <mat-icon>add</mat-icon>
                        Use Template
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
              
              @if (filteredTemplates.length === 0) {
                <div class="no-results">
                  <mat-icon class="no-results-icon">search_off</mat-icon>
                  <h3>No templates found</h3>
                  <p>Try adjusting your search terms or category filter.</p>
                  <button mat-button (click)="clearFilters()">
                    <mat-icon>clear</mat-icon>
                    Clear Filters
                  </button>
                </div>
              }
            </div>
          }

          @if (selectedTab === 2) {
            <div class="custom-templates-tab">
              <div class="section-header">
                <h2>Your Custom Templates</h2>
                <p>Templates you've created or saved from your wall configurations</p>
                <button mat-raised-button color="primary" (click)="createCustomTemplate()">
                  <mat-icon>add</mat-icon>
                  Create Custom Template
                </button>
              </div>
              
              @if (customTemplates.length === 0) {
                <div class="empty-custom">
                  <mat-icon class="empty-icon">bookmark_border</mat-icon>
                  <h3>No custom templates yet</h3>
                  <p>Save your wall configurations as templates to reuse them later or share with others.</p>
                  <div class="empty-actions">
                    <button mat-raised-button color="primary" (click)="createCustomTemplate()">
                      <mat-icon>add</mat-icon>
                      Create Your First Template
                    </button>
                    <button mat-button (click)="importTemplate()">
                      <mat-icon>file_upload</mat-icon>
                      Import Template
                    </button>
                  </div>
                </div>
              } @else {
                <div class="templates-grid">
                  @for (template of customTemplates; track template.id) {
                    <mat-card class="template-card custom">
                      <div class="template-header">
                        <div class="template-icon">
                          <mat-icon>bookmark</mat-icon>
                        </div>
                        <div class="template-actions">
                          <button mat-icon-button [matMenuTriggerFor]="templateMenu">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                          <mat-menu #templateMenu="matMenu">
                            <button mat-menu-item (click)="editTemplate(template)">
                              <mat-icon>edit</mat-icon>
                              Edit
                            </button>
                            <button mat-menu-item (click)="duplicateTemplate(template)">
                              <mat-icon>content_copy</mat-icon>
                              Duplicate
                            </button>
                            <button mat-menu-item (click)="exportTemplate(template)">
                              <mat-icon>file_download</mat-icon>
                              Export
                            </button>
                            <button mat-menu-item (click)="shareTemplate(template)">
                              <mat-icon>share</mat-icon>
                              Share
                            </button>
                            <mat-divider></mat-divider>
                            <button mat-menu-item (click)="deleteTemplate(template)" class="danger">
                              <mat-icon>delete</mat-icon>
                              Delete
                            </button>
                          </mat-menu>
                        </div>
                      </div>
                      
                      <mat-card-content>
                        <h3>{{template.name}}</h3>
                        <p class="template-description">{{template.description}}</p>
                        
                        <div class="template-stats">
                          <div class="stat">
                            <mat-icon>category</mat-icon>
                            <span>{{template.objectTypes.length}} Types</span>
                          </div>
                          <div class="stat">
                            <mat-icon>schedule</mat-icon>
                            <span>{{template.estimatedSetupTime}}</span>
                          </div>
                        </div>
                      </mat-card-content>
                      
                      <mat-card-actions>
                        <button mat-button (click)="previewTemplate(template)">
                          <mat-icon>visibility</mat-icon>
                          Preview
                        </button>
                        <button mat-raised-button color="primary" (click)="useTemplate(template)">
                          <mat-icon>add</mat-icon>
                          Use Template
                        </button>
                      </mat-card-actions>
                    </mat-card>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './template-library.component.scss'
})
export class TemplateLibraryComponent implements OnInit {
  @Input() wallId!: string;
  @Output() templateSelected = new EventEmitter<WallTemplate>();
  @Output() close = new EventEmitter<void>();

  searchTerm = '';
  selectedCategory = 'all';
  selectedTab = 0;
  
  allTemplates: WallTemplate[] = [];
  featuredTemplates: WallTemplate[] = [];
  customTemplates: WallTemplate[] = [];
  filteredTemplates: WallTemplate[] = [];

  tabItems: ButtonGroupItem[] = [
    { id: '0', label: 'Featured', icon: 'star' },
    { id: '1', label: 'All Templates', icon: 'library_books' },
    { id: '2', label: 'Custom', icon: 'bookmark' }
  ];

  constructor(
    private dialog: MatDialog,
    private objectTypeService: ObjectTypeManagementService
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    // Load built-in templates
    this.allTemplates = this.getBuiltInTemplates();
    this.featuredTemplates = this.allTemplates.filter(t => 
      ['veteran-registry', 'business-directory', 'university-alumni', 'community-events'].includes(t.id)
    );
    this.filteredTemplates = [...this.allTemplates];
    
    // Load custom templates
    this.loadCustomTemplates();
  }

  private async loadCustomTemplates(): Promise<void> {
    try {
      const customTemplates = await this.objectTypeService.getCustomTemplates().toPromise();
      // Convert ObjectTypeTemplate to WallTemplate format
      this.customTemplates = customTemplates?.map(this.convertToWallTemplate) || [];
    } catch (error) {
      console.error('Error loading custom templates:', error);
      this.customTemplates = [];
    }
  }

  private convertToWallTemplate(template: any): WallTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: 'custom',
      preview: '',
      objectTypes: [template], // Simplified - in real implementation, load full object types
      relationships: [],
      useCase: 'Custom template',
      features: ['Custom Fields', 'User Defined'],
      complexity: 'intermediate',
      estimatedSetupTime: '15 minutes'
    };
  }

  private getBuiltInTemplates(): WallTemplate[] {
    return [
      {
        id: 'veteran-registry',
        name: 'Veteran Registry',
        description: 'Honor military service members with a comprehensive registry including deployments, awards, and service history.',
        category: 'military',
        preview: '/assets/templates/veteran-registry.png',
        objectTypes: [
          {
            name: 'Veteran',
            description: 'Service member information',
            icon: 'military_tech',
            color: '#059669',
            fields: [
              { id: 'name', name: 'Full Name', type: 'text', required: true },
              { id: 'rank', name: 'Rank', type: 'text', required: false },
              { id: 'branch', name: 'Service Branch', type: 'text', required: true },
              { id: 'serviceYears', name: 'Years of Service', type: 'text', required: false },
              { id: 'bio', name: 'Biography', type: 'longtext', required: false }
            ]
          },
          {
            name: 'Deployment',
            description: 'Military deployment information',
            icon: 'public',
            color: '#dc2626',
            fields: [
              { id: 'name', name: 'Deployment Name', type: 'text', required: true },
              { id: 'location', name: 'Location', type: 'text', required: true },
              { id: 'startDate', name: 'Start Date', type: 'date', required: false },
              { id: 'endDate', name: 'End Date', type: 'date', required: false }
            ]
          }
        ],
        relationships: [
          { name: 'served in', fromType: 'Veteran', toType: 'Deployment', type: 'many-to-many' }
        ],
        useCase: 'Honor military veterans and document their service history',
        features: ['Service Records', 'Deployment Tracking', 'Award Management', 'Photo Gallery'],
        complexity: 'intermediate',
        estimatedSetupTime: '30 minutes'
      },
      {
        id: 'business-directory',
        name: 'Business Directory',
        description: 'Professional business listing with companies, employees, and locations.',
        category: 'business',
        preview: '/assets/templates/business-directory.png',
        objectTypes: [
          {
            name: 'Company',
            description: 'Business organization',
            icon: 'business',
            color: '#2563eb',
            fields: [
              { id: 'name', name: 'Company Name', type: 'text', required: true },
              { id: 'industry', name: 'Industry', type: 'text', required: false },
              { id: 'website', name: 'Website', type: 'url', required: false },
              { id: 'description', name: 'Description', type: 'longtext', required: false }
            ]
          },
          {
            name: 'Employee',
            description: 'Company employee',
            icon: 'person',
            color: '#059669',
            fields: [
              { id: 'name', name: 'Full Name', type: 'text', required: true },
              { id: 'position', name: 'Position', type: 'text', required: true },
              { id: 'email', name: 'Email', type: 'email', required: false }
            ]
          }
        ],
        relationships: [
          { name: 'works at', fromType: 'Employee', toType: 'Company', type: 'many-to-one' }
        ],
        useCase: 'Create a professional business directory with company profiles',
        features: ['Company Profiles', 'Employee Directory', 'Contact Information', 'Industry Classification'],
        complexity: 'simple',
        estimatedSetupTime: '20 minutes'
      },
      {
        id: 'university-alumni',
        name: 'University Alumni',
        description: 'Track graduates, their achievements, and maintain alumni connections.',
        category: 'education',
        preview: '/assets/templates/university-alumni.png',
        objectTypes: [
          {
            name: 'Alumnus',
            description: 'University graduate',
            icon: 'school',
            color: '#2563eb',
            fields: [
              { id: 'name', name: 'Full Name', type: 'text', required: true },
              { id: 'graduationYear', name: 'Graduation Year', type: 'number', required: true },
              { id: 'degree', name: 'Degree', type: 'text', required: false },
              { id: 'currentPosition', name: 'Current Position', type: 'text', required: false }
            ]
          },
          {
            name: 'Event',
            description: 'Alumni events',
            icon: 'event',
            color: '#dc2626',
            fields: [
              { id: 'name', name: 'Event Name', type: 'text', required: true },
              { id: 'date', name: 'Date', type: 'date', required: true },
              { id: 'location', name: 'Location', type: 'text', required: false }
            ]
          }
        ],
        relationships: [
          { name: 'attended', fromType: 'Alumnus', toType: 'Event', type: 'many-to-many' }
        ],
        useCase: 'Maintain connections with university graduates and track achievements',
        features: ['Graduate Profiles', 'Career Tracking', 'Event Management', 'Networking'],
        complexity: 'intermediate',
        estimatedSetupTime: '25 minutes'
      },
      {
        id: 'community-events',
        name: 'Community Events',
        description: 'Organize and promote local community events with volunteer management.',
        category: 'community',
        preview: '/assets/templates/community-events.png',
        objectTypes: [
          {
            name: 'Event',
            description: 'Community event',
            icon: 'event',
            color: '#dc2626',
            fields: [
              { id: 'name', name: 'Event Name', type: 'text', required: true },
              { id: 'description', name: 'Description', type: 'longtext', required: false },
              { id: 'date', name: 'Date', type: 'date', required: true },
              { id: 'location', name: 'Location', type: 'text', required: true }
            ]
          },
          {
            name: 'Volunteer',
            description: 'Event volunteer',
            icon: 'volunteer_activism',
            color: '#059669',
            fields: [
              { id: 'name', name: 'Full Name', type: 'text', required: true },
              { id: 'email', name: 'Email', type: 'email', required: true },
              { id: 'skills', name: 'Skills', type: 'multiselect', required: false }
            ]
          }
        ],
        relationships: [
          { name: 'volunteers for', fromType: 'Volunteer', toType: 'Event', type: 'many-to-many' }
        ],
        useCase: 'Organize community events and coordinate volunteer participation',
        features: ['Event Planning', 'Volunteer Management', 'RSVP Tracking', 'Photo Sharing'],
        complexity: 'simple',
        estimatedSetupTime: '15 minutes'
      },
      {
        id: 'project-portfolio',
        name: 'Project Portfolio',
        description: 'Showcase projects, team members, and achievements for portfolios.',
        category: 'business',
        preview: '/assets/templates/project-portfolio.png',
        objectTypes: [
          {
            name: 'Project',
            description: 'Portfolio project',
            icon: 'work',
            color: '#6366f1',
            fields: [
              { id: 'name', name: 'Project Name', type: 'text', required: true },
              { id: 'description', name: 'Description', type: 'richtext', required: false },
              { id: 'technologies', name: 'Technologies', type: 'multiselect', required: false },
              { id: 'status', name: 'Status', type: 'multiselect', required: false }
            ]
          }
        ],
        relationships: [],
        useCase: 'Display professional projects and technical achievements',
        features: ['Project Showcase', 'Technology Tags', 'Status Tracking', 'Rich Descriptions'],
        complexity: 'simple',
        estimatedSetupTime: '10 minutes'
      },
      {
        id: 'family-tree',
        name: 'Family Tree',
        description: 'Document family history and relationships across generations.',
        category: 'personal',
        preview: '/assets/templates/family-tree.png',
        objectTypes: [
          {
            name: 'Family Member',
            description: 'Family member information',
            icon: 'person',
            color: '#8b5cf6',
            fields: [
              { id: 'name', name: 'Full Name', type: 'text', required: true },
              { id: 'birthDate', name: 'Birth Date', type: 'date', required: false },
              { id: 'birthPlace', name: 'Birth Place', type: 'text', required: false },
              { id: 'occupation', name: 'Occupation', type: 'text', required: false }
            ]
          }
        ],
        relationships: [
          { name: 'parent of', fromType: 'Family Member', toType: 'Family Member', type: 'one-to-many' },
          { name: 'spouse of', fromType: 'Family Member', toType: 'Family Member', type: 'one-to-one' }
        ],
        useCase: 'Document and preserve family history and genealogy',
        features: ['Genealogy Tracking', 'Relationship Mapping', 'Historical Records', 'Photo Archive'],
        complexity: 'advanced',
        estimatedSetupTime: '45 minutes'
      }
    ];
  }

  onSearch(): void {
    this.applyFilters();
  }

  onCategoryFilter(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.allTemplates];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.features.some(feature => feature.toLowerCase().includes(searchLower)) ||
        template.useCase.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === this.selectedCategory);
    }

    this.filteredTemplates = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  getTemplateIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'business': 'business',
      'education': 'school',
      'military': 'military_tech',
      'community': 'groups',
      'personal': 'person',
      'custom': 'bookmark'
    };
    return icons[category] || 'category';
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'business': 'Business',
      'education': 'Education',
      'military': 'Military',
      'community': 'Community',
      'personal': 'Personal',
      'custom': 'Custom'
    };
    return labels[category] || category;
  }

  selectTemplate(template: WallTemplate): void {
    this.templateSelected.emit(template);
  }

  previewTemplate(template: WallTemplate): void {
    // TODO: Open template preview dialog
    console.log('Preview template:', template);
  }

  useTemplate(template: WallTemplate): void {
    this.templateSelected.emit(template);
  }

  createCustomTemplate(): void {
    // TODO: Open custom template creation dialog
    console.log('Create custom template');
  }

  editTemplate(template: WallTemplate): void {
    // TODO: Open template editor
    console.log('Edit template:', template);
  }

  duplicateTemplate(template: WallTemplate): void {
    const duplicated = {
      ...template,
      id: `${template.id}_copy_${Date.now()}`,
      name: `${template.name} Copy`
    };
    this.customTemplates.push(duplicated);
  }

  exportTemplate(template: WallTemplate): void {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '_')}_template.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importTemplate(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const template = JSON.parse(e.target.result);
            template.id = `imported_${Date.now()}`;
            template.category = 'custom';
            this.customTemplates.push(template);
          } catch (error) {
            console.error('Error importing template:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  shareTemplate(template: WallTemplate): void {
    // TODO: Implement template sharing
    console.log('Share template:', template);
  }

  deleteTemplate(template: WallTemplate): void {
    const index = this.customTemplates.findIndex(t => t.id === template.id);
    if (index > -1) {
      this.customTemplates.splice(index, 1);
    }
  }

  getActiveTabId(): string {
    return this.selectedTab.toString();
  }

  onTabChange(item: ButtonGroupItem): void {
    this.selectedTab = parseInt(item.id);
  }
}