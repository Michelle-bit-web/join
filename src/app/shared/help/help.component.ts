/**
 * Component representing the Help page.
 * 
 * Displays help or support-related information to the user and 
 * provides a way to navigate back to the previous route using 
 * the NavigationHistoryService.
 */

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavigationHistoryService } from '../../services/navigation-history.service';

@Component({
  selector: 'app-help',
  imports: [RouterModule],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})

export class HelpComponent {

  /**
   * Creates an instance of HelpComponent.
   *
   * @param navigationService - Service used to navigate back in the routing history.
   */
  constructor(private navigationService: NavigationHistoryService) {}

  /**
   * Navigates back to the previous route using the NavigationHistoryService.
   */
  goBack(): void {
    this.navigationService.navigateBack();
  }
}