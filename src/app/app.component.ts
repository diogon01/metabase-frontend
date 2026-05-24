/**
 * AppComponent — shell minimalista. Apenas <router-outlet>.
 * Tudo o que era header/nav/filters/dashboard migrou pra DashboardsPageComponent.
 * No Phase 3c o shell vai ganhar mat-sidenav-container (sidebar + header).
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
