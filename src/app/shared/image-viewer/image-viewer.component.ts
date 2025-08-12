import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../services/upload.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * Component for viewing images in a modal overlay with navigation and delete functionality.
 * Supports touch devices, keyboard navigation, and slide-in/out animations.
 */
@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate(
          '300ms ease-in',
          style({ transform: 'translateY(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})

export class ImageViewerComponent {

  /** Array of image URLs to display */
  @Input() images: string[] = [];

  /** Starting index for image display */
  @Input() startIndex: number = 0;

  /** Array of image objects containing metadata (id, fileName, fileType, fileSize, etc.) */
  @Input() imageObjects: any[] = [];

  /** Whether delete functionality is enabled */
  @Input() allowDelete: boolean = false;

  /** Whether deletions should be immediate (true) or pending (false) */
  @Input() immediateDelete: boolean = false;

  /** Event emitted when viewer should be closed */
  @Output() close = new EventEmitter<Event>();

  /** Event emitted when an image should be deleted, contains index and optional imageId */
  @Output() deleteImage = new EventEmitter<{ index: number, imageId?: string }>();

  /** Current index of the displayed image in the images array */
  currentIndex: number = 0;

  /** Flag indicating if the current device supports touch input */
  isTouchDevice: boolean = false;

  /** Animation state for controlling slide-in/out transitions */
  animationState: 'in' | 'out' = 'in';

  /** Flag to control background overlay visibility during animations */
  backgroundVisible: boolean = false;

  /** Flag to control overall component visibility */
  isVisible: boolean = true;

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
    setTimeout(() => {
      this.backgroundVisible = true;
    }, 280);
  }

  /**
   * Gets the currently displayed image URL.
   * @returns Current image URL or empty string
   */
  get currentImage(): string {
    return this.images[this.currentIndex] || '';
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
   * Downloads the currently displayed image to the user's device.
   * Creates a temporary download link with a generated filename.
   */
  downloadImage() {
    const link = document.createElement('a');
    link.href = this.currentImage;
    link.download = `join_image_${this.getImageName() || this.currentImage + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Handles deletion of the currently displayed image.
   * Emits delete event with current index and image ID if available.
   * Closes viewer if it was the last image.
   */
  onDeleteImage() {
    if (this.allowDelete && this.imageObjects?.length > 0) {
      const imageObj = this.imageObjects[this.currentIndex];
      this.deleteImage.emit({
        index: this.currentIndex,
        imageId: imageObj?.id
      });
      if (this.imageObjects.length <= 1) {
        this.onClose(new Event('close'));
      }
    }
  }

  /**
   * Handles closing the image viewer with slide-out animation.
   * Prevents event bubbling and sets animation states.
   * @param event - The close event that triggered the action
   */
  onClose(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.animationState = 'out';
    this.backgroundVisible = false;
    this.close.emit(event);
  }

  /**
   * Handles animation completion events for slide transitions.
   * Updates visibility state when slide-out animation completes.
   * @param event - The animation event containing transition state information
   */
  onAnimationDone(event: any) {
    if (event.toState === 'void' && event.fromState === 'in') {
      this.isVisible = false;
    }
  }

  /**
   * Gets the filename of the currently displayed image.
   * @returns The filename of the current image, or undefined if not available
   */
  getImageName(): string | undefined {
    const img = this.imageObjects?.[this.currentIndex];
    return img?.fileName;
  }

  /**
   * Gets the file type (MIME type) of the currently displayed image.
   * @returns The file type of the current image, or undefined if not available
   */
  getImageType(): string | undefined {
    const img = this.imageObjects?.[this.currentIndex];
    return img?.fileType;
  }

  /**
   * Gets the formatted file size of the currently displayed image.
   * @returns The file size in KB as a formatted string, or empty string if not available
   */
  getImageSize(): string {
    const img = this.imageObjects?.[this.currentIndex];
    if (img?.fileSize) {
      return Math.round(img.fileSize / 1000) + ' KB';
    }
    return '';
  }
}