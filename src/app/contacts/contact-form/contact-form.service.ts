import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Contact, ContactService } from '../../services/contact.service';
import { UploadService } from '../../services/upload.service';
import { Subscription } from 'rxjs';

/**
 * Service for handling contact form operations and business logic.
 * Manages image operations, form data manipulation, and contact CRUD operations.
 * Provides helper methods for contact form component to maintain separation of concerns.
 * 
 * @example
 * ```typescript
 * // Inject in component constructor
 * constructor(private formService: ContactFormService) {}
 * 
 * // Use service methods
 * await this.formService.processSubmission(this, contact);
 * ```
 */
@Injectable({
    providedIn: 'root'
})

export class ContactFormService {
    subscription: Subscription | undefined = undefined;
    /**
     * Creates an instance of ContactFormService.
     * @param {ContactService} contactService - Service for contact CRUD operations
     * @param {UploadService} uploadService - Service for image upload and storage operations
     */
    constructor(
        private contactService: ContactService,
        private uploadService: UploadService
    ) { }

    /**
     * Deletes any previously uploaded or assigned images from storage.
     * Cleans up orphaned images to prevent storage bloat.
     * 
     * @param {string} [uploadedKey] - Key of uploaded image to delete
     * @param {string} [contactKey] - Key of contact's existing image to delete
     * @returns {Promise<void>} Promise that resolves when deletion is complete
     */

    //WÄRE UNNÖTIG UND STATTDESSEN NUR EIN UPDATE
    // async deletePreviousImages(uploadedKey?: string, contactKey?: string): Promise<void> {
    //     if (uploadedKey) {
    //         this.uploadService.deleteImage(uploadedKey);
    //     }
    //     if (contactKey) {
    //         this.uploadService.deleteImage(contactKey);
    //     }
    // }

    /**
     * Sets the local image state and prepares it for saving.
     * Updates component's image-related properties with new image data.
     * 
     * @param {any} component - The contact form component instance
     * @param {File} file - The uploaded image file
     * @param {string} imageKey - Generated unique key for the image
     * @param {string} base64 - Base64 encoded image data
     * @returns {void}
     */
    // setImageData(component: any, file: File, imageKey: string, base64: string): void {
    //     component.uploadedImageKey = imageKey;
    //     component.imageBase64 = base64;
    //     component.imgData = {
    //         imageKey, filename: file.name, fileType: file.type,
    //         fileSize: file.size, base64, assignedTo: 'user'
    //     };
    // }
    setImageData(file: File, imageBase64: string): any {
        const imageData = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            base64: imageBase64
        };
        return imageData;
    }

    /**
     * Fills the contact form fields with the selected contact's data.
     * Populates form controls with existing contact information for editing.
     * 
     * @param {FormGroup} form - The reactive form group to populate
     * @param {Contact} contact - The contact object containing data to fill
     * @returns {void}
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
     * @param {any} component - The contact form component instance
     * @param {Contact} contact - The contact object with potential imageKey
     * @returns {void}
     */
    loadContactImage(component: any, contact: Contact): void {
        // Clean up existing subscription
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }
        
        const imageKey = contact.image;
        if (!imageKey) {
            component.imageBase64 = null;
            return;
        }
        
        if (contact.id && contact.image) {
            this.subscription = this.uploadService.getImages('contacts', contact.id).subscribe(images => {
                if (images && images.length > 0) {
                    component.imageBase64 = images[0].base64;
                    this.uploadService.setImages([images[0]]);
                } else {
                    component.imageBase64 = null;
                }
            });
            this.subscription.unsubscribe();
        } else {
            component.imageBase64 = null;
        }
    }

    /**
     * Cleanup method called when the component is destroyed.
     * Unsubscribes from all active subscriptions to prevent memory leaks.
     */
    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    /**
     * Sets contact image data from storage into component state.
     * Helper method for loading existing contact images.
     * 
     * @private
     * @param {any} component - The contact form component instance
     * @param {string} imageKey - The image key to retrieve from storage
     * @returns {void}
     */
    // private setContactImageData(component: any, imageKey: string): void {
    //     component.imageBase64 = this.uploadService.getContactImage(imageKey);
    //     const existingImage = this.uploadService.getImageByKey(imageKey);
    //     if (existingImage) {
    //         this.uploadService.setImages([existingImage]);
    //     }
    // }

    /**
     * Resets contact image data to clear state.
     * Clears all image-related properties in the component.
     * 
     * @param {any} component - The contact form component instance
     * @returns {void}
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
     * @param {any} component - The contact form component instance
     * @returns {void}
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
     * @private
     * @param {any} component - The contact form component instance
     * @returns {string[]} Array of image keys for the viewer
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
     * @param {any} component - The contact form component instance
     * @returns {void}
     */
    handleFormClose(component: any): void {
        // if (this.shouldDeleteUnsavedImage(component)) {
        //     this.uploadService.deleteImage(component.uploadedImageKey);
        // }
        component.contactForm.reset();
        component.imageMarkedForDeletion = false;
    }

    /**
     * Determines if an unsaved image should be deleted on form close.
     * Checks conditions for cleaning up temporary images.
     * 
     * @private
     * @param {any} component - The contact form component instance
     * @returns {boolean} True if image should be deleted, false otherwise
     */
    // private shouldDeleteUnsavedImage(component: any): boolean {
    //     return component.uploadedImageKey &&
    //         !component.contactToEdit &&
    //         !component.formSubmitted;
    // }

    /**
     * Builds a trimmed Contact object from form values.
     * Creates contact object with cleaned form data and appropriate image key.
     * 
     * @param {any} component - The contact form component instance
     * @returns {Contact} Contact object built from form data
     */
    buildContactFromForm(component: any): Contact {
        const { name, email, phone } = component.contactForm.value;
        const contact: Contact = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim()
        };
        this.setContactImage(component, contact);
        if (component.contactToEdit?.id) {
            contact.id = component.contactToEdit.id;
        }
        return contact;
    }

    /**
     * Sets the appropriate image key on the contact object.
     * Determines correct image key based on component state and edit mode.
     * 
     * @private
     * @param {any} component - The contact form component instance
     * @param {Contact} contact - The contact object to update with image key
     * @returns {void}
     */
    // private setContactImageKey(component: any, contact: Contact): void {
    //     if (component.uploadedImageKey) {
    //         contact.imageKey = component.uploadedImageKey;
    //     } else if (component.contactToEdit?.imageKey && !component.imageMarkedForDeletion) {
    //         contact.imageKey = component.contactToEdit.imageKey;
    //     }
    // }
    setContactImage(component: any, contact: Contact): void {
        if (component.imgData) {
            contact.image = component.imgData;
        }
    }

    /**
     * Processes form submission based on edit mode.
     * Handles both new contact creation and existing contact updates.
     * 
     * @param {any} component - The contact form component instance
     * @param {Contact} contact - The contact object to process
     * @returns {Promise<void>} Promise that resolves when submission is complete
     */
    // async processSubmission(component: any, contact: Contact): Promise<void> {
    //     if (component.imageMarkedForDeletion && component.contactToEdit?.imageKey) {
    //         await this.uploadService.deleteImage(component.contactToEdit.imageKey);
    //         contact.imageKey = '';
    //     }
    //     if (component.isEditMode()) {
    //         this.updateExistingContact(component, contact);
    //     } else {
    //         await this.addNewContact(component, contact);
    //     }
    // }
    async processSubmission(component: any, contact: Contact): Promise<void> {
        if (component.imageMarkedForDeletion && component.contactToEdit?.image) {
            await this.uploadService.deleteImage('contacts', component.contactToEdit.id, component.contactToEdit.image?.id);
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
     * @param {any} component - The contact form component instance
     * @param {Contact} contact - The contact object with updated data
     * @returns {void}
     */
    updateExistingContact(component: any, contact: Contact): void {
        component.contactToEdit = contact;
        if (component.imgData && component.imgData?.base64 && contact.id) {
            this.uploadService.addImage('contacts', contact.id, component.imgData);
        }
        this.processContactUpdate(contact);
    }

    /**
     * Processes contact update operations based on contact state.
     * Handles image deletion or contact update based on imageKey status.
     * 
     * @private
     * @param {Contact} contact - The contact object to update
     * @returns {void}
     */
    private processContactUpdate(contact: Contact): void {
        if (!contact.image) {
            this.contactService.deleteImageFromContact(contact);
        } else if (contact.id) {
            this.contactService.updateContact(contact.id, contact, [contact.image]);
        }
    }

    /**
     * Adds a new contact and emits it if successful.
     * Handles new contact creation workflow with image saving.
     * 
     * @private
     * @param {any} component - The contact form component instance
     * @param {Contact} contact - The new contact object to create
     * @returns {Promise<void>} Promise that resolves when contact is added
     */
    private async addNewContact(component: any, contact: Contact): Promise<void> {
        if (component.imgData?.base64) {
            const newContact = await this.contactService.addContact(contact, [component.imgData]);
            if (newContact) {
                contact.image = newContact.image;
            }
        }
        // const newContact = await this.contactService.addContact(contact);
        // if (newContact) {
        //     component.addedContact.emit(newContact);
        // }
    }

    /**
     * Handles contact deletion including image cleanup.
     * Removes contact from storage and cleans up associated images.
     * 
     * @param {Contact} contact - The contact object to delete
     * @returns {void}
     */
    handleContactDeletion(contact: Contact): void {
        if (contact.id) {
            this.contactService.deleteContact(contact.id);
            if (contact.image && contact.image.id) {
                this.uploadService.deleteImage('contacts', contact.id, contact.image.id);
            }
        }
    }
}