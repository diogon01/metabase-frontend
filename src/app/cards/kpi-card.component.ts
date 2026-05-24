import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CardResult, MetabaseService } from '../metabase.service';
import type { Dashcard } from '../core/models/metabase.model';
import { FiltersStore } from '../filters/filters-store';
import { extractLeadingEmoji, formatNumber, stripLeadingEmoji } from '../core/util/format.util';
import { dashcardColClasses } from '../core/util/grid.util';

/**
 * KPI: card de valor único (display=scalar).
 *
 * TODO (Fase 4): trocar heurística R$/% por leitura de
 * `card.visualization_settings.column_settings[].number_style` e `currency`.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <article
      class="kpi-card"
      [class]="colClasses()"
      [class.highlight]="highlight()">
      <div class="kpi-label">{{ cleanName() }}</div>

      @if (loading()) {
        <div class="kpi-value" style="font-size:14px;font-weight:500">···</div>
      } @else if (error()) {
        <div class="kpi-value" style="font-size:12px;color:var(--red);font-weight:500">erro</div>
        <div class="kpi-state">{{ error() }}</div>
      } @else {
        <div class="kpi-value">
          @if (prefix()) { <span class="unit">{{ prefix() }}</span> }
          {{ value() }}
          @if (suffix()) { <span class="unit">{{ suffix() }}</span> }
        </div>
        @if (smartChange(); as ch) {
          <div class="kpi-trend" [class.up]="ch.direction === 'up'" [class.down]="ch.direction === 'down'">
            <span class="trend-arrow">{{ ch.direction === 'up' ? '▲' : ch.direction === 'down' ? '▼' : '–' }}</span>
            <span class="trend-pct">{{ ch.pctFormatted }}</span>
            <span class="trend-suffix">vs {{ ch.unitLabel }} anterior</span>
          </div>
        }
      }

      @if (emoji()) {
        <div class="kpi-accent">{{ emoji() }}</div>
      }
    </article>
  `,
  styles: [`
    .kpi-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 6px;
      color: var(--edge-muted);
    }
    .kpi-trend.up { color: var(--accent-green); }
    .kpi-trend.down { color: var(--accent-red); }
    .kpi-trend .trend-arrow { font-size: 10px; }
    .kpi-trend .trend-suffix { font-weight: 400; color: var(--edge-mute-2); margin-left: 2px; }
    :host-context(.highlight) .kpi-trend { color: rgba(255,255,255,.8); }
    :host-context(.highlight) .kpi-trend.up { color: #6EE7B7; }
    :host-context(.highlight) .kpi-trend.down { color: #FCA5A5; }
  `],
})
export class KpiCardComponent {
  private metabase = inject(MetabaseService);
  private filtersStore = inject(FiltersStore);

  dashcard = input.required<Dashcard>();
  dashboardMeta = input.required<any>();
  dashboardId = input.required<number>();
  /** Renderiza com gradient wine (destaque). Pra ser usado em primeiro card de uma série. */
  highlight = input<boolean>(false);

  result = signal<CardResult | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  cardName = computed(() => this.dashcard().card.name ?? '');
  emoji = computed(() => extractLeadingEmoji(this.cardName()));
  cleanName = computed(() => stripLeadingEmoji(this.cardName()));
  colClasses = computed(() => dashcardColClasses(this.dashcard()));

  /** Heurística: nome contém "receita"/"faturamento"/"despesa"/"spend"/"ticket" → R$. */
  prefix = computed(() => {
    const n = this.cardName().toLowerCase();
    if (n.includes('receita') || n.includes('faturamento') || n.includes('despesa') ||
        n.includes('spend') || n.includes('ticket')) return 'R$';
    return '';
  });

  /** Heurística: nome contém "%"/"crescimento"/"margem" → %. */
  suffix = computed(() => {
    const n = this.cardName().toLowerCase();
    if (n.includes('%') || n.includes('crescimento') || n.includes('margem')) return '%';
    return '';
  });

  value = computed(() => {
    const r = this.result();
    if (!r?.rows?.length) return '—';

    // Smartscalar: usa insights[0]['last-value'] se disponível (é o valor
    // "atual" da série temporal, não a soma de todas as linhas).
    const insights = r.insights?.[0];
    if (insights && this.dashcard().card?.display === 'smartscalar') {
      const v = insights['last-value'];
      if (typeof v === 'number') {
        if (this.suffix() === '%') return v.toFixed(1);
        return formatNumber(v);
      }
    }

    const v = Object.values(r.rows[0])[0];
    if (typeof v !== 'number') return String(v ?? '—');
    if (this.suffix() === '%') return v.toFixed(1);
    return formatNumber(v);
  });

  /**
   * Para smartscalar: calcula direção e formata percentual da última mudança.
   * Retorna null se não houver insights.
   */
  smartChange = computed<null | {
    direction: 'up' | 'down' | 'flat';
    pctFormatted: string;
    unitLabel: string;
  }>(() => {
    const r = this.result();
    if (this.dashcard().card?.display !== 'smartscalar') return null;
    const insights = r?.insights?.[0];
    if (!insights || typeof insights['last-change'] !== 'number') return null;

    const change = insights['last-change'];
    const direction: 'up' | 'down' | 'flat' =
      change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat';
    const pct = Math.abs(change * 100);
    const pctFormatted = (pct >= 100 ? pct.toFixed(0) : pct.toFixed(1)) + '%';

    const unitMap: Record<string, string> = {
      day: 'dia', week: 'semana', month: 'mês',
      quarter: 'trimestre', year: 'ano',
    };
    const unitLabel = unitMap[insights.unit ?? ''] ?? 'período';

    return { direction, pctFormatted, unitLabel };
  });

  constructor() {
    // Reage a (a) mudanças no dashcard/meta/dashboardId via inputs,
    // (b) mudanças no estado dos filtros via store (signal global).
    // Lendo this.filtersStore.state() dentro do effect registra a dependência.
    effect(() => {
      const f = this.filtersStore.state();
      const d = this.dashcard();
      const meta = this.dashboardMeta();
      const dashId = this.dashboardId();
      if (!meta || d.card_id == null) return;
      this.loading.set(true);
      this.error.set(null);
      this.metabase.runDashcard(dashId, d.id, d.card_id, f, meta).subscribe({
        next: (r) => { this.result.set(r); this.loading.set(false); },
        error: (e) => { this.error.set(e?.message || 'falha'); this.loading.set(false); },
      });
    }, { allowSignalWrites: true });
  }
}
