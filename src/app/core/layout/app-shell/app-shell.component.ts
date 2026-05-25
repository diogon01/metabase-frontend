/**
 * AppShellComponent — layout principal pós-login.
 * mat-sidenav-container com sidebar lateral + header + router-outlet.
 *
 * - Em desktop (>1024px): sidebar fixa lateral (mode='side')
 * - Em mobile: sidebar overlay com backdrop (mode='over')
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ChatPanelComponent } from '../../../chat/chat-panel.component';
import { ChatStore } from '../../../chat/chat.store';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, MatSidenavModule,
    SidebarComponent, HeaderComponent, ChatPanelComponent, BreadcrumbComponent,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        #sidenav
        [mode]="sidenavMode()"
        [opened]="sidenavOpened()"
        fixedInViewport="true"
        class="shell-sidenav">
        <app-sidebar />
      </mat-sidenav>

      <mat-sidenav-content class="shell-content">
        <app-header (menuToggle)="toggleSidebar()" />
        <div class="shell-body" [class.chat-open]="chatOpen()">
          <main class="shell-main">
            <app-breadcrumb class="shell-breadcrumb" [items]="breadcrumbs()" />
            <router-outlet />
          </main>
          @if (chatOpen()) {
            <app-chat-panel class="shell-chat" />
          }
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chat = inject(ChatStore);

  readonly sidenav = viewChild<MatSidenav>('sidenav');

  readonly isMobile = signal(typeof window === 'undefined' ? false : window.innerWidth <= 1024);
  readonly sidenavMode = computed<'side' | 'over'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = computed(() => !this.isMobile());
  readonly chatOpen = this.chat.open;
  readonly breadcrumbs = signal<BreadcrumbItem[]>(this.buildBreadcrumbs(this.router.url));

  constructor() {
    // Em mobile, auto-fecha sidebar ao navegar
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.breadcrumbs.set(this.buildBreadcrumbs(this.router.url));
        if (this.isMobile()) this.sidenav()?.close();
      });
  }

  toggleSidebar(): void {
    this.sidenav()?.toggle();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth <= 1024);
    }
  }

  private buildBreadcrumbs(url: string): BreadcrumbItem[] {
    const path = url.split('?')[0].split('#')[0];
    const segments = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: 'Início', route: ['/'] }];

    if (segments[0] === 'settings') {
      items.push({ label: 'Configurações' });
      if (segments[1] === 'branding') items.push({ label: 'Branding' });
      return items;
    }

    items.push({ label: 'Dashboards', route: ['/'] });

    if (segments[0] === 'd' && segments[1]) {
      items.push({ label: `Dashboard ${segments[1]}`, route: ['/d', segments[1]] });
    }

    if (segments[0] === 'd' && segments[2] === 'tab' && segments[3]) {
      items.push({ label: `Aba ${segments[3]}` });
    }

    return items;
  }
}
