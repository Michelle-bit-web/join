import { Injectable } from '@angular/core';
import { ContactService } from './contact.service';
import { deleteField, Firestore, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

/**
 * Interface representing an uploaded image with metadata.
 */
export interface UploadedImage {
  /** Optional Firestore document ID for the image */
  id?: string;

  /** Original fileName of the uploaded image */
  fileName: string;

  /** Type of the file */
  fileType: string;

  /** Size of the file in bytes */
  fileSize: number;

  /** Base64 encoded image data */
  base64: string;
}

/**
 * Service for managing image uploads, storage, and retrieval using localStorage.
 * Provides methods for saving, retrieving, and deleting images.
 */
@Injectable({
  providedIn: 'root'
})

export class UploadService {
  /**
   * In-memory array of uploaded images for quick access during application runtime.
   * @type {UploadedImage[]}
   */
  images: UploadedImage[] = [];

  /**
   * Creates an instance of UploadService.
   * Initializes the service for managing image uploads and storage operations.
   */
  constructor(private contactService: ContactService, private firestore: Firestore) { }

  /**
   * Saves a single image to localStorage.
   * @param {UploadedImage} image - Image to save
   * @returns {void}
   */
  saveImage(image: UploadedImage) {
    // const current = this.getImages();
    // current.push(image);
    // localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  /**
   * Saves multiple images to localStorage, avoiding duplicates.
   * @param {UploadedImage[]} images - Array of images to save
   * @returns {void}
   */
  saveImages(images: UploadedImage[]): void {
    // const existing = this.getImages();
    // const filtered = existing.filter(img => !images.some(newImg => newImg.imageKey === img.imageKey));
    // const merged = [...filtered, ...images];
    // localStorage.setItem(this.storageKey, JSON.stringify(merged));
  }

  /**
   * Sets the in-memory images array.
   * @param {UploadedImage[]} images - Array of images to set
   * @returns {void}
   */
  setImages(images: UploadedImage[]) {
    this.images = images;
  }

  /**
   * Retrieves all images from localStorage.
   * @returns {UploadedImage[]} Array of all stored images
   */
  //Unten eine Methode per Firebase
  // getImages(): UploadedImage[] {
  //   const data = localStorage.getItem(this.storageKey);
  //   return data ? JSON.parse(data) : [];
  // }

  /**
    * Returns a reference to the 'images' subcollection for a given task or contact.
    *
    * @param parentCollection - The collection type ('contacts' or 'tasks').
    * @param parentId - The document ID of the parent contact.
    */
  private getImagesRef(parentCollection: 'contacts' | 'tasks', parentId: string) {
    return collection(this.firestore, parentCollection, parentId, 'images');
  }

  /**
     * Adds a subtask to a specific task's subcollection.
     * 
     * @param parentCollection - The collection type ('contacts' or 'tasks').
     * @param parentId - The ID of the parent task or contact.
     * @param subtask - The subtask to add.
     * @returns The created subtask with ID, or null on failure.
     */
  async addImage(parentCollection: 'contacts' | 'tasks', parentId: string, image: UploadedImage): Promise<UploadedImage | null> {
    try {
      const imagesRef = this.getImagesRef(parentCollection, parentId);
      const docRef = await addDoc(imagesRef, image);
      return { id: docRef.id, ...image };
    } catch (error) {
      console.error('Error adding image:', error);
      return null;
    }
  }

  /**
   * Retrieves the first image for a given task or contact.
   *
   * @param parentCollection - The collection type ('contacts' or 'tasks').
   * @param parentId - The ID of the parent task or contact.
   */
  async getFirstImage(parentCollection: 'contacts' | 'tasks', parentId: string): Promise<UploadedImage | null> {
    try {
      const qSnap = await getDocs(this.getImagesRef(parentCollection, parentId));
      if (qSnap.empty) return null;
      const d = qSnap.docs[0];
      return { id: d.id, ...(d.data() as any) } as UploadedImage;
    } catch (err) {
      console.error('getFirstImage error', err);
      return null;
    }
  }

  /**
   * Observes the images of a given task or contact in real-time.
   *
   * @param parentCollection - The collection type ('contacts' or 'tasks').
   * @param parentId - The ID of the parent task or contact.
   */
  getImages(parentCollection: 'contacts' | 'tasks', parentId: string): Observable<UploadedImage[]> {
    return new Observable(observer => {
      const unsubscribe = onSnapshot(this.getImagesRef(parentCollection, parentId), snapshot => {
        const images: UploadedImage[] = [];
        snapshot.forEach(doc => {
          images.push({ id: doc.id, ...doc.data() } as UploadedImage);
        });
        observer.next(images);
      }, error => observer.error(error));
      
      return () => unsubscribe();
    });
  }

  /**
   * Updates a subtask document in Firestore.
   * 
   * @param parentCollection - The collection type ('contacts' or 'tasks').
   * @param parentId - The parent task ID.
   * @param imageId - The subtask document ID.
   * @param updatedImage - The updated subtask data.
   */
  async updateImage(parentCollection: 'contacts' | 'tasks', parentId: string, imageId: string, updatedImage: Partial<UploadedImage>): Promise<void> {
    try {
      const docRef = doc(this.firestore, parentCollection, parentId, 'images', imageId);
      await updateDoc(docRef, updatedImage as any);
    } catch (err) {
      console.error('updateImage error', err);
    }
  }

  /**
   * Returns a plain JSON object with only the allowed contact fields.
   * This is used to avoid including undefined or extra properties when updating Firestore.
   * @param {Contact} updatedContact - The contact object to sanitize
   * @returns {Partial<Contact>} A JSON object containing only valid contact fields
   */
  getCleanJson(updated: UploadedImage): Partial<UploadedImage> {
    return {
      fileName: updated.fileName,
      fileSize: updated.fileSize,
      fileType: updated.fileType,
      base64: updated.base64
    };
  }


  /**
   * Retrieves images by their keys.
   * @param {string[]} imageKeys - Array of image keys to retrieve
   * @returns {UploadedImage[]} Array of matching images
   */
  // getImagesByKeys(imageKeys: string[]): UploadedImage[] {
  //   const allImages = this.getImages();
  //   return allImages.filter(img => imageKeys.includes(img.imageKey));
  // }

  /**
   * Retrieves a single image by its key.
   * @param {string} imageKey - Key of the image to retrieve
   * @returns {UploadedImage | undefined} Image object or undefined if not found
   */
  getImageByKey(imageKey: string): void {
    // const allImages = this.getImages();
    const allImages = localStorage.getItem(imageKey);
    //   return data ? JSON.parse(data) : [];
    // return allImages.find(img => img.imageKey === imageKey);
  }

  /**
   * Retrieves base64 data for an image by its key.
   * @param {string} imageKey - Key of the image
   * @returns {string | null} Base64 string or null if image not found
   */
  // getBase64ByKey(imageKey: string): string | null {
  //   const image = this.getImageByKey(imageKey);
  //   return image ? image.base64 : null;
  // }

  /**
  * Deletes a subtask from a task's subcollection.
  * 
  * @param parentCollection - The collection type ('contacts' or 'tasks').
  * @param parentId - The parent ID.
  * @param ImageId - The Image ID to delete.
  */
  async deleteImage(parentCollection: 'contacts' | 'tasks', parentId: string, imageId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, parentCollection, parentId, 'images', imageId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('deleteImage error', err);
    }
  }
  /**
   * Deletes a single image by its key.
   * @param {string} imageKey - Key of the image to delete
   * @returns {void}
   */
  // deleteImage(imageKey: string) {
  //   const current = this.getImages();
  //   const updated = current.filter(img => img.imageKey !== imageKey);
  //   localStorage.setItem(this.storageKey, JSON.stringify(updated));
  // }

  /**
   * Deletes multiple images by their keys.
   * @param {string[]} imageKeys - Array of image keys to delete
   * @returns {void}
   */
  // deleteImages(imageKeys: string[]) {
  //   const current = this.getImages();
  //   const updated = current.filter(img => !imageKeys.includes(img.imageKey));
  //   localStorage.setItem(this.storageKey, JSON.stringify(updated));
  // }

  /**
   * Clears all images from localStorage.
   * @returns {void}
   */
  clearImages() {
    this.images = [];
  }

  /**
   * Retrieves base64 data for task-related images.
   * @param {string[]} taskImageKeys - Array of task image keys
   * @returns {string[]} Array of base64 strings for existing images
   */
  // getTaskImages(taskImageKeys: string[]): string[] {
  //   return taskImageKeys
  //     .map(key => this.getBase64ByKey(key))
  //     .filter(base64 => base64 !== null) as string[];
  // }

  /**
   * Retrieves base64 data for a contact image.
   * @param {string} contactImageKey - Key of the contact image
   * @returns {string | null} Base64 string or null if image not found
   */
  // getContactImage(contactImageKey: string): string | null {
  //   return this.getBase64ByKey(contactImageKey);
  // }
}