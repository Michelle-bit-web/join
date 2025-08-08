/**
 * ContactsComponent is the main container component responsible for managing
 * the display and interactions of the contact list, contact form, and contact details.
 * It handles responsive animations, shows/hides overlays and toasts, and routes events
 * between child components using the ContactService.
 */

import { Component } from '@angular/core';
import { ContactListComponent } from './contact-list/contact-list.component';
import { ContactDetailsComponent } from './contact-details/contact-details.component';
import { ContactFormComponent } from './contact-form/contact-form.component';
import { ContactService, Contact } from './../services/contact.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate, AnimationEvent } from '@angular/animations';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [
    CommonModule,
    ContactListComponent,
    ContactDetailsComponent,
    ContactFormComponent,
  ],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss',
  animations: [
    trigger('slideInOut', [
      transition('void => right', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('250ms ease-in-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition('right => void', [
        animate('250ms ease-in-out', style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
      transition('void => bottom', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('250ms ease-in-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition('bottom => void', [
        animate('250ms ease-in-out', style({ transform: 'translateY(100%)', opacity: 0 })),
      ]),
    ]),
  ],
})

export class ContactsComponent {

  /**
   * Current direction of the animation for overlay transitions.
   * It switches between 'right' for desktop and 'bottom' for mobile views.
   */
  animationDirection: 'right' | 'bottom' = 'right';

  /**
   * Whether the toast message is currently visible.
   */
  toastMessageVisible = false;

  /**
   * Controls the current animation state of the toast.
   */
  toastAnimationState: 'right' | 'bottom' | 'void' = 'void';

  /**
   * Whether the background overlay is visible behind the form or detail view.
   */
  backgroundVisible = false;

  /**
   * Observable that determines whether the contact form should be shown.
   */
  showForm$: Observable<boolean>;

  /**
   * Controls whether the contact detail view is visible.
   */
  showContactDetails = false;

  /**
   * Initializes the component and subscribes to the form visibility observable.
   * Also sets up the resize event listener to dynamically adjust the animation direction.
   * 
   * @param contactService - The service that manages contact data and UI state.
   */
  constructor(private contactService: ContactService) {
    this.showForm$ = this.contactService.showForm$;
  }

  /**
   * Lifecycle hook: Sets initial animation direction and attaches resize listener.
   */
  ngOnInit() {
    this.setAnimationDirection(window.innerWidth);
    window.addEventListener('resize', () => {
      this.setAnimationDirection(window.innerWidth);
    });
  }

  /**
   * Called when a new contact is added from the form.
   * It selects the new contact, shows the contact detail view, and triggers a toast.
   * 
   * @param newContact - The newly added contact.
   */
  onContactAdded(newContact: Contact) {
    this.contactService.selectContact(newContact);
    this.onContactSelected();
    this.startMessageAnimation();
  }

  /**
   * Determines the animation direction based on screen width.
   * @param width - The current window width.
   */
  setAnimationDirection(width: number) {
    this.animationDirection = width < 1000 ? 'bottom' : 'right';
  }

  /**
   * Starts the toast message animation and automatically hides it after 3 seconds.
   */
  startMessageAnimation() {
    this.toastAnimationState = this.animationDirection;
    this.toastMessageVisible = true;
    setTimeout(() => {
      this.toastMessageVisible = false;
      this.toastAnimationState = 'void';
    }, 3000);
  }

  /**
   * Handles the event emitted by the contact form when it is closed.
   * @param event - A string indicating the close state (e.g., 'closed').
   */
  removeBackground(event: string) {
    if (event === 'closed') {
      this.backgroundVisible = false;
    }
  }

  /**
   * Called when the slide-in animation of an overlay is completed.
   * Delays showing the background overlay to prevent flickering.
   * 
   * @param event - The animation transition event.
   */
  onOverlayAnimationDone(event: AnimationEvent) {
    if (event.toState === 'right' || event.toState === 'bottom') {
      setTimeout(() => {
        this.backgroundVisible = true;
      }, 50);
    }
  }

  /**
   * Handles the back button in mobile view, hiding the contact detail component.
   */
  onBackToList() {
    this.showContactDetails = false;
  }

  /**
   * Triggers the display of the contact detail component.
   */
  onContactSelected() {
    this.showContactDetails = true;
  }

  /**
   * Hides the contact detail view if no contact is selected and the screen is small.
   */
  onNoContactVisible() {
    if (window.innerWidth < 768) {
      this.showContactDetails = false;
    }
  }
}