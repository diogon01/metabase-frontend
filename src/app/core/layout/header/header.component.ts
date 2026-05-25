import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../../theming/theme.service';
import { ChatStore } from '../../../chat/chat.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule],
  template: `
    <mat-toolbar class="header-toolbar" role="banner">
      <button mat-icon-button type="button" class="menu-btn"
              aria-label="Abrir menu" (click)="menuToggle.emit()">
        <mat-icon>menu</mat-icon>
      </button>

      <div class="title-group">
        <h1 class="page-title">{{ theme.brand() }}</h1>
      </div>

      <div class="header-spacer"></div>

      <button
        mat-icon-button
        type="button"
        class="chat-toggle-btn"
        [class.is-active]="chat.open()"
        (click)="chat.toggleOpen()"
        title="Assistente IA">
        <mat-icon>smart_toy</mat-icon>
      </button>

      @if (auth.user(); as user) {
        <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-trigger">
          <div class="trigger-content">
            <div class="user-avatar">{{ initial(user) }}</div>
            <span class="user-name">{{ displayName(user) }}</span>
            <mat-icon class="expand-icon">expand_more</mat-icon>
          </div>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="user-menu-header">
            <strong>{{ displayName(user) }}</strong>
            <small>{{ user.email }}</small>
          </div>
          <mat-divider />
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Sair</span>
          </button>
        </mat-menu>
      }
    </mat-toolbar>
  `,
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly chat = inject(ChatStore);
  @Output() menuToggle = new EventEmitter<void>();

  displayName(u: { common_name?: string; first_name?: string; email?: string }): string {
    return u.common_name || u.first_name || u.email || '';
  }

  initial(u: { common_name?: string; first_name?: string; email?: string }): string {
    const n = this.displayName(u);
    return (n[0] || '?').toUpperCase();
  }

  logout(): void {
    this.auth.logout();
  }
}
