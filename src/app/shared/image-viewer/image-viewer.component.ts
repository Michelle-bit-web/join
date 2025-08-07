import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss'
})

export class ImageViewerComponent {

  @Input() images: string[] = [];
  @Input() startIndex: number = 0;
  @Input() imageKeys: string[] = []; // Add image keys for deletion
  @Input() allowDelete: boolean = false; // Allow deletion
  @Output() close = new EventEmitter<Event>();
  @Output() deleteImage = new EventEmitter<{ index: number, imageKey?: string }>();

  currentIndex: number = 0;
  isTouchDevice: boolean = false;

  constructor(public uploadService: UploadService) { }

  ngOnInit() {
    this.currentIndex = this.startIndex;
    this.checkIfTouchDevice();
  }

  get currentImage(): string {
    return this.images[this.currentIndex] || '';
  }

  get currentImageKey(): string | undefined {
    return this.imageKeys[this.currentIndex];
  }

  checkIfTouchDevice() {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  previousImage() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  nextImage() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    }
  }

  getImageName(): string | undefined {
    let imageName = this.uploadService.getImageByKey(this.imageKeys[this.currentIndex]);
    return imageName?.filename;
  }

  getImageType(): string | undefined {
    let imageType = this.uploadService.getImageByKey(this.imageKeys[this.currentIndex]);
    return imageType?.fileType;
  }

  getImageSize(): string {
    let imageSize = this.uploadService.getImageByKey(this.imageKeys[this.currentIndex]);
    if (imageSize) {
      return Math.round(imageSize.fileSize / 1000) + ' KB';
    }
    return '';
  }

  downloadImage() {
    const link = document.createElement('a');
    link.href = this.currentImage;
    link.download = `image_${this.currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onDeleteImage() {
    if (this.allowDelete) {
      this.deleteImage.emit({
        index: this.currentIndex,
        imageKey: this.currentImageKey
      });
      if(this.imageKeys.length <= 0) {
        this.onClose(new Event('close'));
      }
    }
  }

  onClose(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.close.emit(event);
  }
}