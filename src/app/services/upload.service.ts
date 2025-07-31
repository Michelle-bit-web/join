import { Injectable } from '@angular/core';

export interface UploadedImage {
  filename: string;
  fileType: string;
  base64: string;
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
    return data ? JSON.parse(data) : [];
  }

  clearImages() {
    localStorage.removeItem(this.storageKey);
  }
}
