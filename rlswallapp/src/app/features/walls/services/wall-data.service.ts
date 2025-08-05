import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { 
  Wall, 
  WallItem, 
  EnhancedWallItem, 
  WallObjectType, 
  RelationshipDefinition,
  WallImage 
} from '../../../shared/models/wall.model';
import { WallService } from './wall.service';
import { WallItemService } from './wall-item.service';
import { ObjectTypeService } from './object-type.service';
import { RelationshipService, RelationshipGraph } from './relationship.service';
import { ImageService } from './image.service';
import { WallTemplatesService } from './wall-templates.service';

export interface CompleteWallData {
  wall: Wall;
  objectTypes: WallObjectType[];
  items: EnhancedWallItem[];
  relationshipDefinitions: RelationshipDefinition[];
  relationshipGraph: RelationshipGraph;
  statistics: {
    totalItems: number;
    itemsByObjectType: { [objectTypeId: string]: number };
    totalRelationships: number;
    totalImages: number;
  };
}

export interface WallCreationOptions {
  template?: 'veteran' | 'alumni' | 'general';
  createSampleData?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WallDataService {
  constructor(
    private wallService: WallService,
    private wallItemService: WallItemService,
    private objectTypeService: ObjectTypeService,
    private relationshipService: RelationshipService,
    private imageService: ImageService,
    private wallTemplatesService: WallTemplatesService
  ) {}

  /**
   * Get complete wall data with all related information
   */
  getCompleteWallData(wallId: string): Observable<CompleteWallData> {
    return forkJoin({
      wall: this.wallService.getWallById(wallId),
      objectTypes: this.objectTypeService.getObjectTypesForWall(wallId),
      items: this.wallItemService.getEnhancedWallItems(wallId),
      itemStatistics: this.wallItemService.getWallItemStatistics(wallId),
      relationshipStats: this.relationshipService.getRelationshipStatistics(wallId)
    }).pipe(
      switchMap(({ wall, objectTypes, items, itemStatistics, relationshipStats }) => {
        if (!wall) {
          throw new Error('Wall not found');
        }

        // Get relationship definitions from wall
        const relationshipDefinitions = wall.relationshipDefinitions || [];

        // Build relationship graph if we have items and relationship definitions
        let relationshipGraphObs: Observable<RelationshipGraph>;
        if (items.length > 0 && relationshipDefinitions.length > 0) {
          relationshipGraphObs = this.relationshipService.buildRelationshipGraph(
            wallId, 
            items, 
            relationshipDefinitions
          );
        } else {
          relationshipGraphObs = of({
            items: [],
            relationships: [],
            nodes: [],
            edges: []
          });
        }

        return relationshipGraphObs.pipe(
          map(relationshipGraph => ({
            wall,
            objectTypes,
            items,
            relationshipDefinitions,
            relationshipGraph,
            statistics: {
              totalItems: itemStatistics.totalItems,
              itemsByObjectType: itemStatistics.itemsByObjectType,
              totalRelationships: relationshipStats.totalRelationships,
              totalImages: itemStatistics.totalImages
            }
          }))
        );
      }),
      catchError(error => {
        console.error('Error getting complete wall data:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new wall with complete setup
   */
  createCompleteWall(
    wallData: Omit<Wall, 'id' | 'objectTypes' | 'relationshipDefinitions'>,
    options: WallCreationOptions = {}
  ): Observable<CompleteWallData> {
    const template = options.template || 'general';
    console.log('createCompleteWall called with template:', template, 'options:', options);
    
    return this.wallService.createWallWithObjectTypes(wallData, template).pipe(
      switchMap(({ wallId, objectTypes }) => {
        console.log('Wall created with ID:', wallId, 'objectTypes count:', objectTypes.length);
        
        // Create sample relationship definitions
        const sampleRelationshipDefinitions = this.createSampleRelationshipDefinitions(objectTypes);
        console.log('Created relationship definitions:', sampleRelationshipDefinitions.length);
        
        // Update wall with relationship definitions
        const wallUpdateObs = this.wallService.updateWall(wallId, {
          relationshipDefinitions: sampleRelationshipDefinitions
        });

        // Create sample data if requested, or default data for veteran template
        let sampleDataObs: Observable<any>;
        if (options.createSampleData || template === 'veteran') {
          console.log('Creating sample data for template:', template, 'createSampleData:', options.createSampleData);
          sampleDataObs = this.createSampleWallData(wallId, objectTypes, template);
        } else {
          console.log('Skipping sample data creation for template:', template);
          sampleDataObs = of(null);
        }

        return forkJoin({
          wallUpdate: wallUpdateObs,
          sampleData: sampleDataObs
        }).pipe(
          switchMap((results) => {
            console.log('forkJoin completed:', results);
            console.log('Now getting complete wall data for:', wallId);
            return this.getCompleteWallData(wallId);
          }),
          map((completeWallData) => {
            console.log('CompleteWallData returned:', completeWallData);
            console.log('Wall in CompleteWallData:', completeWallData.wall);
            console.log('Wall ID in CompleteWallData:', completeWallData.wall?.id);
            return completeWallData;
          })
        );
      })
    );
  }

  /**
   * Add a new item to a wall
   */
  addWallItem(
    wallId: string,
    objectTypeId: string,
    fieldData: { [fieldId: string]: any },
    images?: File[]
  ): Observable<WallItem> {
    // First validate the field data
    return this.objectTypeService.getObjectTypesForWall(wallId).pipe(
      switchMap(objectTypes => {
        const objectType = objectTypes.find(ot => ot.id === objectTypeId);
        if (!objectType) {
          throw new Error('Object type not found');
        }

        const validation = this.wallItemService.validateFieldData(fieldData, objectType);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Create the wall item
        const wallItem: Omit<WallItem, 'id'> = {
          wallId,
          objectTypeId,
          fieldData,
          images: [],
          primaryImageIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'current-user', // TODO: Get from auth service
          updatedBy: 'current-user'
        };

        return this.wallItemService.createWallItem(wallItem);
      }),
      switchMap(itemId => {
        // Upload images if provided
        if (images && images.length > 0) {
          return this.imageService.uploadMultipleImages(images, wallId, itemId).pipe(
            switchMap(uploadResults => {
              const successfulUploads = uploadResults
                .filter(result => result.success && result.image)
                .map(result => result.image!);

              if (successfulUploads.length > 0) {
                // Update the item with image information
                return this.wallItemService.updateWallItem(itemId, {
                  images: successfulUploads
                }).pipe(
                  switchMap(() => this.wallItemService.getWallItem(itemId))
                );
              } else {
                return this.wallItemService.getWallItem(itemId);
              }
            })
          );
        } else {
          return this.wallItemService.getWallItem(itemId);
        }
      }),
      map(item => {
        if (!item) {
          throw new Error('Failed to retrieve created item');
        }
        return item;
      })
    );
  }

  /**
   * Update a wall item
   */
  updateWallItem(
    itemId: string,
    updates: Partial<WallItem>,
    newImages?: File[],
    imagesToDelete?: WallImage[]
  ): Observable<WallItem> {
    let updateChain: Observable<any> = of(null);

    // Delete old images if specified
    if (imagesToDelete && imagesToDelete.length > 0) {
      updateChain = updateChain.pipe(
        switchMap(() => this.imageService.deleteMultipleImages(imagesToDelete))
      );
    }

    // Upload new images if provided
    if (newImages && newImages.length > 0) {
      updateChain = updateChain.pipe(
        switchMap(() => this.wallItemService.getWallItem(itemId)),
        switchMap(item => {
          if (!item) throw new Error('Item not found');
          
          return this.imageService.uploadMultipleImages(newImages, item.wallId, itemId).pipe(
            map(uploadResults => {
              const successfulUploads = uploadResults
                .filter(result => result.success && result.image)
                .map(result => result.image!);

              // Merge with existing images (after deletion)
              const existingImages = item.images || [];
              const filteredExistingImages = imagesToDelete 
                ? existingImages.filter(img => !imagesToDelete.some(del => del.id === img.id))
                : existingImages;

              return [...filteredExistingImages, ...successfulUploads];
            })
          );
        }),
        switchMap(allImages => {
          const updatesWithImages = { ...updates, images: allImages };
          return this.wallItemService.updateWallItem(itemId, updatesWithImages);
        })
      );
    } else {
      updateChain = updateChain.pipe(
        switchMap(() => this.wallItemService.updateWallItem(itemId, updates))
      );
    }

    return updateChain.pipe(
      switchMap(() => this.wallItemService.getWallItem(itemId)),
      map(item => {
        if (!item) {
          throw new Error('Failed to retrieve updated item');
        }
        return item;
      })
    );
  }

  /**
   * Delete a wall item and cleanup relationships
   */
  deleteWallItem(itemId: string): Observable<void> {
    return this.wallItemService.getWallItem(itemId).pipe(
      switchMap(item => {
        if (!item) {
          throw new Error('Item not found');
        }

        // Delete images first
        const deleteImagesObs = item.images && item.images.length > 0
          ? this.imageService.deleteMultipleImages(item.images)
          : of([]);

        // Delete the item (this will also handle relationships via the wall item service)
        const deleteItemObs = this.wallItemService.deleteWallItem(itemId);

        return forkJoin({
          images: deleteImagesObs,
          item: deleteItemObs
        }).pipe(
          map(() => void 0)
        );
      })
    );
  }

  /**
   * Search across all wall content
   */
  searchWallContent(wallId: string, searchTerm: string): Observable<{
    items: WallItem[];
    objectTypes: WallObjectType[];
  }> {
    return forkJoin({
      items: this.wallItemService.searchWallItems(wallId, searchTerm),
      objectTypes: this.objectTypeService.getObjectTypesForWall(wallId)
    }).pipe(
      map(({ items, objectTypes }) => {
        // Filter object types that match the search term
        const filteredObjectTypes = objectTypes.filter(ot =>
          ot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ot.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          items,
          objectTypes: filteredObjectTypes
        };
      })
    );
  }

  /**
   * Get wall items with filtering and sorting
   */
  getFilteredWallItems(
    wallId: string,
    filters: {
      objectTypeIds?: string[];
      hasImages?: boolean;
      hasRelationships?: boolean;
      dateRange?: { start: Date; end: Date };
    },
    sortBy: 'createdAt' | 'updatedAt' | 'name' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<EnhancedWallItem[]> {
    return this.wallItemService.getEnhancedWallItems(wallId).pipe(
      map(items => {
        let filteredItems = items;

        // Apply filters
        if (filters.objectTypeIds && filters.objectTypeIds.length > 0) {
          filteredItems = filteredItems.filter(item =>
            item.objectTypeId && filters.objectTypeIds!.includes(item.objectTypeId)
          );
        }

        if (filters.hasImages !== undefined) {
          filteredItems = filteredItems.filter(item =>
            filters.hasImages ? (item.images && item.images.length > 0) : (!item.images || item.images.length === 0)
          );
        }

        if (filters.hasRelationships !== undefined) {
          filteredItems = filteredItems.filter(item =>
            filters.hasRelationships ? item.relationshipCount > 0 : item.relationshipCount === 0
          );
        }

        if (filters.dateRange) {
          filteredItems = filteredItems.filter(item =>
            item.createdAt >= filters.dateRange!.start &&
            item.createdAt <= filters.dateRange!.end
          );
        }

        // Apply sorting
        filteredItems.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (sortBy) {
            case 'createdAt':
              aValue = a.createdAt.getTime();
              bValue = b.createdAt.getTime();
              break;
            case 'updatedAt':
              aValue = a.updatedAt.getTime();
              bValue = b.updatedAt.getTime();
              break;
            case 'name':
              // Try to get name from primary field
              const primaryFieldId = a.fieldData ? Object.keys(a.fieldData)[0] : '';
              aValue = a.fieldData[primaryFieldId] || '';
              bValue = b.fieldData[primaryFieldId] || '';
              break;
            default:
              aValue = a.createdAt.getTime();
              bValue = b.createdAt.getTime();
          }

          if (sortOrder === 'desc') {
            return bValue - aValue;
          } else {
            return aValue - bValue;
          }
        });

        return filteredItems;
      })
    );
  }

  /**
   * Create sample relationship definitions based on object types
   */
  private createSampleRelationshipDefinitions(objectTypes: WallObjectType[]): RelationshipDefinition[] {
    const relationships: RelationshipDefinition[] = [];

    if (objectTypes.length < 2) {
      return relationships;
    }

    // Create some basic relationships between the first few object types
    for (let i = 0; i < Math.min(objectTypes.length - 1, 3); i++) {
      const fromType = objectTypes[i];
      const toType = objectTypes[i + 1];

      relationships.push({
        id: `rel_${fromType.id}_${toType.id}`,
        name: `${fromType.name} to ${toType.name}`,
        description: `Connects ${fromType.name} with ${toType.name}`,
        fromObjectTypeId: fromType.id,
        toObjectTypeId: toType.id,
        relationshipType: 'one-to-many',
        bidirectional: false,
        required: false,
        cascadeDelete: false
      });
    }

    return relationships;
  }

  /**
   * Create sample wall data for demonstration, or default data for templates
   */
  private createSampleWallData(wallId: string, objectTypes: WallObjectType[], template?: string): Observable<any> {
    console.log('createSampleWallData called with:', { wallId, objectTypesCount: objectTypes.length, template });
    
    if (objectTypes.length === 0) {
      console.log('No object types found, returning null');
      return of(null);
    }

    const sampleItems: Omit<WallItem, 'id'>[] = [];

    // Special handling for veteran template - create default branches and deployments
    if (template === 'veteran') {
      console.log('Creating veteran registry default data');
      const defaultItems = this.wallTemplatesService.createDefaultVeteranRegistryItems(wallId);
      
      // Add default branches
      defaultItems.branches.forEach(branch => {
        sampleItems.push({
          wallId,
          objectTypeId: branch.objectTypeId,
          fieldData: branch.fieldData,
          images: [],
          primaryImageIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'template-generator',
          updatedBy: 'template-generator'
        });
      });

      // Add default deployments
      defaultItems.deployments.forEach(deployment => {
        sampleItems.push({
          wallId,
          objectTypeId: deployment.objectTypeId,
          fieldData: deployment.fieldData,
          images: [],
          primaryImageIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'template-generator',
          updatedBy: 'template-generator'
        });
      });

      // Create the default objects and return
      console.log('Creating', sampleItems.length, 'default items for veteran registry');
      return this.wallItemService.bulkCreateWallItems(sampleItems).pipe(
        map(itemIds => {
          console.log('Successfully created', itemIds.length, 'default items');
          return itemIds;
        }),
        catchError(error => {
          console.error('Error creating default items:', error);
          throw error;
        })
      );
    }

    // Create 1-2 sample items per object type
    objectTypes.forEach((objectType, index) => {
      for (let i = 0; i < Math.min(2, 3 - index); i++) {
        const fieldData: { [fieldId: string]: any } = {};
        
        objectType.fields.forEach(field => {
          switch (field.type) {
            case 'text':
              fieldData[field.id] = `Sample ${field.name} ${i + 1}`;
              break;
            case 'longtext':
              fieldData[field.id] = `This is a sample ${field.name.toLowerCase()} for demonstration purposes. Item ${i + 1} in ${objectType.name}.`;
              break;
            case 'number':
              fieldData[field.id] = Math.floor(Math.random() * 100) + 1;
              break;
            case 'date':
              fieldData[field.id] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
              break;
            case 'boolean':
              fieldData[field.id] = Math.random() > 0.5;
              break;
            case 'email':
              fieldData[field.id] = `sample${i + 1}@example.com`;
              break;
            case 'url':
              fieldData[field.id] = `https://example.com/sample${i + 1}`;
              break;
            default:
              fieldData[field.id] = `Sample value ${i + 1}`;
          }
        });

        sampleItems.push({
          wallId,
          objectTypeId: objectType.id,
          fieldData,
          images: [],
          primaryImageIndex: 0,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          createdBy: 'sample-data-generator',
          updatedBy: 'sample-data-generator'
        });
      }
    });

    console.log('Creating', sampleItems.length, 'sample items for template:', template);
    return this.wallItemService.bulkCreateWallItems(sampleItems);
  }
}