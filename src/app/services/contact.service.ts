import { Injectable } from '@angular/core';
import { deleteField, Firestore, addDoc, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { collection, onSnapshot, getDoc } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { UploadedImage } from './upload.service';

/**
 * Interface representing a contact.
 */
export interface Contact {
  /** Unique identifier (automatically assigned by Firestore) */
  id?: string;
  /** Full name of the contact */
  name: string;
  /** Email address of the contact */
  email: string;
  /** Optional phone number of the contact */
  phone?: string;
  /** Optional avatar base64 for the contact */
  image?: UploadedImage;
}

/**
 * Custom validator to check that a form input contains more than just whitespace.
 *
 * @param control - The form control to validate.
 * @returns A validation error object if invalid, otherwise null.
 */
export function notOnlyWhitespace(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value === 'string' && value.trim().length === 0) {
    return { whitespace: true };
  }
  return null;
}

/**
 * Injectable service for managing contact data in Firestore.
 * Provides reactive streams for selected contact, form visibility, and editing state.
 */
@Injectable({
  providedIn: 'root',
})

export class ContactService {
  /**
   * BehaviorSubject holding the currently selected contact for viewing or interaction.
   * @private
   * @type {BehaviorSubject<Contact | null>}
   */
  private selectedContactSubject = new BehaviorSubject<Contact | null>(null);

  /**
   * Observable stream of the currently selected contact.
   * @public
   * @type {Observable<Contact | null>}
   */
  public selectedContact$ = this.selectedContactSubject.asObservable();

  /**
   * BehaviorSubject controlling the visibility of the contact form.
   * @private
   * @type {BehaviorSubject<boolean>}
   */
  private showFormSubject = new BehaviorSubject<boolean>(false);

  /**
   * Observable stream for contact form visibility state.
   * @public
   * @type {Observable<boolean>}
   */
  public showForm$ = this.showFormSubject.asObservable();

  /**
   * BehaviorSubject holding the contact currently being edited.
   * @private
   * @type {BehaviorSubject<Contact | null>}
   */
  private editContactSubject = new BehaviorSubject<Contact | null>(null);

  /**
   * Observable stream for the contact being edited.
   * @public
   * @type {Observable<Contact | null>}
   */
  public editContact$ = this.editContactSubject.asObservable();

  /**
   * Predefined array of hexadecimal colors used for contact avatar backgrounds.
   * Colors are selected based on contact name hash for consistency.
   * @private
   * @type {string[]}
   */
  private avatarColors = [
    '#9C27B0', '#2196F3', '#FF9800', '#4CAF50', '#F44336', '#00BCD4',
    '#c44314ff', '#5191daff', '#E91E63', '#3F51B5', '#b3c511ff',
    '#FF5722', '#388E3C', '#1976D2', '#5c0582ff', '#c90d0dff',
    '#c303aaff', '#0118acff', '#0288D1', '#C2185B', '#049484ff',
    '#FFA000', '#084c6bff', '#6bb604ff'
  ];

  /**
   * Creates an instance of ContactService.
   * @param {Firestore} firestore - Firebase Firestore database service for contact data persistence
   */
  constructor(private firestore: Firestore) { }

  /**
   * Returns a Firestore reference to the `contacts` collection.
   * @returns {CollectionReference} Firestore collection reference for contacts
   */
  getContactsRef() {
    return collection(this.firestore, 'contacts');
  }

  /**
   * Returns a Firestore reference to a single contact document.
   * @param {string} docId - The ID of the contact document
   * @returns {DocumentReference} Firestore document reference for the specific contact
   */
  getSingleContactsRef(docId: string) {
    return doc(this.getContactsRef(), docId);
  }

  /**
   * Returns an observable stream of all contacts from Firestore.
   *
   * @returns Observable of Contact array.
   */
  getContacts(): Observable<Contact[]> {
    return new Observable((observer) => {
      const contactsRef = this.getContactsRef();
      const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
          const contacts: Contact[] = [];
          snapshot.forEach((doc) => {
            contacts.push({ id: doc.id, ...doc.data() } as Contact);
          });
          observer.next(contacts);
        },
        (error) => { observer.error(error); }
      );
      return () => unsubscribe();
    });
  }

  /**
   * Adds a new contact to Firestore.
   *
   * @param newContact - The contact to add.
   * @returns The added contact with its generated ID or null if failed.
   */
  async addContact(newContact: Contact, images?: UploadedImage[]): Promise<Contact | null> {
    try {
      const contactsRef = this.getContactsRef();
      const docRef = await addDoc(contactsRef, newContact);
      const fullContact: Contact = { id: docRef.id, ...newContact };
      return fullContact;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  /**
   * Updates an existing contact in Firestore.
   *
   * @param docId - The Firestore document ID of the contact to update.
   * @param updatedContact - The updated contact data.
   */
  async updateContact(docId: string, updatedContact: Contact, images?: UploadedImage[]): Promise<void> {
    let docRef = this.getSingleContactsRef(docId);
    await updateDoc(docRef, this.getCleanJson(updatedContact)).catch((err) => {
      console.error(err);
    });
  }

  /**
   * Returns a plain JSON object with only the allowed contact fields.
   * This is used to avoid including undefined or extra properties when updating Firestore.
   * @param {Contact} updatedContact - The contact object to sanitize
   * @returns {Partial<Contact>} A JSON object containing only valid contact fields
   */
  getCleanJson(updatedContact: Contact): Partial<Contact> {
    const contact: Contact = {
      name: updatedContact.name,
      email: updatedContact.email,
      phone: updatedContact.phone
    };
    if (updatedContact.image) {
      contact.image = updatedContact.image;
    }
    return contact;
  }

  /**
   * Emits a contact to the selected contact observable.
   * Used to show the contact details in the UI.
   * @param {Contact} contact - The contact to select
   * @returns {void}
   */
  selectContact(contact: Contact): void {
    this.selectedContactSubject.next(contact);
  }

  /**
   * Clears the currently selected contact.
   * @returns {void}
   */
  clearSelection(): void {
    this.selectedContactSubject.next(null);
  }

  /**
   * Triggers the display of the add contact form.
   * @returns {void}
   */
  showAddForm(): void {
    this.showFormSubject.next(true);
  }

  /**
   * Triggers the display of the edit contact form with a prefilled contact.
   * @param {Contact} contact - The contact to edit
   * @returns {void}
   */
  showEditForm(contact: Contact): void {
    this.editContactSubject.next(contact);
    this.showFormSubject.next(true);
  }

  /**
   * Hides the contact form and clears the edit state.
   * @returns {void}
   */
  hideForm(): void {
    this.showFormSubject.next(false);
    this.editContactSubject.next(null);
  }

  /**
   * Deletes the imageKey field from Firestore.
   * @param {Contact} contactToEdit - The contact to delete the imageKey from
   * @returns {void}
   */
  deleteImageFromContact(contactToEdit: Contact): void {
    if (!contactToEdit.id) {
      console.error('Contact id is undefined. Cannot delete image.');
      return;
    }
    const contactRef = this.getSingleContactsRef(contactToEdit.id);
    updateDoc(contactRef, {
      imageKey: deleteField()
    }).catch((err) => {
      console.error('Failed to delete image from contact:', err);
    });
  }

  /**
   * Deletes a contact from Firestore.
   * @param {string} docId - The Firestore document ID of the contact to delete
   * @returns {Promise<void>} Promise that resolves when contact is deleted
   */
  async deleteContact(docId: string): Promise<void> {
    await deleteDoc(this.getSingleContactsRef(docId)).catch((err) => {
      console.error('Failed to delete contact:', err);
    });
  }

  /**
   * Generates a consistent avatar color for a contact based on their name.
   *
   * @param contactName - The contact’s name used to calculate a hash.
   * @returns A hexadecimal color string from the avatarColors array.
   */
  getContactColor(contactName: string): string {
    let hash = 0;
    for (let i = 0; i < contactName.length; i++) {
      hash += contactName.charCodeAt(i);
    }
    return this.avatarColors[hash % this.avatarColors.length];
  }

  /**
   * Extracts the initials from a contact name.
   *
   * @param name - The full name of the contact.
   * @returns A string with one or two uppercase initials, or '?' if the name is invalid.
   */
  getInitials(name?: string): string {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /**
   * Fetches a single contact by its Firestore document ID.
   *
   * @param contactId - The Firestore document ID.
   * @returns A promise resolving to the contact object or null if not found.
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    const contactRef = this.getSingleContactsRef(contactId);
    return getDoc(contactRef).then(snapshot => {
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Contact;
      }
      return null;
    });
  }
}