import { Injectable } from '@angular/core';
import { Observable, from, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { WallItemImage } from '../../../shared/models/wall.model';

export interface ImageUploadProgress {
  progress: number;
  url?: string;
  error?: string;
}

export interface ImageValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  private readonly THUMB_SIZE = 300;

  constructor(private storage: Storage) {}

  /**
   * Validate image file before upload
   */
  validateImage(file: File): ImageValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      errors.push(`File type ${file.type} is not supported. Please use JPEG, PNG, WebP, or GIF.`);
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds the maximum limit of ${this.formatFileSize(this.MAX_FILE_SIZE)}.`);
    }

    // Check for very large images
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large images may take longer to upload and load.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Upload image to Firebase Storage
   */
  uploadImage(
    file: File, 
    wallId: string, 
    itemId: string,
    progressCallback?: (progress: number) => void
  ): Observable<WallItemImage> {
    // Validate file first
    const validation = this.validateImage(file);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFilename(file.name);
    const filename = `${timestamp}_${sanitizedName}`;
    const imagePath = `walls/${wallId}/items/${itemId}/images/${filename}`;

    // Create storage reference
    const imageRef = ref(this.storage, imagePath);

    return from(uploadBytes(imageRef, file)).pipe(
      switchMap(() => getDownloadURL(imageRef)),
      map(url => {
        const imageId = this.generateImageId();
        const wallItemImage: WallItemImage = {
          id: imageId,
          url: url,
          fileName: sanitizedName,
          filename: sanitizedName, // Legacy compatibility
          size: file.size,
          mimeType: file.type,
          isPrimary: false, // Will be set externally if needed
          uploadedAt: new Date(),
          uploadedBy: 'current-user', // TODO: Get from auth service
          altText: this.generateAltText(sanitizedName),
          caption: undefined
        };
        return wallItemImage;
      }),
      catchError(error => {
        console.error('Error uploading image:', error);
        return throwError(() => new Error('Failed to upload image. Please try again.'));
      })
    );
  }

  /**
   * Upload multiple images
   */
  uploadMultipleImages(
    files: FileList | File[], 
    wallId: string, 
    itemId: string,
    progressCallback?: (fileIndex: number, progress: number) => void
  ): Observable<WallItemImage[]> {
    const fileArray = Array.from(files);
    const uploadObservables = fileArray.map((file, index) => 
      this.uploadImage(file, wallId, itemId, (progress) => {
        progressCallback?.(index, progress);
      })
    );

    // Upload all files concurrently using forkJoin
    return forkJoin(uploadObservables);
  }

  /**
   * Delete image from Firebase Storage
   */
  deleteImage(imageUrl: string): Observable<void> {
    try {
      const imageRef = ref(this.storage, imageUrl);
      return from(deleteObject(imageRef)).pipe(
        catchError(error => {
          console.error('Error deleting image:', error);
          return throwError(() => new Error('Failed to delete image.'));
        })
      );
    } catch (error) {
      return throwError(() => new Error('Invalid image URL.'));
    }
  }

  /**
   * Resize image client-side before upload (optional optimization)
   */
  resizeImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create thumbnail URL for Firebase Storage images
   */
  getThumbnailUrl(originalUrl: string, size: number = this.THUMB_SIZE): string {
    // For Firebase Storage, we can use URL parameters to get resized images
    // This requires Firebase Extensions like "Resize Images"
    try {
      const url = new URL(originalUrl);
      url.searchParams.set('alt', 'media');
      url.searchParams.set('token', url.searchParams.get('token') || '');
      // Add resize parameters if extension is installed
      return `${url.toString()}_${size}x${size}`;
    } catch {
      return originalUrl; // Fallback to original if URL manipulation fails
    }
  }

  /**
   * Check if user can upload more images
   */
  canUploadMore(currentCount: number, maxImages: number): boolean {
    return currentCount < maxImages;
  }

  /**
   * Get storage usage for a wall item
   */
  calculateStorageUsage(images: WallItemImage[]): { totalSize: number; formattedSize: string; count: number } {
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    return {
      totalSize,
      formattedSize: this.formatFileSize(totalSize),
      count: images.length
    };
  }

  private sanitizeFilename(filename: string): string {
    // Remove potentially dangerous characters and spaces
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAltText(filename: string): string {
    // Generate basic alt text from filename
    const name = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    return name.replace(/_/g, ' ').replace(/-/g, ' ');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}