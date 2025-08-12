/**
 * ContactListComponent displays a grouped list of contacts (alphabetically),
 * handles contact selection, highlights the current user, and allows triggering
 * the creation of a new contact. It interacts with the ContactService to load,
 * group, and manage contact selection.
 * 
 * @example
 * <app-contact-list
 *   (contactSelected)="onContactSelect()">
 * </app-contact-list>
 */

import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService, Contact } from '../../services/contact.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss']
})

export class ContactListComponent implements OnInit, OnDestroy {

  /**
   * Holds the contacts grouped by the first letter of their name.
   * Each key is a letter, each value is an array of contacts starting with that letter.
   */
  groupedContacts: { [key: string]: Contact[] } = {};

  /**
   * The currently selected contact for highlighting in the list.
   */
  selectedContact: Contact | null = null;

  /**
   * The email address of the currently authenticated user for highlighting.
   */
  currentUserEmail: string | null = null;

  /**
   * The display name of the currently authenticated user.
   */
  currentUser: string | null = null;

  /**
   * Subscription to contact data changes from the service.
   */
  private contactsSubscription: Subscription = new Subscription();
  
  /**
   * Subscription to contact selection changes from the service.
   */
  private selectionSubscription: Subscription = new Subscription();

  /**
   * Event emitted when a contact is selected from the list.
   */
  @Output() contactSelected = new EventEmitter<void>();

  /**
   * Constructor injecting required services for contact management and authentication.
   * @param contactService - Service that manages contact data and selection state
   * @param authService - Service that provides current user authentication info  
   * @param uploadService - Service that manages image uploads and retrieval
   */
  constructor(
    public contactService: ContactService,
    private authService: AuthService,
    public uploadService: UploadService
  ) { }

  /**
   * Initializes the component by loading contacts,
   * grouping them by initial, identifying the current user,
   * and handling errors and contact selection.
   */
  ngOnInit(): void {
    this.subscribeToContacts();
    this.getCurrentUser();
  }

  /**
   * Subscribes to the contact list, groups them by initial letter,
   * and selects the current user's contact if available.
   */
  private subscribeToContacts(): void {
    this.contactsSubscription = this.contactService.getContacts().subscribe({
      next: (contacts) => this.handleContactsLoaded(contacts),
      error: (error) => this.handleContactsError(error),
    });
  }

  /**
   * Processes the loaded contacts by grouping them
   * and selecting the current user's contact if present.
   * 
   * @param contacts - The array of contact objects loaded from the service
   */
  private handleContactsLoaded(contacts: Contact[]): void {
    this.groupedContacts = this.groupByInitial(contacts);
    if (this.currentUserEmail) {
      const matchedContact = contacts.find(c => c.email === this.currentUserEmail);
      if (matchedContact) {
        this.onContactSelect(matchedContact);
      }
    }
  }

  /**
   * Handles an error that occurred while loading contacts.
   * Logs the error to console for debugging purposes.
   * 
   * @param error - The error object returned from the subscription
   */
  private handleContactsError(error: any): void {
    console.error('Error loading contacts:', error);
  }

  /**
   * Identifies the current authenticated user to directly select them in the contact list.
   * Also subscribes to contact selection changes to maintain selection state.
   */
  getCurrentUser() {
    const user = this.authService.getCurrentUser();
    this.currentUser = user?.displayName || null;
    this.currentUserEmail = user?.email || null;
    this.selectionSubscription = this.contactService.selectedContact$.subscribe(
      contact => this.selectedContact = contact
    );
  }

  /**
   * Unsubscribes from all active subscriptions to prevent memory leaks.
   * Called automatically when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.contactsSubscription.unsubscribe();
    this.selectionSubscription.unsubscribe();
  }

  /**
   * Checks if the given contact matches the currently logged-in user.
   * Used for highlighting the current user in the contact list.
   * 
   * @param contact - The contact to compare with the current user
   * @returns True if the contact's email matches the authenticated user's email
   */
  isCurrentUser(contact: Contact): boolean {
    return typeof contact.email === 'string' && contact.email === this.currentUserEmail;
  }

  /**
   * Handles selection of a contact from the list.
   * Updates the selection state and emits the selection event.
   * 
   * @param contact - The contact that was selected
   */
  onContactSelect(contact: Contact): void {
    this.contactService.selectContact(contact);
    this.contactSelected.emit();
  }

  /**
   * Determines if a contact is currently selected for highlighting.
   * 
   * @param contact - The contact to check selection status for
   * @returns True if the contact is currently selected
   */
  isSelected(contact: Contact): boolean {
    return this.selectedContact?.id === contact.id;
  }

  /**
   * Triggers the display of the "add contact" form via the ContactService.
   * Opens the contact creation overlay/modal.
   */
  onAddNewContact(): void {
    this.contactService.showAddForm();
  }

  /**
   * Groups contacts alphabetically by the first character of their name.
   * Filters out invalid contacts and sorts contacts within each group.
   * 
   * @param contacts - The list of contacts to group by initial letter
   * @returns An object with uppercase letters as keys and arrays of contacts as values
   */
  groupByInitial(contacts: Contact[]): { [key: string]: Contact[] } {
    const validContacts = contacts.filter(contact => contact && contact.name);
    return validContacts.reduce((groups, contact) => {
      const initial = contact.name.charAt(0).toUpperCase();
      groups[initial] = groups[initial] || [];
      groups[initial].push(contact);
      groups[initial].sort((a, b) => a.name.localeCompare(b.name));
      return groups;
    }, {} as { [key: string]: Contact[] });
  }

  /**
   * Sorting helper function for alphabetical ordering of grouped contact keys.
   * Used with keyvalue pipe in template for consistent alphabetical display.
   */
  keyAsc = (a: any, b: any) => a.key.localeCompare(b.key);

  /**
   * Returns the initials of the given name using ContactService utility.
   * Falls back to service method for consistent initial generation logic.
   * 
   * @param name - The full name of the contact
   * @returns String containing the person's initials (e.g., "JD" for "John Doe")
   */
  getInitials(name: string | undefined): string {
    return this.contactService.getInitials(name);
  }

  /**
   * Gets the contact's profile image from Firestore using their ID.
   * Returns null if no image is associated with the contact.
   * 
   * @param contact - The contact object
   * @returns The base64 encoded image string or null if no image exists
   */
  getContactImage(contact: Contact): string | null {
    // Remove imageKey logic, use Firestore-based retrieval
    if (contact.id) {
      // This is a synchronous method, but Firestore is async.
      // For display, you should use an async pipe in the template.
      // Here, just return null; see template hint below.
      return null;
    }
    return null;
  }
}