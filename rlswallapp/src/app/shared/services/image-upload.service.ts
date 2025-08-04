import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WallItemImage } from '../models/wall.model';

export interface PendingImage {
  id: string;
  file: File;
  preview: string; // Object URL for preview
  altText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private storage = inject(Storage);

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeInMB = 10;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `File type not allowed. Please use: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}` 
      };
    }

    if (file.size > maxSizeInBytes) {
      return { 
        valid: false, 
        error: `File size too large. Maximum size is ${maxSizeInMB}MB` 
      };
    }

    return { valid: true };
  }

  /**
   * Create a preview URL for a file (for display before upload)
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Clean up preview URL
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Convert file to PendingImage for temporary storage
   */
  createPendingImage(file: File, altText?: string): PendingImage {
    return {
      id: 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      file,
      preview: this.createPreviewUrl(file),
      altText
    };
  }

  /**
   * Upload a single image to Firebase Storage
   */
  uploadImage(
    file: File, 
    wallId: string, 
    objectTypeId: string, 
    itemId: string
  ): Observable<WallItemImage> {
    return new Observable(observer => {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `walls/${wallId}/items/${itemId}/${fileName}`;
      const storageRef = ref(this.storage, storagePath);

      // Upload with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'originalName': file.name,
          'wallId': wallId,
          'itemId': itemId,
          'uploadedBy': 'user' // TODO: Add actual user ID
        }
      };

      uploadBytes(storageRef, file, metadata).then(snapshot => {
        return getDownloadURL(storageRef);
      }).then(downloadURL => {
        const wallItemImage: WallItemImage = {
          id: `img_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          url: downloadURL,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
          altText: '',
          uploadedAt: new Date(),
          storagePath // Store the path for potential deletion later
        };
        observer.next(wallItemImage);
        observer.complete();
      }).catch(error => {
        console.error('Upload error:', error);
        observer.error(new Error(`Failed to upload ${file.name}: ${error.message}`));
      });
    });
  }

  /**
   * Upload multiple images
   */
  uploadImages(
    pendingImages: PendingImage[], 
    wallId: string, 
    objectTypeId: string, 
    itemId: string
  ): Observable<WallItemImage[]> {
    if (pendingImages.length === 0) {
      return from(Promise.resolve([]));
    }

    return new Observable(observer => {
      const uploadPromises = pendingImages.map(pending => {
        return this.uploadImage(pending.file, wallId, objectTypeId, itemId).toPromise()
          .then(uploaded => {
            if (!uploaded) {
              throw new Error(`Failed to upload image: ${pending.file.name}`);
            }
            return {
              ...uploaded,
              altText: pending.altText || ''
            };
          });
      });

      Promise.all(uploadPromises)
        .then(results => {
          observer.next(results);
          observer.complete();
        })
        .catch(error => {
          console.error('Multiple upload error:', error);
          observer.error(error);
        });
    });
  }

  /**
   * Delete an image from Firebase Storage
   */
  deleteImage(storagePath: string): Observable<void> {
    const storageRef = ref(this.storage, storagePath);
    return from(deleteObject(storageRef));
  }

  /**
   * Open file picker dialog
   */
  openFilePicker(multiple: boolean = true): Promise<FileList | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
      input.multiple = multiple;
      
      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        resolve(target.files);
      };
      
      input.oncancel = () => {
        resolve(null);
      };
      
      input.click();
    });
  }

  /**
   * Process selected files into pending images
   */
  processSelectedFiles(files: FileList): { valid: PendingImage[]; errors: string[] } {
    const validImages: PendingImage[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const validation = this.validateImageFile(file);
      if (validation.valid) {
        validImages.push(this.createPendingImage(file));
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    return { valid: validImages, errors };
  }
}