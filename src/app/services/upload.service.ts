import { Injectable } from '@angular/core';

export interface UploadedImage {
  imageKey: string;
  filename: string;
  fileType: string;
  base64: string;
  assignedTo: 'user' | 'task';
}

@Injectable({
  providedIn: 'root'
})

export class UploadService {
  private storageKey = 'allImages';

  constructor() { }

  saveImage(image: UploadedImage) {
    const current = this.getImages();
    current.push(image);
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  getImages(): UploadedImage[] {
    const data = localStorage.getItem(this.storageKey);
    console.log(data);
    return data ? JSON.parse(data) : [];
  }

  getImagesByKeys(imageKeys: string[]): UploadedImage[] {
    const allImages = this.getImages();
    return allImages.filter(img => imageKeys.includes(img.imageKey));
  }

  getImageByKey(imageKey: string): UploadedImage | undefined {
    const allImages = this.getImages();
    return allImages.find(img => img.imageKey === imageKey);
  }

  getBase64ByKey(imageKey: string): string | null {
    const image = this.getImageByKey(imageKey);
    return image ? image.base64 : null;
  }

  deleteImage(imageKey: string) {
    const current = this.getImages();
    const updated = current.filter(img => img.imageKey !== imageKey);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  deleteImages(imageKeys: string[]) {
    const current = this.getImages();
    const updated = current.filter(img => !imageKeys.includes(img.imageKey));
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  clearImages() {
    localStorage.removeItem(this.storageKey);
  }

   // Method to get images for a specific task
  getTaskImages(taskImageKeys: string[]): string[] {
    return taskImageKeys
      .map(key => this.getBase64ByKey(key))
      .filter(base64 => base64 !== null) as string[];
  }

  // Method to get image for a specific contact
  getContactImage(contactImageKey: string): string | null {
    return this.getBase64ByKey(contactImageKey);
  }
}
