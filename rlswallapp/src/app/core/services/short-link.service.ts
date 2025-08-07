import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface WallShortLink {
  shortId: string;
  wallId: string;
  createdAt?: Date;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShortLinkService {
  private firestore = inject(Firestore);
  private collectionName = 'wall-short-links';
  
  // Cache for short links to reduce Firestore reads
  private shortLinkCache = new Map<string, Observable<string | null>>();
  
  /**
   * Get wall ID from short link
   * @param shortId The short link identifier (e.g., 'wall-of-honor')
   * @returns Observable of the wall ID or null if not found
   */
  getWallIdFromShortLink(shortId: string): Observable<string | null> {
    // Normalize the short ID (lowercase, trim)
    const normalizedId = shortId.toLowerCase().trim();
    
    // Check cache first
    if (this.shortLinkCache.has(normalizedId)) {
      return this.shortLinkCache.get(normalizedId)!;
    }
    
    // Create observable for this short link
    const wallId$ = from(
      getDoc(doc(this.firestore, this.collectionName, normalizedId))
    ).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as WallShortLink;
          console.log('🔗 Short link found:', {
            shortId: normalizedId,
            wallId: data.wallId,
            description: data.description
          });
          return data.wallId;
        } else {
          console.log('❌ Short link not found:', normalizedId);
          return null;
        }
      }),
      catchError(error => {
        console.error('Error fetching short link:', error);
        return of(null);
      }),
      // Share the result to avoid multiple Firestore reads
      shareReplay(1)
    );
    
    // Cache the observable
    this.shortLinkCache.set(normalizedId, wallId$);
    
    return wallId$;
  }
  
  /**
   * Check if a short link exists
   * @param shortId The short link identifier to check
   * @returns Observable<boolean> indicating if the short link exists
   */
  shortLinkExists(shortId: string): Observable<boolean> {
    return this.getWallIdFromShortLink(shortId).pipe(
      map(wallId => wallId !== null)
    );
  }
  
  /**
   * Clear the cache (useful when short links are updated)
   */
  clearCache(): void {
    this.shortLinkCache.clear();
  }
  
  /**
   * Get all short links for a specific wall
   * @param wallId The wall ID to get short links for
   * @returns Observable of short links array
   */
  getShortLinksForWall(wallId: string): Observable<WallShortLink[]> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('wallId', '==', wallId)
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const links: WallShortLink[] = [];
        snapshot.forEach(doc => {
          links.push({
            shortId: doc.id,
            ...doc.data()
          } as WallShortLink);
        });
        return links;
      }),
      catchError(error => {
        console.error('Error fetching short links for wall:', error);
        return of([]);
      })
    );
  }
}