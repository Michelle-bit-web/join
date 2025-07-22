/**
 * ContactListComponent displays a grouped list of contacts (alphabetically),
 * handles contact selection, highlights the current user, and allows triggering
 * the creation of a new contact. It interacts with the ContactService to load,
 * group, and manage contact selection.
 */

import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService, Contact } from '../../services/contact.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss']
})

export class ContactListComponent implements OnInit, OnDestroy {

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
   * and selects the current user’s contact if available.
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
   * @param contacts - The array of contact objects.
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
   * 
   * @param error - The error object returned from the subscription.
   */
  private handleContactsError(error: any): void {
    console.error('Error loading contacts:', error);
  }

  /**
   * Identifying the current user to directly select this user in the contact list.
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
   * Holds the contacts grouped by the first letter of their name.
   */
  groupedContacts: { [key: string]: Contact[] } = {};

  /**
   * The currently selected contact (if any).
   */
  selectedContact: Contact | null = null;

  /**
   * The email of the currently authenticated user.
   */
  currentUserEmail: string | null = null;

  /**
   * The display name of the currently authenticated user.
   */
  currentUser: string | null = null;

  private contactsSubscription: Subscription = new Subscription();
  private selectionSubscription: Subscription = new Subscription();

  /**
   * Emits an event when a contact is selected.
   */
  @Output() contactSelected = new EventEmitter<void>();

  /**
   * Constructor injecting required services.
   * @param contactService - Manages contact data and selection.
   * @param authService - Provides the currently logged-in user's info.
   */
  constructor(
    public contactService: ContactService,
    private authService: AuthService
  ) { }

  /**
   * Unsubscribes from all subscriptions to avoid memory leaks.
   */
  ngOnDestroy(): void {
    this.contactsSubscription.unsubscribe();
    this.selectionSubscription.unsubscribe();
  }

  /**
   * Checks if the given contact matches the current logged-in user.
   * @param contact - The contact to compare with the current user.
   * @returns True if the contact's email matches the user's email.
   */
  isCurrentUser(contact: Contact): boolean {
    return typeof contact.email === 'string' && contact.email === this.currentUserEmail;
  }

  /**
   * Handles selection of a contact.
   * @param contact - The contact to select.
   */
  onContactSelect(contact: Contact): void {
    this.contactService.selectContact(contact);
    this.contactSelected.emit();
  }

  /**
   * Determines if a contact is currently selected.
   * @param contact - The contact to check.
   * @returns True if the contact is selected.
   */
  isSelected(contact: Contact): boolean {
    return this.selectedContact?.id === contact.id;
  }

  /**
   * Triggers the display of the "add contact" form via the ContactService.
   */
  onAddNewContact(): void {
    this.contactService.showAddForm();
  }

  /**
   * Groups contacts alphabetically by the first character of their name.
   * @param contacts - The list of contacts to group.
   * @returns An object with initials as keys and arrays of contacts as values.
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
   * Sorting helper for alphabetical keys.
   */
  keyAsc = (a: any, b: any) => a.key.localeCompare(b.key);

  /**
   * Returns the initials of the given name using ContactService.
   * @param name - The full name of the contact.
   * @returns Initials string.
   */
  getInitials(name: string | undefined): string {
    return this.contactService.getInitials(name);
  }
}
