import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy } from '@angular/fire/firestore';
import { WallObjectType, FieldDefinition, RelationshipDefinition } from '../../../shared/models/wall.model';

@Injectable({
  providedIn: 'root'
})
export class ObjectTypeService {
  private readonly COLLECTION_NAME = 'object_types';

  constructor(private firestore: Firestore) {}

  /**
   * Create a new object type
   */
  createObjectType(objectType: Omit<WallObjectType, 'id'>): Observable<string> {
    const objectTypeData = {
      ...objectType,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return from(addDoc(collection(this.firestore, this.COLLECTION_NAME), objectTypeData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error creating object type:', error);
        return throwError(() => new Error('Failed to create object type'));
      })
    );
  }

  /**
   * Update an existing object type
   */
  updateObjectType(id: string, updates: Partial<WallObjectType>): Observable<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(updateDoc(docRef, updateData)).pipe(
      catchError(error => {
        console.error('Error updating object type:', error);
        return throwError(() => new Error('Failed to update object type'));
      })
    );
  }

  /**
   * Delete an object type
   */
  deleteObjectType(id: string): Observable<void> {
    const docRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(deleteDoc(docRef)).pipe(
      catchError(error => {
        console.error('Error deleting object type:', error);
        return throwError(() => new Error('Failed to delete object type'));
      })
    );
  }

  /**
   * Get all object types for a wall
   */
  getObjectTypesForWall(wallId: string): Observable<WallObjectType[]> {
    const q = query(
      collection(this.firestore, this.COLLECTION_NAME),
      where('wallId', '==', wallId),
      orderBy('sortOrder', 'asc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as WallObjectType))
      ),
      catchError(error => {
        console.error('Error getting object types:', error);
        return throwError(() => new Error('Failed to get object types'));
      })
    );
  }

  /**
   * Create default object types for a new wall
   */
  createDefaultObjectTypes(wallId: string): Observable<WallObjectType[]> {
    const defaultTypes = this.getDefaultObjectTypeTemplates(wallId);
    
    const createPromises = defaultTypes.map(objectType =>
      this.createObjectType(objectType).toPromise().then(id => ({
        ...objectType,
        id: id!
      } as WallObjectType))
    );

    return from(Promise.all(createPromises)).pipe(
      catchError(error => {
        console.error('Error creating default object types:', error);
        return throwError(() => new Error('Failed to create default object types'));
      })
    );
  }

  /**
   * Migrate legacy wall fields to object types
   */
  migrateLegacyFieldsToObjectType(wallId: string, fields: FieldDefinition[]): Observable<WallObjectType> {
    const legacyObjectType: Omit<WallObjectType, 'id'> = {
      wallId: wallId,
      name: 'Wall Items',
      description: 'Migrated from legacy field system',
      icon: 'article',
      color: '#6366f1',
      fields: fields,
      relationships: [],
      displaySettings: {
        cardLayout: 'detailed',
        showOnMap: false,
        primaryField: fields[0]?.id || '',
        secondaryField: fields[1]?.id,
        imageField: undefined
      },
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.createObjectType(legacyObjectType).pipe(
      map(id => ({
        ...legacyObjectType,
        id
      }))
    );
  }

  /**
   * Get default object type templates
   */
  private getDefaultObjectTypeTemplates(wallId: string): Omit<WallObjectType, 'id'>[] {
    const baseTemplate = (template: Partial<WallObjectType>): Omit<WallObjectType, 'id'> => ({
      wallId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...template
    } as Omit<WallObjectType, 'id'>);

    return [
      baseTemplate({
        name: 'General Items',
        description: 'General purpose items for any content',
        icon: 'description',
        color: '#6366f1',
        fields: [
          {
            id: 'title',
            name: 'Title',
            type: 'text',
            required: true,
            placeholder: 'Enter title...'
          },
          {
            id: 'description',
            name: 'Description',
            type: 'longtext',
            required: false,
            placeholder: 'Enter description...'
          },
          {
            id: 'date',
            name: 'Date',
            type: 'date',
            required: false
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'detailed',
          showOnMap: false,
          primaryField: 'title',
          secondaryField: 'description'
        },
        isActive: true,
        sortOrder: 0
      })
    ];
  }

  /**
   * Create predefined templates for specific use cases
   */
  createVeteranRegistryTemplate(wallId: string): Observable<WallObjectType[]> {
    const baseTemplate = (template: Partial<WallObjectType>): Omit<WallObjectType, 'id'> => ({
      wallId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...template
    } as Omit<WallObjectType, 'id'>);

    const templates: Omit<WallObjectType, 'id'>[] = [
      baseTemplate({
        name: 'Veteran',
        description: 'Service member information',
        icon: 'military_tech',
        color: '#059669',
        fields: [
          {
            id: 'name',
            name: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter full name...'
          },
          {
            id: 'rank',
            name: 'Rank',
            type: 'text',
            required: false,
            placeholder: 'Enter rank...'
          },
          {
            id: 'branch',
            name: 'Branch',
            type: 'text',
            required: true,
            placeholder: 'Army, Navy, Air Force, Marines, Coast Guard...'
          },
          {
            id: 'serviceYears',
            name: 'Years of Service',
            type: 'text',
            required: false,
            placeholder: 'e.g., 1998-2018'
          },
          {
            id: 'bio',
            name: 'Biography',
            type: 'longtext',
            required: false,
            placeholder: 'Enter biography...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'detailed',
          showOnMap: false,
          primaryField: 'name',
          secondaryField: 'rank'
        },
        isActive: true,
        sortOrder: 0
      }),
      baseTemplate({
        name: 'Deployment',
        description: 'Military deployment information',
        icon: 'public',
        color: '#dc2626',
        fields: [
          {
            id: 'name',
            name: 'Deployment Name',
            type: 'text',
            required: true,
            placeholder: 'Enter deployment name...'
          },
          {
            id: 'location',
            name: 'Location',
            type: 'text',
            required: true,
            placeholder: 'Enter location...'
          },
          {
            id: 'startDate',
            name: 'Start Date',
            type: 'date',
            required: false
          },
          {
            id: 'endDate',
            name: 'End Date',
            type: 'date',
            required: false
          },
          {
            id: 'description',
            name: 'Description',
            type: 'longtext',
            required: false,
            placeholder: 'Enter deployment details...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'timeline',
          showOnMap: true,
          primaryField: 'name',
          secondaryField: 'location'
        },
        isActive: true,
        sortOrder: 1
      }),
      baseTemplate({
        name: 'Unit',
        description: 'Military unit information',
        icon: 'groups',
        color: '#d97706',
        fields: [
          {
            id: 'name',
            name: 'Unit Name',
            type: 'text',
            required: true,
            placeholder: 'Enter unit name...'
          },
          {
            id: 'branch',
            name: 'Branch',
            type: 'text',
            required: true,
            placeholder: 'Army, Navy, Air Force, Marines, Coast Guard...'
          },
          {
            id: 'description',
            name: 'Description',
            type: 'longtext',
            required: false,
            placeholder: 'Enter unit description...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'compact',
          showOnMap: false,
          primaryField: 'name',
          secondaryField: 'branch'
        },
        isActive: true,
        sortOrder: 2
      }),
      baseTemplate({
        name: 'Award',
        description: 'Military awards and decorations',
        icon: 'workspace_premium',
        color: '#7c3aed',
        fields: [
          {
            id: 'name',
            name: 'Award Name',
            type: 'text',
            required: true,
            placeholder: 'Enter award name...'
          },
          {
            id: 'description',
            name: 'Description',
            type: 'longtext',
            required: false,
            placeholder: 'Enter award description...'
          },
          {
            id: 'criteria',
            name: 'Award Criteria',
            type: 'longtext',
            required: false,
            placeholder: 'Enter criteria for earning this award...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'compact',
          showOnMap: false,
          primaryField: 'name',
          secondaryField: 'description'
        },
        isActive: true,
        sortOrder: 3
      })
    ];

    const createPromises = templates.map(template =>
      this.createObjectType(template).toPromise().then(id => ({
        ...template,
        id: id!
      } as WallObjectType))
    );

    return from(Promise.all(createPromises));
  }

  /**
   * Create alumni directory template
   */
  createAlumniDirectoryTemplate(wallId: string): Observable<WallObjectType[]> {
    const baseTemplate = (template: Partial<WallObjectType>): Omit<WallObjectType, 'id'> => ({
      wallId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...template
    } as Omit<WallObjectType, 'id'>);

    const templates: Omit<WallObjectType, 'id'>[] = [
      baseTemplate({
        name: 'Alumnus',
        description: 'Alumni information',
        icon: 'school',
        color: '#2563eb',
        fields: [
          {
            id: 'name',
            name: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter full name...'
          },
          {
            id: 'graduationYear',
            name: 'Graduation Year',
            type: 'number',
            required: true,
            placeholder: 'Enter graduation year...'
          },
          {
            id: 'degree',
            name: 'Degree',
            type: 'text',
            required: false,
            placeholder: 'Enter degree...'
          },
          {
            id: 'currentPosition',
            name: 'Current Position',
            type: 'text',
            required: false,
            placeholder: 'Enter current position...'
          },
          {
            id: 'email',
            name: 'Email',
            type: 'email',
            required: false,
            placeholder: 'Enter email address...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'detailed',
          showOnMap: false,
          primaryField: 'name',
          secondaryField: 'currentPosition'
        },
        isActive: true,
        sortOrder: 0
      }),
      baseTemplate({
        name: 'Company',
        description: 'Company information',
        icon: 'business',
        color: '#059669',
        fields: [
          {
            id: 'name',
            name: 'Company Name',
            type: 'text',
            required: true,
            placeholder: 'Enter company name...'
          },
          {
            id: 'industry',
            name: 'Industry',
            type: 'text',
            required: false,
            placeholder: 'Enter industry...'
          },
          {
            id: 'location',
            name: 'Location',
            type: 'text',
            required: false,
            placeholder: 'Enter location...'
          },
          {
            id: 'website',
            name: 'Website',
            type: 'url',
            required: false,
            placeholder: 'Enter website URL...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'compact',
          showOnMap: true,
          primaryField: 'name',
          secondaryField: 'industry'
        },
        isActive: true,
        sortOrder: 1
      }),
      baseTemplate({
        name: 'Event',
        description: 'Alumni events',
        icon: 'event',
        color: '#dc2626',
        fields: [
          {
            id: 'name',
            name: 'Event Name',
            type: 'text',
            required: true,
            placeholder: 'Enter event name...'
          },
          {
            id: 'date',
            name: 'Event Date',
            type: 'date',
            required: true
          },
          {
            id: 'location',
            name: 'Location',
            type: 'text',
            required: false,
            placeholder: 'Enter event location...'
          },
          {
            id: 'description',
            name: 'Description',
            type: 'longtext',
            required: false,
            placeholder: 'Enter event description...'
          }
        ],
        relationships: [],
        displaySettings: {
          cardLayout: 'timeline',
          showOnMap: true,
          primaryField: 'name',
          secondaryField: 'location'
        },
        isActive: true,
        sortOrder: 2
      })
    ];

    const createPromises = templates.map(template =>
      this.createObjectType(template).toPromise().then(id => ({
        ...template,
        id: id!
      } as WallObjectType))
    );

    return from(Promise.all(createPromises));
  }
}