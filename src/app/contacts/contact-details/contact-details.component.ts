import { CommonModule } from '@angular/common';
import {
  trigger,
  style,
  transition,
  animate,
} from '@angular/animations';
import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { ContactService, Contact } from '../../services/contact.service';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UploadService } from '../../services/upload.service';

/**
 * ContactDetailsComponent displays detailed information about a selected contact
 * with smooth animations, mobile responsiveness, and edit/delete functionality.
 * Features slide-in animations, mobile menu support, and contact image display.
 *
 * @example
 * <app-contact-details
 *   (backToList)="handleBackToList()"
 *   (noContactVisible)="handleNoContact()">
 * </app-contact-details>
 */
@Component({
  selector: 'app-contact-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-details.component.html',
  styleUrl: './contact-details.component.scss',
  animations: [
    trigger('slideInFromRight', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateX(0%)', opacity: 1 })
        ),
      ]),
      transition(':increment', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateX(0%)', opacity: 1 })
        ),
      ]),
    ],),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '200ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})

export class ContactDetailsComponent implements OnInit, OnDestroy {
  /** Flag to control contact visibility with animations */
  contactVisible = false;
  
  /** The currently displayed contact object */
  contact?: Contact;
  
  /** Animation state counter for triggering enter animations */
  animationState = 0;
  
  /** Flag indicating if contact is being deleted */
  isDeleting = false;
  
  /** Flag indicating if contact is being edited */
  isEditing = false;
  
  /** Flag for mobile menu visibility */
  menuOpen = false;
  
  /** Flag for mobile layout detection */
  isMobile = window.innerWidth < 768;
  
  /** Subscription to contact changes */
  private subscription?: Subscription;
  
  /** Flag to track first load for animation purposes */
  firstLoad = true;

  /** Event emitted when user wants to return to contact list */
  @Output() backToList = new EventEmitter<void>();
  
  /** Event emitted when no contact is visible */
  @Output() noContactVisible = new EventEmitter<void>();

  /**
   * Constructor injecting required services for contact management and DOM manipulation.
   * @param contactService - Service for managing contact data and operations
   * @param elementRef - Reference to component's DOM element for menu detection
   * @param uploadService - Service for retrieving contact images
   */
  constructor(
    private contactService: ContactService,
    private elementRef: ElementRef,
    private uploadService: UploadService
  ) { }

  /**
   * Handles clicks outside the mobile menu to close it automatically.
   * Prevents menu from staying open when user clicks elsewhere.
   *
   * @param event - The document click event
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const mobileMenu = this.elementRef.nativeElement.querySelector('.mobile-menu');
    const mobileOptions = this.elementRef.nativeElement.querySelector('.mobile-options-btn');
    if (
      this.menuOpen &&
      !mobileMenu?.contains(target) &&
      !mobileOptions?.contains(target)
    ) {
      this.menuOpen = false;
    }
  }

  /**
   * Handles window resize events to adjust mobile layout and menu behavior.
   * Closes mobile menu when switching from mobile to desktop view.
   *
   * @param event - The window resize event
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    this.isMobile = width < 781;
    if (!this.isMobile && this.menuOpen) {
      this.menuOpen = false;
    }
  }

  /**
   * Toggles the mobile menu visibility when on mobile devices.
   * Only functions in mobile view to prevent desktop interference.
   */
  toggleMobileMenu() {
    if (this.isMobile) {
      this.menuOpen = !this.menuOpen;
    }
  }

  /**
   * Determines if animations should be disabled during certain operations.
   * Prevents animation conflicts during delete or edit operations.
   *
   * @returns True if animations should be disabled
   */
  get isAnimationDisabled(): boolean {
    return this.isDeleting || this.isEditing;
  }

  /**
   * Initializes the component and sets up contact data subscriptions.
   * Subscribes to both selected contact and full contact list for data consistency.
   */
  ngOnInit(): void {
    this.subscribeToSelectedContact();
  }

  /**
   * Subscribes to changes in the selected contact and all contacts.
   * Ensures contact data stays synced and handles visibility/animation transitions.
   */
  private subscribeToSelectedContact(): void {
    this.subscription = combineLatest([
      this.contactService.selectedContact$,
      this.contactService.getContacts(),
    ])
      .pipe(map(([selected, all]) => this.resolveSelectedContact(selected, all)))
      .subscribe({
        next: (contact) => this.handleContactChange(contact),
      });
  }

  /**
   * Matches the selected contact with the full contact list to ensure it still exists.
   * Handles cases where a contact might be deleted while being viewed.
   *
   * @param selected - The currently selected contact from the service
   * @param all - Array of all available contacts from the service
   * @returns The resolved contact object or null if not found
   */
  private resolveSelectedContact(
    selected: Contact | null,
    all: Contact[]
  ): Contact | null {
    if (!selected) return null;
    return all.find((c) => c.id === selected.id) || selected;
  }

  /**
   * Handles contact changes, manages visibility state, and triggers animations.
   * Coordinates the display logic when contacts are selected, changed, or cleared.
   *
   * @param contact - The resolved contact to display, or null if none selected
   */
  private handleContactChange(contact: Contact | null): void {
    const wasEmpty = !this.contact;
    const isContactChange = contact && contact !== this.contact;
    this.contact = contact || undefined;
    if (!contact) {
      this.resetContactState();
      return;
    }
    if (isContactChange) {
      this.prepareContactTransition(wasEmpty);
    }
  }

  /**
   * Resets component state when no contact is selected.
   * Clears flags and emits visibility change event with slight delay.
   */
  private resetContactState(): void {
    this.isDeleting = false;
    this.isEditing = false;
    this.contactVisible = false;
    setTimeout(() => {
      this.noContactVisible.emit();
    }, 100);
  }

  /**
   * Prepares animation and visibility transition when a new contact is selected.
   * Handles the smooth transition between different contacts or from empty state.
   *
   * @param wasEmpty - Indicates if the previous state had no contact selected
   */
  private prepareContactTransition(wasEmpty: boolean): void {
    this.isEditing = false;
    if (!this.isDeleting) {
      this.contactVisible = false;
      setTimeout(() => {
        this.contactVisible = true;
        this.animationState++;
        this.firstLoad = false;
      }, 10);
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
   * Opens the edit form for the currently displayed contact.
   * Sets editing state and triggers the contact form service.
   */
  onEditContact(): void {
    if (this.contact) {
      this.isEditing = true;
      this.contactService.showEditForm(this.contact);
      this.menuOpen = false;
    }
  }

  /**
   * Deletes the current contact and clears the selection state.
   * Sets deleting flag to prevent animation conflicts during deletion.
   */
  onDeleteContact(): void {
    if (this.contact?.id) {
      this.isDeleting = true;
      this.menuOpen = false;
      if(this.contact.imageKey && this.contact.imageKey.length > 0) {
        this.uploadService.deleteImage(this.contact.imageKey);
      }
      this.contactService.deleteContact(this.contact.id);
      this.contactService.clearSelection();
    }
  }

  /**
   * Generates initials from a contact's name using the contact service.
   * Provides consistent initial generation across the application.
   *
   * @param name - The contact's full name
   * @returns String containing the person's initials
   */
  getInitials(name?: string): string {
    return this.contactService.getInitials(name);
  }

  /**
   * Gets the color associated with a contact's name for consistent theming.
   * Uses contact service to ensure consistent colors across components.
   *
   * @param name - The contact's name for color generation
   * @returns Hex color code string, defaults to gray if no name provided
   */
  getContactColor(name?: string): string {
    if (!name) return '#9E9E9E';
    return this.contactService.getContactColor(name);
  }

  /**
   * Closes the contact details view with animation.
   * Sets visibility flag to trigger exit animations.
   */
  closeContactDetails(): void {
    this.contactVisible = false;
  }

  /**
   * Emits the event to return to the contact list view.
   * Used for mobile navigation and parent component communication.
   */
  onBackToList() {
    this.backToList.emit();
  }

  /**
   * Retrieves the contact's profile image from localStorage using their imageKey.
   * Returns null if no image is associated with the contact.
   *
   * @param contact - The contact object containing the imageKey
   * @returns Base64 encoded image string or null if no image exists
   */
  getContactImage(contact: Contact): string | null {
    if (contact.imageKey) {
      return this.uploadService.getContactImage(contact.imageKey);
    }
    return null;
  }
}