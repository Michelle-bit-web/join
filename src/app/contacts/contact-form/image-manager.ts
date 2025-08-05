import { Injectable } from '@angular/core';
import { UploadService } from '../../services/upload.service';

@Injectable({
  providedIn: 'root'
})
export class ImageManager {
  fileTypeError: boolean = false;

  constructor(public uploadService: UploadService) {}

  /**
   * Prüft den Dateityp und gibt das Bild zurück, falls gültig.
   */
  extractValidImageFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file) {
      this.fileTypeError = false;
      return null;
    }

    if (!file.type.startsWith('image/')) {
      this.fileTypeError = true;
      return null;
    }

    this.fileTypeError = false;
    return file;
  }

  /**
   * Komprimiert ein Bild auf gewünschte Maße und Qualität.
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
