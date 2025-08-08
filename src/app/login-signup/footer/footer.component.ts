/**
 * FooterComponent renders the application's footer section.
 * 
 * It includes navigation links or additional informational elements
 * and is typically displayed at the bottom of the layout.
 * 
 * This component is purely presentational and contains no internal logic.
 */
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [ RouterModule ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})

export class FooterComponent {}