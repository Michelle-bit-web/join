import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Output() close = new EventEmitter<void>();
  @Output() deleteImage = new EventEmitter<{index: number, imageKey?: string}>();

  currentIndex: number = 0;

  ngOnInit() {
    this.currentIndex = this.startIndex;
  }

  get currentImage(): string {
    return this.images[this.currentIndex] || '';
  }

  get currentImageKey(): string | undefined {
    return this.imageKeys[this.currentIndex];
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
    }
  }

  onClose() {
   this.close.emit();
  }
}
