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
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private authInitialized = new BehaviorSubject<boolean>(false);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  public authInitialized$: Observable<boolean> = this.authInitialized.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private authErrorService: AuthErrorService
  ) {
    this.initializeAuthListener();
  }

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

  private async saveUserData(user: User, displayName: string): Promise<void> {
    const userData: UserData = {
      uid: user.uid, email: user.email!,
      displayName: displayName, createdAt: new Date()
    };
    await setDoc(doc(this.firestore, 'users', user.uid), userData);
  }

  /**
   * Signs in a user with email and password.
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
   */
  async signInAsGuest(): Promise<{ success: boolean; message?: string }> {
    try {
      await signInWithEmailAndPassword(this.auth, 'guest@join.com', 'Guest123!');
      return { success: true };
    } catch (error: any) {
      return await this.createGuestUser();
    }
  }

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
   */
  async signOutUser(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  /**
   * Retrieves the current user's data from Firestore.
   */
  async getCurrentUserData(): Promise<UserData | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;
    const userDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    return userDoc.exists() ? userDoc.data() as UserData : null;
  }

  /**
   * Checks whether a user is currently authenticated.
   */
  isLoggedIn(): boolean {
    return this.auth.currentUser !== null;
  }

  /**
   * Gets the current authenticated Firebase user.
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Deletes the currently authenticated user account.
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