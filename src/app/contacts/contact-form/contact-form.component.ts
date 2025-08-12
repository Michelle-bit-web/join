/**
 * ContactFormComponent provides a form for creating and editing contacts.
 */
import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService, Contact, notOnlyWhitespace } from '../../services/contact.service';
import { Subscription } from 'rxjs';
import { UploadedImage } from '../../services/upload.service';
import { ImageViewerComponent } from '../../shared/image-viewer/image-viewer.component';
import { ImageManager } from './image-manager';
import { ContactFormService } from './contact-form.service';
import { UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-contact-form',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ImageViewerComponent],
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

  /**
   * The reactive form group for the contact form.
   */
  contactForm!: FormGroup;

  /**
   * The contact to edit, if editing mode is active.
   */
  contactToEdit?: Contact;

  /**
   * Data for the uploaded image including metadata.
   * @type {UploadedImage | undefined}
   */
  imgData?: UploadedImage;
  
  /**
   * Unique key identifier for the uploaded image.
   * @type {string | undefined}
   */
  uploadedImageKey?: string;
  
  /**
   * Base64 encoded string representation of the image for display.
   * @type {string | null}
   */
  imageBase64: string | null = null;

  /**
   * Subscription to receive the contact data to be edited via the ContactService.
   */
  private editContactSubscription?: Subscription;
  
  /**
   * Array of uploaded image URLs for display purposes.
   * @type {string[]}
   */
  uploadedUrls: string[] = [];
  
  /**
   * Array of uploaded image objects with metadata.
   * @type {UploadedImage[]}
   */
  uploadedImages: UploadedImage[] = [];
  
  /**
   * Reference to the file input element for image selection.
   * @type {ElementRef<HTMLInputElement>}
   */
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  
  /**
   * Controls the visibility of the image viewer modal.
   * @type {boolean}
   */
  showImageViewer = false;
  
  /**
   * Array of contact image URLs for display.
   * @type {string[]}
   */
  contactImages: string[] = [];
  
  /**
   * Array of contact image keys for backend reference.
   * @type {string[]}
   */
  contactImageKeys: string[] = [];
  
  /**
   * Error message to display for validation or upload errors.
   * @type {string}
   */
  errorMessage: string = '';
  
  /**
   * Flag indicating if the current image is marked for deletion.
   * @type {boolean}
   */
  imageMarkedForDeletion: boolean = false;
  
  /**
   * Flag indicating if the form has been submitted to show validation errors.
   * @type {boolean}
   */
  formSubmitted: boolean = false;

  /**
   * Constructor injecting the form builder and contact service.
   * @param {FormBuilder} form - Angular's FormBuilder for creating the form
   * @param {ContactService} contactService - Service that manages contact CRUD operations
   * @param {ImageManager} imageManager - Service for image processing and validation
   * @param {ContactFormService} formService - Service for form-specific business logic
   */
  constructor(
    private form: FormBuilder,
    public contactService: ContactService,
    public imageManager: ImageManager,
    private formService: ContactFormService,
    private uploadService: UploadService
  ) { }

  /**
   * Initializes the form and subscribes to editContact$ to load contact data
   * when editing an existing entry.
   */
  ngOnInit(): void {
    this.initializeForm();
    this.subscribeToEditContact();
  }

  /**
   * Initializes the reactive form with validation rules.
   * @private
   * @returns {void}
   */
  private initializeForm(): void {
    this.contactForm = this.form.group({
      name: ['', [Validators.required, notOnlyWhitespace]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(5), Validators.pattern(/^\d+$/)]]
    });
  }

  /**
   * Sets up subscription to listen for edit contact events.
   * @private
   * @returns {void}
   */
  private subscribeToEditContact(): void {
    this.editContactSubscription = this.contactService.editContact$.subscribe(
      contact => this.getDataToEdit(contact)
    );
  }

  /**
   * Opens the file dialog for image selection.
   */
  openFileDialog(): void {
    this.filepickerRef.nativeElement.click();
  }

  /**
   * Handles a new image file selection for a contact.
   * Validates the file, deletes old image, and compresses the new image.
   * @param event - The input change event.
   */
  async onContactImageChanged(event: Event): Promise<void> {
    this.errorMessage = '';
    const file = this.imageManager.extractValidImageFile(event);
    if (!file) {
      this.errorMessage = 'Hoppla, please select an image file (max 3MB).';
      return;
    }
    await this.processValidImage(file);
  }

  /**
   * Processes a valid image file by handling deletion and compression.
   * @private
   * @param {File} file - The validated image file to process
   * @returns {Promise<void>} Promise that resolves when image processing is complete
   */
  private async processValidImage(file: File): Promise<void> {
    this.imageBase64 = await this.imageManager.compressImage(file, 800, 800, 0.7);
    this.imgData = this.formService.setImageData(file, this.imageBase64);
    this.errorMessage = '';
  }

  /**
   * Populates the form with the contact's data for editing.
   * @param contact - The contact to edit or null to clear the form.
   */
  getDataToEdit(contact: Contact | null): void {
    this.contactToEdit = contact || undefined;
    if (!this.contactToEdit) return;
    this.formService.fillContactForm(this.contactForm, this.contactToEdit);
    this.formService.loadContactImage(this, this.contactToEdit);
  }

  /**
   * Opens the image viewer for the contact image.
   */
  openContactImageViewer(): void {
    if (!this.imgData) return;
    this.contactImages = [this.imgData.base64];
    this.showImageViewer = true;
  }

  /**
   * Closes the image viewer.
   */
  closeImageViewer(): void {
    this.showImageViewer = false;
  }

  /**
   * Handles image deletion from the image viewer.
   */
  onDeleteImage(event: { index: number, imageId?: string }) {
    if (event.imageId && this.contactToEdit?.id) {
      this.uploadService.deleteImage('contacts', this.contactToEdit.id, event.imageId);
      this.imgData = undefined;
      this.imageBase64 = null;
      this.emitImagesChanged();
    }
    this.closeImageViewer();
  }

  /**
   * Cleans up the subscription on component destruction to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.editContactSubscription) {
      this.editContactSubscription.unsubscribe();
    }
    this.formService.ngOnDestroy();
  }

  /**
   * Closes the contact form, resets its state, and emits a closing event.
   */
  onClose(): void {
    this.formService.handleFormClose(this);
    this.contactService.hideForm();
    this.closeOverlay.emit('closed');
    this.imageBase64 = null;
  }

  /**
   * Handles form submission. Validates input, creates or updates the contact
   * using the ContactService, emits the new contact (if applicable),
   * and closes the form.
   */
  async onSubmit(): Promise<void> {
    if (!this.contactForm.valid) return;
    this.formSubmitted = true;
    const contact = this.formService.buildContactFromForm(this);
    await this.formService.processSubmission(this, contact);
    
    // Emit the contact with the proper ID (either updated contactToEdit or the original contact)
    this.addedContact.emit(this.contactToEdit || contact);
    
    this.finalizeSubmission();
    this.imageBase64 = null;
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
  clearInputs(): void {
    this.contactForm.reset();
  }

  /**
   * Deletes the contact being edited (if any) and closes the form.
   */
  deleteContact(): void {
    if (!this.contactToEdit?.id) return;
    this.formService.handleContactDeletion(this.contactToEdit);
    this.onClose();
  }

  /**
   * Determines whether the form is in edit mode.
   * 
   * @returns True if editing an existing contact, false if creating a new one.
   */
  public isEditMode(): boolean {
    return !!this.contactToEdit?.id;
  }

  /**
   * Updates an existing contact using the ContactService.
   * 
   * @param contact - The contact data to be saved.
   */
  public updateContact(contact: Contact): void {
    this.formService.updateExistingContact(this, contact);
  }

  private emitImagesChanged() {
    this.addedContact.emit(this.contactToEdit);
  }
}