import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { TooltipDirective } from '../../../../shared/components/tooltip/tooltip.component';
import { ProgressSpinnerComponent } from '../../../../shared/components/progress-spinner/progress-spinner.component';
import { MatFormField, MatLabel, MatSelect, MatOption } from '../../../../shared/components/material-stubs';
import { Observable, Subject, combineLatest, takeUntil } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import { MapsService, Coordinates, MapMarker } from '../../services/maps.service';
import { WallItem, WallObjectType, Wall } from '../../../../shared/models/wall.model';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { WallService } from '../../../walls/services/wall.service';
import { WallItemService } from '../../../wall-items/services/wall-item.service';
import { ThemeService } from '../../../../shared/services/theme.service';

export interface MapViewSettings {
  tileProvider: 'openstreetmap' | 'satellite';
  clusterMarkers: boolean;
  showAllItems: boolean;
  filterByObjectType?: string;
}

export interface MapItemClickEvent {
  wallItem: WallItem;
  coordinates: Coordinates;
  marker: L.Marker;
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [
    CommonModule,
    ThemedButtonComponent,
    MaterialIconComponent,
    SelectComponent,
    TooltipDirective,
    ProgressSpinnerComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption
  ],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css']
})
export class MapViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  @Input() wallItems: WallItem[] = [];
  @Input() objectTypes: WallObjectType[] = [];
  @Input() height = '500px';
  @Input() showControls = true;
  @Input() initialSettings: Partial<MapViewSettings> = {};
  @Input() fullPage = false;  // New input to determine if map should fill entire page
  
  @Output() itemClick = new EventEmitter<MapItemClickEvent>();
  @Output() settingsChanged = new EventEmitter<MapViewSettings>();
  
  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private tileLayer!: L.TileLayer;
  private destroy$ = new Subject<void>();
  
  settings: MapViewSettings = {
    tileProvider: 'openstreetmap',
    clusterMarkers: false,
    showAllItems: true,
    filterByObjectType: undefined
  };
  
  isLoading = false;
  visibleItems: WallItem[] = [];
  mapMarkers: MapMarker[] = [];
  private currentWallId?: string;
  private currentWall?: Wall;
  private wallThemeColors?: { primary: string; secondary: string; accent: string; };
  
  constructor(
    private mapsService: MapsService,
    private route: ActivatedRoute,
    private wallService: WallService,
    private wallItemService: WallItemService,
    private router: Router,
    private themeService: ThemeService
  ) {}
  
  ngOnInit() {
    // Apply initial settings
    this.settings = { ...this.settings, ...this.initialSettings };
    
    // Subscribe to theme changes
    this.themeService.getCurrentTheme()
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        if (theme.wallTheme) {
          this.wallThemeColors = {
            primary: theme.wallTheme.primaryColor,
            secondary: theme.wallTheme.secondaryColor,
            accent: theme.wallTheme.accentColor || theme.wallTheme.primaryColor
          };
          // Update existing markers with new theme colors
          if (this.map && this.mapMarkers.length > 0) {
            this.updateMapMarkers();
          }
        }
      });
    
    // Check if we're being used as a standalone route (no inputs provided)
    const isStandaloneRoute = !this.wallItems.length && !this.objectTypes.length;
    
    if (isStandaloneRoute) {
      this.fullPage = true;
      this.showControls = true; // Always show controls in standalone mode
      this.loadWallData();
    }
    
    // Update map when wall items or settings change
    this.updateVisibleItems();
  }
  
  ngAfterViewInit() {
    this.initializeMap();
    
    // Set up global event listener for map item clicks from popup buttons
    window.addEventListener('mapItemClick', this.handleMapItemClick);
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.map) {
      this.map.remove();
    }
    
    // Clean up event listener
    window.removeEventListener('mapItemClick', this.handleMapItemClick);
  }
  
  private handleMapItemClick = (event: any) => {
    const itemId = event.detail;
    if (itemId && this.currentWallId) {
      this.router.navigate(['/walls', this.currentWallId, 'items', itemId]);
    }
  }
  
  private initializeMap() {
    // Create map
    this.map = this.mapsService.createMap(this.mapContainer.nativeElement.id, {
      center: [39.8283, -98.5795], // Center of USA
      zoom: 4
    });
    
    // Add initial tile layer
    this.updateTileLayer();
    
    // Create markers layer
    this.markersLayer = L.layerGroup().addTo(this.map);
    
    // Load initial markers
    this.updateMapMarkers();
  }
  
  private updateTileLayer() {
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }
    
    this.tileLayer = this.mapsService.addTileLayer(this.map, this.settings.tileProvider);
  }
  
  private updateVisibleItems() {
    if (this.settings.showAllItems) {
      this.visibleItems = this.wallItems;
    } else if (this.settings.filterByObjectType) {
      this.visibleItems = this.wallItems.filter(item => 
        item.objectTypeId === this.settings.filterByObjectType
      );
    } else {
      this.visibleItems = [];
    }
    
    this.updateMapMarkers();
  }
  
  private updateMapMarkers() {
    if (!this.map) return;
    
    this.isLoading = true;
    
    // Clear existing markers
    this.markersLayer.clearLayers();
    
    // Filter items that have coordinates (either directly or in fieldData.location)
    const itemsWithCoordinates = this.visibleItems.filter(item => {
      // Check direct coordinates first
      if (item.coordinates && this.mapsService.isValidCoordinates(item.coordinates)) {
        return true;
      }
      // Check fieldData.location for location field type
      if (item.fieldData?.['location'] && 
          typeof item.fieldData['location'] === 'object' &&
          'lat' in item.fieldData['location'] && 
          'lng' in item.fieldData['location']) {
        return this.mapsService.isValidCoordinates(item.fieldData['location']);
      }
      return false;
    });
    
    if (itemsWithCoordinates.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Create map markers from wall items
    this.mapMarkers = itemsWithCoordinates.map(item => {
      const objectType = this.objectTypes.find(type => type.id === item.objectTypeId);
      
      // Get coordinates from either direct coordinates or fieldData.location
      let coordinates = item.coordinates;
      if (!coordinates && item.fieldData?.['location']) {
        coordinates = item.fieldData['location'];
      }
      
      // Use wall theme colors if available, otherwise use object type colors
      let markerColor = objectType?.color || '#4285f4';
      if (this.wallThemeColors) {
        // Use theme colors based on object type index for variety
        const objectTypeIndex = this.objectTypes.findIndex(type => type.id === item.objectTypeId);
        if (objectTypeIndex === 0) {
          markerColor = this.wallThemeColors.primary;
        } else if (objectTypeIndex === 1) {
          markerColor = this.wallThemeColors.secondary;
        } else if (objectTypeIndex === 2) {
          markerColor = this.wallThemeColors.accent;
        } else {
          // For additional object types, alternate between primary and secondary
          markerColor = objectTypeIndex % 2 === 0 ? this.wallThemeColors.primary : this.wallThemeColors.secondary;
        }
      }
      
      return {
        id: item.id,
        coordinates: coordinates!,
        title: this.getItemDisplayName(item),
        content: this.getItemDescription(item),
        icon: objectType?.icon || 'place',
        color: markerColor,
        wallItemId: item.id,
        objectTypeId: item.objectTypeId
      };
    });
    
    // Add markers to map
    this.addMarkersToMap();
    
    // Fit map to show all markers
    if (this.mapMarkers.length > 0) {
      this.mapsService.fitMapToMarkers(this.map, this.mapMarkers);
    }
    
    this.isLoading = false;
  }
  
  private addMarkersToMap() {
    this.mapMarkers.forEach(markerData => {
      const wallItem = this.wallItems.find(item => item.id === markerData.wallItemId);
      const objectType = this.objectTypes.find(ot => ot.id === markerData.objectTypeId);
      
      // Create enhanced popup content with view button
      // Apply theme color to the view button if available
      const buttonStyle = this.wallThemeColors ? 
        `style="background: ${this.wallThemeColors.primary}; color: white;"` : '';
      
      const popupContent = `
        <div class="map-popup-card">
          <div class="popup-header">
            <h4 class="popup-title">${markerData.title}</h4>
            <button class="popup-close-btn" onclick="this.closest('.leaflet-popup').querySelector('.leaflet-popup-close-button').click()">
              <span class="material-icons">close</span>
            </button>
          </div>
          <p class="popup-content">${markerData.content}</p>
          ${markerData.coordinates.address ? `<p class="popup-address"><small>${markerData.coordinates.address}</small></p>` : ''}
          <div class="popup-actions">
            <button class="view-item-btn" ${buttonStyle} data-wall-id="${this.currentWallId}" data-object-type="${markerData.objectTypeId}" data-item-id="${markerData.wallItemId}">
              <span class="material-icons">open_in_new</span>
              <span>View Details</span>
            </button>
          </div>
        </div>
      `;
      
      const marker = this.mapsService.createCustomMarker(markerData.coordinates, {
        title: markerData.title,
        content: markerData.content,
        color: markerData.color,
        icon: markerData.icon
      });
      
      // Bind enhanced popup
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'material-popup'
      });
      
      // Add popup open event to handle button click
      marker.on('popupopen', (e: any) => {
        // Add click handler to the view button
        const popup = e.popup;
        const container = popup.getElement();
        if (container) {
          const viewBtn = container.querySelector('.view-item-btn');
          if (viewBtn) {
            viewBtn.addEventListener('click', () => {
              const wallId = viewBtn.getAttribute('data-wall-id');
              const objectTypeId = viewBtn.getAttribute('data-object-type');
              const itemId = viewBtn.getAttribute('data-item-id');
              if (wallId && objectTypeId && itemId) {
                // Navigate to the correct preset/items path
                this.router.navigate(['/walls', wallId, 'presets', objectTypeId, 'items', itemId]);
              }
            });
          }
        }
      });
      
      // Handle click event for non-full page mode
      if (!this.fullPage && wallItem) {
        marker.on('click', (e: any) => {
          this.itemClick.emit({
            wallItem,
            coordinates: markerData.coordinates,
            marker
          });
        });
      }
      
      // Store additional data
      (marker as any).wallItemId = markerData.wallItemId;
      (marker as any).objectTypeId = markerData.objectTypeId;
      
      this.markersLayer.addLayer(marker);
    });
  }
  
  private getItemDisplayName(item: WallItem): string {
    // Find the first text field value or use ID
    const fieldData = item.fieldData || item.data || {};
    for (const [fieldId, value] of Object.entries(fieldData)) {
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return `Item ${item.id.substring(0, 8)}...`;
  }
  
  private getItemDescription(item: WallItem): string {
    const objectType = this.objectTypes.find(type => type.id === item.objectTypeId);
    const objectTypeName = objectType?.name || 'Unknown Type';
    
    let description = `<strong>${objectTypeName}</strong><br>`;
    
    // Add first few field values (excluding location object)
    const fieldData = item.fieldData || item.data || {};
    const fieldEntries = Object.entries(fieldData)
      .filter(([key, value]) => key !== 'location' && value && typeof value === 'string')
      .slice(0, 3);
    fieldEntries.forEach(([fieldId, value]) => {
      if (value && typeof value === 'string' && value.trim()) {
        const truncatedValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
        description += `${truncatedValue}<br>`;
      }
    });
    
    // Add View button only if not in full page mode
    if (!this.fullPage) {
      description += `<br><button onclick="window.dispatchEvent(new CustomEvent('mapItemClick', {detail: '${item.id}'}))" style="
        background: ${objectType?.color || '#4285f4'};
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 8px;
      ">View Details</button>`;
    }
    
    // Add coordinates
    const coords = item.coordinates || item.fieldData?.['location'];
    if (coords) {
      description += `<br><small>📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}</small>`;
    }
    
    return description;
  }
  
  // Public methods for external control
  
  onTileProviderChange(provider: 'openstreetmap' | 'satellite') {
    this.settings.tileProvider = provider;
    this.updateTileLayer();
    this.emitSettingsChange();
  }
  
  onFilterChange(objectTypeId: string | null) {
    if (objectTypeId === null || objectTypeId === 'all') {
      this.settings.showAllItems = true;
      this.settings.filterByObjectType = undefined;
    } else {
      this.settings.showAllItems = false;
      this.settings.filterByObjectType = objectTypeId;
    }
    
    this.updateVisibleItems();
    this.emitSettingsChange();
  }
  
  centerOnMarker(wallItemId: string) {
    const marker = this.mapMarkers.find(m => m.wallItemId === wallItemId);
    if (marker && this.map) {
      this.map.setView([marker.coordinates.lat, marker.coordinates.lng], 15);
      
      // Find and open the popup
      this.markersLayer.eachLayer((layer: any) => {
        if (layer.wallItemId === wallItemId) {
          layer.openPopup();
        }
      });
    }
  }
  
  fitToAllMarkers() {
    if (this.mapMarkers.length > 0) {
      this.mapsService.fitMapToMarkers(this.map, this.mapMarkers);
    }
  }
  
  refreshMap() {
    this.updateMapMarkers();
  }
  
  getVisibleItemsCount(): number {
    return this.visibleItems.length;
  }
  
  getItemsWithCoordinatesCount(): number {
    return this.visibleItems.filter(item => {
      // Check direct coordinates
      if (item.coordinates && this.mapsService.isValidCoordinates(item.coordinates)) {
        return true;
      }
      
      // Check fieldData.location
      if (item.fieldData?.['location'] && 
          typeof item.fieldData['location'] === 'object' &&
          'lat' in item.fieldData['location'] && 
          'lng' in item.fieldData['location']) {
        return this.mapsService.isValidCoordinates(item.fieldData['location']);
      }
      
      return false;
    }).length;
  }
  
  private emitSettingsChange() {
    this.settingsChanged.emit({ ...this.settings });
  }
  
  private loadWallData() {
    // Load wall data when used as standalone route
    this.route.params.pipe(
      switchMap(params => {
        const wallId = params['wallId'];
        if (wallId) {
          this.currentWallId = wallId;
          return this.wallService.getWallById(wallId);
        }
        return [];
      }),
      takeUntil(this.destroy$)
    ).subscribe(wall => {
      if (wall) {
        this.currentWall = wall;
        this.objectTypes = wall.objectTypes || [];
        
        // Apply wall theme if it exists
        if (wall.theme) {
          this.themeService.applyWallTheme(wall.theme);
        }
        
        // Load wall items
        this.wallItemService.getWallItems(wall.id!).subscribe(items => {
          this.wallItems = items;
          this.updateVisibleItems();
        });
      }
    });
  }
  
  // Handle input changes
  onWallItemsChange() {
    this.updateVisibleItems();
  }
  
  onObjectTypesChange() {
    this.updateMapMarkers();
  }
  
  // Helper methods for template
  getItemCountForObjectType(objectTypeId: string): number {
    return this.wallItems.filter(item => {
      if (item.objectTypeId !== objectTypeId) return false;
      
      // Check direct coordinates
      if (item.coordinates && this.mapsService.isValidCoordinates(item.coordinates)) {
        return true;
      }
      
      // Check fieldData.location
      if (item.fieldData?.['location'] && 
          typeof item.fieldData['location'] === 'object' &&
          'lat' in item.fieldData['location'] && 
          'lng' in item.fieldData['location']) {
        return this.mapsService.isValidCoordinates(item.fieldData['location']);
      }
      
      return false;
    }).length;
  }
  
  getTotalItemsCount(): number {
    return this.wallItems.length;
  }
}