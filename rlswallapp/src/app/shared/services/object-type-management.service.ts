import { Injectable } from '@angular/core';
import { Observable, map, switchMap, combineLatest } from 'rxjs';
import { EntityService } from './entity.service';
import { WallObjectType, FieldDefinition, Wall } from '../models/wall.model';

export interface ObjectTypeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'people' | 'events' | 'media' | 'custom';
  icon: string;
  fields: FieldDefinition[];
  displaySettings: any;
  isBuiltIn: boolean;
}

export interface FieldValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'custom';
  value?: any;
  message?: string;
  customValidator?: (value: any) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ObjectTypeManagementService {
  private readonly OBJECT_TYPES_COLLECTION = 'object_types';
  private readonly TEMPLATES_COLLECTION = 'object_type_templates';

  constructor(private entityService: EntityService) {}

  // Object Type CRUD Operations
  getObjectTypes(wallId: string): Observable<WallObjectType[]> {
    return this.entityService.getEntitiesByWallId<WallObjectType>(
      this.OBJECT_TYPES_COLLECTION,
      wallId,
      { orderByField: 'name', orderDirection: 'asc' }
    );
  }

  getObjectTypeById(id: string): Observable<WallObjectType | null> {
    return this.entityService.getEntityById<WallObjectType>(this.OBJECT_TYPES_COLLECTION, id);
  }

  createObjectType(objectType: Omit<WallObjectType, 'id'>): Observable<string> {
    const processedObjectType = this.processObjectTypeForSave(objectType) as Omit<WallObjectType, 'id'>;
    return this.entityService.createEntity<WallObjectType>(
      this.OBJECT_TYPES_COLLECTION, 
      processedObjectType
    );
  }

  updateObjectType(id: string, updates: Partial<WallObjectType>): Observable<void> {
    const processedUpdates = this.processObjectTypeForSave(updates);
    return this.entityService.updateEntity<WallObjectType>(
      this.OBJECT_TYPES_COLLECTION, 
      id, 
      processedUpdates
    );
  }

  deleteObjectType(id: string): Observable<void> {
    // TODO: Add safety checks - ensure no items use this object type
    return this.entityService.deleteEntity(this.OBJECT_TYPES_COLLECTION, id);
  }

  // Field Management
  addFieldToObjectType(objectTypeId: string, field: FieldDefinition): Observable<void> {
    return this.getObjectTypeById(objectTypeId).pipe(
      switchMap(objectType => {
        if (!objectType) throw new Error('Object type not found');
        
        const updatedFields = [...objectType.fields, this.processFieldForSave(field)];
        return this.updateObjectType(objectTypeId, { fields: updatedFields });
      })
    );
  }

  updateFieldInObjectType(objectTypeId: string, fieldId: string, updates: Partial<FieldDefinition>): Observable<void> {
    return this.getObjectTypeById(objectTypeId).pipe(
      switchMap(objectType => {
        if (!objectType) throw new Error('Object type not found');
        
        const updatedFields = objectType.fields.map(field => 
          field.id === fieldId ? { ...field, ...this.processFieldForSave(updates) } : field
        );
        return this.updateObjectType(objectTypeId, { fields: updatedFields });
      })
    );
  }

  removeFieldFromObjectType(objectTypeId: string, fieldId: string): Observable<void> {
    return this.getObjectTypeById(objectTypeId).pipe(
      switchMap(objectType => {
        if (!objectType) throw new Error('Object type not found');
        
        const updatedFields = objectType.fields.filter(field => field.id !== fieldId);
        return this.updateObjectType(objectTypeId, { fields: updatedFields });
      })
    );
  }

  reorderFieldsInObjectType(objectTypeId: string, fieldIds: string[]): Observable<void> {
    return this.getObjectTypeById(objectTypeId).pipe(
      switchMap(objectType => {
        if (!objectType) throw new Error('Object type not found');
        
        // Reorder fields based on provided order
        const fieldMap = new Map(objectType.fields.map(field => [field.id, field]));
        const reorderedFields = fieldIds.map(id => fieldMap.get(id)).filter(Boolean) as FieldDefinition[];
        
        return this.updateObjectType(objectTypeId, { fields: reorderedFields });
      })
    );
  }

  // Templates Management
  getBuiltInTemplates(): Observable<ObjectTypeTemplate[]> {
    return this.entityService.getEntities<ObjectTypeTemplate>(
      this.TEMPLATES_COLLECTION,
      { 
        filters: [{ field: 'isBuiltIn', operator: '==', value: true }],
        orderByField: 'category'
      }
    );
  }

  getCustomTemplates(): Observable<ObjectTypeTemplate[]> {
    return this.entityService.getEntities<ObjectTypeTemplate>(
      this.TEMPLATES_COLLECTION,
      { 
        filters: [{ field: 'isBuiltIn', operator: '==', value: false }],
        orderByField: 'name'
      }
    );
  }

  createObjectTypeFromTemplate(wallId: string, templateId: string, customizations?: Partial<WallObjectType>): Observable<string> {
    return this.entityService.getEntityById<ObjectTypeTemplate>(this.TEMPLATES_COLLECTION, templateId).pipe(
      switchMap(template => {
        if (!template) throw new Error('Template not found');
        
        const newObjectType: Omit<WallObjectType, 'id'> = {
          wallId,
          name: customizations?.name || template.name,
          description: customizations?.description || template.description,
          icon: template.icon,
          color: '#6366f1',
          fields: template.fields.map(field => ({ ...field, id: this.generateFieldId() })),
          relationships: [],
          displaySettings: { ...template.displaySettings, ...customizations?.displaySettings },
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return this.createObjectType(newObjectType);
      })
    );
  }

  saveAsTemplate(objectTypeId: string, templateName: string, templateDescription: string): Observable<string> {
    return this.getObjectTypeById(objectTypeId).pipe(
      switchMap(objectType => {
        if (!objectType) throw new Error('Object type not found');
        
        const template: Omit<ObjectTypeTemplate, 'id'> = {
          name: templateName,
          description: templateDescription,
          category: 'custom',
          icon: 'category',
          fields: objectType.fields.map(field => ({ ...field, id: this.generateFieldId() })),
          displaySettings: objectType.displaySettings,
          isBuiltIn: false
        };
        
        return this.entityService.createEntity<ObjectTypeTemplate>(this.TEMPLATES_COLLECTION, template);
      })
    );
  }

  // Validation and Analysis
  validateObjectType(objectType: Partial<WallObjectType>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!objectType.name || objectType.name.trim().length === 0) {
      errors.push('Object type name is required');
    }
    
    if (!objectType.fields || objectType.fields.length === 0) {
      errors.push('At least one field is required');
    }
    
    if (objectType.fields) {
      // Check for duplicate field names
      const fieldNames = objectType.fields.map(f => f.name.toLowerCase());
      const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        errors.push(`Duplicate field names: ${duplicateNames.join(', ')}`);
      }
      
      // Validate each field
      objectType.fields.forEach((field, index) => {
        const fieldErrors = this.validateField(field);
        fieldErrors.forEach(error => errors.push(`Field ${index + 1}: ${error}`));
      });
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateField(field: Partial<FieldDefinition>): string[] {
    const errors: string[] = [];
    
    if (!field.name || field.name.trim().length === 0) {
      errors.push('Field name is required');
    }
    
    if (!field.type) {
      errors.push('Field type is required');
    }
    
    // Type-specific validations
    if (field.type === 'multiselect' && (!field.multiselectConfig?.options || field.multiselectConfig.options.length === 0)) {
      errors.push('Multiselect field must have at least one option');
    }
    
    if (field.type === 'file' && field.fileConfig?.allowedTypes?.length === 0) {
      errors.push('File field must specify allowed file types');
    }
    
    return errors;
  }

  analyzeObjectTypeUsage(objectTypeId: string): Observable<{
    itemCount: number;
    lastUsed: Date | null;
    fieldUsageStats: { fieldId: string; fieldName: string; usageCount: number; usagePercentage: number }[];
  }> {
    // This would typically query the wall_items collection
    // For now, return mock data
    return this.entityService.getEntities('wall_items', {
      filters: [{ field: 'objectTypeId', operator: '==', value: objectTypeId }]
    }).pipe(
      map(items => {
        const itemCount = items.length;
        const lastUsed = items.length > 0 ? new Date(Math.max(...items.map((item: any) => new Date(item.updatedAt).getTime()))) : null;
        
        // Calculate field usage statistics
        const fieldUsageStats: any[] = [];
        // TODO: Implement actual field usage analysis
        
        return { itemCount, lastUsed, fieldUsageStats };
      })
    );
  }

  // Utility Methods
  generateFieldId(): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getFieldTypeOptions(): { value: string; label: string; description: string }[] {
    return [
      { value: 'text', label: 'Text', description: 'Single line text input' },
      { value: 'longtext', label: 'Long Text', description: 'Multi-line text area' },
      { value: 'richtext', label: 'Rich Text', description: 'Formatted text with styling' },
      { value: 'number', label: 'Number', description: 'Numeric input' },
      { value: 'date', label: 'Date', description: 'Date picker' },
      { value: 'boolean', label: 'Yes/No', description: 'Checkbox for true/false values' },
      { value: 'email', label: 'Email', description: 'Email address with validation' },
      { value: 'url', label: 'URL', description: 'Web address with validation' },
      { value: 'color', label: 'Color', description: 'Color picker' },
      { value: 'multiselect', label: 'Multiple Choice', description: 'Select multiple options from a list' },
      { value: 'file', label: 'File Upload', description: 'File attachment' },
      { value: 'location', label: 'Location', description: 'Geographic coordinates' },
      { value: 'relationship', label: 'Relationship', description: 'Link to other items' }
    ];
  }

  cloneObjectType(objectTypeId: string, newName: string): Observable<string> {
    return this.getObjectTypeById(objectTypeId).pipe(
      switchMap(objectType => {
        if (!objectType) throw new Error('Object type not found');
        
        const clonedObjectType: Omit<WallObjectType, 'id'> = {
          ...objectType,
          name: newName,
          fields: objectType.fields.map(field => ({ ...field, id: this.generateFieldId() }))
        };
        
        return this.createObjectType(clonedObjectType);
      })
    );
  }

  private processObjectTypeForSave(objectType: Partial<WallObjectType>): Partial<WallObjectType> {
    const processed = {
      ...objectType,
      fields: objectType.fields?.map(field => this.processFieldForSave(field))
    };
    
    // Only add updatedAt if this is an update operation (not creation)
    if (objectType.id) {
      (processed as any).updatedAt = new Date();
    }
    
    return processed;
  }

  private processFieldForSave(field: Partial<FieldDefinition>): FieldDefinition {
    return {
      ...field,
      id: field.id || this.generateFieldId(),
      name: field.name?.trim() || '',
      type: field.type || 'text',
      required: field.required || false,
      placeholder: field.placeholder?.trim(),
      description: field.description?.trim()
    } as FieldDefinition;
  }
}