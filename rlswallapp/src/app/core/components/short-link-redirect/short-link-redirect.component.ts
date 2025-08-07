import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ShortLinkService } from '../../services/short-link.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-short-link-redirect',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent],
  template: `
    <div class="redirect-container">
      @if (loading) {
        <app-loading-state 
          type="spinner" 
          message="Loading wall..."
          [spinnerSize]="60">
        </app-loading-state>
      } @else if (error) {
        <div class="error-state">
          <div class="error-icon">🔗</div>
          <h2>Wall Not Found</h2>
          <p>The link "{{ shortId }}" doesn't exist or has been removed.</p>
          <button class="home-button" (click)="goHome()">
            Go to Home
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .redirect-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--md-sys-color-surface);
    }
    
    .error-state {
      text-align: center;
      padding: 48px 24px;
      max-width: 400px;
    }
    
    .error-icon {
      font-size: 64px;
      margin-bottom: 24px;
      opacity: 0.5;
    }
    
    .error-state h2 {
      color: var(--md-sys-color-on-surface);
      margin-bottom: 12px;
      font-size: 24px;
      font-weight: 500;
    }
    
    .error-state p {
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: 32px;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .home-button {
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .home-button:hover {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class ShortLinkRedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shortLinkService = inject(ShortLinkService);
  
  shortId = '';
  loading = true;
  error = false;
  
  constructor() {
    console.log('🏗️ ShortLinkRedirectComponent constructor called');
    console.log('📍 Constructor - Current URL:', window.location.href);
    console.log('📍 Constructor - Path:', window.location.pathname);
  }
  
  async ngOnInit() {
    console.log('🚀 ShortLinkRedirectComponent ngOnInit called');
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Current pathname:', window.location.pathname);
    console.log('🛣️ Route snapshot:', this.route.snapshot);
    console.log('🛣️ Route params:', this.route.snapshot.params);
    console.log('🛣️ Route paramMap keys:', this.route.snapshot.paramMap.keys);
    console.log('🛣️ All route data:', {
      params: this.route.snapshot.params,
      paramMap: this.route.snapshot.paramMap,
      url: this.route.snapshot.url,
      routeConfig: this.route.snapshot.routeConfig
    });
    
    // Get the short ID from the route
    this.shortId = this.route.snapshot.paramMap.get('shortId') || '';
    
    console.log('🔑 Short ID extracted from paramMap:', this.shortId);
    
    // Also try getting it from params directly
    const shortIdFromParams = this.route.snapshot.params['shortId'];
    console.log('🔑 Short ID from params:', shortIdFromParams);
    
    if (!this.shortId && shortIdFromParams) {
      this.shortId = shortIdFromParams;
      console.log('🔄 Using shortId from params instead:', this.shortId);
    }
    
    if (!this.shortId) {
      console.error('❌ No short ID found in route');
      console.error('❌ Available params:', this.route.snapshot.params);
      console.error('❌ URL segments:', this.route.snapshot.url.map(s => s.path));
      this.error = true;
      this.loading = false;
      return;
    }
    
    console.log('🔍 Looking up short link:', this.shortId);
    
    try {
      // Look up the wall ID from the short link
      const wallId = await firstValueFrom(
        this.shortLinkService.getWallIdFromShortLink(this.shortId)
      );
      
      console.log('📦 Service returned wallId:', wallId);
      
      if (wallId) {
        console.log('✅ Redirecting to wall:', wallId);
        // Redirect to the actual wall page
        this.router.navigate(['/walls', wallId], {
          replaceUrl: true // Replace the current URL in history
        });
      } else {
        console.log('❌ Short link not found in database');
        this.error = true;
        this.loading = false;
      }
    } catch (error) {
      console.error('💥 Error during redirect:', error);
      this.error = true;
      this.loading = false;
    }
  }
  
  goHome() {
    this.router.navigate(['/']);
  }
}