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
  constructor(public uploadService: UploadService) { }

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
    if (!file.type.startsWith('image/') || file.size > maxFileSize) {
      this.fileTypeError = true;
      return null;
    }
    this.fileTypeError = false;
    return file;
  }

  /**
   * Loads an image from a file and returns an HTMLImageElement.
   * @param file - Image file to load
   * @returns Promise resolving to loaded HTMLImageElement
   */
  private loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject('Error loading image.');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('Error reading file.');
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compresses an image to fit within the given dimensions and quality.
   * Maintains aspect ratio while resizing.
   * @param img - Loaded HTMLImageElement
   * @param maxWidth - Maximum allowed width
   * @param maxHeight - Maximum allowed height
   * @param quality - JPEG compression quality (0–1)
   * @returns Base64 encoded compressed image
   */
  private resizeAndCompressImage(img: HTMLImageElement,maxWidth: number,maxHeight: number,quality: number): string {
    let { width, height } = img;
    if (width > maxWidth || height > maxHeight) {
      const dimensions = this.checkSizeRatios(width, height, maxWidth, maxHeight);
      width = dimensions.width;
      height = dimensions.height;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Calculates new dimensions while maintaining aspect ratio.
   * @param width - Original width
   * @param height - Original height
   * @param maxWidth - Maximum allowed width
   * @param maxHeight - Maximum allowed height
   * @returns Object with calculated width and height
   * @private
   */
  private checkSizeRatios(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
    if (width > height) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    } else {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    return { width, height };
  }

  /**
   * Compresses an image file to specified dimensions and quality.
   * @param file - Image file to compress
   * @param maxWidth - Maximum allowed width
   * @param maxHeight - Maximum allowed height
   * @param quality - JPEG compression quality (0–1)
   * @returns Promise resolving to base64 encoded compressed image
   */
  async compressImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<string> {
    const img = await this.loadImageFromFile(file);
    return this.resizeAndCompressImage(img, maxWidth, maxHeight, quality);
  }
}