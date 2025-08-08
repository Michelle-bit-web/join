import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../services/upload.service';

/**
 * Component for viewing images in a modal overlay with navigation and delete functionality.
 * Supports touch devices and keyboard navigation.
 */
@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss'
})

export class ImageViewerComponent {

  /** Array of image URLs to display */
  @Input() images: string[] = [];
  
  /** Starting index for image display */
  @Input() startIndex: number = 0;
  
  /** Array of image keys corresponding to images */
  @Input() imageKeys: string[] = [];
  
  /** Whether delete functionality is enabled */
  @Input() allowDelete: boolean = false;
  
  /** Event emitted when viewer should be closed */
  @Output() close = new EventEmitter<Event>();
  
  /** Event emitted when image should be deleted */
  @Output() deleteImage = new EventEmitter<{ index: number, imageKey?: string }>();

  /** Current index of displayed image */
  currentIndex: number = 0;
  
  /** Flag indicating if device supports touch */
  isTouchDevice: boolean = false;

  /**
   * Creates an instance of ImageViewerComponent.
   * @param uploadService - Service for image operations
   */
  constructor(public uploadService: UploadService) { }

  /**
   * Angular lifecycle hook - component initialization.
   */
  ngOnInit() {
    this.currentIndex = this.startIndex;
    this.checkIfTouchDevice();
  }

  /**
   * Gets the currently displayed image URL.
   * @returns Current image URL or empty string
   */
  get currentImage(): string {
    return this.images[this.currentIndex] || '';
  }

  /**
   * Gets the key of the currently displayed image.
   * @returns Current image key or undefined
   */
  get currentImageKey(): string | undefined {
    return this.imageKeys[this.currentIndex];
  }

  /**
   * Checks if the current device supports touch input.
   */
  checkIfTouchDevice() {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Navigates to the previous image if available.
   */
  previousImage() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  /**
   * Navigates to the next image if available.
   */
  nextImage() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    }
  }

  /**
   * Gets the filename of the current image.
   * @returns Filename or undefined if not available
   */
  getImageName(): string | undefined {
    let imageName = this.uploadService.getImageByKey(this.imageKeys[this.currentIndex]);
    return imageName?.filename;
  }

  /**
   * Gets the file type of the current image.
   * @returns File type or undefined if not available
   */
  getImageType(): string | undefined {
    let imageType = this.uploadService.getImageByKey(this.imageKeys[this.currentIndex]);
    return imageType?.fileType;
  }

  /**
   * Gets the formatted file size of the current image.
   * @returns Formatted file size string in KB or empty string
   */
  getImageSize(): string {
    let imageSize = this.uploadService.getImageByKey(this.imageKeys[this.currentIndex]);
    if (imageSize) {
      return Math.round(imageSize.fileSize / 1000) + ' KB';
    }
    return '';
  }

  /**
   * Downloads the currently displayed image.
   */
  downloadImage() {
    const link = document.createElement('a');
    link.href = this.currentImage;
    link.download = `image_${this.currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Handles image deletion if delete is allowed.
   */
  onDeleteImage() {
    if (this.allowDelete) {
      this.deleteImage.emit({
        index: this.currentIndex,
        imageKey: this.currentImageKey,
      });
      if (this.imageKeys.length <= 0) {
        this.onClose(new Event('close'));
      }
    }
  }

  /**
   * Handles closing the image viewer.
   * @param event - Close event
   */
  onClose(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.close.emit(event);
  }
}