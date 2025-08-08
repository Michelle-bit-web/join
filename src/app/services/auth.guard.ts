import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, combineLatest, map, filter, take } from 'rxjs';

/**
 * Route guard that prevents access to certain routes
 * unless the user is authenticated.
 * Waits for Firebase Auth to initialize before making routing decisions.
 * 
 * @example
 * // In routing configuration
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [AuthGuard]
 * }
 */
@Injectable({
  providedIn: 'root'
})

export class AuthGuard implements CanActivate {

  /**
   * Constructs the AuthGuard with required dependencies.
   * @param authService - Service to check the user's authentication status
   * @param router - Angular Router used for navigation to login page
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Determines whether a route can be activated based on authentication status.
   * Waits for Firebase Auth to initialize before making the decision to ensure
   * accurate authentication state. If user is not authenticated, redirects to login.
   * 
   * @returns Observable<boolean> that resolves to true if user is logged in,
   *          false if not (after redirecting to login)
   */
  canActivate(): Observable<boolean> {
    return combineLatest([
      this.authService.currentUser$,
      this.authService.authInitialized$
    ]).pipe(
      filter(([user, initialized]) => initialized),
      take(1),
      map(([user, initialized]) => {
        if (user) {
          return true;
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}