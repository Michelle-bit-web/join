import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, Input, ViewChild, OnInit, HostListener } from '@angular/core';
import { UploadedImage, UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-uploads',
  imports: [CommonModule],
  templateUrl: './uploads.component.html',
  styleUrl: './uploads.component.scss',
  standalone: true,
  schemas: []
})

export class UploadsComponent implements OnInit {
  selectedFiles: File[] = [];
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  taskCreated: boolean = false;
  errorMessage: string = '';
  imgData?: UploadedImage;
  isDragOver = false;
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  @Output() imageUrls = new EventEmitter<string[]>();
  @Input() multiple: boolean = true;
  @Input() maxImages: number = 10;
  @Input() maxFileSize: number = 1 * 800 * 800; // 1MB
  @Output() imagesChanged = new EventEmitter<UploadedImage[]>();
  @Input() assignedTo: 'user' | 'task' = 'task';

  constructor(private uploadService: UploadService) { }

  ngOnInit(): void {}

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    await this.processFiles(files);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  @HostListener('drop', ['$event'])
  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []);
    await this.processFiles(files);
  }

  private async processFiles(files: File[]) {
    this.errorMessage = '';
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Only image files are allowed';
        continue;
      }
       if (this.uploadedImages.length >= this.maxImages) {
        this.errorMessage = `Maximum ${this.maxImages} images allowed`;
        break;
      }

      try {
        const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
        const imageKey = `${Date.now()}_${file.name}`;
        this.imgData = {
          imageKey: imageKey,
          filename: file.name,
          fileType: file.type,
          base64: compressedBase64,
          assignedTo: 'task'
        };
         // Save to localStorage immediately for tasks (multiple images allowed)
        this.uploadService.saveImage(this.imgData!);
        this.uploadedImages.push(this.imgData!);
        this.uploadedUrls.push(compressedBase64);
        this.emitImagesChanged();
      } catch (error) {
        this.errorMessage = 'Error processing image';
        console.error('Error processing image:', error);
      }
    }
  }

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
    const allImages = this.uploadService.getImages();
    const updatedImages = allImages.filter(img => img.imageKey !== removedImage.imageKey);
    localStorage.setItem('allImages', JSON.stringify(updatedImages));
    this.emitImagesChanged();
  }

  openImageViewer(index: number) {
    const imageUrls = this.uploadedImages.map(img => img.base64);
    console.log('Open image viewer for index:', index, 'with images:', imageUrls);
  }

  private emitImagesChanged() {
    this.imagesChanged.emit([...this.uploadedImages]);
  }

  setImages(images: UploadedImage[]) {
    this.uploadedImages = [...images];
    this.emitImagesChanged();
  }
  
  getImageKeys(): string[] {
    return this.uploadedImages.map(img => img.imageKey);
  }

  clearImages() {
    this.uploadedImages = [];
    this.emitImagesChanged();
  }
}