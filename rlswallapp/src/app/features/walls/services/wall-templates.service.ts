import { Injectable } from '@angular/core';
import { Wall, WallTheme, WallObjectType, FieldDefinition } from '../../../shared/models/wall.model';

export interface WallTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  wall: Partial<Wall>;
  objectTypes: WallObjectType[];
  theme: WallTheme;
}

@Injectable({
  providedIn: 'root'
})
export class WallTemplatesService {
  
  private templates: Map<string, WallTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Get default military branches data for Veterans Registry
   */
  getDefaultMilitaryBranches(): Array<{ name: string; description: string }> {
    return [
      {
        name: 'U.S. Army',
        description: 'The land service branch of the United States Armed Forces'
      },
      {
        name: 'U.S. Navy',
        description: 'The naval warfare service branch of the United States Armed Forces'
      },
      {
        name: 'U.S. Air Force',
        description: 'The air service branch of the United States Armed Forces'
      },
      {
        name: 'U.S. Marine Corps',
        description: 'A branch of the United States Armed Forces responsible for conducting expeditionary and amphibious operations'
      },
      {
        name: 'U.S. Coast Guard',
        description: 'The maritime security, search and rescue, and law enforcement service branch'
      },
      {
        name: 'U.S. Space Force',
        description: 'The space service branch of the United States Armed Forces'
      }
    ];
  }

  /**
   * Get default military deployments data for Veterans Registry (1900-2025)
   */
  getDefaultMilitaryDeployments(): Array<{ title: string; description: string; startYear: number; endYear?: number; location: string }> {
    return [
      // World War I
      { title: 'World War I', description: 'The Great War (1914-1918)', startYear: 1917, endYear: 1918, location: 'Europe' },
      
      // World War II
      { title: 'World War II - European Theater', description: 'Operations in Europe and North Africa', startYear: 1941, endYear: 1945, location: 'Europe' },
      { title: 'World War II - Pacific Theater', description: 'Operations in the Pacific Ocean', startYear: 1941, endYear: 1945, location: 'Pacific' },
      
      // Korean War
      { title: 'Korean War', description: 'United Nations forces in Korea', startYear: 1950, endYear: 1953, location: 'Korea' },
      
      // Vietnam War
      { title: 'Vietnam War', description: 'Military involvement in Vietnam', startYear: 1955, endYear: 1975, location: 'Vietnam' },
      
      // Cold War Operations
      { title: 'Cold War Operations', description: 'Various operations during the Cold War period', startYear: 1947, endYear: 1991, location: 'Worldwide' },
      
      // Gulf War
      { title: 'Gulf War (Operation Desert Storm)', description: 'Liberation of Kuwait', startYear: 1991, endYear: 1991, location: 'Kuwait/Iraq' },
      
      // Peacekeeping Operations  
      { title: 'Bosnia-Herzegovina Operations', description: 'NATO peacekeeping operations', startYear: 1995, endYear: 2004, location: 'Bosnia-Herzegovina' },
      { title: 'Kosovo Operations', description: 'NATO intervention in Kosovo', startYear: 1999, endYear: 1999, location: 'Kosovo' },
      
      // War on Terror
      { title: 'Operation Enduring Freedom', description: 'Operations in Afghanistan', startYear: 2001, endYear: 2021, location: 'Afghanistan' },
      { title: 'Operation Iraqi Freedom', description: 'Iraq War operations', startYear: 2003, endYear: 2011, location: 'Iraq' },
      { title: 'Operation New Dawn', description: 'Iraq stability operations', startYear: 2010, endYear: 2011, location: 'Iraq' },
      
      // Recent Operations
      { title: 'Operation Inherent Resolve', description: 'Counter-ISIS operations', startYear: 2014, location: 'Iraq/Syria' },
      { title: 'Horn of Africa Operations', description: 'Counter-terrorism operations', startYear: 2002, location: 'Horn of Africa' },
      { title: 'Philippines Operations', description: 'Counter-terrorism support', startYear: 2002, location: 'Philippines' },
      
      // Humanitarian Operations
      { title: 'Haiti Relief Operations', description: 'Humanitarian assistance operations', startYear: 2010, endYear: 2010, location: 'Haiti' },
      { title: 'Japan Disaster Relief', description: 'Operation Tomodachi - tsunami relief', startYear: 2011, endYear: 2011, location: 'Japan' },
      
      // Training and Support
      { title: 'NATO Training Missions', description: 'Various NATO training and support missions', startYear: 1949, location: 'Europe' },
      { title: 'Pacific Partnership', description: 'Annual humanitarian assistance mission', startYear: 2006, location: 'Pacific Region' }
    ];
  }

  private initializeTemplates(): void {
    // Veterans Registry Template
    this.templates.set('veterans', {
      id: 'veterans',
      name: 'Veterans Registry',
      description: 'Honor veterans with service records, deployments, and recognition',
      icon: 'military_tech',
      wall: {
        name: 'Veterans Wall of Honor',
        description: 'A tribute to our veterans who have served our country with honor and distinction',
        organizationName: 'Riverside Local Schools',
        organizationSubtitle: 'Riverside Local Schools',
        settings: {
          allowComments: true,
          allowRatings: true,
          enableNotifications: true,
          autoSave: true,
          moderationRequired: false,
          inactivityTimeout: 10
        },
        visibility: {
          isPublished: true,
          requiresLogin: false
        }
      },
      objectTypes: this.getVeteransObjectTypes(),
      theme: this.getPatrioticTheme()
    });

    // Alumni Directory Template
    this.templates.set('alumni', {
      id: 'alumni',
      name: 'Alumni Directory',
      description: 'Connect with alumni through graduation years and achievements',
      icon: 'school',
      wall: {
        name: 'Alumni Wall',
        description: 'Stay connected with fellow graduates and celebrate their achievements',
        organizationName: 'Riverside Local Schools',
        organizationSubtitle: 'Riverside Local Schools',
        settings: {
          allowComments: true,
          allowRatings: false,
          enableNotifications: true,
          autoSave: true,
          moderationRequired: false,
          inactivityTimeout: 5
        },
        visibility: {
          isPublished: true,
          requiresLogin: true
        }
      },
      objectTypes: this.getAlumniObjectTypes(),
      theme: this.getBlackGoldTheme()
    });

    // Team Directory Template
    this.templates.set('team', {
      id: 'team',
      name: 'Team Directory',
      description: 'Showcase team members, departments, and organizational structure',
      icon: 'groups',
      wall: {
        name: 'Team Directory',
        description: 'Meet our talented team members and learn about their roles',
        organizationName: 'Riverside Local Schools',
        organizationSubtitle: 'Riverside Local Schools',
        settings: {
          allowComments: false,
          allowRatings: false,
          enableNotifications: false,
          autoSave: true,
          moderationRequired: true,
          inactivityTimeout: 5
        },
        visibility: {
          isPublished: true,
          requiresLogin: false
        }
      },
      objectTypes: this.getTeamObjectTypes(),
      theme: this.getProfessionalTheme()
    });
  }

  getTemplate(templateId: string): WallTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): WallTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create default branch and deployment items for Veterans Registry
   */
  createDefaultVeteranRegistryItems(wallId: string): {
    branches: Array<{ objectTypeId: string; fieldData: any }>;
    deployments: Array<{ objectTypeId: string; fieldData: any }>;
  } {
    const branches = this.getDefaultMilitaryBranches().map(branch => ({
      objectTypeId: 'branch',
      fieldData: {
        name: branch.name,
        description: branch.description
      }
    }));

    const deployments = this.getDefaultMilitaryDeployments().map(deployment => ({
      objectTypeId: 'deployment',
      fieldData: {
        title: deployment.title,
        description: deployment.description,
        startDate: new Date(deployment.startYear, 0, 1),
        endDate: deployment.endYear ? new Date(deployment.endYear, 11, 31) : undefined,
        location: deployment.location
      }
    }));

    return { branches, deployments };
  }

  // Veterans Object Types
  private getVeteransObjectTypes(): WallObjectType[] {
    const veteranFields: FieldDefinition[] = [
      {
        id: 'name',
        name: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Enter full name'
      },
      {
        id: 'graduationYear',
        name: 'Graduation Year',
        type: 'number',
        required: false,
        placeholder: 'Year of graduation (e.g., 2010)'
      },
      {
        id: 'rank',
        name: 'Military Rank',
        type: 'text',
        required: false,
        placeholder: 'e.g., Sergeant, Captain'
      },
      {
        id: 'branches',
        name: 'Branches',
        type: 'relationship',
        required: true,
        relationshipConfig: {
          targetObjectTypeId: 'branch',
          relationshipType: 'one-to-many',
          allowMultiple: true
        }
      },
      {
        id: 'militaryEntryDate',
        name: 'Military Entry Date',
        type: 'date',
        required: false,
        placeholder: 'Date entered military service'
      },
      {
        id: 'militaryExitDate',
        name: 'Military Exit Date',
        type: 'date',
        required: false,
        placeholder: 'Date left military service'
      },
      {
        id: 'deployments',
        name: 'Deployments',
        type: 'relationship',
        required: false,
        relationshipConfig: {
          targetObjectTypeId: 'deployment',
          relationshipType: 'one-to-many',
          allowMultiple: true
        }
      },
      {
        id: 'description',
        name: 'Service Description',
        type: 'richtext',
        required: false,
        placeholder: 'Share your service story and experiences'
      }
    ];

    const deploymentFields: FieldDefinition[] = [
      {
        id: 'title',
        name: 'Deployment Title',
        type: 'text',
        required: true,
        placeholder: 'e.g., Operation Enduring Freedom'
      },
      {
        id: 'location',
        name: 'Location',
        type: 'location',
        required: true,
        placeholder: 'Deployment location'
      },
      {
        id: 'startDate',
        name: 'Start Date',
        type: 'date',
        required: false,
        placeholder: 'Deployment start date'
      },
      {
        id: 'endDate',
        name: 'End Date',
        type: 'date',
        required: false,
        placeholder: 'Deployment end date'
      },
      {
        id: 'description',
        name: 'Description',
        type: 'longtext',
        required: false,
        placeholder: 'Describe the deployment mission'
      }
    ];

    const branchFields: FieldDefinition[] = [
      {
        id: 'name',
        name: 'Branch Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Army, Navy, Air Force'
      },
      {
        id: 'description',
        name: 'Description',
        type: 'longtext',
        required: false,
        placeholder: 'Description of the service branch'
      },
      {
        id: 'pictureURL',
        name: 'Branch Logo',
        type: 'file',
        required: false,
        fileConfig: {
          allowedTypes: ['image/*'],
          maxSize: 5,
          multiple: false
        }
      }
    ];

    return [
      {
        id: 'veteran',
        wallId: '',
        name: 'Veteran',
        description: 'Individual veteran service member',
        icon: 'person',
        color: '#1976d2',
        fields: veteranFields,
        relationships: [],
        displaySettings: {
          primaryField: 'name',
          secondaryField: 'rank',
          tertiaryField: 'graduationYear',
          showOnMap: false,
          cardLayout: 'detailed' as 'compact' | 'detailed' | 'timeline'
        },
        defaultImage: {
          url: '/assets/veteran-placeholder.png',
          altText: 'Veteran placeholder'
        },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'deployment',
        wallId: '',
        name: 'Deployment',
        description: 'Military deployment or operation',
        icon: 'public',
        color: '#388e3c',
        fields: deploymentFields,
        relationships: [],
        displaySettings: {
          primaryField: 'title',
          secondaryField: 'location',
          showOnMap: true,
          cardLayout: 'compact'
        },
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'branch',
        wallId: '',
        name: 'Branch',
        description: 'Military service branch (Army, Navy, etc.)',
        icon: 'military_tech',
        color: '#f57c00',
        fields: branchFields,
        relationships: [],
        displaySettings: {
          primaryField: 'name',
          secondaryField: 'description',
          imageField: 'pictureURL',
          showOnMap: false,
          cardLayout: 'compact'
        },
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // Alumni Object Types
  private getAlumniObjectTypes(): WallObjectType[] {
    const alumniFields: FieldDefinition[] = [
      {
        id: 'firstName',
        name: 'First Name',
        type: 'text',
        required: true
      },
      {
        id: 'lastName',
        name: 'Last Name',
        type: 'text',
        required: true
      },
      {
        id: 'maidenName',
        name: 'Maiden Name',
        type: 'text',
        required: false
      },
      {
        id: 'graduationYear',
        name: 'Class Year',
        type: 'number',
        required: true,
        validation: {
          minLength: 4,
          maxLength: 4
        }
      },
      {
        id: 'email',
        name: 'Email',
        type: 'email',
        required: false
      },
      {
        id: 'currentLocation',
        name: 'Current Location',
        type: 'text',
        required: false,
        placeholder: 'City, State'
      },
      {
        id: 'profession',
        name: 'Current Profession',
        type: 'text',
        required: false
      },
      {
        id: 'achievements',
        name: 'Notable Achievements',
        type: 'richtext',
        required: false
      },
      {
        id: 'activities',
        name: 'School Activities',
        type: 'multiselect',
        required: false,
        multiselectConfig: {
          options: ['Football', 'Basketball', 'Baseball', 'Track', 'Band', 'Choir', 'Drama', 'Student Council', 'NHS', 'FFA', 'Other'],
          allowCustom: true
        }
      },
      {
        id: 'photos',
        name: 'Photos',
        type: 'file',
        required: false,
        fileConfig: {
          allowedTypes: ['image/*'],
          maxSize: 10,
          multiple: true
        }
      }
    ];

    return [
      {
        id: 'alumni',
        wallId: '',
        name: 'Alumni',
        description: 'School graduate',
        icon: 'school',
        color: '#ffd700',
        fields: alumniFields,
        relationships: [],
        displaySettings: {
          primaryField: 'firstName',
          secondaryField: 'graduationYear',
          imageField: 'photos',
          showOnMap: false,
          cardLayout: 'detailed' as 'compact' | 'detailed' | 'timeline'
        },
        defaultImage: {
          url: '/assets/alumni-placeholder.png',
          altText: 'Alumni placeholder'
        },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // Team Object Types
  private getTeamObjectTypes(): WallObjectType[] {
    const teamMemberFields: FieldDefinition[] = [
      {
        id: 'name',
        name: 'Full Name',
        type: 'text',
        required: true
      },
      {
        id: 'title',
        name: 'Job Title',
        type: 'text',
        required: true
      },
      {
        id: 'department',
        name: 'Department',
        type: 'relationship',
        required: true,
        relationshipConfig: {
          targetObjectTypeId: 'department',
          relationshipType: 'one-to-many' as 'one-to-one' | 'one-to-many' | 'many-to-many',
          allowMultiple: false
        }
      },
      {
        id: 'email',
        name: 'Email',
        type: 'email',
        required: true
      },
      {
        id: 'phone',
        name: 'Phone',
        type: 'text',
        required: false
      },
      {
        id: 'startDate',
        name: 'Start Date',
        type: 'date',
        required: false
      },
      {
        id: 'bio',
        name: 'Biography',
        type: 'richtext',
        required: false
      },
      {
        id: 'skills',
        name: 'Skills & Expertise',
        type: 'multiselect',
        required: false,
        multiselectConfig: {
          options: [],
          allowCustom: true
        }
      },
      {
        id: 'photo',
        name: 'Profile Photo',
        type: 'file',
        required: false,
        fileConfig: {
          allowedTypes: ['image/*'],
          maxSize: 5,
          multiple: false
        }
      }
    ];

    const departmentFields: FieldDefinition[] = [
      {
        id: 'name',
        name: 'Department Name',
        type: 'text',
        required: true
      },
      {
        id: 'description',
        name: 'Description',
        type: 'longtext',
        required: false
      },
      {
        id: 'manager',
        name: 'Department Head',
        type: 'relationship',
        required: false,
        relationshipConfig: {
          targetObjectTypeId: 'team-member',
          relationshipType: 'one-to-one',
          allowMultiple: false
        }
      },
      {
        id: 'location',
        name: 'Location',
        type: 'text',
        required: false
      }
    ];

    return [
      {
        id: 'team-member',
        wallId: '',
        name: 'Team Member',
        description: 'Individual team member',
        icon: 'person',
        color: '#2196f3',
        fields: teamMemberFields,
        relationships: [],
        displaySettings: {
          primaryField: 'name',
          secondaryField: 'title',
          imageField: 'photo',
          showOnMap: false,
          cardLayout: 'detailed' as 'compact' | 'detailed' | 'timeline'
        },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'department',
        wallId: '',
        name: 'Department',
        description: 'Organizational department',
        icon: 'business',
        color: '#4caf50',
        fields: departmentFields,
        relationships: [],
        displaySettings: {
          primaryField: 'name',
          secondaryField: 'description',
          showOnMap: false,
          cardLayout: 'compact'
        },
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // Theme Definitions
  private getPatrioticTheme(): WallTheme {
    return {
      id: 'patriotic',
      name: 'Patriotic',
      isCustom: false,
      mode: 'dark',
      primaryColor: '#dc3545',     // Red accent
      secondaryColor: '#ffffff',   // White
      accentColor: '#dc3545',      // Red
      backgroundColor: '#0d1421',  // Deep navy blue
      surfaceColor: '#1a2332',     // Darker navy
      cardColor: '#243142',        // Dark navy
      textColor: '#ffffff',        // White text
      errorColor: '#d32f2f',
      warningColor: '#ff9800',
      successColor: '#4caf50',
      cardStyle: 'elevated',
      layout: 'grid',
      spacing: 'comfortable',
      cornerRadius: 'medium',
      elevation: 'medium',
      font: 'system',
      textScale: 1,
      contrast: 'normal',
      animations: true,
      customCss: `
        /* Patriotic theme custom styles */
        .wall-header {
          background: linear-gradient(135deg, #1976d2 0%, #d32f2f 100%);
          color: white;
        }
        .veteran-card {
          border-top: 4px solid #1976d2;
        }
      `
    };
  }

  private getBlackGoldTheme(): WallTheme {
    return {
      id: 'black-gold',
      name: 'Black & Gold',
      isCustom: false,
      mode: 'dark',
      primaryColor: '#ffd700',     // Gold
      secondaryColor: '#000000',   // Black
      accentColor: '#ffed4e',      // Light gold
      backgroundColor: '#121212',
      surfaceColor: '#1e1e1e',
      cardColor: '#2a2a2a',
      textColor: '#ffffff',
      errorColor: '#cf6679',
      warningColor: '#ffb74d',
      successColor: '#81c784',
      cardStyle: 'bordered',
      layout: 'grid',
      spacing: 'spacious',
      cornerRadius: 'large',
      elevation: 'low',
      font: 'system',
      textScale: 1,
      contrast: 'high',
      animations: true,
      customCss: `
        /* Black & Gold theme custom styles */
        .wall-header {
          background: linear-gradient(135deg, #000000 0%, #ffd700 100%);
          color: white;
        }
        .alumni-card {
          border: 2px solid #ffd700;
        }
        .alumni-card:hover {
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
      `
    };
  }

  private getProfessionalTheme(): WallTheme {
    return {
      id: 'professional',
      name: 'Professional Blue',
      isCustom: false,
      mode: 'light',
      primaryColor: '#2196f3',
      secondaryColor: '#455a64',
      accentColor: '#03a9f4',
      backgroundColor: '#fafafa',
      surfaceColor: '#ffffff',
      cardColor: '#ffffff',
      textColor: '#212121',
      errorColor: '#f44336',
      warningColor: '#ff9800',
      successColor: '#4caf50',
      cardStyle: 'minimal',
      layout: 'list',
      spacing: 'comfortable',
      cornerRadius: 'small',
      elevation: 'flat',
      font: 'system',
      textScale: 1,
      contrast: 'normal',
      animations: true,
      customCss: ''
    };
  }

  // Additional theme options
  getAvailableThemes(): WallTheme[] {
    return [
      this.getPatrioticTheme(),
      this.getBlackGoldTheme(),
      this.getProfessionalTheme()
    ];
  }

}