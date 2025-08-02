import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';

export interface Coordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface MapMarker {
  id: string;
  coordinates: Coordinates;
  title: string;
  content: string;
  icon?: string;
  color?: string;
  wallItemId: string;
  objectTypeId: string;
}

export interface MapBounds {
  southwest: Coordinates;
  northeast: Coordinates;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  address: string;
  displayName: string;
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapsService {
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  
  constructor() {
    // Fix Leaflet's default icon path issues in Angular
    this.setupLeafletIcons();
  }

  /**
   * Setup default Leaflet marker icons
   */
  private setupLeafletIcons(): void {
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  /**
   * Create a new Leaflet map instance
   */
  createMap(containerId: string, options?: L.MapOptions): L.Map {
    const defaultOptions: L.MapOptions = {
      center: [39.8283, -98.5795], // Center of USA
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      ...options
    };

    return L.map(containerId, defaultOptions);
  }

  /**
   * Add a tile layer to the map
   */
  addTileLayer(map: L.Map, provider: 'openstreetmap' | 'satellite' = 'openstreetmap'): L.TileLayer {
    let tileLayer: L.TileLayer;

    switch (provider) {
      case 'satellite':
        tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 18
        });
        break;
      case 'openstreetmap':
      default:
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18
        });
        break;
    }

    tileLayer.addTo(map);
    return tileLayer;
  }

  /**
   * Create a custom marker with specified color and icon
   */
  createCustomMarker(coordinates: Coordinates, options: {
    title?: string;
    content?: string;
    color?: string;
    icon?: string;
  } = {}): L.Marker {
    const { title, content, color = '#3388ff', icon = 'location_on' } = options;

    // Create custom icon HTML
    const iconHtml = `
      <div class="custom-marker" style="background-color: ${color};">
        <span class="material-icons">${icon}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-marker-container',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: customIcon });

    if (title || content) {
      const popupContent = `
        <div class="map-popup">
          ${title ? `<h4>${title}</h4>` : ''}
          ${content ? `<p>${content}</p>` : ''}
          ${coordinates.address ? `<p class="address"><small>${coordinates.address}</small></p>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);
    }

    return marker;
  }

  /**
   * Add multiple markers to the map
   */
  addMarkers(map: L.Map, markers: MapMarker[]): L.LayerGroup {
    const layerGroup = L.layerGroup();

    markers.forEach(markerData => {
      const marker = this.createCustomMarker(markerData.coordinates, {
        title: markerData.title,
        content: markerData.content,
        color: markerData.color,
        icon: markerData.icon
      });

      // Store additional data on the marker for later retrieval
      (marker as any).wallItemId = markerData.wallItemId;
      (marker as any).objectTypeId = markerData.objectTypeId;

      layerGroup.addLayer(marker);
    });

    layerGroup.addTo(map);
    return layerGroup;
  }

  /**
   * Fit map view to show all markers
   */
  fitMapToMarkers(map: L.Map, markers: MapMarker[], padding: number = 20): void {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      // Single marker - center and zoom
      const coords = markers[0].coordinates;
      map.setView([coords.lat, coords.lng], 10);
      return;
    }

    // Multiple markers - fit bounds
    const latLngs = markers.map(marker => L.latLng(marker.coordinates.lat, marker.coordinates.lng));
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [padding, padding] });
  }

  /**
   * Geocode an address to coordinates using Nominatim
   */
  geocodeAddress(address: string): Observable<GeocodingResult[]> {
    const encodedAddress = encodeURIComponent(address);
    const url = `${this.NOMINATIM_BASE_URL}/search?format=json&q=${encodedAddress}&limit=5&addressdetails=1`;

    return from(fetch(url)).pipe(
      switchMap(response => from(response.json())),
      map((results: any[]) => 
        results.map(result => ({
          coordinates: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name
          },
          address: result.display_name,
          displayName: result.display_name,
          confidence: parseFloat(result.importance) || 0.5
        } as GeocodingResult))
      ),
      catchError(error => {
        console.error('Geocoding error:', error);
        return of([]);
      })
    );
  }

  /**
   * Reverse geocode coordinates to address
   */
  reverseGeocode(coordinates: Coordinates): Observable<GeocodingResult | null> {
    const { lat, lng } = coordinates;
    const url = `${this.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;

    return from(fetch(url)).pipe(
      switchMap(response => from(response.json())),
      map((result: any) => {
        if (!result || result.error) return null;
        
        return {
          coordinates: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name
          },
          address: result.display_name,
          displayName: result.display_name,
          confidence: parseFloat(result.importance) || 0.5
        } as GeocodingResult;
      }),
      catchError(error => {
        console.error('Reverse geocoding error:', error);
        return of(null);
      })
    );
  }

  /**
   * Get user's current location
   */
  getCurrentLocation(): Observable<Coordinates> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          observer.next({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          observer.complete();
        },
        error => {
          observer.error(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if coordinates are valid
   */
  isValidCoordinates(coordinates: Coordinates): boolean {
    const { lat, lng } = coordinates;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Get bounds that include all provided coordinates
   */
  getBounds(coordinates: Coordinates[]): MapBounds | null {
    if (coordinates.length === 0) return null;

    let minLat = coordinates[0].lat;
    let maxLat = coordinates[0].lat;
    let minLng = coordinates[0].lng;
    let maxLng = coordinates[0].lng;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.lat);
      maxLat = Math.max(maxLat, coord.lat);
      minLng = Math.min(minLng, coord.lng);
      maxLng = Math.max(maxLng, coord.lng);
    });

    return {
      southwest: { lat: minLat, lng: minLng },
      northeast: { lat: maxLat, lng: maxLng }
    };
  }

  /**
   * Create clustering for markers when zoomed out
   * Note: This would require leaflet.markercluster plugin
   * For now, we use a simple layer group
   */
  createMarkerCluster(): L.LayerGroup {
    return L.layerGroup();
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}