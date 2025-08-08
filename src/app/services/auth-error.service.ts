import { Injectable } from '@angular/core';

/**
 * Service for handling authentication error messages.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthErrorService {

  constructor() { }

  /**
   * Maps Firebase Auth error codes to human-readable error messages.
   * @param errorCode - Firebase Auth error code
   * @returns A string describing the error
   */
  getErrorMessage(errorCode: string): string {
    const errorMessages = this.getErrorMessageMap();
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }

  private getErrorMessageMap(): { [key: string]: string } {
    return {
      'auth/user-not-found': 'User not found.',
      'auth/wrong-password': 'Wrong password.',
      'auth/email-already-in-use': 'Email address is already in use.',
      'auth/weak-password': 'Password is too weak.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'User account has been disabled.',
      'auth/too-many-requests': 'Too many login attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.'
    };
  }
}
