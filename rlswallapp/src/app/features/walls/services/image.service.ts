import { Injectable } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from '@angular/fire/storage';
import { WallImage } from '../../../shared/models/wall.model';

export interface ImageUploadProgress {
  progress: number;
  url?: string;
  error?: string;
}

export interface ImageUploadResult {
  success: boolean;
  image?: WallImage;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  constructor(private storage: Storage) {}

  /**
   * Upload a single image to Firebase Storage
   */
  uploadImage(
    file: File, 
    wallId: string, 
    itemId?: string,
    description?: string
  ): Observable<ImageUploadResult> {
    if (!this.isValidImageFile(file)) {
      return of({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return of({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }

    const fileName = this.generateFileName(file.name);
    const path = itemId 
      ? `walls/${wallId}/items/${itemId}/${fileName}`
      : `walls/${wallId}/general/${fileName}`;
    
    const storageRef = ref(this.storage, path);

    return from(uploadBytes(storageRef, file)).pipe(
      switchMap(() => from(getDownloadURL(storageRef))),
      map(downloadURL => ({
        success: true,
        image: {
          id: this.generateImageId(),
          url: downloadURL,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
          description: description || '',
          uploadedAt: new Date(),
          storagePath: path
        } as WallImage
      })),
      catchError(error => {
        console.error('Error uploading image:', error);
        return of({
          success: false,
          error: 'Failed to upload image. Please try again.'
        });
      })
    );
  }

  /**
   * Upload multiple images
   */
  uploadMultipleImages(
    files: File[], 
    wallId: string, 
    itemId?: string
  ): Observable<ImageUploadResult[]> {
    const uploadObservables = files.map(file => 
      this.uploadImage(file, wallId, itemId)
    );

    return from(Promise.all(uploadObservables.map(obs => obs.toPromise()))).pipe(
      map(results => results.filter(result => result !== undefined) as ImageUploadResult[])
    );
  }

  /**
   * Delete an image from Firebase Storage
   */
  deleteImage(image: WallImage): Observable<boolean> {
    if (!image.storagePath) {
      return of(false);
    }

    const storageRef = ref(this.storage, image.storagePath);
    
    return from(deleteObject(storageRef)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting image:', error);
        // Return true even if delete fails to avoid blocking UI
        // The image reference will be removed from the database
        return of(true);
      })
    );
  }

  /**
   * Get all images for a wall item
   */
  getItemImages(wallId: string, itemId: string): Observable<string[]> {
    const path = `walls/${wallId}/items/${itemId}`;
    const storageRef = ref(this.storage, path);

    return from(listAll(storageRef)).pipe(
      switchMap(result => {
        if (result.items.length === 0) {
          return of([]);
        }

        const urlPromises = result.items.map(item => getDownloadURL(item));
        return from(Promise.all(urlPromises));
      }),
      catchError(error => {
        console.error('Error getting item images:', error);
        return of([]);
      })
    );
  }

  /**
   * Resize and compress image on client side before upload
   */
  resizeImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              resolve(file); // Fallback to original file
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create thumbnail version of image
   */
  createThumbnail(file: File, size: number = 300): Promise<File> {
    return this.resizeImage(file, size, size, 0.7);
  }

  /**
   * Get optimized image URL (for different sizes if using a CDN)
   */
  getOptimizedImageUrl(
    originalUrl: string, 
    width?: number, 
    height?: number, 
    quality?: number
  ): string {
    // For Firebase Storage, we return the original URL
    // In a production app, you might use a CDN like Cloudinary or ImageKit
    // that supports URL-based transformations
    return originalUrl;
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(originalUrl: string, size: number = 300): string {
    return this.getOptimizedImageUrl(originalUrl, size, size, 70);
  }

  /**
   * Validate image file type
   */
  private isValidImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return allowedTypes.includes(file.type);
  }

  /**
   * Generate unique file name
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Generate unique image ID
   */
  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert File to base64 string (for preview purposes)
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Get image dimensions
   */
  getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compress image before upload
   */
  async compressImage(file: File, targetSizeKB: number = 500): Promise<File> {
    const targetSizeBytes = targetSizeKB * 1024;
    
    if (file.size <= targetSizeBytes) {
      return file; // Already under target size
    }

    // Calculate compression ratio
    const compressionRatio = targetSizeBytes / file.size;
    const quality = Math.max(0.1, Math.min(0.9, compressionRatio));

    // Use resize with calculated quality
    return this.resizeImage(file, 1920, 1080, quality);
  }

  /**
   * Batch delete images
   */
  deleteMultipleImages(images: WallImage[]): Observable<boolean[]> {
    const deleteObservables = images.map(image => this.deleteImage(image));
    return from(Promise.all(deleteObservables.map(obs => obs.toPromise()))).pipe(
      map(results => results.filter(result => result !== undefined) as boolean[])
    );
  }

  /**
   * Get image metadata
   */
  getImageMetadata(file: File): Promise<{
    name: string;
    size: number;
    type: string;
    dimensions: { width: number; height: number };
    lastModified: Date;
  }> {
    return this.getImageDimensions(file).then(dimensions => ({
      name: file.name,
      size: file.size,
      type: file.type,
      dimensions,
      lastModified: new Date(file.lastModified)
    }));
  }
}