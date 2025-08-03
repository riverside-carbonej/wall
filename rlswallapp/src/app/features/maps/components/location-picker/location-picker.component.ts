import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/components/input-field/input-field.component';
import { ThemedButtonComponent } from '../../../../shared/components/themed-button/themed-button.component';
import { MaterialIconComponent } from '../../../../shared/components/material-icon/material-icon.component';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';
import { MatLabel, MatError } from '../../../../shared/components/material-stubs';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import * as L from 'leaflet';
import { MapsService, Coordinates, GeocodingResult } from '../../services/maps.service';

export interface LocationPickerResult {
  coordinates: Coordinates;
  address?: string;
  fromSearch?: boolean;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    ThemedButtonComponent,
    MaterialIconComponent,
    ProgressBarComponent,
    MatLabel,
    MatError
  ],
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.css']
})
export class LocationPickerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  @Input() initialCoordinates?: Coordinates;
  @Input() showCurrentLocationButton = true;
  @Input() showAddressSearch = true;
  @Input() height = '400px';
  @Input() allowMapClick = true;
  @Input() showCoordinateInputs = true;
  
  @Output() locationSelected = new EventEmitter<LocationPickerResult>();
  @Output() locationCleared = new EventEmitter<void>();
  
  private map!: L.Map;
  private currentMarker?: L.Marker;
  private destroy$ = new Subject<void>();
  
  addressControl = new FormControl('');
  latitudeControl = new FormControl<number | null>(null, [
    Validators.min(-90),
    Validators.max(90)
  ]);
  longitudeControl = new FormControl<number | null>(null, [
    Validators.min(-180),
    Validators.max(180)
  ]);
  
  locationForm = new FormGroup({
    address: this.addressControl,
    latitude: this.latitudeControl,
    longitude: this.longitudeControl
  });
  
  searchResults: GeocodingResult[] = [];
  isSearching = false;
  isGettingLocation = false;
  
  constructor(private mapsService: MapsService) {}
  
  ngOnInit() {
    this.setupAddressSearch();
    this.setupCoordinateSync();
    
    if (this.initialCoordinates) {
      this.setLocation(this.initialCoordinates);
    }
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
    // Create map with initial position
    const center: [number, number] = this.initialCoordinates 
      ? [this.initialCoordinates.lat, this.initialCoordinates.lng]
      : [39.8283, -98.5795]; // Center of USA
      
    this.map = this.mapsService.createMap(this.mapContainer.nativeElement.id, {
      center,
      zoom: this.initialCoordinates ? 12 : 4
    });
    
    // Add tile layer
    this.mapsService.addTileLayer(this.map);
    
    // Add initial marker if coordinates provided
    if (this.initialCoordinates) {
      this.addMarker(this.initialCoordinates);
    }
    
    // Handle map clicks
    if (this.allowMapClick) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const coordinates: Coordinates = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        };
        this.setLocation(coordinates, true);
      });
    }
  }
  
  private setupAddressSearch() {
    if (!this.showAddressSearch) return;
    
    this.addressControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) {
          this.searchResults = [];
          return [];
        }
        
        this.isSearching = true;
        return this.mapsService.geocodeAddress(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
      },
      error: () => {
        this.searchResults = [];
        this.isSearching = false;
      }
    });
  }
  
  private setupCoordinateSync() {
    // Watch for coordinate input changes
    this.latitudeControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.onCoordinateInputChange());
    
    this.longitudeControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.onCoordinateInputChange());
  }
  
  private onCoordinateInputChange() {
    const lat = this.latitudeControl.value;
    const lng = this.longitudeControl.value;
    
    if (lat !== null && lng !== null && this.mapsService.isValidCoordinates({ lat, lng })) {
      const coordinates: Coordinates = { lat, lng };
      this.setLocation(coordinates, false, false);
    }
  }
  
  selectSearchResult(result: GeocodingResult) {
    this.setLocation(result.coordinates, true);
    this.addressControl.setValue(result.address);
    this.searchResults = [];
  }
  
  getCurrentLocation() {
    this.isGettingLocation = true;
    
    this.mapsService.getCurrentLocation().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (coordinates) => {
        this.setLocation(coordinates, true);
        this.isGettingLocation = false;
      },
      error: (error) => {
        console.error('Error getting current location:', error);
        this.isGettingLocation = false;
      }
    });
  }
  
  setLocation(coordinates: Coordinates, updateMap = true, emitEvent = true) {
    // Update form controls
    this.latitudeControl.setValue(coordinates.lat, { emitEvent: false });
    this.longitudeControl.setValue(coordinates.lng, { emitEvent: false });
    
    // Update map
    if (updateMap && this.map) {
      this.map.setView([coordinates.lat, coordinates.lng], 12);
      this.addMarker(coordinates);
    }
    
    // Emit location selected event
    if (emitEvent) {
      const result: LocationPickerResult = {
        coordinates,
        address: coordinates.address
      };
      this.locationSelected.emit(result);
      
      // Reverse geocode to get address if not provided
      if (!coordinates.address) {
        this.mapsService.reverseGeocode(coordinates).pipe(
          takeUntil(this.destroy$)
        ).subscribe(result => {
          if (result) {
            coordinates.address = result.address;
            this.addressControl.setValue(result.address);
          }
        });
      }
    }
  }
  
  private addMarker(coordinates: Coordinates) {
    // Remove existing marker
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }
    
    // Add new marker
    this.currentMarker = this.mapsService.createCustomMarker(coordinates, {
      title: 'Selected Location',
      content: coordinates.address || `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`,
      color: '#4285f4',
      icon: 'place'
    });
    
    this.currentMarker.addTo(this.map);
  }
  
  clearLocation() {
    // Clear form controls
    this.addressControl.reset();
    this.latitudeControl.reset();
    this.longitudeControl.reset();
    
    // Remove marker
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
      this.currentMarker = undefined;
    }
    
    // Clear search results
    this.searchResults = [];
    
    // Emit cleared event
    this.locationCleared.emit();
  }
  
  get hasLocation(): boolean {
    const lat = this.latitudeControl.value;
    const lng = this.longitudeControl.value;
    return lat !== null && lng !== null;
  }
  
  get currentCoordinates(): Coordinates | null {
    const lat = this.latitudeControl.value;
    const lng = this.longitudeControl.value;
    
    if (lat !== null && lng !== null) {
      return {
        lat,
        lng,
        address: this.addressControl.value || undefined
      };
    }
    
    return null;
  }
}