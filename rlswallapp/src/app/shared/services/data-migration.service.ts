import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap, combineLatest, forkJoin } from 'rxjs';
import { EntityService } from './entity.service';
import { ObjectTypeManagementService } from './object-type-management.service';
import { Wall, WallItem, WallObjectType, FieldDefinition } from '../models/wall.model';

export interface MigrationOperation {
  id: string;
  type: 'import' | 'export' | 'transform' | 'backup' | 'restore';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  metadata?: any;
}

export interface ImportResult {
  success: boolean;
  itemsImported: number;
  itemsSkipped: number;
  errors: string[];
  warnings: string[];
  objectTypesCreated: string[];
}

export interface ExportOptions {
  includeMetadata: boolean;
  includeImages: boolean;
  format: 'json' | 'csv' | 'excel';
  dateRange?: { start: Date; end: Date };
  objectTypeIds?: string[];
}

export interface TransformRule {
  sourceField: string;
  targetField: string;
  transformation?: 'uppercase' | 'lowercase' | 'trim' | 'dateFormat' | 'custom';
  customTransform?: (value: any) => any;
}

@Injectable({
  providedIn: 'root'
})
export class DataMigrationService {
  private operations = new Map<string, MigrationOperation>();

  constructor(
    private entityService: EntityService,
    private objectTypeService: ObjectTypeManagementService
  ) {}

  // Export Operations
  exportWallData(wallId: string, options: ExportOptions): Observable<Blob> {
    const operationId = this.createOperation('export');
    
    return combineLatest([
      this.entityService.getEntityById<Wall>('walls', wallId),
      this.entityService.getEntitiesByWallId<WallItem>('wall_items', wallId),
      this.objectTypeService.getObjectTypes(wallId)
    ]).pipe(
      map(([wall, items, objectTypes]) => {
        this.updateOperationProgress(operationId, 50);
        
        const exportData = {
          metadata: {
            exportDate: new Date(),
            exportVersion: '1.0',
            wallId: wallId,
            wallName: wall?.name,
            includeMetadata: options.includeMetadata,
            includeImages: options.includeImages
          },
          wall: options.includeMetadata ? wall : null,
          objectTypes: objectTypes,
          items: this.filterItemsByOptions(items, options)
        };

        this.updateOperationProgress(operationId, 100);
        this.completeOperation(operationId);

        return this.convertToFormat(exportData, options.format);
      })
    );
  }

  exportObjectType(objectTypeId: string, format: 'json' | 'template'): Observable<Blob> {
    return this.objectTypeService.getObjectTypeById(objectTypeId).pipe(
      map(objectType => {
        if (!objectType) throw new Error('Object type not found');

        const exportData = format === 'template' 
          ? this.convertToTemplate(objectType)
          : objectType;

        const jsonData = JSON.stringify(exportData, null, 2);
        return new Blob([jsonData], { type: 'application/json' });
      })
    );
  }

  // Import Operations
  importWallData(wallId: string, file: File, options?: { 
    overwriteExisting?: boolean;
    createMissingObjectTypes?: boolean;
    transformRules?: TransformRule[];
  }): Observable<ImportResult> {
    const operationId = this.createOperation('import');
    
    return from(this.parseImportFile(file)).pipe(
      switchMap(data => this.processImportData(wallId, data, options || {})),
      map(result => {
        this.completeOperation(operationId);
        return result;
      })
    );
  }

  importObjectTypes(wallId: string, file: File): Observable<ImportResult> {
    return from(this.parseImportFile(file)).pipe(
      switchMap(data => {
        const objectTypes = Array.isArray(data) ? data : [data];
        const importPromises = objectTypes.map(ot => 
          this.objectTypeService.createObjectType({ ...ot, wallId })
        );
        
        return forkJoin(importPromises).pipe(
          map(createdIds => ({
            success: true,
            itemsImported: createdIds.length,
            itemsSkipped: 0,
            errors: [],
            warnings: [],
            objectTypesCreated: createdIds
          }))
        );
      })
    );
  }

  // Transform Operations
  transformItemData(wallId: string, transformRules: TransformRule[]): Observable<{ updated: number; errors: string[] }> {
    const operationId = this.createOperation('transform');
    
    return this.entityService.getEntitiesByWallId<WallItem>('wall_items', wallId).pipe(
      switchMap(items => {
        let updated = 0;
        const errors: string[] = [];
        
        const updatePromises = items.map(item => {
          try {
            const transformedItem = this.applyTransformRules(item, transformRules);
            if (JSON.stringify(transformedItem) !== JSON.stringify(item)) {
              updated++;
              return this.entityService.updateEntity('wall_items', item.id, transformedItem);
            }
            return Promise.resolve();
          } catch (error) {
            errors.push(`Error transforming item ${item.id}: ${error}`);
            return Promise.resolve();
          }
        });
        
        return forkJoin(updatePromises).pipe(
          map(() => {
            this.completeOperation(operationId);
            return { updated, errors };
          })
        );
      })
    );
  }

  // Backup and Restore Operations
  createBackup(wallId: string): Observable<string> {
    const operationId = this.createOperation('backup');
    const backupId = `backup_${Date.now()}`;
    
    return this.exportWallData(wallId, {
      includeMetadata: true,
      includeImages: false, // For now, skip images in backups
      format: 'json'
    }).pipe(
      switchMap(backupData => {
        // Store backup data (in a real implementation, this would go to cloud storage)
        const backup = {
          id: backupId,
          wallId: wallId,
          createdAt: new Date(),
          size: backupData.size,
          data: backupData
        };
        
        return this.entityService.createEntity('backups', backup);
      }),
      map(() => {
        this.completeOperation(operationId);
        return backupId;
      })
    );
  }

  restoreFromBackup(backupId: string, wallId: string): Observable<ImportResult> {
    const operationId = this.createOperation('restore');
    
    return this.entityService.getEntityById('backups', backupId).pipe(
      switchMap(backup => {
        if (!backup) throw new Error('Backup not found');
        
        // Parse backup data and restore
        return this.processImportData(wallId, (backup as any).data, { 
          overwriteExisting: true,
          createMissingObjectTypes: true
        });
      }),
      map(result => {
        this.completeOperation(operationId);
        return result;
      })
    );
  }

  // Schema Migration
  migrateToNewSchema(wallId: string, schemaVersion: string): Observable<{ migrated: number; errors: string[] }> {
    // This would handle schema migrations between different versions
    const operationId = this.createOperation('transform');
    
    return this.entityService.getEntitiesByWallId<WallItem>('wall_items', wallId).pipe(
      map(items => {
        // Example: Migrate from old field structure to new
        let migrated = 0;
        const errors: string[] = [];
        
        // Implementation would depend on specific schema changes
        this.completeOperation(operationId);
        return { migrated, errors };
      })
    );
  }

  // Operation Management
  getOperationStatus(operationId: string): MigrationOperation | null {
    return this.operations.get(operationId) || null;
  }

  getAllOperations(): MigrationOperation[] {
    return Array.from(this.operations.values());
  }

  cancelOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation && operation.status === 'running') {
      operation.status = 'failed';
      operation.error = 'Operation cancelled by user';
      operation.endTime = new Date();
    }
  }

  // Private Helper Methods
  private createOperation(type: MigrationOperation['type']): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation: MigrationOperation = {
      id,
      type,
      status: 'pending',
      progress: 0,
      startTime: new Date()
    };
    
    this.operations.set(id, operation);
    return id;
  }

  private updateOperationProgress(operationId: string, progress: number): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.progress = Math.min(100, Math.max(0, progress));
      operation.status = 'running';
    }
  }

  private completeOperation(operationId: string, error?: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.status = error ? 'failed' : 'completed';
      operation.progress = error ? operation.progress : 100;
      operation.endTime = new Date();
      if (error) operation.error = error;
    }
  }

  private async parseImportFile(file: File): Promise<any> {
    const text = await file.text();
    
    if (file.name.endsWith('.json')) {
      return JSON.parse(text);
    } else if (file.name.endsWith('.csv')) {
      return this.parseCSV(text);
    } else {
      throw new Error('Unsupported file format');
    }
  }

  private parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  private async processImportData(
    wallId: string, 
    data: any, 
    options: { 
      overwriteExisting?: boolean;
      createMissingObjectTypes?: boolean;
      transformRules?: TransformRule[];
    }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      itemsImported: 0,
      itemsSkipped: 0,
      errors: [],
      warnings: [],
      objectTypesCreated: []
    };

    try {
      // Handle different data formats
      let items: any[] = [];
      if (data.items) {
        items = data.items; // Full export format
      } else if (Array.isArray(data)) {
        items = data; // Simple array format
      } else {
        throw new Error('Invalid data format');
      }

      // Create missing object types if needed
      if (options.createMissingObjectTypes && data.objectTypes) {
        for (const objectType of data.objectTypes) {
          try {
            const id = await this.objectTypeService.createObjectType({
              ...objectType,
              wallId
            }).toPromise();
            result.objectTypesCreated.push(id || '');
          } catch (error) {
            result.warnings.push(`Could not create object type ${objectType.name}: ${error}`);
          }
        }
      }

      // Import items
      for (const item of items) {
        try {
          let processedItem = { ...item, wallId };
          
          // Apply transform rules if provided
          if (options.transformRules) {
            processedItem = this.applyTransformRules(processedItem, options.transformRules);
          }

          // Remove ID for creation
          const { id, ...itemWithoutId } = processedItem;
          
          await this.entityService.createEntity('wall_items', itemWithoutId).toPromise();
          result.itemsImported++;
          
        } catch (error) {
          result.errors.push(`Error importing item: ${error}`);
          result.itemsSkipped++;
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
    }

    return result;
  }

  private applyTransformRules(item: any, rules: TransformRule[]): any {
    const transformed = { ...item };

    rules.forEach(rule => {
      const sourceValue = this.getNestedProperty(item, rule.sourceField);
      if (sourceValue !== undefined) {
        let transformedValue = sourceValue;

        switch (rule.transformation) {
          case 'uppercase':
            transformedValue = String(sourceValue).toUpperCase();
            break;
          case 'lowercase':
            transformedValue = String(sourceValue).toLowerCase();
            break;
          case 'trim':
            transformedValue = String(sourceValue).trim();
            break;
          case 'dateFormat':
            transformedValue = new Date(sourceValue);
            break;
          case 'custom':
            if (rule.customTransform) {
              transformedValue = rule.customTransform(sourceValue);
            }
            break;
        }

        this.setNestedProperty(transformed, rule.targetField, transformedValue);
      }
    });

    return transformed;
  }

  private filterItemsByOptions(items: WallItem[], options: ExportOptions): WallItem[] {
    let filtered = [...items];

    // Filter by date range
    if (options.dateRange) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= options.dateRange!.start && itemDate <= options.dateRange!.end;
      });
    }

    // Filter by object types
    if (options.objectTypeIds && options.objectTypeIds.length > 0) {
      filtered = filtered.filter(item => 
        options.objectTypeIds!.includes(item.objectTypeId)
      );
    }

    return filtered;
  }

  private convertToFormat(data: any, format: string): Blob {
    switch (format) {
      case 'json':
        const jsonData = JSON.stringify(data, null, 2);
        return new Blob([jsonData], { type: 'application/json' });
      
      case 'csv':
        const csvData = this.convertItemsToCSV(data.items || []);
        return new Blob([csvData], { type: 'text/csv' });
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertItemsToCSV(items: WallItem[]): string {
    if (items.length === 0) return '';

    // Get all unique field keys
    const fieldKeys = new Set<string>();
    items.forEach(item => {
      Object.keys(item.fieldData || {}).forEach(key => fieldKeys.add(key));
    });

    const headers = ['id', 'objectTypeId', 'createdAt', 'updatedAt', ...Array.from(fieldKeys)];
    const csvRows = [headers.join(',')];

    items.forEach(item => {
      const row = [
        item.id,
        item.objectTypeId,
        item.createdAt.toString(),
        item.updatedAt.toString(),
        ...Array.from(fieldKeys).map(key => {
          const value = item.fieldData?.[key] || '';
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        })
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private convertToTemplate(objectType: WallObjectType): any {
    return {
      name: objectType.name,
      description: objectType.description,
      category: 'custom',
      icon: 'category',
      fields: objectType.fields,
      displaySettings: objectType.displaySettings,
      isBuiltIn: false
    };
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}