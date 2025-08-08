import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, combineLatest, map, filter, take } from 'rxjs';

/**
 * Route guard that prevents access to certain routes
 * unless the user is authenticated.
 */
@Injectable({
  providedIn: 'root'
})

export class AuthGuard implements CanActivate {

  /**
   * Constructs the AuthGuard.
   * @param authService - Service to check the user's authentication status
   * @param router - Angular Router used for navigation
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Determines whether a route can be activated.
   * If the user is not authenticated, redirects to the login page.
   * Waits for Firebase Auth to initialize before making the decision.
   *
   * @returns Observable<boolean> that resolves to true if user is logged in
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