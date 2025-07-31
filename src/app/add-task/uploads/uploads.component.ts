import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
import "@uploadcare/file-uploader/web/uc-file-uploader-regular.min.css"
import * as UC from '@uploadcare/file-uploader';
import { UploadedImage, UploadService } from '../../services/upload.service';

UC.defineComponents(UC);

@Component({
  selector: 'app-uploads',
  imports: [CommonModule],
  templateUrl: './uploads.component.html',
  styleUrl: './uploads.component.scss',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class UploadsComponent implements OnInit{
  selectedFiles: File[] = [];
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  taskCreated: boolean = false;
  fileTyeError: boolean = false;
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  @Output() imageUrls = new EventEmitter<string[]>();
  @ViewChild('ctxProvider', {static: true}) ctxProvider!: ElementRef <typeof UC.UploadCtxProvider.prototype>;

  constructor(private storage: Storage, private uploadService: UploadService) { }

  ngOnInit(): void {
    this.uploadedImages = this.uploadService.getImages();
  //  this.ctxProvider.nativeElement.addEventListener('data-output', this.handleUploadevent);
  //  this.ctxProvider.nativeElement.addEventListener('done-flow', this.handleDoneFlow);
  }

  // handleUploadevent(e: Event) {
  //   if(!(e instanceof CustomEvent)) return;
  //   console.log(e.detail)
  // }

  // handleDoneFlow() {}

  // onFileSelected(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   const files = input.files;
  //   if (files) {
  //     this.selectedFiles = Array.from(files);
  //     console.log('File selected:', files);
  //   }
  // }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    for (const file of Array.from(input.files)) {
      if (!file.type.startsWith('image/')) {
        this.fileTyeError = true;;
        continue;
      }

      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      const imgData = {
        filename: file.name,
        fileType: file.type,
        base64: compressedBase64
      };

      this.uploadService.saveImage(imgData);
     this.uploadedImages.push(imgData);
     this.uploadedUrls.push(compressedBase64); //optional
    }
  }

  // async uploadAll() {
  //   this.uploadedUrls = [];
  //   for (const file of this.selectedFiles) {
  //     if (!file.type.startsWith('image/'))  {
  //       this.fileTyeError = true;
  //     };
  //     if (file.size > 5 * 1024 * 1024) continue; // 5 MB Begrenzung

  //     const path = `uploads/${uuidv4()}_${file.name}`;
  //     const storageRef = ref(this.storage, path);
  //     const snapshot = await uploadBytes(storageRef, file);
  //     const downloadUrl = await getDownloadURL(snapshot.ref);
  //     console.log('Image URL:', downloadUrl);
  //     this.uploadedUrls.push(downloadUrl);
  //   }
  //   if (this.taskCreated && this.uploadedUrls.length > 0) {
  //     this.imageUrls.emit(this.uploadedUrls); // ⬅️ gib URLs zurück an add-task
  //     console.log('this.uploadedUrls', this.uploadedUrls);
  //     this.fileTyeError = false
  //   }
  // }

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  clearSelectedImages() {
     console.log('Selected files before', this.selectedFiles);
    this.selectedFiles = [];
    console.log('Selected files cleared', this.selectedFiles);
  }

  async compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
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

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject('Fehler beim Laden des Bildes.');
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject('Fehler beim Lesen der Datei.');
      reader.readAsDataURL(file);
    });
  }
}