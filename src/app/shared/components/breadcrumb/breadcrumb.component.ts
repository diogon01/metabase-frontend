import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface BreadcrumbItem {
  label: string;
  route?: string | unknown[];
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      @for (item of items; track item.label; let last = $last) {
        @if (!last && item.route) {
          <a [routerLink]="item.route">{{ item.label }}</a>
        } @else {
          <span [class.breadcrumb-current]="last">{{ item.label }}</span>
        }

        @if (!last) {
          <mat-icon class="breadcrumb-sep">chevron_right</mat-icon>
        }
      }
    </nav>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      min-width: 0;
      color: var(--app-breadcrumb-text);
      font: var(--text-caption);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      min-width: 0;
      overflow: hidden;
    }

    a,
    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    a {
      color: var(--app-breadcrumb-link);
      text-decoration: none;
      transition: color var(--fd-transition-fast) ease;
    }

    a:hover {
      color: var(--app-breadcrumb-link-hover);
      text-decoration: underline;
    }

    a:focus-visible {
      border-radius: var(--fd-radius-sm);
      outline: 2px solid var(--app-breadcrumb-focus-ring);
      outline-offset: 3px;
    }

    .breadcrumb-sep {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: var(--app-breadcrumb-separator);
      font-size: 1rem;
    }

    .breadcrumb-current {
      color: var(--app-breadcrumb-current);
      font-weight: 700;
    }
  `],
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
