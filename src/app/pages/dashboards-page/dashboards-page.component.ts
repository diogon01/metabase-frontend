/**
 * DashboardsPageComponent — renderiza dashboard ativo (dentro do AppShell).
 *
 * Phase 3d: lê route params (/d/:id/tab/:tabId) reativamente.
 * Quando entra em /d/:id sem tab, auto-redireciona pra primeira tab disponível
 * depois que o meta do dashboard carrega.
 *
 * Tabs viraram MatTabNavBar — cada tab é um routerLink pra /d/:id/tab/:tabId.
 */
import {
  Component, ElementRef, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FiltersComponent } from '../../filters/filters.component';
import { FiltersStore } from '../../filters/filters-store';
import { DashboardComponent } from '../../dashboard.component';
import { ExportService } from '../../core/export/export.service';
import { ThemeService } from '../../theming/theme.service';
import type { Parameter } from '../../core/models/metabase.model';

const FALLBACK_DASHBOARD_ID = 937;

@Component({
  selector: 'app-dashboards-page',
  standalone: true,
  imports: [
    FiltersComponent,
    DashboardComponent,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    RouterLinkActive,
  ],
  template: `
    @if (tabs().length > 0) {
      <nav mat-tab-nav-bar [tabPanel]="tabPanel" class="dashboard-tabs">
        @for (t of tabs(); track t.id) {
          <a
            mat-tab-link
            [routerLink]="['/d', dashboardId(), 'tab', t.id]"
            routerLinkActive
            #rla="routerLinkActive"
            [active]="rla.isActive">
            {{ shortTabName(t.name) }}
          </a>
        }
      </nav>
      <mat-tab-nav-panel #tabPanel />
    }

    <app-filters [parameters]="parameters()" />

    <main class="main" #mainEl>
      <div class="page-header">
        <div>
          <div class="section-title">{{ dashboardName() || 'Carregando…' }}</div>
          <div class="section-sub">
            Renderização live via Metabase API — filtros dinâmicos de <code>dashboard.parameters[]</code>.
          </div>
        </div>
        <button
          mat-stroked-button
          class="export-pdf-btn"
          [disabled]="exporting()"
          (click)="exportPdf()">
          <mat-icon>picture_as_pdf</mat-icon>
          {{ exporting() ? 'Gerando…' : 'Exportar PDF' }}
        </button>
      </div>

      <app-dashboard
        [dashboardId]="dashboardId()"
        [activeTabId]="effectiveTabId()"
        (metaLoaded)="onMetaLoaded($event)" />
    </main>
  `,
  styles: [`
    .dashboard-tabs {
      background: var(--edge-surface);
      border-bottom: 1px solid var(--edge-border);
      padding: 0 24px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }
    .export-pdf-btn {
      flex-shrink: 0;
    }
  `],
})
export class DashboardsPageComponent {
  private filtersStore = inject(FiltersStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private exportService = inject(ExportService);
  readonly theme = inject(ThemeService);

  mainEl = viewChild<ElementRef<HTMLElement>>('mainEl');
  exporting = signal(false);

  /** Route params como signal reativo. */
  private params = toSignal(this.route.paramMap, { requireSync: true });

  dashboardId = computed(() => {
    const v = this.params().get('id');
    return v ? Number(v) : FALLBACK_DASHBOARD_ID;
  });

  /** Tab da URL (pode ser null se /d/:id sem /tab/X). */
  routeTabId = computed<number | null>(() => {
    const v = this.params().get('tabId');
    return v ? Number(v) : null;
  });

  /**
   * Tab efetiva: se URL tem tabId, usa. Senão, espera meta carregar
   * pra escolher a 1ª tab do dashboard (auto-redirect).
   */
  effectiveTabId = computed<number | null>(() => {
    const fromRoute = this.routeTabId();
    if (fromRoute != null) return fromRoute;
    // Sem tab na URL → usa 1ª tab carregada, ou null (dashboard single-tab)
    const ts = this.tabs();
    return ts.length > 0 ? ts[0].id : null;
  });

  tabs = signal<Array<{ id: number; name: string }>>([]);
  parameters = signal<Parameter[]>([]);
  dashboardName = signal<string>('');

  constructor() {
    // Quando dashboardId muda (navegação na sidebar), reseta tabs/meta.
    effect(() => {
      this.dashboardId();
      this.tabs.set([]);
      this.parameters.set([]);
      this.dashboardName.set('');
    }, { allowSignalWrites: true });

    // Auto-redirect pra 1ª tab quando meta carrega e URL não tem tabId.
    effect(() => {
      const fromRoute = this.routeTabId();
      const ts = this.tabs();
      if (fromRoute == null && ts.length > 0) {
        const firstTabId = ts[0].id;
        this.router.navigate(['/d', this.dashboardId(), 'tab', firstTabId], {
          replaceUrl: true,
        });
      }
    }, { allowSignalWrites: true });
  }

  onMetaLoaded(meta: any): void {
    this.tabs.set(meta?.tabs ?? []);
    this.parameters.set(meta?.parameters ?? []);
    this.dashboardName.set(meta?.name ?? '');
    this.filtersStore.applyDefaults(meta?.parameters ?? []);
  }

  shortTabName(name: string): string {
    return name
      .replace(/^[\d\s]+/, '')
      .replace(/^—\s*/, '')
      .replace(/\s+—\s+/g, ' · ')
      .trim()
      .slice(0, 32);
  }

  async exportPdf(): Promise<void> {
    const el = this.mainEl()?.nativeElement;
    if (!el) return;
    this.exporting.set(true);
    try {
      const title = this.dashboardName() || `dashboard-${this.dashboardId()}`;
      await this.exportService.downloadPdf(title, el);
    } finally {
      this.exporting.set(false);
    }
  }
}
