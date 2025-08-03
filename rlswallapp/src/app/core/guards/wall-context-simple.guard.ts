import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';

/**
 * Simplified Wall Context Guard - Always allows navigation
 * Use this as a fallback if the full guard is causing issues
 */
export const wallContextSimpleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): boolean => {
  const wallId = route.paramMap.get('id') || route.paramMap.get('wallId');
  console.log('Simple Wall Context Guard - Wall ID:', wallId);
  
  // Always allow navigation - no pre-loading
  return true;
};