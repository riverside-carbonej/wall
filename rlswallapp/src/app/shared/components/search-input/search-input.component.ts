import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../input-field/input-field.component';
import { MaterialIconComponent } from '../material-icon/material-icon.component';
import { ThemedButtonComponent } from '../themed-button/themed-button.component';
import { AutocompleteComponent, OptionComponent } from '../autocomplete/autocomplete.component';
import { ProgressSpinnerComponent } from '../progress-spinner/progress-spinner.component';
import { MatSpinner, MatOptgroup } from '../material-stubs';
import { Subject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface SearchSuggestion {
  value: string;
  label: string;
  icon?: string;
  category?: string;
  disabled?: boolean;
}

export type SearchVariant = 'default' | 'toolbar' | 'compact';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormFieldComponent,
    MaterialIconComponent,
    ThemedButtonComponent,
    AutocompleteComponent,
    OptionComponent,
    ProgressSpinnerComponent,
    MatSpinner,
    MatOptgroup
  ],
  template: `
    <div class="search-container" [class]="containerClasses">
      <mat-form-field 
        [appearance]="appearance"
        [class]="fieldClasses"
        [subscriptSizing]="'dynamic'">
        
        <!-- Search Icon Prefix -->
        @if (showSearchIcon) {
          <mat-icon matPrefix class="search-icon">search</mat-icon>
        }
        
        <!-- Search Input -->
        <input 
          matInput
          #searchInput
          type="search"
          [placeholder]="placeholder"
          [value]="searchValue"
          [disabled]="disabled"
          [maxLength]="maxLength"
          [attr.aria-label]="ariaLabel || placeholder"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown.enter)="onEnterKey()"
          (keydown.escape)="onEscapeKey()" />
        
        <!-- Loading Spinner -->
        @if (loading) {
          <mat-spinner 
            matSuffix 
[diameter]="20" 
            class="loading-spinner">
          </mat-spinner>
        }
        
        <!-- Clear Button -->
        @if (searchValue && clearable && !loading) {
          <button 
            matSuffix 
            mat-icon-button
            type="button"
            class="clear-button"
            [attr.aria-label]="clearAriaLabel"
            (click)="clearSearch()">
            <mat-icon>clear</mat-icon>
          </button>
        }
        
        <!-- Voice Search Button -->
        @if (voiceSearchEnabled && !loading) {
          <button 
            matSuffix 
            mat-icon-button
            type="button"
            class="voice-button"
            [disabled]="!voiceSearchSupported"
            [attr.aria-label]="voiceAriaLabel"
            (click)="startVoiceSearch()">
            <mat-icon>{{ voiceSearchActive ? 'mic' : 'mic_none' }}</mat-icon>
          </button>
        }
        
        <!-- Autocomplete Panel -->
        <mat-autocomplete 
          #auto="matAutocomplete"
          [displayWith]="displayFn"
          [panelWidth]="panelWidth"
          (optionSelected)="onSuggestionSelected($event)"
          (opened)="onPanelOpened()"
          (closed)="onPanelClosed()">
          
          @if (groupedSuggestions) {
            @for (group of groupedSuggestions; track group.category) {
              @if (group.category) {
                <mat-optgroup [label]="group.category">
                  @for (suggestion of group.suggestions; track suggestion.value) {
                    <mat-option 
                      [value]="suggestion"
                      [disabled]="suggestion.disabled"
                      class="suggestion-option">
                      
                      @if (suggestion.icon) {
                        <mat-icon class="suggestion-icon">{{ suggestion.icon }}</mat-icon>
                      }
                      
                      <span class="suggestion-text">
                        <span class="suggestion-label">{{ suggestion.label }}</span>
                        @if (showSuggestionValues && suggestion.value !== suggestion.label) {
                          <span class="suggestion-value body-small">{{ suggestion.value }}</span>
                        }
                      </span>
                    </mat-option>
                  }
                </mat-optgroup>
              } @else {
                @for (suggestion of group.suggestions; track suggestion.value) {
                  <mat-option 
                    [value]="suggestion"
                    [disabled]="suggestion.disabled"
                    class="suggestion-option">
                    
                    @if (suggestion.icon) {
                      <mat-icon class="suggestion-icon">{{ suggestion.icon }}</mat-icon>
                    }
                    
                    <span class="suggestion-text">
                      <span class="suggestion-label">{{ suggestion.label }}</span>
                      @if (showSuggestionValues && suggestion.value !== suggestion.label) {
                        <span class="suggestion-value body-small">{{ suggestion.value }}</span>
                      }
                    </span>
                  </mat-option>
                }
              }
            }
          }
          
          @if (noResultsMessage && suggestions.length === 0 && searchValue) {
            <mat-option [disabled]="true" class="no-results-option">
              <mat-icon class="no-results-icon">search_off</mat-icon>
              <span>{{ noResultsMessage }}</span>
            </mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
      
      <!-- Search Button (for toolbar variant) -->
      @if (variant === 'toolbar' && showSearchButton) {
        <button 
          mat-icon-button
          type="button"
          class="search-button"
          [disabled]="disabled || (!searchValue && !allowEmptySearch)"
          [attr.aria-label]="searchButtonAriaLabel"
          (click)="performSearch()">
          <mat-icon>search</mat-icon>
        </button>
      }
    </div>
    
    <!-- Recent Searches (when focused and no input) -->
    @if (showRecentSearches && recentSearches.length && focused && !searchValue) {
      <div class="recent-searches" [class]="recentSearchesClasses">
        <div class="recent-searches-header body-small">Recent searches</div>
        @for (recent of recentSearches; track recent) {
          <button 
            class="recent-search-item"
            type="button"
            (click)="selectRecentSearch(recent)">
            <mat-icon class="recent-icon">history</mat-icon>
            <span class="recent-text">{{ recent }}</span>
            <button 
              class="remove-recent"
              type="button"
              [attr.aria-label]="'Remove ' + recent + ' from recent searches'"
              (click)="removeRecentSearch(recent, $event)">
              <mat-icon>close</mat-icon>
            </button>
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    .search-container {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-2);
      width: 100%;
    }
    
    .container-default {
      /* Default container styling */
    }
    
    .container-toolbar {
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-full);
      padding: var(--md-sys-spacing-1);
    }
    
    .container-compact {
      /* Compact container styling */
    }
    
    /* Form Field Variants */
    .field-default mat-form-field {
      width: 100%;
    }
    
    .field-toolbar mat-form-field {
      flex: 1;
    }
    
    .field-compact mat-form-field {
      width: 100%;
    }
    
    .field-toolbar mat-form-field {
      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      
      ::ng-deep .mdc-text-field--outlined .mdc-notched-outline {
        border: none;
      }
      
      ::ng-deep .mdc-text-field--filled {
        background-color: transparent;
      }
    }
    
    /* Icons */
    .search-icon {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    .clear-button,
    .voice-button {
      width: 36px;
      height: 36px;
    }
    
    .clear-button mat-icon,
    .voice-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--md-sys-color-on-surface-variant);
    }
    
    .voice-button[disabled] mat-icon {
      color: var(--md-sys-color-on-surface);
      opacity: 0.38;
    }
    
    .loading-spinner {
      ::ng-deep circle {
        stroke: var(--md-sys-color-primary);
      }
    }
    
    .search-button {
      background-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      width: 40px;
      height: 40px;
    }
    
    .search-button:hover:not(:disabled) {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }
    
    /* Autocomplete Suggestions */
    ::ng-deep .mat-mdc-autocomplete-panel {
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-sys-elevation-3);
      max-height: 256px;
    }
    
    .suggestion-option {
      min-height: 48px;
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-4);
      font-family: 'Google Sans', 'Roboto', sans-serif;
    }
    
    .suggestion-option {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
    }
    
    .suggestion-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--md-sys-color-on-surface-variant);
      flex-shrink: 0;
    }
    
    .suggestion-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      flex: 1;
      min-width: 0;
    }
    
    .suggestion-label {
      font-size: var(--md-sys-typescale-body-large-size);
      line-height: var(--md-sys-typescale-body-large-line-height);
      color: var(--md-sys-color-on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }
    
    .suggestion-value {
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 2px;
    }
    
    .no-results-option {
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
      color: var(--md-sys-color-on-surface-variant);
      cursor: default;
    }
    
    .no-results-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    /* Recent Searches */
    .recent-searches {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background-color: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-sys-elevation-3);
      padding: var(--md-sys-spacing-2) 0;
      margin-top: var(--md-sys-spacing-1);
      max-height: 200px;
      overflow-y: auto;
    }
    
    .recent-searches-header {
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-4);
      color: var(--md-sys-color-on-surface-variant);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .recent-search-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--md-sys-spacing-3);
      padding: var(--md-sys-spacing-2) var(--md-sys-spacing-4);
      border: none;
      background: none;
      text-align: left;
      color: var(--md-sys-color-on-surface);
      font-family: 'Google Sans', 'Roboto', sans-serif;
      font-size: var(--md-sys-typescale-body-large-size);
      cursor: pointer;
      transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
    }
    
    .recent-search-item:hover {
      background-color: var(--md-sys-color-surface-container-high);
    }
    
    .recent-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--md-sys-color-on-surface-variant);
    }
    
    .recent-text {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .remove-recent {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      border-radius: 50%;
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      opacity: 0;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
    }
    
    .remove-recent mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .recent-search-item:hover .remove-recent {
      opacity: 1;
    }
    
    .remove-recent:hover {
      background-color: var(--md-sys-color-surface-container-highest);
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .container-toolbar {
        padding: var(--md-sys-spacing-1) var(--md-sys-spacing-2);
      }
      
      .suggestion-option {
        min-height: 56px;
        padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      }
      
      .recent-search-item {
        min-height: 48px;
        padding: var(--md-sys-spacing-3) var(--md-sys-spacing-4);
      }
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .recent-search-item,
      .suggestion-option {
        transition: none;
      }
    }
    
    /* Focus States */
    .recent-search-item:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: -2px;
    }
    
    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .recent-searches {
        border: 1px solid var(--md-sys-color-outline);
      }
    }
  `]
})
export class SearchInputComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  
  @Input() placeholder = 'Search...';
  @Input() searchValue = '';
  @Input() disabled = false;
  @Input() maxLength?: number;
  @Input() ariaLabel?: string;
  
  // Variants
  @Input() variant: SearchVariant = 'default';
  @Input() appearance: 'fill' | 'outline' = 'outline';
  
  // Features
  @Input() clearable = true;
  @Input() clearAriaLabel = 'Clear search';
  @Input() voiceSearchEnabled = false;
  @Input() voiceSearchSupported = false;
  @Input() voiceAriaLabel = 'Voice search';
  @Input() showSearchIcon = true;
  @Input() showSearchButton = false;
  @Input() searchButtonAriaLabel = 'Search';
  @Input() allowEmptySearch = false;
  
  // Autocomplete
  @Input() suggestions: SearchSuggestion[] = [];
  @Input() showSuggestionValues = false;
  @Input() noResultsMessage = 'No results found';
  @Input() panelWidth: string | number = 'auto';
  @Input() debounceTime = 300;
  
  // Recent Searches
  @Input() showRecentSearches = false;
  @Input() recentSearches: string[] = [];
  @Input() maxRecentSearches = 5;
  
  // Loading
  @Input() loading = false;
  
  @Output() searchChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<SearchSuggestion>();
  @Output() voiceSearchStart = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() blur = new EventEmitter<void>();
  @Output() recentSearchSelected = new EventEmitter<string>();
  @Output() recentSearchRemoved = new EventEmitter<string>();
  
  focused = false;
  voiceSearchActive = false;
  panelOpen = false;
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  ngOnInit(): void {
    // Set up debounced search
    this.searchSubject
      .pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchChange.emit(query);
      });
    
    // Check for voice search support
    this.voiceSearchSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  get containerClasses(): string {
    return `container-${this.variant}`;
  }
  
  get fieldClasses(): string {
    return `field-${this.variant}`;
  }
  
  get recentSearchesClasses(): string {
    return `recent-${this.variant}`;
  }
  
  get groupedSuggestions(): Array<{category?: string; suggestions: SearchSuggestion[]}> {
    if (!this.suggestions?.length) return [];
    
    const grouped = new Map<string, SearchSuggestion[]>();
    
    for (const suggestion of this.suggestions) {
      const category = suggestion.category || '';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(suggestion);
    }
    
    return Array.from(grouped.entries()).map(([category, suggestions]) => ({
      category: category || undefined,
      suggestions
    }));
  }
  
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    this.searchSubject.next(this.searchValue);
  }
  
  onFocus(): void {
    this.focused = true;
    this.focus.emit();
  }
  
  onBlur(): void {
    // Delay to allow for suggestion selection
    setTimeout(() => {
      this.focused = false;
      this.blur.emit();
    }, 200);
  }
  
  onEnterKey(): void {
    this.performSearch();
  }
  
  onEscapeKey(): void {
    if (this.searchValue) {
      this.clearSearch();
    } else {
      this.searchInputRef.nativeElement.blur();
    }
  }
  
  clearSearch(): void {
    this.searchValue = '';
    this.searchSubject.next('');
    this.searchInputRef.nativeElement.focus();
  }
  
  performSearch(): void {
    if (this.searchValue || this.allowEmptySearch) {
      this.addToRecentSearches(this.searchValue);
      this.search.emit(this.searchValue);
    }
  }
  
  onSuggestionSelected(event: any): void {
    const suggestion: SearchSuggestion = event.option.value;
    this.searchValue = suggestion.value;
    this.addToRecentSearches(suggestion.value);
    this.suggestionSelected.emit(suggestion);
    this.search.emit(suggestion.value);
  }
  
  onPanelOpened(): void {
    this.panelOpen = true;
  }
  
  onPanelClosed(): void {
    this.panelOpen = false;
  }
  
  displayFn(suggestion: SearchSuggestion): string {
    return suggestion ? suggestion.value : '';
  }
  
  startVoiceSearch(): void {
    if (!this.voiceSearchSupported) return;
    
    this.voiceSearchActive = true;
    this.voiceSearchStart.emit();
    
    // Implement voice search logic here
    // This would typically involve the Web Speech API
  }
  
  selectRecentSearch(search: string): void {
    this.searchValue = search;
    this.recentSearchSelected.emit(search);
    this.search.emit(search);
    this.searchInputRef.nativeElement.focus();
  }
  
  removeRecentSearch(search: string, event: Event): void {
    event.stopPropagation();
    this.recentSearchRemoved.emit(search);
  }
  
  private addToRecentSearches(search: string): void {
    if (!search.trim() || !this.showRecentSearches) return;
    
    // This would typically be handled by the parent component
    // or a service to persist recent searches
  }
}