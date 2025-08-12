import { Injectable } from '@angular/core';
import { ContactService } from './contact.service';
import { Firestore, addDoc, doc, getDocs, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collection, onSnapshot, getDoc } from 'firebase/firestore';

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
  constructor(private firestore: Firestore) { }

  /**
   * Sets the in-memory images array.
   * @param {UploadedImage[]} images - Array of images to set
   * @returns {void}
   */
  setImages(images: UploadedImage[]) {
    this.images = images;
  }

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
   * Clears all images from localStorage.
   * @returns {void}
   */
  clearImages() {
    this.images = [];
  }

    /**
   * Fügt ein Bild direkt in das Kontakt-Dokument ein.
   */
  async addImageToContact(contactId: string, image: UploadedImage): Promise<void> {
    try {
      const contactRef = doc(this.firestore, 'contacts', contactId);
      await updateDoc(contactRef, { image });
    } catch (error) {
      console.error('Error adding image to contact:', error);
    }
  }

  /**
   * Loads the image from the contact document.
   */
  // async getImageFromContact(contactId: string): Promise<UploadedImage | null> {
  //   try {
  //     const contactRef = doc(this.firestore, 'contacts', contactId);
  //     const snap = await getDoc(contactRef);
  //     if (snap.exists()) {
  //       const data = snap.data();
  //       return data['image'] || null;
  //     }
  //     return null;
  //   } catch (err) {
  //     console.error('Error getting image from contact:', err);
  //     return null;
  //   }
  // }

  /**
   * Löscht das Bild im Kontakt-Dokument.
   */
  async deleteImageFromContact(contactId: string): Promise<void> {
    try {
      const contactRef = doc(this.firestore, 'contacts', contactId);
      await updateDoc(contactRef, { image: null });
    } catch (err) {
      console.error('Error deleting image from contact:', err);
    }
  }
}