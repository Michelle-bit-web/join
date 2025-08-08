import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Contact, ContactService } from '../../services/contact.service';
import { UploadService } from '../../services/upload.service';

/**
 * Service for handling contact form operations and business logic.
 * Manages image operations, form data manipulation, and contact CRUD operations.
 * Provides helper methods for contact form component to maintain separation of concerns.
 * 
 * @example
 * // Inject in component constructor
 * constructor(private formService: ContactFormService) {}
 * 
 * // Use service methods
 * await this.formService.processSubmission(this, contact);
 */
@Injectable({
    providedIn: 'root'
})
export class ContactFormService {

    /**
     * Creates an instance of ContactFormService.
     * @param contactService - Service for contact CRUD operations
     * @param uploadService - Service for image upload and storage operations
     */
    constructor(
        private contactService: ContactService,
        private uploadService: UploadService
    ) { }

    /**
     * Deletes any previously uploaded or assigned images from storage.
     * Cleans up orphaned images to prevent storage bloat.
     * 
     * @param uploadedKey - Key of uploaded image to delete (optional)
     * @param contactKey - Key of contact's existing image to delete (optional)
     * @returns Promise that resolves when deletion is complete
     */
    async deletePreviousImages(uploadedKey?: string, contactKey?: string): Promise<void> {
        if (uploadedKey) {
            this.uploadService.deleteImage(uploadedKey);
        }
        if (contactKey) {
            this.uploadService.deleteImage(contactKey);
        }
    }

    /**
     * Sets the local image state and prepares it for saving.
     * Updates component's image-related properties with new image data.
     * 
     * @param component - The contact form component instance
     * @param file - The uploaded image file
     * @param imageKey - Generated unique key for the image
     * @param base64 - Base64 encoded image data
     */
    setImageState(component: any, file: File, imageKey: string, base64: string): void {
        component.uploadedImageKey = imageKey;
        component.imageBase64 = base64;
        component.imgData = {
            imageKey, filename: file.name, fileType: file.type,
            fileSize: file.size, base64, assignedTo: 'user'
        };
    }

    /**
     * Fills the contact form fields with the selected contact's data.
     * Populates form controls with existing contact information for editing.
     * 
     * @param form - The reactive form group to populate
     * @param contact - The contact object containing data to fill
     */
    fillContactForm(form: FormGroup, contact: Contact): void {
        form.patchValue({
            name: contact.name,
            email: contact.email,
            phone: contact.phone
        });
    }

    /**
     * Loads the contact image into the upload preview.
     * Retrieves and displays existing contact image if available.
     * 
     * @param component - The contact form component instance
     * @param contact - The contact object with potential imageKey
     */
    loadContactImage(component: any, contact: Contact): void {
        const imageKey = contact.imageKey;
        if (!imageKey) {
            component.imageBase64 = null;
            return;
        }
        this.setContactImageData(component, imageKey);
    }

    /**
     * Sets contact image data from storage into component state.
     * Helper method for loading existing contact images.
     * 
     * @param component - The contact form component instance
     * @param imageKey - The image key to retrieve from storage
     * @private
     */
    private setContactImageData(component: any, imageKey: string): void {
        component.imageBase64 = this.uploadService.getContactImage(imageKey);
        const existingImage = this.uploadService.getImageByKey(imageKey);
        if (existingImage) {
            this.uploadService.setImages([existingImage]);
        }
    }

    /**
     * Resets contact image data to clear state.
     * Clears all image-related properties in the component.
     * 
     * @param component - The contact form component instance
     */
    resetImageState(component: any): void {
        component.uploadedImageKey = undefined;
        component.imgData = undefined;
        component.imageBase64 = null;
    }

    /**
     * Sets up the image viewer with contact images.
     * Configures image viewer component with current contact image data.
     * 
     * @param component - The contact form component instance
     */
    setupImageViewer(component: any): void {
        component.contactImages = [component.imageBase64];
        component.contactImageKeys = this.getImageKeys(component);
        component.showImageViewer = true;
    }

    /**
     * Gets image keys for the image viewer based on component state.
     * Returns appropriate image keys for editing vs. new contact scenarios.
     * 
     * @param component - The contact form component instance
     * @returns Array of image keys for the viewer
     * @private
     */
    private getImageKeys(component: any): string[] {
        if (component.contactToEdit?.imageKey) {
            return [component.contactToEdit.imageKey];
        }
        return component.uploadedImageKey ? [component.uploadedImageKey] : [];
    }

    /**
     * Handles form close operations including cleanup.
     * Performs necessary cleanup when form is closed without saving.
     * 
     * @param component - The contact form component instance
     */
    handleFormClose(component: any): void {
        if (this.shouldDeleteUnsavedImage(component)) {
            this.uploadService.deleteImage(component.uploadedImageKey);
        }
        component.contactForm.reset();
        component.imageMarkedForDeletion = false;
    }

    /**
     * Determines if an unsaved image should be deleted on form close.
     * Checks conditions for cleaning up temporary images.
     * 
     * @param component - The contact form component instance
     * @returns True if image should be deleted, false otherwise
     * @private
     */
    private shouldDeleteUnsavedImage(component: any): boolean {
        return component.uploadedImageKey &&
            !component.contactToEdit &&
            !component.formSubmitted;
    }

    /**
     * Builds a trimmed Contact object from form values.
     * Creates contact object with cleaned form data and appropriate image key.
     * 
     * @param component - The contact form component instance
     * @returns Contact object built from form data
     */
    buildContactFromForm(component: any): Contact {
        const { name, email, phone } = component.contactForm.value;
        const contact: Contact = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim()
        };
        this.setContactImageKey(component, contact);
        if (component.contactToEdit?.id) {
            contact.id = component.contactToEdit.id;
        }
        return contact;
    }

    /**
     * Sets the appropriate image key on the contact object.
     * Determines correct image key based on component state and edit mode.
     * 
     * @param component - The contact form component instance
     * @param contact - The contact object to update with image key
     * @private
     */
    private setContactImageKey(component: any, contact: Contact): void {
        if (component.uploadedImageKey) {
            contact.imageKey = component.uploadedImageKey;
        } else if (component.contactToEdit?.imageKey && !component.imageMarkedForDeletion) {
            contact.imageKey = component.contactToEdit.imageKey;
        }
    }

    /**
     * Processes form submission based on edit mode.
     * Handles both new contact creation and existing contact updates.
     * 
     * @param component - The contact form component instance
     * @param contact - The contact object to process
     * @returns Promise that resolves when submission is complete
     */
    async processSubmission(component: any, contact: Contact): Promise<void> {
        if (component.imageMarkedForDeletion && component.contactToEdit?.imageKey) {
            await this.uploadService.deleteImage(component.contactToEdit.imageKey);
            contact.imageKey = '';
        }
        if (component.isEditMode()) {
            this.updateExistingContact(component, contact);
        } else {
            await this.addNewContact(component, contact);
        }
    }

    /**
      * Updates an existing contact.
      * Handles contact update workflow including image management.
      * 
      * @param component - The contact form component instance
      * @param contact - The contact object with updated data
      */
    updateExistingContact(component: any, contact: Contact): void {
        component.contactToEdit = contact;
        if (component.imgData?.imageKey && component.imgData?.base64) {
            this.uploadService.saveImage(component.imgData);
        }
        this.processContactUpdate(contact);
    }

    /**
     * Processes contact update operations based on contact state.
     * Handles image deletion or contact update based on imageKey status.
     * 
     * @param contact - The contact object to update
     * @private
     */
    private processContactUpdate(contact: Contact): void {
        if (contact.imageKey === '') {
            this.contactService.deleteImageFromContact(contact);
        } else if (contact.id) {
            this.contactService.updateContact(contact.id, contact);
        }
    }

    /**
     * Adds a new contact and emits it if successful.
     * Handles new contact creation workflow with image saving.
     * 
     * @param component - The contact form component instance
     * @param contact - The new contact object to create
     * @returns Promise that resolves when contact is added
     * @private
     */
    private async addNewContact(component: any, contact: Contact): Promise<void> {
        if (component.imgData?.imageKey && component.imgData?.base64) {
            this.uploadService.saveImage(component.imgData);
        }
        const newContact = await this.contactService.addContact(contact);
        if (newContact) {
            component.addedContact.emit(newContact);
        }
    }

    /**
     * Handles contact deletion including image cleanup.
     * Removes contact from storage and cleans up associated images.
     * 
     * @param contact - The contact object to delete
     */
    handleContactDeletion(contact: Contact): void {
        if (contact.id) {
            this.contactService.deleteContact(contact.id);
            if (contact.imageKey) {
                localStorage.removeItem(contact.imageKey);
            }
        }
    }
}