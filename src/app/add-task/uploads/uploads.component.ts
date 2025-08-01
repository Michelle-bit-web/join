import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, Input, ViewChild, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { UploadedImage, UploadService } from '../../services/upload.service';

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
  errorMessage: string = '';
  imgData?: UploadedImage;
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  @Output() imageUrls = new EventEmitter<string[]>();
  @Input() multiple: boolean = true;
  @Input() maxImages: number = 10;
  @Input() maxFileSize: number = 1 * 1024 * 1024; // 1MB
  @Output() imagesChanged = new EventEmitter<UploadedImage[]>();

  constructor(private uploadService: UploadService) { }

  ngOnInit(): void {
    this.uploadedImages = this.uploadService.getImages();
  }

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    this.errorMessage = '';
    for (const file of Array.from(input.files)) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      const imageKey = `${Date.now()}_${file.name}`;
      this.imgData = {
        imageKey: imageKey,
        filename: file.name,
        fileType: file.type,
        base64: compressedBase64,
        assignedTo: 'task'
      };

      this.uploadService.saveImage(this.imgData!);
      this.uploadedImages.push(this.imgData!);
      this.uploadedUrls.push(compressedBase64); //optional
    
    }
  }


  // openImageViewer(base64:string){
  //   console.log('Opening image viewer for:', base64);
  // }

  clearSelectedImages() {
    this.selectedFiles = [];
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

  removeImage(index: number) {
    const removedImage = this.uploadedImages[index];
    this.uploadedImages.splice(index, 1);
    
    // Remove from localStorage
    const allImages = this.uploadService.getImages();
    const updatedImages = allImages.filter(img => img.imageKey !== removedImage.imageKey);
    localStorage.setItem('allImages', JSON.stringify(updatedImages));
    
    this.emitImagesChanged();
  }

  openImageViewer(index: number) {
    const imageUrls = this.uploadedImages.map(img => img.base64);
    // This would typically emit an event to the parent component to show the image viewer
    // For now, we'll just log the action
    console.log('Open image viewer for index:', index, 'with images:', imageUrls);
  }

  private emitImagesChanged() {
    this.imagesChanged.emit([...this.uploadedImages]);
  }

  // Method to set images from parent component (for editing mode)
  setImages(images: UploadedImage[]) {
    this.uploadedImages = [...images];
    this.emitImagesChanged();
  }

  // Method to get image keys for database storage
  getImageKeys(): string[] {
    return this.uploadedImages.map(img => img.imageKey);
  }

  // Method to clear all images
  clearImages() {
    this.uploadedImages = [];
    this.emitImagesChanged();
  }
}