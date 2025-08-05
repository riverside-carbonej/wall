import { Injectable, signal } from '@angular/core';
import { FormGroup, AbstractControl } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, distinctUntilChanged } from 'rxjs/operators';

export interface FormStateConfig {
  /** The FormGroup to monitor */
  form: FormGroup;
  /** Initial data to compare against for changes */
  initialData?: any;
  /** Custom comparison function for detecting changes */
  compareFunction?: (current: any, initial: any) => boolean;
  /** Fields to exclude from change detection */
  excludeFields?: string[];
}

export interface FormState {
  /** Whether the form has unsaved changes */
  hasChanges: boolean;
  /** Whether the form is valid */
  isValid: boolean;
  /** Whether save button should be enabled */
  canSave: boolean;
  /** Whether the form is currently saving */
  isSaving: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FormStateService {
  private formStates = new Map<string, BehaviorSubject<FormState>>();
  private initialDataMap = new Map<string, any>();
  private configMap = new Map<string, FormStateConfig>();

  /**
   * Register a form for state tracking
   * @param formId Unique identifier for the form
   * @param config Form configuration
   * @returns Observable of form state
   */
  registerForm(formId: string, config: FormStateConfig): Observable<FormState> {
    // Store config and initial data
    this.configMap.set(formId, config);
    this.initialDataMap.set(formId, this.cloneData(config.initialData || {}));

    // Create state subject if it doesn't exist
    if (!this.formStates.has(formId)) {
      const initialState: FormState = {
        hasChanges: false,
        isValid: config.form.valid,
        canSave: false,
        isSaving: false
      };
      this.formStates.set(formId, new BehaviorSubject(initialState));
    }

    const stateSubject = this.formStates.get(formId)!;

    // Listen to form changes
    const formValue$ = config.form.valueChanges.pipe(
      startWith(config.form.value),
      distinctUntilChanged((prev, curr) => this.deepEqual(prev, curr))
    );

    const formStatus$ = config.form.statusChanges.pipe(
      startWith(config.form.status),
      distinctUntilChanged()
    );

    // Combine form value and status changes
    combineLatest([formValue$, formStatus$]).subscribe(([value, status]) => {
      const currentState = stateSubject.value;
      const hasChanges = this.detectChanges(formId, value);
      const isValid = status === 'VALID';
      const canSave = hasChanges && isValid && !currentState.isSaving;

      const newState: FormState = {
        hasChanges,
        isValid,
        canSave,
        isSaving: currentState.isSaving
      };

      stateSubject.next(newState);
    });

    return stateSubject.asObservable();
  }

  /**
   * Update the initial data for a form (e.g., after successful save)
   * @param formId Form identifier
   * @param newInitialData New initial data to compare against
   */
  updateInitialData(formId: string, newInitialData: any): void {
    this.initialDataMap.set(formId, this.cloneData(newInitialData));
    
    // Trigger state recalculation
    const config = this.configMap.get(formId);
    const stateSubject = this.formStates.get(formId);
    
    if (config && stateSubject) {
      const currentValue = config.form.value;
      const hasChanges = this.detectChanges(formId, currentValue);
      const currentState = stateSubject.value;
      
      const newState: FormState = {
        ...currentState,
        hasChanges,
        canSave: hasChanges && currentState.isValid && !currentState.isSaving
      };
      
      stateSubject.next(newState);
    }
  }

  /**
   * Set the saving state for a form
   * @param formId Form identifier
   * @param isSaving Whether the form is currently saving
   */
  setSavingState(formId: string, isSaving: boolean): void {
    const stateSubject = this.formStates.get(formId);
    if (stateSubject) {
      const currentState = stateSubject.value;
      const newState: FormState = {
        ...currentState,
        isSaving,
        canSave: currentState.hasChanges && currentState.isValid && !isSaving
      };
      stateSubject.next(newState);
    }
  }

  /**
   * Reset a form to its initial state
   * @param formId Form identifier
   */
  resetForm(formId: string): void {
    const config = this.configMap.get(formId);
    const initialData = this.initialDataMap.get(formId);
    
    if (config && initialData) {
      config.form.patchValue(initialData);
      config.form.markAsPristine();
      config.form.markAsUntouched();
    }
  }

  /**
   * Get current form state
   * @param formId Form identifier
   * @returns Current form state or null if not registered
   */
  getFormState(formId: string): FormState | null {
    const stateSubject = this.formStates.get(formId);
    return stateSubject ? stateSubject.value : null;
  }

  /**
   * Check if form has unsaved changes
   * @param formId Form identifier
   * @returns True if form has changes
   */
  hasUnsavedChanges(formId: string): boolean {
    const state = this.getFormState(formId);
    return state ? state.hasChanges : false;
  }

  /**
   * Unregister a form (cleanup)
   * @param formId Form identifier
   */
  unregisterForm(formId: string): void {
    const stateSubject = this.formStates.get(formId);
    if (stateSubject) {
      stateSubject.complete();
      this.formStates.delete(formId);
    }
    this.initialDataMap.delete(formId);
    this.configMap.delete(formId);
  }

  /**
   * Detect if form data has changed from initial
   */
  private detectChanges(formId: string, currentValue: any): boolean {
    const config = this.configMap.get(formId);
    const initialData = this.initialDataMap.get(formId);
    
    if (!config || !initialData) {
      return false;
    }

    // Use custom comparison function if provided
    if (config.compareFunction) {
      return !config.compareFunction(currentValue, initialData);
    }

    // Filter out excluded fields
    const filteredCurrent = this.filterExcludedFields(currentValue, config.excludeFields);
    const filteredInitial = this.filterExcludedFields(initialData, config.excludeFields);

    return !this.deepEqual(filteredCurrent, filteredInitial);
  }

  /**
   * Filter out excluded fields from an object
   */
  private filterExcludedFields(data: any, excludeFields?: string[]): any {
    if (!excludeFields || excludeFields.length === 0) {
      return data;
    }

    const filtered = { ...data };
    excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }

  /**
   * Deep equality check for objects
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!this.deepEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  /**
   * Deep clone data to avoid reference issues
   */
  private cloneData(data: any): any {
    if (data === null || typeof data !== 'object') return data;
    if (data instanceof Date) return new Date(data.getTime());
    if (Array.isArray(data)) return data.map(item => this.cloneData(item));
    
    const cloned: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        cloned[key] = this.cloneData(data[key]);
      }
    }
    return cloned;
  }
}