import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-uploads',
  imports: [CommonModule],
  templateUrl: './uploads.component.html',
  styleUrl: './uploads.component.scss',
  standalone: true,
})

export class UploadsComponent {
  selectedFiles: File[] = [];
  uploadedUrls: string[] = [];
  taskCreated: boolean = false;
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  @Output() imageUrls = new EventEmitter<string[]>();

  constructor(private storage: Storage) { }

  onFileSelected(event: Event) {
    console.log('File selected:', event);
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  async uploadAll() {
    this.uploadedUrls = [];
    for (const file of this.selectedFiles) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) continue; // 5 MB Begrenzung

      const path = `uploads/${uuidv4()}_${file.name}`;
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      this.uploadedUrls.push(downloadUrl);
    }
    if (this.taskCreated && this.uploadedUrls.length > 0) {
      this.imageUrls.emit(this.uploadedUrls); // ⬅️ gib URLs zurück an add-task
      console.log('this.uploadedUrls', this.uploadedUrls);
    }
  }

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }
}
