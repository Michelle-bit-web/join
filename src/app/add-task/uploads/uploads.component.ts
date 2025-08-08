import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, Input, ViewChild, OnInit, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { UploadedImage, UploadService } from '../../services/upload.service';
import { ImageViewerComponent } from '../../shared/image-viewer/image-viewer.component';

@Component({
  selector: 'app-uploads',
  imports: [CommonModule, ImageViewerComponent],
  templateUrl: './uploads.component.html',
  styleUrl: './uploads.component.scss',
  standalone: true,
  schemas: []
})

export class UploadsComponent implements OnInit {
  selectedFiles: UploadedImage[] = [];
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  taskCreated: boolean = false;
  // errorMessage: string = '';
  errorMessages: string[] = [];
  imgData?: UploadedImage;
  isDragOver = false;
  showImageViewer = false;
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  @Output() imageUrls = new EventEmitter<string[]>();
  @Input() multiple: boolean = true;
  @Input() maxImages: number = 5;
  @Input() maxFileSize: number = 3 * 1024 * 1024;
  @Output() imagesChanged = new EventEmitter<UploadedImage[]>();
  @Input() assignedTo: 'user' | 'task' = 'task';
  @Input() isEditingMode: boolean = false;
  @Input() preloadedImages: UploadedImage[] = [];

  constructor(private uploadService: UploadService) { }

  ngOnInit(): void { }

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
    this.errorMessages = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.errorMessages.push('Only image files are allowed');
        continue;
      }
      if (file.size > this.maxFileSize) {
        const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(2);
        this.errorMessages.push(`File ${file.name} is too large. Max ${maxSizeMB} MB allowed.`);
        continue;
      }
      if (this.uploadedImages.length >= this.maxImages) {
        this.errorMessages.push(`Maximum ${this.maxImages} images allowed`);
        break;
      }

      try {
        const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
        const imageKey = `${Date.now()}_${file.name}`;
        this.imgData = {
          imageKey: imageKey,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          base64: compressedBase64,
          assignedTo: 'task'
        };
        this.uploadedImages.push(this.imgData!);
        this.uploadedUrls.push(compressedBase64);
        this.emitImagesChanged();
      } catch (error) {
        this.errorMessages.push(`Error processing file ${file.name}`);
        console.error('Error processing image:', error);
      }
    }
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
      reader.onerror = () => reject('Error on reading the file.');
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
    img.onerror = () => reject('Error on loading image.');
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

  removeImage(index: number, source: 'uploaded' | 'preloaded') {
    if (source === 'uploaded') {
      this.uploadedImages.splice(index, 1);
    } else if (source === 'preloaded') {
      this.preloadedImages.splice(index, 1);
    }
    if (!this.isEditingMode) {
      const allImages = this.uploadService.getImages();
      const updatedImages = allImages.filter(img => img.imageKey !== this.selectedFiles[0]?.imageKey);
      localStorage.setItem('allImages', JSON.stringify(updatedImages));
    }
    this.emitImagesChanged();
  }

  removeAllImages() {
    this.uploadedImages = [];
    this.preloadedImages = [];
    if (!this.isEditingMode) {
      const allImages = this.uploadService.getImages();
      localStorage.setItem('allImages', JSON.stringify(allImages));
    }
    this.emitImagesChanged();
  }

  /**
  * Opens the image viewer for the contact image.
  */
  openImageViewer(index: number) {
    const imageUrls = this.uploadedImages.map(img => img.base64);
    this.showImageViewer = true;
    console.log('Open image viewer for index:', index, 'with images:', imageUrls);
  }

  /**
   * Closes the image viewer.
   */
  closeImageViewer(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.showImageViewer = false;
  }

  /**
   * Handles image deletion from the image viewer.
   */
  onDeleteImage(event: { index: number, imageKey?: string }) {
    // if (event.imageKey) {
    //   this.uploadService.deleteImage(event.imageKey);
    // }
    if (this.isEditingMode && event.imageKey) {
      this.  removeImage(event.index, 'preloaded');
    } else if (!this.isEditingMode && event.imageKey) {
      this.uploadService.deleteImage(event.imageKey);
    }
    this.closeImageViewer();
  }

  private emitImagesChanged() {
    this.imagesChanged.emit([...this.uploadedImages]);
  }

  setImages(images: UploadedImage[]) {
    this.uploadedImages = images;
    this.emitImagesChanged();
  }

  getImageKeys(): string[] {
    return this.uploadedImages.map(img => img.imageKey);
  }

  clearImages() {
    this.uploadedImages = [];
    this.emitImagesChanged();
  }

  allImages(): UploadedImage[] {
    return [...this.uploadedImages, ...this.preloadedImages];
  }

  getAllImageKeys(): string[] {
    return this.allImages().map(img => img.imageKey);
  }

  getAllImageBase64(): string[] {
    return this.allImages().map(img => img.base64);
  }
}