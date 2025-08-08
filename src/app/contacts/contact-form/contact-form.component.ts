/**
 * ContactFormComponent provides a form for creating and editing contacts.
 */
import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService, Contact, notOnlyWhitespace } from '../../services/contact.service';
import { Subscription } from 'rxjs';
import { UploadedImage, UploadService } from '../../services/upload.service';
import { ImageViewerComponent } from '../../shared/image-viewer/image-viewer.component';
import { ImageManager } from './image-manager';
import { ContactFormService } from './contact-form.service';

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

  imgData?: UploadedImage;
  uploadedImageKey?: string;
  imageBase64: string | null = null;

  /**
   * Subscription to receive the contact data to be edited via the ContactService.
   */
  private editContactSubscription?: Subscription;
  uploadedUrls: string[] = [];
  uploadedImages: UploadedImage[] = [];
  @ViewChild('filepicker') filepickerRef!: ElementRef<HTMLInputElement>;
  showImageViewer = false;
  contactImages: string[] = [];
  contactImageKeys: string[] = [];
  errorMessage: string = '';
  imageMarkedForDeletion: boolean = false;
  formSubmitted: boolean = false;

  /**
   * Constructor injecting the form builder and contact service.
   * @param form - Angular's FormBuilder for creating the form.
   * @param contactService - Service that manages contact CRUD operations.
   */
  constructor(
    private form: FormBuilder,
    public contactService: ContactService,
    private uploadService: UploadService,
    public imageManager: ImageManager,
    private formService: ContactFormService
  ) { }

  /**
   * Initializes the form and subscribes to editContact$ to load contact data
   * when editing an existing entry.
   */
  ngOnInit(): void {
    this.initializeForm();
    this.subscribeToEditContact();
  }

  private initializeForm(): void {
    this.contactForm = this.form.group({
      name: ['', [Validators.required, notOnlyWhitespace]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.min(10), Validators.pattern(/^\d+$/)]]
    });
  }

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

  private async processValidImage(file: File): Promise<void> {
    await this.formService.deletePreviousImages(this.uploadedImageKey, this.contactToEdit?.imageKey);
    const imageKey = `${Date.now()}_${file.name}`;
    const base64 = await this.imageManager.compressImage(file, 800, 800, 0.7);
    this.formService.setImageState(this, file, imageKey, base64);
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
    if (!this.imageBase64) return;
    this.formService.setupImageViewer(this);
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
  onDeleteImage(event: { imageKey?: string }): void {
    if (event.imageKey) {
      this.imageMarkedForDeletion = true;
    }
    this.formService.resetImageState(this);
    this.closeImageViewer();
  }

  /**
   * Cleans up the subscription on component destruction to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.editContactSubscription?.unsubscribe();
  }

  /**
   * Closes the contact form, resets its state, and emits a closing event.
   */
  onClose(): void {
    this.formService.handleFormClose(this);
    this.contactService.hideForm();
    this.closeOverlay.emit('closed');
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
    this.finalizeSubmission();
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
}