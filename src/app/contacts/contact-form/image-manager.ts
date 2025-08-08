import { Injectable } from '@angular/core';
import { UploadService } from '../../services/upload.service';

/**
 * Service for managing contact images with validation and compression capabilities.
 * Provides methods for file validation and image compression.
 */
@Injectable({
  providedIn: 'root'
})
export class ImageManager {
  /** Flag indicating if there's a file type validation error */
  fileTypeError: boolean = false;

  /**
   * Creates an instance of ImageManager.
   * @param uploadService - Service for handling uploads
   */
  constructor(public uploadService: UploadService) {}

  /**
   * Validates and extracts image file from file input event.
   * Checks file type and size constraints.
   * @param event - File input change event
   * @returns Valid File object or null if validation fails
   */
  extractValidImageFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    const maxFileSize = 3 * 1024 * 1024;

    if (!file) {
      this.fileTypeError = false;
      return null;
    }

    if (!file.type.startsWith('image/')) {
      this.fileTypeError = true;
      return null;
    }

    if (file.size > maxFileSize) {
      this.fileTypeError = true;
      return null;
    }

    this.fileTypeError = false;
    return file;
  }

  /**
   * Compresses an image file to specified dimensions and quality.
   * Maintains aspect ratio while resizing to fit within max dimensions.
   * @param file - Image file to compress
   * @param maxWidth - Maximum width in pixels
   * @param maxHeight - Maximum height in pixels
   * @param quality - Compression quality (0-1, where 1 is highest quality)
   * @returns Promise resolving to base64 encoded compressed image
   */
  async compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject('Fehler beim Laden des Bildes.');
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject('Fehler beim Lesen der Datei.');
      reader.readAsDataURL(file);
    });
  }
}