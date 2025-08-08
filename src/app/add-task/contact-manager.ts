import { Injectable } from '@angular/core';
import { Contact, ContactService } from '../services/contact.service';
import { CategoryManager } from './category-manager';

/**
 * ContactManager handles all contact-related operations for the AddTaskComponent.
 * Manages contact selection, display, dropdown functionality, and provides contact utilities.
 * Supports multiple contact selection with duplicate prevention and visual feedback.
 * 
 * @example
 * // Inject and use in component
 * constructor(private contactManager: ContactManager) {}
 * 
 * // Select/deselect a contact
 * this.contactManager.selectContact(contact);
 * 
 * // Check if contact is selected
 * if (this.contactManager.isContactSelected(contact)) { ... }
 */
@Injectable({
  providedIn: 'root'
})

export class ContactManager {
  /** Array of currently selected contacts for task assignment */
  private selectedContacts: Contact[] = [];
  
  /** Current state of the contact dropdown visibility */
  private showContactDropdown: boolean = false;

  /**
   * Constructor injecting required services for contact operations.
   * @param contactService - Service for contact data and utility functions
   * @param categoryManager - Category manager for coordinated dropdown behavior
   */
  constructor(
    private contactService: ContactService,
    public categoryManager: CategoryManager
  ) {}

  /**
   * Gets all currently selected contacts.
   * @returns Array of selected contact objects
   */
  getSelectedContacts(): Contact[] {
    return this.selectedContacts;
  }

  /**
   * Sets the selected contacts array with duplicate filtering.
   * Ensures no duplicate contacts based on ID comparison.
   * 
   * @param contacts - Array of contacts to set as selected
   */
  setSelectedContacts(contacts: Contact[]): void {
    const uniqueContacts = contacts.filter((contact, index, self) => 
      index === self.findIndex(c => c.id === contact.id)
    );
    this.selectedContacts = uniqueContacts;
  }

  /**
   * Gets the current contact dropdown visibility state.
   * @returns True if dropdown is visible, false otherwise
   */
  getShowContactDropdown(): boolean {
    return this.showContactDropdown;
  }

  /**
   * Sets the contact dropdown visibility state.
   * @param value - True to show dropdown, false to hide it
   */
  setShowContactDropdown(value: boolean): void {
    this.showContactDropdown = value;
  }

  /**
   * Toggles the contact dropdown visibility state.
   * Opens dropdown if closed, closes if open.
   */
  toggleDropdown(): void {
    this.showContactDropdown = !this.showContactDropdown;
  }

  /**
   * Toggles the selection state of a contact.
   * Adds contact to selection if not selected, removes if already selected.
   * 
   * @param contact - The contact to select or deselect
   */
  selectContact(contact: Contact): void {
    const index = this.selectedContacts.findIndex(c => c.id === contact.id);
    if (index === -1) {
      this.selectedContacts.push(contact);
    } else {
      this.selectedContacts.splice(index, 1);
    }
  }

  /**
   * Checks if a specific contact is currently selected.
   * Used for UI highlighting and selection state management.
   * 
   * @param contact - The contact to check selection status for
   * @returns True if the contact is selected, false otherwise
   */
  isContactSelected(contact: Contact): boolean {
    return this.selectedContacts.some(c => c.id === contact.id);
  }

  /**
   * Returns the placeholder text to display in the contact selector.
   * Provides consistent messaging for the contact selection UI.
   * 
   * @returns Standard placeholder text for contact selection
   */
  getSelectedContactsText(): string {
    return 'Select contacts to assign';
  }

  /**
   * Returns the initials for a contact using the contact service.
   * Ensures consistent initial generation across the application.
   * 
   * @param contact - The contact to generate initials for
   * @returns String containing the contact's initials
   */
  getContactInitials(contact: Contact): string {
    return this.contactService.getInitials(contact.name);
  }

  /**
   * Returns the color associated with a contact using the contact service.
   * Provides consistent color theming for contact display.
   * 
   * @param contact - The contact to get color for
   * @returns Hex color code string for the contact
   */
  getContactColor(contact: Contact): string {
    return this.contactService.getContactColor(contact.name);
  }

  /**
   * Formats remaining contact names into a comma-separated string.
   * Used for displaying overflow contacts in a compact format.
   * 
   * @param remainingContacts - Array of contacts to format
   * @returns Comma-separated string of contact names
   */
  getRemainingContactNames(remainingContacts: Contact[]): string {
    return remainingContacts.map((contact) => contact.name).join(', ');
  }

  /**
   * Clears all selected contacts and resets dropdown state to defaults.
   * Used when resetting the form or clearing all selections.
   */
  clearAll(): void {
    this.selectedContacts = [];
    this.showContactDropdown = false;
  }
}