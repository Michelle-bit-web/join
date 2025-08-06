/**
 * LoginComponent handles user authentication via email/password or guest login.
 * It includes animations for a login screen logo, touch device detection,
 * form validation, and loading/error state management.
 * 
 * Features:
 * - Animated login transition for first-time visits
 * - Reactive form with validation for email and password
 * - Login via credentials or guest access
 * - Displays validation and error messages
 * - Supports touch device detection and password visibility toggle
 * 
 * Dependencies:
 * - AuthService for user authentication
 * - FormBuilder (Reactive Forms) for login form creation
 * - Angular Router for navigation after successful login
 */
import { Component } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { LoginHeaderComponent } from '../login-header/login-header.component';
import {
  trigger,
  state,
  style,
  transition,
  animate,
  group
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    LoginHeaderComponent,
    FooterComponent,
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('fadeOutWrapper', [
      state('start', style({
        opacity: 1
      })),
      state('moved', style({
        opacity: 0
      })),
      transition('start => moved', [
        animate('2s 0.7s ease-in-out')
      ])
    ])
  ]
})

export class LoginComponent {
  /**
   * State of the logo animation. `'start'` before animation, `'moved'` after.
   */
  logoState: 'start' | 'moved' = 'start';

  /**
   * Indicates whether the page has finished loading (used for triggering animation).
   */
  pageLoaded = false;

  /**
   * Reactive form group for email and password login fields.
   */
  loginForm!: FormGroup;

  /**
   * Displays the current error message if login fails.
   */
  errorMessage: string = '';

  /**
   * Shows whether a login request is currently in progress.
   */
  isLoading: boolean = false;

  /**
   * Indicates whether the password should be shown in plain text.
   */
  showPassword: boolean = false;

  /**
   * Detects if the device supports touch input.
   */
  isTouchDevice = false;

  /**
   * Initializes the LoginComponent and injects required services.
   * 
   * @param fb FormBuilder instance for creating the login form
   * @param authService Service for handling authentication
   * @param router Router for navigation after login
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) { }

  /**
   * Lifecycle hook: initializes the login form, touch detection,
   * and triggers logo animation on first visit.
   */
  ngOnInit(): void {
    this.initializeForm();
    this.checkIfTouchDevice();
    this.initializeAnimation();
  }

  /**
   * Checks whether the user's device is a touch-enabled device.
   */
  private checkIfTouchDevice(): void {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Initializes the reactive login form with validators.
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Triggers a delayed logo animation if it hasn't already occurred.
   * Stores a flag in session storage to prevent repeat animation.
   */
  private initializeAnimation(): void {
    if (!sessionStorage.getItem('logoMoved')) {
      this.runLogoAnimationWithDelay();
    } else {
      this.logoState = 'moved';
    }
  }

  /**
   * Performs the delayed logo animation and sets the session flag.
   */
  private runLogoAnimationWithDelay(): void {
    setTimeout(() => {
      this.pageLoaded = true;
      this.logoState = 'moved';
      sessionStorage.setItem('logoMoved', 'true');
    }, 100);
  }

  /**
   * Handles user login using form credentials.
   * Displays a loading indicator, validates form input,
   * and navigates on success or shows an error message.
   */
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.startLoading();
    const { email, password } = this.loginForm.value;
    const result = await this.authService.signIn(email, password);
    this.handleAuthResult(result, 'Login failed');
  }

  /**
   * Logs in as a guest user using the AuthService.
   * Navigates to the summary page on success or shows an error.
   */
  async onGuestLogin(): Promise<void> {
    this.startLoading();
    const result = await this.authService.signInAsGuest();
    this.handleAuthResult(result, 'Guest login failed');
  }

  /**
   * Starts loading state and resets the error message.
   */
  private startLoading(): void {
    this.isLoading = true;
    this.errorMessage = '';
  }

  /**
   * Handles the result of an authentication attempt.
   * Navigates on success or displays a fallback error message.
   *
   * @param result - The result object returned from the auth service.
   * @param fallbackError - The fallback error message if no message is provided.
   */
  private handleAuthResult(
    result: { success: boolean; message?: string },
    fallbackError: string
  ): void {
    if (result.success) {
      this.router.navigate(['/summary']);
    } else {
      this.errorMessage = result.message || fallbackError;
    }
    this.isLoading = false;
  }

  /**
   * Returns a user-friendly validation message for a given form field.
   * 
   * @param field The name of the form control (e.g. 'email' or 'password')
   * @returns A string message describing the validation issue.
   */
  getValidationMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['minlength']) return 'Please choose at least 8 characters';
    return '';
  }

  /**
   * Lifecycle hook: resets the loading state when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.isLoading = false;
  }
}
