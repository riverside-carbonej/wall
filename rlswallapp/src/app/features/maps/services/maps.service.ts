import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import { leafletLayer, paintRules, labelRules } from 'protomaps-leaflet';
import { namedFlavor, Flavor } from '@protomaps/basemaps';
import { mix, getLuminance } from 'color2k';
import { WallTheme } from '../../../shared/models/wall.model';

// Self-hosted map tiles (OpenStreetMap data cut with Protomaps), served from our own Firebase site
const MAP_TILES_BASE_URL = 'https://rlswall-maps.web.app';

// Area covered by riverside.pmtiles, which carries street-level detail around the district
const DISTRICT_DETAIL_BOUNDS = L.latLngBounds([41.45, -81.75], [42.0, -80.85]);

// Warm, quiet base used when no wall theme applies
const DEFAULT_MAP_COLORS = { land: '#f3efe7', ink: '#3f3b35', accent: '#c9a227', dark: false };

/**
 * Builds the street map's palette from a wall theme: land and water come from the wall's
 * surfaces, labels from its text color, highways from its accent, and dark walls get a dark map.
 */
export function createMapFlavor(theme?: WallTheme): Flavor {
  const colors = theme ? mapColorsForTheme(theme) : DEFAULT_MAP_COLORS;
  const { land, ink, accent, dark } = colors;
  const tint = (color: string, amount: number) => mix(land, color, amount);
  const water = dark && theme ? theme.backgroundColor : tint('#6f9cbf', 0.3);
  const green = tint(dark ? '#4f7d5c' : '#9fbf8f', dark ? 0.18 : 0.22);
  const sand = tint('#d9c49a', dark ? 0.08 : 0.18);
  const area = tint(ink, 0.05);
  const road = dark ? tint(ink, 0.16) : tint('#ffffff', 0.85);
  const casing = tint(ink, dark ? 0.06 : 0.14);

  return {
    ...namedFlavor(dark ? 'dark' : 'light'),
    background: land,
    earth: land,
    water,
    park_a: green, park_b: green, wood_a: green, wood_b: green,
    scrub_a: green, scrub_b: green, zoo: green,
    sand, beach: sand,
    glacier: tint('#ffffff', dark ? 0.1 : 0.5),
    buildings: tint(ink, dark ? 0.1 : 0.08),
    industrial: area, hospital: area, school: area, aerodrome: area,
    military: area, pedestrian: area, pier: area,
    runway: tint(ink, 0.12),
    minor_a: road, minor_b: road, minor_service: road, other: road, link: road,
    major: dark ? tint(ink, 0.24) : tint('#ffffff', 0.95),
    highway: tint(accent, dark ? 0.45 : 0.35),
    minor_casing: casing, minor_service_casing: casing, link_casing: casing,
    major_casing_early: casing, major_casing_late: casing,
    highway_casing_early: casing, highway_casing_late: casing,
    railway: tint(ink, 0.25),
    boundaries: tint(ink, 0.35),
    ocean_label: mix(water, ink, 0.5),
    country_label: tint(ink, 0.7),
    state_label: tint(ink, 0.5), state_label_halo: land,
    city_label: tint(ink, 0.85), city_label_halo: land,
    subplace_label: tint(ink, 0.65), subplace_label_halo: land,
    roads_label_minor: tint(ink, 0.6), roads_label_minor_halo: land,
    roads_label_major: tint(ink, 0.7), roads_label_major_halo: land,
    address_label: tint(ink, 0.55), address_label_halo: land,
    landcover: {
      grassland: tint(green, 0.5), farmland: tint(green, 0.5), scrub: tint(green, 0.6),
      forest: green, barren: sand, urban_area: area, glacier: tint('#ffffff', dark ? 0.1 : 0.5)
    }
  };
}

function mapColorsForTheme(theme: WallTheme) {
  const dark = theme.mode === 'dark' || (theme.mode !== 'light' && getLuminance(theme.backgroundColor) < 0.3);
  return {
    // Dark walls use their raised surface for land so the darker background can read as water
    land: dark ? theme.surfaceColor : mix(theme.backgroundColor, theme.primaryColor, 0.04),
    ink: theme.textColor || theme.titleColor || (dark ? '#ffffff' : '#333333'),
    accent: theme.accentColor || theme.primaryColor,
    dark
  };
}

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
    // Use Leaflet's default CDN icons or create simple markers
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
    // Validate and set default center if invalid
    let center = options?.center || [39.8283, -98.5795];
    
    // Ensure center is valid
    if (!Array.isArray(center) || center.length !== 2 || 
        typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
        isNaN(center[0]) || isNaN(center[1])) {
      console.warn('Invalid center coordinates, using default');
      center = [39.8283, -98.5795]; // Center of USA
    }
    
    const defaultOptions: L.MapOptions = {
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      ...options,
      center // Override with validated center
    };

    return L.map(containerId, defaultOptions);
  }

  /**
   * Add a tile layer to the map
   */
  addTileLayer(map: L.Map, provider: 'openstreetmap' | 'satellite' = 'openstreetmap', theme?: WallTheme): L.Layer {
    let tileLayer: L.Layer;

    switch (provider) {
      case 'satellite':
        tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 18
        });
        break;
      case 'openstreetmap':
      default:
        // Our own OpenStreetMap tiles, so the street map depends on no outside map provider
        tileLayer = this.createStreetMapLayer(theme);
        break;
    }

    tileLayer.addTo(map);
    return tileLayer;
  }

  /**
   * Street map drawn from our self-hosted PMTiles: the whole world down to region detail,
   * with full street detail layered on top around the district.
   */
  private createStreetMapLayer(theme?: WallTheme): L.Layer {
    const flavor = createMapFlavor(theme);
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const paint = paintRules(flavor);
    const labels = labelRules(flavor, 'en');

    const world = leafletLayer({
      url: `${MAP_TILES_BASE_URL}/world.pmtiles`,
      maxDataZoom: 7,
      paintRules: paint,
      labelRules: labels,
      backgroundColor: flavor.background,
      attribution,
      maxZoom: 19
    });

    const district = leafletLayer({
      url: `${MAP_TILES_BASE_URL}/riverside.pmtiles`,
      maxDataZoom: 15,
      paintRules: paint,
      labelRules: labels,
      backgroundColor: flavor.background,
      attribution,
      bounds: DISTRICT_DETAIL_BOUNDS,
      minZoom: 9,
      maxZoom: 19
    });

    // protomaps-leaflet's typings don't extend L.Layer, though the layers are Leaflet GridLayers
    return L.layerGroup([world as unknown as L.Layer, district as unknown as L.Layer]);
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

    // Create custom icon HTML with larger, more Material Design
    const iconHtml = `
      <div class="custom-marker-material">
        <div class="marker-shadow"></div>
        <div class="marker-body" style="background: ${color};">
          <span class="material-icons">${icon}</span>
        </div>
        <div class="marker-pointer" style="background: ${color};"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-marker-container',
      iconSize: [32, 44],
      iconAnchor: [16, 44],
      popupAnchor: [0, -44]
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
    // Validate address input
    if (!address || address.trim().length < 3) {
      return of([]);
    }
    
    const encodedAddress = encodeURIComponent(address.trim());
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