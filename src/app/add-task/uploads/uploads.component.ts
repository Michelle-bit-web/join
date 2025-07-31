import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
import "@uploadcare/file-uploader/web/uc-file-uploader-regular.min.css"
import * as UC from '@uploadcare/file-uploader';
import { UploadedImage, UploadService } from '../../services/upload.service';

UC.defineComponents(UC);

@Component({
  selector: 'app-uploads',
  imports: [CommonModule],
  templateUrl: './uploads.component.html',
  styleUrl: './uploads.component.scss',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class UploadsComponent implements OnInit {
  selectedFiles: File[] = [];
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  taskCreated: boolean = false;
  fileTypeError: boolean = false;
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  @Output() imageUrls = new EventEmitter<string[]>();

  constructor(private storage: Storage, private uploadService: UploadService) { }

  ngOnInit(): void {
    this.uploadedImages = this.uploadService.getImages();
  }


  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    for (const file of Array.from(input.files)) {
      if (!file.type.startsWith('image/')) {
        this.fileTypeError = true;;
        continue;
      }

      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      const imgData = {
        filename: file.name,
        fileType: file.type,
        base64: compressedBase64
      };

      this.uploadService.saveImage(imgData);
      this.uploadedImages.push(imgData);
      this.uploadedUrls.push(compressedBase64); //optional
      this.fileTypeError = false;
    }
  }

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  clearSelectedImages() {
    console.log('Selected files before', this.selectedFiles);
    this.selectedFiles = [];
    console.log('Selected files cleared', this.selectedFiles);
  }

  async compressImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event =>
        this.handleImageLoad(event, maxWidth, maxHeight, quality, resolve, reject);
      reader.onerror = () => reject('Fehler beim Lesen der Datei.');
      reader.readAsDataURL(file);
    });
  }

  private handleImageLoad(
    event: ProgressEvent<FileReader>,
    maxWidth: number,
    maxHeight: number,
    quality: number,
    resolve: (value: string) => void,
    reject: (reason?: any) => void
  ) {
    const img = new Image();
    img.onload = () =>
      this.drawCompressedImage(img, maxWidth, maxHeight, quality, resolve);
    img.onerror = () => reject('Fehler beim Laden des Bildes.');
    img.src = event.target?.result as string;
  }

  private drawCompressedImage(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
    quality: number,
    resolve: (value: string) => void
  ) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const { width, height } = this.getResizedDimensions(img, maxWidth, maxHeight);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    resolve(canvas.toDataURL('image/jpeg', quality));
  }

  private getResizedDimensions(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
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
    return { width, height };
  }

  trackByFilename(index: number, item: UploadedImage) {
    return item.filename;
  }
}