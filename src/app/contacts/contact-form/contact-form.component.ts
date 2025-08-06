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
import { ImageViewerComponent } from '../../shared/image-viewer/image-viewer.component';
import { ImageManager } from './image-manager';

@Component({
  selector: 'app-contact-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ImageViewerComponent
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
  // fileTypeError: boolean = false;
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  showImageViewer = false;
  contactImages: string[] = [];
  contactImageKeys: string[] = [];
  errorMessage: string = '';
  imageMarkedForDeletion: boolean = false;
  /**
   * Constructor injecting the form builder and contact service.
   * @param form - Angular's FormBuilder for creating the form.
   * @param contactService - Service that manages contact CRUD operations.
   */
  constructor(private form: FormBuilder, public contactService: ContactService, private uploadService: UploadService, public imageManager: ImageManager) { }

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
    this.editContactSubscription = this.contactService.editContact$.subscribe(contact => this.getDataToEdit(contact));
  }

  openFileDialog() {
    this.filepickerRef.nativeElement.click();
  }

  /**
 * Handles a new image file selection for a contact.
 * Validates the file, deletes old image, and compresses the new image.
 * @param event - The input change event.
 */
  async onContactImageChanged(event: Event): Promise<void> {
    // this.imageManager.onContactImageChanged(event);
    this.errorMessage = '';
    const file = this.imageManager.extractValidImageFile(event);
    if (!file) {
      this.errorMessage = 'Hoppla, please select an image file (max 3MB).';
      return
    };
    await this.deletePreviousImages();
    const imageKey = `${Date.now()}_${file.name}`;
    const base64 = await this.imageManager.compressImage(file, 800, 800, 0.7);
    this.setImageState(file, imageKey, base64);
    this.errorMessage = '';
  }

  /**
   * Deletes any previously uploaded or assigned image from storage.
   */
  private async deletePreviousImages(): Promise<void> {
    if (this.uploadedImageKey) {
      this.uploadService.deleteImage(this.uploadedImageKey);
    }
    if (this.contactToEdit?.imageKey) {
      this.uploadService.deleteImage(this.contactToEdit.imageKey);
    }
  }

  /**
   * Sets the local image state and prepares it for saving.
   * @param file - The uploaded image file.
   * @param imageKey - The generated unique image key.
   * @param base64 - The base64 representation of the image.
   */
  private setImageState(file: File, imageKey: string, base64: string): void {
    this.uploadedImageKey = imageKey;
    this.imageBase64 = base64;
    this.imgData = {
      imageKey,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      base64,
      assignedTo: 'user'
    };
  }

  /**
 * Populates the form with the contact's data for editing.
 * @param contact - The contact to edit or null to clear the form.
 */
  getDataToEdit(contact: Contact | null): void {
    this.contactToEdit = contact || undefined;
    if (!this.contactToEdit) return;
    this.fillContactForm();
    this.loadContactImage();
  }

  /**
   * Fills the contact form fields with the selected contact’s data.
   */
  private fillContactForm(): void {
    this.contactForm.patchValue({
      name: this.contactToEdit!.name,
      email: this.contactToEdit!.email,
      phone: this.contactToEdit!.phone
    });
  }

  /**
   * Loads the contact image into the upload preview.
   */
  private loadContactImage(): void {
    const imageKey = this.contactToEdit!.imageKey;
    if (!imageKey) {
      this.imageBase64 = null;
      return;
    }
    this.imageBase64 = this.uploadService.getContactImage(imageKey);
    const existingImage = this.uploadService.getImageByKey(imageKey);
    if (existingImage) this.uploadService.setImages([existingImage]);
  }

  private resetImageState() {
    this.uploadedImageKey = undefined;
    this.imgData = undefined;
    this.compressedBase64 = undefined;
    this.imageBase64 = null;
  }

  /**
   * Opens the image viewer for the contact image.
   */
  openContactImageViewer() {
    if (this.imageBase64) {
      this.contactImages = [this.imageBase64];
      this.contactImageKeys = this.contactToEdit?.imageKey ? [this.contactToEdit.imageKey] :
      this.uploadedImageKey ? [this.uploadedImageKey] : [];
      this.showImageViewer = true;
    }
  }

  /**
   * Closes the image viewer.
   */
  closeImageViewer() {
    this.showImageViewer = false;
  }

  /**
   * Handles image deletion from the image viewer.
   */
  onDeleteImage(event: { imageKey?: string }) {
    if (event.imageKey) {
      // this.uploadService.deleteImage(event.imageKey);
      this.imageMarkedForDeletion = true;
    }

    // Reset image state
    this.resetImageState();

    // Update contact if editing
    // if (this.contactToEdit) {
    //   this.contactToEdit.imageKey = '';
    //   this.updateContact(this.contactToEdit);
    // }

    // Close image viewer
    this.closeImageViewer();
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
    // Clear any unsaved images from localStorage
    if (this.uploadedImageKey && !this.contactToEdit) {
      this.uploadService.deleteImage(this.uploadedImageKey);
    }
    this.contactService.hideForm();
    this.contactForm.reset();
    this.imageMarkedForDeletion = false;
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
    if (this.imageMarkedForDeletion && this.contactToEdit?.imageKey) {
      await this.uploadService.deleteImage(this.contactToEdit.imageKey);
      contact.imageKey = '';
    }
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
  public isEditMode(): boolean {
    return !!this.contactToEdit?.id;
  }

  removeImage() {
    if (!this.contactToEdit || !this.contactToEdit.id || !this.uploadedImageKey) return;
    // Bild aus dem UploadService + localStorage entfernen
    this.uploadService.deleteImage(this.uploadedImageKey);

    this.uploadedImageKey = undefined;
    this.imgData = undefined;
    this.imageBase64 = null;
    this.compressedBase64 = undefined;

    const updatedContact: Contact = {
      ...this.contactToEdit,
      imageKey: ''
    };

    this.updateContact(updatedContact);

    // Optional: auch im UI den Contact zurücksetzen
    this.contactToEdit.imageKey = '';
  }

  /**
   * Updates an existing contact using the ContactService.
   * 
   * @param contact - The contact data to be saved.
   */
  public updateContact(contact: Contact): void {
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