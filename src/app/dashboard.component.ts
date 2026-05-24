/**
 * DashboardComponent — carrega o dashboard Metabase por ID e renderiza os
 * dashcards da tab ativa via <app-card-renderer> (dispatcher por display).
 *
 * Lógica de layout (Fase 1):
 *  - Lê `dashboard.dashcards[]` da API (não mais CARD_CONFIG hardcoded)
 *  - Filtra por `activeTabId`
 *  - Separa em 2 seções visuais (decisão UX): KPIs em cima (scalars
 *    compactos), charts em baixo (cards largos)
 *  - Ordena cada seção por `(row, col)` — preserva a ordem original do
 *    Metabase dentro de cada seção
 *  - Mapeia `size_x` (24-col) → span (12-col) automaticamente via
 *    `dashcardColClasses` no próprio renderer
 *  - Primeiro KPI ganha `highlight=true` (gradient wine)
 */
import {
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { MetabaseService } from './metabase.service';
import { CardRendererComponent } from './cards/card-renderer.component';
import type { Dashcard } from './core/models/metabase.model';
import { dashcardsOfTab, sortDashcards } from './core/util/grid.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardRendererComponent],
  template: `
    @if (loadingMeta()) {
      <div class="state">Carregando metadata do dashboard…</div>
    } @else if (metaError()) {
      <div class="state error">Falha ao carregar dashboard: {{ metaError() }}</div>
    } @else {
      <section class="grid">
        @for (d of kpiDashcards(); track d.id; let i = $index) {
          <app-card-renderer
            [dashcard]="d"
            [dashboardMeta]="dashboardMeta()"
            [dashboardId]="dashboardId()"
            [highlight]="i === 0" />
        }
      </section>

      <section class="grid">
        @for (d of chartDashcards(); track d.id) {
          <app-card-renderer
            [dashcard]="d"
            [dashboardMeta]="dashboardMeta()"
            [dashboardId]="dashboardId()" />
        }
      </section>
    }
  `,
})
export class DashboardComponent {
  private metabase = inject(MetabaseService);

  dashboardId = input.required<number>();
  /** null = dashboard sem tabs (single-page). */
  activeTabId = input<number | null>(null);

  @Output() metaLoaded = new EventEmitter<any>();

  dashboardMeta = signal<any>(null);
  loadingMeta = signal(true);
  metaError = signal<string | null>(null);

  /**
   * Todos os dashcards visíveis da tab ativa, ordenados por (row, col).
   * Phase 4: text/heading cards (sem card_id) agora são renderizados pelo
   * MarkdownCardComponent via dispatcher.
   */
  visibleDashcards = computed<Dashcard[]>(() => {
    const meta = this.dashboardMeta();
    if (!meta) return [];
    const all: Dashcard[] = meta.dashcards ?? [];
    const ofTab = dashcardsOfTab(all, this.activeTabId());
    return sortDashcards(ofTab);
  });

  /** Scalars + smartscalars (KPIs compactos, vão em cima). */
  kpiDashcards = computed<Dashcard[]>(() =>
    this.visibleDashcards().filter((d) => {
      if (d.card_id == null) return false;
      const disp = d.card?.display;
      return disp === 'scalar' || disp === 'smartscalar';
    }),
  );

  /**
   * Charts, tabelas, markdown e text cards. Vão em baixo dos KPIs.
   * Cards de texto se misturam com gráficos nessa seção (preservando a ordem
   * row,col do Metabase para que cabeçalhos fiquem antes dos seus charts).
   */
  chartDashcards = computed<Dashcard[]>(() =>
    this.visibleDashcards().filter((d) => {
      if (d.card_id == null) return true; // virtual cards (text/heading)
      const disp = d.card?.display;
      return disp !== 'scalar' && disp !== 'smartscalar';
    }),
  );

  constructor() {
    effect(() => {
      const id = this.dashboardId();
      this.loadingMeta.set(true);
      this.metaError.set(null);
      this.metabase.getDashboard(id).subscribe({
        next: (m) => {
          this.dashboardMeta.set(m);
          this.loadingMeta.set(false);
          this.metaLoaded.emit(m);
        },
        error: (e) => {
          this.metaError.set(e?.message || String(e));
          this.loadingMeta.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }
}
