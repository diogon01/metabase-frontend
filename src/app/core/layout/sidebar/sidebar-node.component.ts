/**
 * SidebarNodeComponent — renderiza um nó da árvore de coleções recursivamente.
 *
 * Cada nó:
 *  - Header expansível com nome da collection + count total
 *  - Sub-collections (recursivo)
 *  - Dashboards próprios da collection
 *
 * Coleções sem nenhum dashboard descendente são ocultadas pelo SidebarComponent.
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  input,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { DashboardListItem } from '../../../metabase.service';

export interface CollectionNode {
  id: number | string;
  name: string;
  /** Dashboards direto nessa collection. */
  ownDashboards: DashboardListItem[];
  /** Sub-collections (também CollectionNodes). */
  children: CollectionNode[];
  /** Total recursivo de dashboards no subtree (próprios + descendantes). */
  totalDashboards: number;
}

@Component({
  selector: 'app-sidebar-node',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, SidebarNodeComponent],
  template: `
    <div class="nav-block">
      <button
        type="button"
        class="nav-item nav-item--expandable"
        [class.is-open]="expanded()"
        [style.padding-left.px]="paddingLeft()"
        (click)="toggle()">
        <span class="nav-item-main">
          <mat-icon class="nav-icon">{{ icon() }}</mat-icon>
          <span class="nav-copy">
            <span class="nav-title">{{ node.name }}</span>
            <span class="nav-description">
              {{ node.totalDashboards }}
              {{ node.totalDashboards === 1 ? 'dashboard' : 'dashboards' }}
            </span>
          </span>
        </span>
        <mat-icon class="nav-chevron">expand_more</mat-icon>
      </button>

      @if (expanded()) {
        <div class="sublist">
          <!-- Sub-coleções recursivamente -->
          @for (child of node.children; track child.id) {
            <app-sidebar-node
              [node]="child"
              [depth]="depth + 1"
              [expandedKey]="expandedKey" />
          }

          <!-- Dashboards próprios desta coleção -->
          @for (d of node.ownDashboards; track d.id) {
            <a
              class="sub-item"
              [style.padding-left.px]="paddingLeft() + 22"
              [routerLink]="['/d', d.id]"
              routerLinkActive="is-active">
              <mat-icon class="sub-icon">dashboard</mat-icon>
              <span class="sub-title">{{ d.name }}</span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNodeComponent {
  @Input({ required: true }) node!: CollectionNode;
  @Input() depth = 0;
  /** Chave usada como prefixo no localStorage. */
  @Input() expandedKey = 'sidebar_expanded_collections';

  private _expanded = signal(false);
  expanded = this._expanded.asReadonly();

  ngOnInit() {
    // Restaura estado de expansão do localStorage
    try {
      const json = localStorage.getItem(this.expandedKey);
      const set = new Set(json ? (JSON.parse(json) as string[]) : []);
      if (set.has(String(this.node.id))) this._expanded.set(true);
    } catch {}
  }

  toggle(): void {
    this._expanded.update((v) => !v);
    this.saveState();
  }

  paddingLeft(): number {
    // 14px base + 16px por nível de profundidade
    return 14 + this.depth * 16;
  }

  icon(): string {
    if (this.depth === 0) return 'folder_special';      // root = cliente
    return this.expanded() ? 'folder_open' : 'folder';
  }

  private saveState(): void {
    try {
      const json = localStorage.getItem(this.expandedKey);
      const set = new Set<string>(json ? (JSON.parse(json) as string[]) : []);
      if (this._expanded()) set.add(String(this.node.id));
      else set.delete(String(this.node.id));
      localStorage.setItem(this.expandedKey, JSON.stringify([...set]));
    } catch {}
  }
}
