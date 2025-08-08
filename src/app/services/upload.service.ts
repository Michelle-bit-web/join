import { Injectable } from '@angular/core';

/**
 * Interface representing an uploaded image with metadata.
 */
export interface UploadedImage {
  /** Unique identifier for the image */
  imageKey: string;
  /** Original filename of the uploaded image */
  filename: string;
  /** Type of the file */
  fileType: string;
  /** Size of the file in bytes */
  fileSize: number;
  /** Base64 encoded image data */
  base64: string;
  /** Assignment target for the image */
  assignedTo: 'user' | 'task';
}

/**
 * Service for managing image uploads, storage, and retrieval using localStorage.
 * Provides methods for saving, retrieving, and deleting images.
 */
@Injectable({
  providedIn: 'root'
})

export class UploadService {
  /** Key used for localStorage storage */
  private storageKey = 'allImages';
  
  /** In-memory array of images */
  images: UploadedImage[] = [];

  /**
   * Creates an instance of UploadService.
   */
  constructor() { }

  /**
   * Saves a single image to localStorage.
   * @param image - Image to save
   */
  saveImage(image: UploadedImage) {
    const current = this.getImages();
    current.push(image);
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  /**
   * Saves multiple images to localStorage, avoiding duplicates.
   * @param images - Array of images to save
   */
  saveImages(images: UploadedImage[]): void {
    const existing = this.getImages();
    const filtered = existing.filter(img => !images.some(newImg => newImg.imageKey === img.imageKey));
    const merged = [...filtered, ...images];
    localStorage.setItem(this.storageKey, JSON.stringify(merged));
  }

  /**
   * Sets the in-memory images array.
   * @param images - Array of images to set
   */
  setImages(images: UploadedImage[]) {
    this.images = images;
  }

  /**
   * Retrieves all images from localStorage.
   * @returns Array of all stored images
   */
  getImages(): UploadedImage[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Retrieves images by their keys.
   * @param imageKeys - Array of image keys to retrieve
   * @returns Array of matching images
   */
  getImagesByKeys(imageKeys: string[]): UploadedImage[] {
    const allImages = this.getImages();
    return allImages.filter(img => imageKeys.includes(img.imageKey));
  }

  /**
   * Retrieves a single image by its key.
   * @param imageKey - Key of the image to retrieve
   * @returns Image object or undefined if not found
   */
  getImageByKey(imageKey: string): UploadedImage | undefined {
    const allImages = this.getImages();
    return allImages.find(img => img.imageKey === imageKey);
  }

  /**
   * Retrieves base64 data for an image by its key.
   * @param imageKey - Key of the image
   * @returns Base64 string or null if image not found
   */
  getBase64ByKey(imageKey: string): string | null {
    const image = this.getImageByKey(imageKey);
    return image ? image.base64 : null;
  }

  /**
   * Deletes a single image by its key.
   * @param imageKey - Key of the image to delete
   */
  deleteImage(imageKey: string) {
    const current = this.getImages();
    const updated = current.filter(img => img.imageKey !== imageKey);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  /**
   * Deletes multiple images by their keys.
   * @param imageKeys - Array of image keys to delete
   */
  deleteImages(imageKeys: string[]) {
    const current = this.getImages();
    const updated = current.filter(img => !imageKeys.includes(img.imageKey));
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  /**
   * Clears all images from localStorage.
   */
  clearImages() {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Retrieves base64 data for task-related images.
   * @param taskImageKeys - Array of task image keys
   * @returns Array of base64 strings for existing images
   */
  getTaskImages(taskImageKeys: string[]): string[] {
    return taskImageKeys
      .map(key => this.getBase64ByKey(key))
      .filter(base64 => base64 !== null) as string[];
  }

  /**
   * Retrieves base64 data for a contact image.
   * @param contactImageKey - Key of the contact image
   * @returns Base64 string or null if image not found
   */
  getContactImage(contactImageKey: string): string | null {
    return this.getBase64ByKey(contactImageKey);
  }
}