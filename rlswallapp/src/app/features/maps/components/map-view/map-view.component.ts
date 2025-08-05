import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { TooltipDirective } from '../../../../shared/components/tooltip/tooltip.component';
import { ProgressSpinnerComponent } from '../../../../shared/components/progress-spinner/progress-spinner.component';
import { MatFormField, MatLabel, MatSelect, MatOption } from '../../../../shared/components/material-stubs';
import { Observable, Subject, combineLatest, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';
import * as L from 'leaflet';
import { MapsService, Coordinates, MapMarker } from '../../services/maps.service';
import { WallItem, WallObjectType } from '../../../../shared/models/wall.model';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

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
  
  constructor(private mapsService: MapsService) {}
  
  ngOnInit() {
    // Apply initial settings
    this.settings = { ...this.settings, ...this.initialSettings };
    
    // Update map when wall items or settings change
    this.updateVisibleItems();
  }
  
  ngAfterViewInit() {
    this.initializeMap();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.map) {
      this.map.remove();
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
    
    // Filter items that have coordinates
    const itemsWithCoordinates = this.visibleItems.filter(item => 
      item.coordinates && 
      this.mapsService.isValidCoordinates(item.coordinates)
    );
    
    if (itemsWithCoordinates.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Create map markers from wall items
    this.mapMarkers = itemsWithCoordinates.map(item => {
      const objectType = this.objectTypes.find(type => type.id === item.objectTypeId);
      
      return {
        id: item.id,
        coordinates: item.coordinates!,
        title: this.getItemDisplayName(item),
        content: this.getItemDescription(item),
        icon: objectType?.icon || 'place',
        color: objectType?.color || '#4285f4',
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
      const marker = this.mapsService.createCustomMarker(markerData.coordinates, {
        title: markerData.title,
        content: markerData.content,
        color: markerData.color,
        icon: markerData.icon
      });
      
      // Add click event
      marker.on('click', (e: any) => {
        // Prevent default zoom behavior
        e.originalEvent?.stopPropagation();
        
        const wallItem = this.wallItems.find(item => item.id === markerData.wallItemId);
        if (wallItem) {
          this.itemClick.emit({
            wallItem,
            coordinates: markerData.coordinates,
            marker
          });
        }
      });
      
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
    
    // Add first few field values
    const fieldData = item.fieldData || item.data || {};
    const fieldEntries = Object.entries(fieldData).slice(0, 3);
    fieldEntries.forEach(([fieldId, value]) => {
      if (value && typeof value === 'string' && value.trim()) {
        const truncatedValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
        description += `${truncatedValue}<br>`;
      }
    });
    
    // Add coordinates
    if (item.coordinates) {
      description += `<small>📍 ${item.coordinates.lat.toFixed(4)}, ${item.coordinates.lng.toFixed(4)}</small>`;
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
    return this.visibleItems.filter(item => 
      item.coordinates && 
      this.mapsService.isValidCoordinates(item.coordinates)
    ).length;
  }
  
  private emitSettingsChange() {
    this.settingsChanged.emit({ ...this.settings });
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
    return this.wallItems.filter(item => 
      item.objectTypeId === objectTypeId && 
      item.coordinates &&
      this.mapsService.isValidCoordinates(item.coordinates)
    ).length;
  }
  
  getTotalItemsCount(): number {
    return this.wallItems.length;
  }
}