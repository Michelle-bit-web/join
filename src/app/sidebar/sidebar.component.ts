import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

/**
 * Sidebar component for application navigation.
 * Displays navigation links and checks the user's authentication status.
 */
@Component({
  selector: 'app-sidebar',
  imports: [
    RouterModule,
    CommonModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})

export class SidebarComponent {
  /**
   * Constructs the SidebarComponent.
   * @param authService - Service for managing user authentication
   */
  constructor(private authService: AuthService) {}

  /**
   * Checks whether the user is currently logged in.
   * @returns True if the user is authenticated, otherwise false
   */
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}