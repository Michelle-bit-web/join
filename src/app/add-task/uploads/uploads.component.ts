import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, Input, ViewChild, OnInit, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { UploadedImage, UploadService } from '../../services/upload.service';
import { ImageViewerComponent } from '../../shared/image-viewer/image-viewer.component';

/**
 * Component for handling file uploads with drag & drop functionality and image compression.
 * Supports multiple image uploads with size and type validation.
 */
@Component({
  selector: 'app-uploads',
  imports: [CommonModule, ImageViewerComponent],
  templateUrl: './uploads.component.html',
  styleUrl: './uploads.component.scss',
  standalone: true,
  schemas: []
})

export class UploadsComponent implements OnInit {
  /** Array of selected files for upload */
  selectedFiles: UploadedImage[] = [];
  
  /** Array of uploaded image URLs */
  uploadedUrls: string[] = [];
  
  /** Array of uploaded image objects */
  uploadedImages: UploadedImage[] = [];
  
  /** Flag indicating if a task has been created */
  taskCreated: boolean = false;
  
  /** Array of error messages for upload validation */
  errorMessages: string[] = [];
  
  /** Current image data being processed */
  imgData?: UploadedImage;
  
  /** Flag indicating if drag over state is active */
  isDragOver = false;
  
  /** Flag to control image viewer visibility */
  showImageViewer = false;
  
  /** Reference to the file input element */
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  
  /** Event emitter for image URLs */
  @Output() imageUrls = new EventEmitter<string[]>();
  
  /** Whether multiple file selection is allowed */
  @Input() multiple: boolean = true;
  
  /** Maximum number of images allowed */
  @Input() maxImages: number = 5;
  
  /** Maximum file size in bytes */
  @Input() maxFileSize: number = 3 * 1024 * 1024;
  
  /** Event emitter for when images change */
  @Output() imagesChanged = new EventEmitter<UploadedImage[]>();
  
  /** Assignment target for uploaded images */
  @Input() assignedTo: 'user' | 'task' = 'task';
  
  /** Flag indicating if component is in editing mode */
  @Input() isEditingMode: boolean = false;
  
  /** Array of preloaded images for editing mode */
  @Input() preloadedImages: UploadedImage[] = [];

  /**
   * Creates an instance of UploadsComponent.
   * @param uploadService - Service for handling image uploads and storage
   */
  constructor(private uploadService: UploadService) { }

  /**
   * Angular lifecycle hook - component initialization.
   */
  ngOnInit(): void { }

  /**
   * Opens the file selection dialog.
   */
  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  /**
   * Handles file selection from input element.
   * @param event - File selection event
   */
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    await this.processFiles(files);
  }

  /**
   * Handles drag over events for drag & drop functionality.
   * @param event - Drag event
   */
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handles drag leave events.
   * @param event - Drag event
   */
  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handles file drop events for drag & drop functionality.
   * @param event - Drop event containing files
   */
  @HostListener('drop', ['$event'])
  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = Array.from(event.dataTransfer?.files || []);
    await this.processFiles(files);
  }

  /**
   * Processes and validates uploaded files.
   * @param files - Array of files to process
   * @private
   */
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

  /**
   * Compresses an image to specified dimensions and quality.
   * @param file - File to compress
   * @param maxWidth - Maximum width in pixels
   * @param maxHeight - Maximum height in pixels
   * @param quality - Compression quality (0-1)
   * @returns Promise resolving to base64 string of compressed image
   */
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

  /**
   * Handles image load event during compression process.
   * @param event - FileReader progress event
   * @param maxWidth - Maximum width for compression
   * @param maxHeight - Maximum height for compression
   * @param quality - Compression quality
   * @param resolve - Promise resolve function
   * @param reject - Promise reject function
   * @private
   */
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

  /**
   * Draws compressed image on canvas.
   * @param img - HTML image element
   * @param maxWidth - Maximum width
   * @param maxHeight - Maximum height
   * @param quality - Compression quality
   * @param resolve - Promise resolve function
   * @private
   */
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

  /**
   * Calculates resized dimensions while maintaining aspect ratio.
   * @param img - HTML image element
   * @param maxWidth - Maximum allowed width
   * @param maxHeight - Maximum allowed height
   * @returns Object containing calculated width and height
   * @private
   */
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

  /**
   * Track function for Angular ngFor optimization.
   * @param index - Array index
   * @param item - UploadedImage item
   * @returns Tracking identifier
   */
  trackByFilename(index: number, item: UploadedImage) {
    return item.filename;
  }

  /**
   * Removes an image from the uploaded or preloaded arrays.
   * @param index - Index of image to remove
   * @param source - Source array ('uploaded' or 'preloaded')
   */
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

  /**
   * Removes all uploaded and preloaded images.
   */
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
  * @param index - Index of image to display initially
  */
  openImageViewer(index: number) {
    const imageUrls = this.uploadedImages.map(img => img.base64);
    this.showImageViewer = true;
    console.log('Open image viewer for index:', index, 'with images:', imageUrls);
  }

  /**
   * Closes the image viewer.
   * @param event - Optional event to stop propagation
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
   * @param event - Event containing index and imageKey for deletion
   */
  onDeleteImage(event: { index: number, imageKey?: string }) {
    if (this.isEditingMode && event.imageKey) {
      this.removeImage(event.index, 'preloaded');
    } else if (!this.isEditingMode && event.imageKey) {
      this.uploadService.deleteImage(event.imageKey);
    }
    this.closeImageViewer();
  }

  /**
   * Emits the imagesChanged event with current uploaded images.
   * @private
   */
  private emitImagesChanged() {
    this.imagesChanged.emit([...this.uploadedImages]);
  }

  /**
   * Sets the uploaded images array and emits change event.
   * @param images - Array of images to set
   */
  setImages(images: UploadedImage[]) {
    this.uploadedImages = images;
    this.emitImagesChanged();
  }

  /**
   * Gets array of image keys from uploaded images.
   * @returns Array of image keys
   */
  getImageKeys(): string[] {
    return this.uploadedImages.map(img => img.imageKey);
  }

  /**
   * Clears all uploaded images and emits change event.
   */
  clearImages() {
    this.uploadedImages = [];
    this.emitImagesChanged();
  }

  /**
   * Gets combined array of uploaded and preloaded images.
   * @returns Combined array of all images
   */
  allImages(): UploadedImage[] {
    return [...this.uploadedImages, ...this.preloadedImages];
  }

  /**
   * Gets all image keys from both uploaded and preloaded images.
   * @returns Array of all image keys
   */
  getAllImageKeys(): string[] {
    return this.allImages().map(img => img.imageKey);
  }

  /**
   * Gets all base64 strings from both uploaded and preloaded images.
   * @returns Array of all base64 strings
   */
  getAllImageBase64(): string[] {
    return this.allImages().map(img => img.base64);
  }
}