import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, onAuthStateChanged, updateProfile, deleteUser } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthErrorService } from './auth-error.service';

/**
 * Interface for user data stored in Firestore.
 */
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

/**
 * Authentication service for handling user operations and state tracking.
 */
@Injectable({
  providedIn: 'root'
})

export class AuthService {
  /**
   * BehaviorSubject that holds the current authenticated user state.
   * @private
   * @type {BehaviorSubject<User | null>}
   */
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  /**
   * BehaviorSubject that tracks whether authentication has been initialized.
   * @private
   * @type {BehaviorSubject<boolean>}
   */
  private authInitialized = new BehaviorSubject<boolean>(false);
  
  /**
   * Observable stream of the current authenticated user.
   * @public
   * @type {Observable<User | null>}
   */
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  
  /**
   * Observable stream indicating whether authentication has been initialized.
   * @public
   * @type {Observable<boolean>}
   */
  public authInitialized$: Observable<boolean> = this.authInitialized.asObservable();

  /**
   * Creates an instance of AuthService.
   * @param {Auth} auth - Firebase Authentication service
   * @param {Firestore} firestore - Firebase Firestore database service
   * @param {Router} router - Angular Router service for navigation
   * @param {AuthErrorService} authErrorService - Service for handling authentication error messages
   */
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private authErrorService: AuthErrorService
  ) {
    this.initializeAuthListener();
  }

  /**
   * Initializes the Firebase authentication state listener.
   * Updates the current user subject when authentication state changes.
   * @private
   * @returns {void}
   */
  private initializeAuthListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
      if (!this.authInitialized.value) {
        this.authInitialized.next(true);
      }
    });
  }

  /**
   * Registers a new user with email, password, and display name.
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {string} displayName - User's display name
   * @returns {Promise<{ success: boolean; message?: string }>} Result object indicating success/failure and optional error message
   */
  async signUp(email: string, password: string, displayName: string): Promise<{ success: boolean; message?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName });
      await this.saveUserData(user, displayName);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: this.authErrorService.getErrorMessage(error.code) };
    }
  }

  /**
   * Saves user data to Firestore after successful registration.
   * @private
   * @param {User} user - The Firebase user object
   * @param {string} displayName - The user's display name
   * @returns {Promise<void>} Promise that resolves when user data is saved
   */
  private async saveUserData(user: User, displayName: string): Promise<void> {
    const userData: UserData = {
      uid: user.uid, email: user.email!,
      displayName: displayName, createdAt: new Date()
    };
    await setDoc(doc(this.firestore, 'users', user.uid), userData);
  }

  /**
   * Signs in a user with email and password.
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{ success: boolean; message?: string }>} Result object indicating success/failure and optional error message
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: this.authErrorService.getErrorMessage(error.code) };
    }
  }

  /**
   * Signs in as a guest user.
   * Attempts to sign in with predefined guest credentials, creates guest account if it doesn't exist.
   * @returns {Promise<{ success: boolean; message?: string }>} Result object indicating success/failure and optional error message
   */
  async signInAsGuest(): Promise<{ success: boolean; message?: string }> {
    try {
      await signInWithEmailAndPassword(this.auth, 'guest@join.com', 'Guest123!');
      return { success: true };
    } catch (error: any) {
      return await this.createGuestUser();
    }
  }

  /**
   * Creates a new guest user account with predefined credentials.
   * @private
   * @returns {Promise<{ success: boolean; message?: string }>} Result object indicating success/failure and optional error message
   */
  private async createGuestUser(): Promise<{ success: boolean; message?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, 'guest@join.com', 'Guest123!');
      const user = userCredential.user;
      await updateProfile(user, { displayName: 'Guest User' });
      await this.saveUserData(user, 'Guest User');
      return { success: true };
    } catch (createError: any) {
      return { success: false, message: this.authErrorService.getErrorMessage(createError.code) };
    }
  }

  /**
   * Signs out the currently authenticated user.
   * Redirects to login page after successful sign out.
   * @returns {Promise<void>} Promise that resolves when user is signed out
   */
  async signOutUser(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  /**
   * Retrieves the current user's data from Firestore.
   * @returns {Promise<UserData | null>} User data from Firestore or null if user not found
   */
  async getCurrentUserData(): Promise<UserData | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;
    const userDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    return userDoc.exists() ? userDoc.data() as UserData : null;
  }

  /**
   * Checks whether a user is currently authenticated.
   * @returns {boolean} True if user is logged in, false otherwise
   */
  isLoggedIn(): boolean {
    return this.auth.currentUser !== null;
  }

  /**
   * Gets the current authenticated Firebase user.
   * @returns {User | null} Current Firebase user object or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Deletes the currently authenticated user account.
   * @returns {Promise<{ success: boolean; message?: string }>} Result object indicating success/failure and optional error message
   */
  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    const user = this.auth.currentUser;
    if (!user) {
      return { success: false, message: 'No user is currently signed in.' };
    }
    try {
      await deleteUser(user);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: this.authErrorService.getErrorMessage(error.code) };
    }
  }
}