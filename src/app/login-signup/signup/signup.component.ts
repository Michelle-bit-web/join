/**
 * SignupComponent provides a user registration form with validation and feedback.
 * It allows users to create an account by entering personal information,
 * validates strong password rules and policy agreement, and stores new users as contacts.
 * 
 * Features:
 * - Reactive form with custom and built-in validators
 * - Password strength and matching validation
 * - Privacy policy agreement enforcement
 * - Success/error messages and loading state management
 * - Automatic contact creation upon successful signup
 * - Redirect to summary page or back to login
 * 
 * Dependencies:
 * - AuthService for user registration
 * - ContactService for storing new user contacts
 * - Router for page navigation
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Contact, ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FooterComponent,
    ReactiveFormsModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})

export class SignupComponent implements OnInit {
  /**
   * The reactive signup form with fields for name, email, password, etc.
   */
  signupform!: FormGroup;

  /**
   * Holds the current error message for display on form failure.
   */
  errorMessage: string = '';

  /**
   * Holds the success message shown after successful registration.
   */
  successMessage: string = '';

  /**
   * Indicates whether a registration request is currently in progress.
   */
  isLoading: boolean = false;

  /**
   * Controls visibility of the password input field.
   */
  showPassword: boolean = false;

  /**
   * Controls visibility of the confirm password input field.
   */
  showConfirmPassword: boolean = false;

  /**
   * Initializes the signup form and injects required services.
   * 
   * @param form FormBuilder for creating the reactive form
   * @param authService Service for user registration
   * @param router Angular Router for navigation
   * @param contactService Service to store new users as contacts
   */
  constructor(
    private form: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private contactService: ContactService,
  ) { }

  /**
   * Lifecycle hook: creates the signup form with all necessary validators.
   */
  ngOnInit(): void {
    this.signupform = this.form.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'"\\|,.<>\/?]).+$/)
      ]],
      confirmPassword: ['', Validators.required],
      privacyPolicy: [false, [Validators.requiredTrue]],
    }, { validators: this.passwordsMatchValidator });
  }

  /**
   * Custom validator to ensure password and confirm password fields match.
   * 
   * @param group The form group containing password fields.
   * @returns A validation error object or null if passwords match.
   */
  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordsDontMatch: true };
  }

  /**
  * Handles the form submission process:
  * Validates input, attempts user registration,
  * saves the new user as a contact, and navigates on success.
  */
  async onSubmit(): Promise<void> {
    if (this.signupform.invalid) {
      this.signupform.markAllAsTouched();
      return;
    }
    this.startLoading();
    const { name, email, password } = this.signupform.value;
    const result = await this.authService.signUp(email, password, name);
    this.saveNewContact(name, email);
    this.handleRegistrationResult(result);
  }

  /**
   * Sets loading state, clears previous messages.
   */
  private startLoading(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Handles the result of the registration process.
   * Shows success message and redirects on success,
   * or displays an error message.
   *
   * @param result - Result object returned from signUp attempt.
   */
  private handleRegistrationResult(
    result: { success: boolean; message?: string }
  ): void {
    if (result.success) {
      this.successMessage = 'Registration successful! You will be redirected...';
      setTimeout(() => {
        this.router.navigate(['/summary']);
      }, 2000);
    } else {
      this.errorMessage = result.message || 'Registration failed';
    }
    this.isLoading = false;
  }

  /**
   * Creates and stores a new contact based on registration input.
   * 
   * @param newName Name entered during registration.
   * @param newEmail Email address entered during registration.
   */
  saveNewContact(newName: string, newEmail: string): void {
    const newContact: Contact = {
      name: newName,
      email: newEmail,
    };
    this.contactService.addContact(newContact);
    this.contactService.selectContact(newContact);
  }

  /**
   * Navigates the user back to the login screen.
   * Uses `skipLocationChange` to avoid adding the redirect to browser history.
   */
  onBackToLogin(): void {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/login']);
    });
    this.isLoading = false;
  }

  /**
   * Returns a user-friendly validation message for the given form field.
   * Delegates error interpretation to specialized helper functions.
   * 
   * @param field - The name of the form control.
   * @returns A descriptive validation message or empty string.
   */
  getValidationMessage(field: string): string {
    if (field === 'confirmPassword') {
      return this.getPasswordMismatchMessage();
    }
    const control = this.signupform.get(field);
    if (!control || !control.touched || !control.errors) return '';
    return this.getFieldErrorMessage(control);
  }

  /**
   * Returns a validation message if the password and confirmation do not match.
   * Only shown if either password field has been touched or changed.
   * 
   * @returns Password mismatch message or empty string.
   */
  private getPasswordMismatchMessage(): string {
    const confirmControl = this.signupform.get('confirmPassword');
    const passwordControl = this.signupform.get('password');
    const mismatch = this.signupform.errors?.['passwordsDontMatch'];
    const touched = confirmControl?.touched || passwordControl?.touched;
    const dirty = confirmControl?.dirty || passwordControl?.dirty;
    if (mismatch && (touched || dirty)) {
      return 'Passwords do not match';
    }
    return '';
  }

  /**
   * Returns a general validation error message for a given form control.
   * 
   * @param control - The FormControl instance to evaluate.
   * @returns The corresponding validation message or an empty string.
   */
  private getFieldErrorMessage(control: AbstractControl): string {
    if (control.errors?.['required']) {
      return 'This field is required';
    }
    if (control.errors?.['email']) {
      return 'Please enter a valid email address';
    }
    if (control.errors?.['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
    }
    if (control.errors?.['pattern']) {
      return 'Password must contain uppercase, numbers and special characters';
    }
    if (control.errors?.['requiredTrue']) {
      return 'You must accept the privacy policy';
    }
    return '';
  }
}