/**
 * SidebarComponent — brand bar + árvore de coleções (clientes) com dashboards.
 *
 * Estratégia:
 *  - Fetch collections + dashboards em paralelo
 *  - Constrói árvore baseada em parent_id (cliente é raiz, sub-coleções dentro)
 *  - Agrupa dashboards em sua collection
 *  - Coleções sem nenhum dashboard descendente são ocultadas
 *  - Dashboards sem collection_id vão em "Geral" no topo
 *  - Render recursivo via SidebarNodeComponent
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import {
  CollectionItem,
  DashboardListItem,
  MetabaseService,
} from '../../../metabase.service';
import { ThemeService } from '../../../theming/theme.service';
import { AuthService } from '../../auth/auth.service';
import { CollectionNode, SidebarNodeComponent } from './sidebar-node.component';
import { RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, SidebarNodeComponent],
  template: `
    <aside class="sidebar">
      <a routerLink="/" class="brand">
        <div class="brand-mark">
          @if (theme.hasLogoImage()) {
            <img [src]="theme.logoUrl()!" alt="Logo" />
          } @else {
            <span>{{ theme.logoText() }}</span>
          }
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">{{ theme.brand() }}</span>
          <strong>Dashboards</strong>
          @if (theme.brandSub()) {
            <small>{{ theme.brandSub() }}</small>
          }
        </div>
      </a>

      <div class="sidebar-scroll">
        @if (loading()) {
          <div class="nav-state">carregando…</div>
        } @else if (error()) {
          <div class="nav-state error">{{ error() }}</div>
        } @else if (rootNodes().length === 0) {
          <div class="nav-state">nenhum dashboard visível</div>
        } @else {
          <div class="section-label">Coleções</div>
          <nav class="nav-list">
            @for (n of rootNodes(); track n.id) {
              <app-sidebar-node [node]="n" [depth]="0" />
            }
          </nav>
        }
      </div>

      @if (auth.isSuperuser()) {
        <a routerLink="/settings/branding" routerLinkActive="is-active" class="admin-link">
          <mat-icon class="nav-icon">palette</mat-icon>
          <span>Configurar Branding</span>
        </a>
      }

      <div class="sidebar-footer">
        <div class="footer-card">
          <span class="footer-label">Versão</span>
          <span class="version-tag">v0.4 · Phase 7</span>
        </div>
      </div>
    </aside>
  `,
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private metabase = inject(MetabaseService);
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);

  rootNodes = signal<CollectionNode[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    forkJoin({
      collections: this.metabase.listCollections(),
      dashboards: this.metabase.listDashboards(),
    }).subscribe({
      next: ({ collections, dashboards }) => {
        this.rootNodes.set(this.buildTree(collections, dashboards));
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'falha ao listar');
        this.loading.set(false);
      },
    });
  }

  /**
   * Constrói árvore de coleções a partir de parent_id.
   *
   *   1. Mapeia parent_id → children
   *   2. Agrupa dashboards por collection_id
   *   3. Constrói nós recursivamente a partir das raízes (parent_id=null)
   *   4. Calcula totalDashboards no subtree
   *   5. Filtra nós sem nenhum dashboard descendente
   *   6. Insere "Geral" no topo se houver dashboards sem collection_id
   */
  private buildTree(cols: CollectionItem[], dashs: DashboardListItem[]): CollectionNode[] {
    // Index dashboards por collection_id
    const dashsByCol = new Map<number | string, DashboardListItem[]>();
    for (const d of dashs) {
      const key = d.collection_id ?? 'geral';
      const arr = dashsByCol.get(key) ?? [];
      arr.push(d);
      dashsByCol.set(key, arr);
    }

    // Index collections por parent_id (string-coerced)
    const childrenByParent = new Map<string, CollectionItem[]>();
    for (const c of cols) {
      if (c.id === 'root') continue;  // skip Metabase root (Nossas análises)
      const parentKey = c.parent_id == null ? 'null' : String(c.parent_id);
      const arr = childrenByParent.get(parentKey) ?? [];
      arr.push(c);
      childrenByParent.set(parentKey, arr);
    }

    // Constrói nó recursivamente
    const buildNode = (c: CollectionItem): CollectionNode => {
      const ownDashboards = (dashsByCol.get(c.id as number) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name));

      const childCols = childrenByParent.get(String(c.id)) ?? [];
      const children = childCols
        .map((cc) => buildNode(cc))
        .filter((n) => n.totalDashboards > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      const totalDashboards =
        ownDashboards.length + children.reduce((sum, ch) => sum + ch.totalDashboards, 0);

      return {
        id: c.id,
        name: c.name,
        ownDashboards,
        children,
        totalDashboards,
      };
    };

    const roots: CollectionNode[] = [];

    // "Geral" no topo (dashboards sem collection)
    const geral = dashsByCol.get('geral');
    if (geral?.length) {
      roots.push({
        id: 'geral',
        name: 'Geral',
        ownDashboards: geral.sort((a, b) => a.name.localeCompare(b.name)),
        children: [],
        totalDashboards: geral.length,
      });
    }

    // Raízes reais (parent_id=null), filtradas e ordenadas
    const rootCols = childrenByParent.get('null') ?? [];
    const rootNodes = rootCols
      .map((c) => buildNode(c))
      .filter((n) => n.totalDashboards > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    roots.push(...rootNodes);
    return roots;
  }
}
