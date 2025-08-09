/**
 * LoginHeaderComponent displays the animated header section for the login page.
 * It includes a fade-in logo animation that only plays once per session.
 * 
 * Features:
 * - Animated logo using Angular animation triggers
 * - Touch device detection (optional extension)
 * - Session-based control to play animation only once per session
 * 
 * This component is purely visual and does not manage any business logic.
 */
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-login-header',
  imports: [ RouterModule ],
  templateUrl: './login-header.component.html',
  styleUrl: './login-header.component.scss',
  animations: [
    trigger('fadeOut', [
      state('start', style({
        opacity: 0
      })),
      state('appear', style({
        opacity: 1
      })),
      transition('start => appear', [
        animate('1.1s 0.7s ease-in-out')
      ])
    ])
  ]
})

export class LoginHeaderComponent {
  /**
   * The current state of the logo animation.
   * - `'start'`: hidden state with opacity 0
   * - `'appear'`: visible state with opacity 1
   */
  logoState: 'start' | 'appear' = 'start';

  /**
   * Indicates whether the current device supports touch input.
   * Currently unused, but reserved for future enhancements.
   */
  isTouchDevice: boolean = false;

  /**
   * Lifecycle hook that initializes the animation state when the component loads.
   */
  ngOnInit(): void {
    this.initializeAnimation();
  }

  /**
   * Triggers the logo fade-in animation if it hasn’t already played during the session.
   * Stores a flag in sessionStorage to prevent the animation from repeating.
   */
  initializeAnimation(): void {
    if (!sessionStorage.getItem('logoAppeared')) {
      setTimeout(() => {
        this.logoState = 'appear';
        sessionStorage.setItem('logoAppeared', 'true');
      }, 100);
    } else {
      this.logoState = 'appear';
    }
  }
}