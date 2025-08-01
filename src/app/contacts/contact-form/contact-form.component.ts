/**
 * ContactFormComponent provides a form for creating and editing contacts.
 * It supports validation, input trimming, and interaction with the ContactService
 * to add, update, or delete contact entries. The form is displayed as an overlay
 * and can emit events when submitted or closed.
 *
 * @example
 * <app-contact-form (addedContact)="handleAddedContact($event)" (closeOverlay)="handleClose($event)"></app-contact-form>
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService, Contact, notOnlyWhitespace } from '../../services/contact.service';
import { Subscription } from 'rxjs';
import { UploadedImage, UploadService } from '../../services/upload.service';
// import "@uploadcare/file-uploader/web/uc-file-uploader-regular.min.css"
// import * as UC from '@uploadcare/file-uploader';

// UC.defineComponents(UC);

@Component({
  selector: 'app-contact-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class ContactFormComponent implements OnInit, OnDestroy {

  /**
   * Emits a newly created contact after successful form submission.
   */
  @Output() addedContact = new EventEmitter<Contact>();

  /**
   * Emits when the form overlay is closed (e.g., after cancel or submit).
   * Emits the string 'closed' as an identifier.
   */
  @Output() closeOverlay = new EventEmitter<string>();

  // @ViewChild('ctxProvider', { static: true }) ctxProvider!: ElementRef<typeof UC.UploadCtxProvider.prototype>;
  /**
   * The reactive form group for the contact form.
   */
  contactForm!: FormGroup;

  /**
   * The contact to edit, if editing mode is active.
   */
  contactToEdit?: Contact;

  imgData?: UploadedImage;
  uploadedImageKey?: string;
  compressedBase64?: string;
  imageBase64: string | null = null;
  /**
   * Subscription to receive the contact data to be edited via the ContactService.
   */
  private editContactSubscription?: Subscription;
  fileTypeError: boolean = false;
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;

  /**
   * Constructor injecting the form builder and contact service.
   * @param form - Angular's FormBuilder for creating the form.
   * @param contactService - Service that manages contact CRUD operations.
   */
  constructor(private form: FormBuilder, public contactService: ContactService, private uploadService: UploadService) { }

  /**
   * Initializes the form and subscribes to editContact$ to load contact data
   * when editing an existing entry.
   */
  ngOnInit(): void {
    this.contactForm = this.form.group({
      name: ['', [Validators.required, notOnlyWhitespace]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.min(10), Validators.pattern(/^\d+$/)]]
    });
    this.editContactSubscription = this.contactService.editContact$.subscribe(this.getDataToEdit);
    // this.ctxProvider.nativeElement.addEventListener('data-output', this.handleUploadevent);
    // this.ctxProvider.nativeElement.addEventListener('done-flow', this.handleDoneFlow);
  }

  // handleUploadevent(e: Event) {
  //   if(!(e instanceof CustomEvent)) return;
  // }

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  // handleDoneFlow() {}

  async onContactImageChanged(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.resetImageState();
      return;
    }

    const file = input.files[0];

    // MIME-Typ prüfen
    if (!file.type.startsWith('image/')) {
      this.fileTypeError = true;
      this.resetImageState();
      return;
    }

    this.fileTypeError = false;

    const imageKey = `${Date.now()}_${file.name}`;
    const base64 = await this.compressImage(file, 800, 800, 0.7);

    this.uploadedImageKey = imageKey;
    this.imgData = {
      imageKey: imageKey,
      filename: file.name,
      fileType: file.type,
      base64: base64,
      assignedTo: 'user'
    };
    this.imageBase64 = base64;

    // Optional: direkt in UploadService speichern
    // this.uploadService.saveImage(this.imgData);
  }

  // onContactImageChanged(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   if (!input.files) return;
  //   if (images.length > 0) {
  //     const image = images[0];
  //     this.uploadedImageKey = image.imageKey;
  //     this.imgData = image;
  //     this.compressedBase64 = image.base64;
  //     this.imageBase64 = image.base64;
  //   } else {
  //     this.uploadedImageKey = undefined;
  //     this.imgData = undefined;
  //     this.compressedBase64 = undefined;
  //     this.imageBase64 = null;
  //   }
  // }

  // async onFileSelected(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   if (!input.files) return;

  //   for (const file of Array.from(input.files)) {
  //     if (!file.type.startsWith('image/')) {
  //       this.fileTypeError = true;;
  //       continue;
  //     }
  //     const imageKey = `${Date.now()}_${file.name}`;
  //     this.compressedBase64 = await this.compressImage(file, 800, 800, 0.7);

  //     this.uploadedImageKey = imageKey; // <-- Wichtig!

  //     this.imgData = {
  //       imageKey: imageKey,
  //       filename: file.name,
  //       fileType: file.type,
  //       base64: this.compressedBase64,
  //       assignedTo: 'user'
  //     };

  //  this.uploadService.saveImage(this.imgData);
  //  this.uploadedImages.push(this.imgData);
  //  this.uploadedUrls.push(compressedBase64); //optional
  //   }
  // }

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

  /**
   * Receives a contact to be edited and pre-fills the form fields.
   * @param contact - The contact object or null to clear the form.
   */
  getDataToEdit = (contact: Contact | null) => {
    this.contactToEdit = contact || undefined;
    if (this.contactToEdit) {
      this.contactForm.patchValue({
        name: this.contactToEdit.name,
        email: this.contactToEdit.email,
        phone: this.contactToEdit.phone
      });
      if (this.contactToEdit.imageKey) {
        this.imageBase64 = this.uploadService.getContactImage(this.contactToEdit.imageKey);
        // Load existing image into the upload component
        const existingImage = this.uploadService.getImageByKey(this.contactToEdit.imageKey);
        if (existingImage) {
          this.uploadService.setImages([existingImage]);
        }
      } else {
        this.imageBase64 = null;
      }
    }
  }

  private resetImageState() {
    this.uploadedImageKey = undefined;
    this.imgData = undefined;
    this.compressedBase64 = undefined;
    this.imageBase64 = null;
  }

  /**
   * Cleans up the subscription on component destruction to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.editContactSubscription) {
      this.editContactSubscription.unsubscribe();
    }
  }

  /**
   * Closes the contact form, resets its state, and emits a closing event.
   */
  onClose(): void {
    this.contactService.hideForm();
    this.contactForm.reset();
    this.closeOverlay.emit('closed');
  }

  /**
   * Handles form submission. Validates input, creates or updates the contact
   * using the ContactService, emits the new contact (if applicable),
   * and closes the form.
   */
  async onSubmit(): Promise<void> {
    if (!this.contactForm.valid) return;
    const contact = this.buildContactFromForm();
    if (this.isEditMode()) {
      this.updateContact(contact);
    } else {
      await this.addNewContact(contact);
    }
    this.finalizeSubmission();
  }

  /**
   * Builds a trimmed Contact object from form values.
   * 
   * @returns A Contact object based on form input.
   */
  private buildContactFromForm(): Contact {
    const { name, email, phone } = this.contactForm.value;
    return {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      imageKey: this.uploadedImageKey || undefined
    };
  }

  /**
   * Determines whether the form is in edit mode.
   * 
   * @returns True if editing an existing contact, false if creating a new one.
   */
  private isEditMode(): boolean {
    return !!this.contactToEdit?.id;
  }

  removeImage() {
    if (!this.contactToEdit || !this.contactToEdit.id || !this.uploadedImageKey) return;
    // Bild aus dem UploadService + localStorage entfernen
    this.uploadService.deleteImage(this.uploadedImageKey);

    // Lokale Zustände zurücksetzen
    this.uploadedImageKey = undefined;
    this.imgData = undefined;
    this.imageBase64 = null;
    this.compressedBase64 = undefined;

    // Bildinformationen aus dem Kontakt entfernen
  const updatedContact: Contact = {
    ...this.contactToEdit,
    imageKey: undefined
  };

   // Kontakt aktualisieren
  this.updateContact(updatedContact);

  // Optional: auch im UI den Contact zurücksetzen
  this.contactToEdit.imageKey = undefined;
  }

  /**
   * Updates an existing contact using the ContactService.
   * 
   * @param contact - The contact data to be saved.
   */
  private updateContact(contact: Contact): void {
    if (this.imgData?.imageKey && this.imgData?.base64) {
      this.uploadService.saveImage(this.imgData);
    }
    if (this.contactToEdit && this.contactToEdit.id) {
      this.contactService.updateContact(this.contactToEdit.id, contact);
    }
  }

  /**
   * Adds a new contact using the ContactService and emits it if successful.
   * 
   * @param contact - The new contact data to be added.
   */
  private async addNewContact(contact: Contact): Promise<void> {
    if (this.imgData?.imageKey && this.imgData?.base64) {
      this.uploadService.saveImage(this.imgData);
    }
    const newContact = await this.contactService.addContact(contact);
    if (newContact) {
      this.addedContact.emit(newContact);
    }
  }

  // saveToStorage() {
  //   this.uploadService.saveImage(this.imgData!);
  //   this.uploadedImages.push(this.imgData!);
  //   this.uploadedUrls.push(this.compressedBase64!); //optional
  // }

  /**
   * Clears form inputs and closes the form after submission.
   */
  private finalizeSubmission(): void {
    this.clearInputs();
    this.onClose();
  }

  /**
   * Resets the form without closing the overlay.
   */
  clearInputs() {
    this.contactForm.reset();
  }

  /**
   * Deletes the contact being edited (if any) and closes the form.
   */
  deleteContact() {
    if (this.contactToEdit?.id) {
      this.contactService.deleteContact(this.contactToEdit.id);
      if (this.contactToEdit?.imageKey && this.contactToEdit.imageKey) {
        localStorage.removeItem(this.contactToEdit.imageKey);
      }
      this.onClose();
    }
  }
}

