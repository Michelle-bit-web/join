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
  images: UploadedImage[] = []; //NEU

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

  /** The index of the currently viewed image */
  currentImageIndex = 0;

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
   ngOnInit(): void {
     this.images = [...this.preloadedImages];
   }

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
   */
  private async processFiles(files: File[]) {
    this.errorMessages = [];
    for (const file of files) {
      const error = this.validateFile(file);
      if (error) { this.errorMessages.push(error); continue; }
      await this.processSingleFile(file);
    }
  }

  /**
   * Validates a single file against type, size, and count restrictions.
   * @param file - File to validate
   * @returns Error message string or null if valid
   */
  private validateFile(file: File): string | null {
    if (!file.type.startsWith('image/')) return 'Only image files are allowed';
    if (file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(2);
      return `File ${file.name} is too large. Max ${maxSizeMB} MB allowed.`;
    }
    if (this.uploadedImages.length >= this.maxImages) {
      return `Maximum ${this.maxImages} images allowed`;
    }
    return null;
  }

  /**
   * Compresses and stores a single valid file.
   * @param file - File to process
   */
  private async processSingleFile(file: File) {
    try {
      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      this.imgData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        base64: compressedBase64
      };
      this.images.push(this.imgData!);
      // this.uploadedUrls.push(compressedBase64);
      this.emitImagesChanged();
    } catch {
      this.errorMessages.push(`Error processing file ${file.name}`);
    }
  }

  /**
   * Compresses an image to specified dimensions and quality.
   */
  async compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => this.handleImageLoad(e, maxWidth, maxHeight, quality, resolve, reject);
      reader.onerror = () => reject('Error reading file');
      reader.readAsDataURL(file);
    });
  }

  /**
   * Handles image load event during compression.
   */
  private handleImageLoad(
    e: ProgressEvent<FileReader>, maxWidth: number, maxHeight: number,
    quality: number, resolve: (v: string) => void, reject: (r?: any) => void
  ) {
    const img = new Image();
    img.onload = () => this.drawCompressedImage(img, maxWidth, maxHeight, quality, resolve);
    img.onerror = () => reject('Error loading image');
    img.src = e.target?.result as string;
  }

  /**
   * Draws compressed image to canvas.
   */
  private drawCompressedImage(img: HTMLImageElement, maxWidth: number, maxHeight: number,
    quality: number, resolve: (v: string) => void) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const { width, height } = this.getResizedDimensions(img, maxWidth, maxHeight);
    canvas.width = width; canvas.height = height;
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
    // return item.filename;
    return ''
  }

  /**
   * Removes an image from the uploaded or preloaded arrays.
   * @param index - Index of image to remove
   * @param source - Source array ('uploaded' or 'preloaded')
   */
  removeImage(index: number) {
    // if (source === 'uploaded') {
    //   this.uploadedImages.splice(index, 1);
    // } else if (source === 'preloaded') {
    //   this.preloadedImages.splice(index, 1);
    // }
    this.images.splice(index, 1);
    this.emitImagesChanged();
  }

  /**
   * Removes all uploaded and preloaded images.
   */
  removeAllImages() {
    this.uploadedImages = [];
    this.preloadedImages = [];
    this.emitImagesChanged();
  }

  /**
  * Opens the image viewer for the contact image.
  * @param index - Index of image to display initially
  */
  openImageViewer(index: number) {
    this.showImageViewer = true;
    this.currentImageIndex = index;
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
  onDeleteImage(event: { index: number, imageId?: string }) {
    const image = this.images[event.index];
    if (image?.id) {
      // this.uploadService.deleteImage('tasks', /* parentId */, image.id);
      this.images.splice(event.index, 1);
      this.emitImagesChanged();
    }
    this.closeImageViewer();
  }

  /**
   * Emits the imagesChanged event with current uploaded images.
   * @private
   */
  private emitImagesChanged() {
    this.imagesChanged.emit([...this.images]);
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
    // No imageKey, so use Firestore IDs if needed after saving
    return this.uploadedImages.map(img => img.id ?? '');
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
    return this.allImages().map(img => img.id ?? '');
  }

  /**
   * Gets all base64 strings from both uploaded and preloaded images.
   * @returns Array of all base64 strings
   */
  getAllImageBase64(): string[] {
    return this.allImages().map(img => img.base64);
  }
}