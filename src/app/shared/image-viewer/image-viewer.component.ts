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
  @Output() close = new EventEmitter<void>();

  currentIndex: number = 0;

  ngOnInit() {
    this.currentIndex = this.startIndex;
  }

  get currentImage(): string {
    return this.images[this.currentIndex] || '';
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

  onClose() {
    this.close.emit();
  }
}
