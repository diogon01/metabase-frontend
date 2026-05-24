/**
 * ProgressCardComponent — barra de progresso simples.
 *
 * Metabase: display='progress', com `visualization_settings.progress.goal`.
 * Valor atual = primeira coluna da primeira linha do resultado.
 * % = (valor / goal) * 100, capped a 100.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CardResult, MetabaseService } from '../metabase.service';
import type { Dashcard } from '../core/models/metabase.model';
import { FiltersStore } from '../filters/filters-store';
import { stripLeadingEmoji, formatNumber } from '../core/util/format.util';
import { dashcardColClasses } from '../core/util/grid.util';
import { CardMenuComponent } from './card-menu.component';

@Component({
  selector: 'app-progress-card',
  standalone: true,
  imports: [CardMenuComponent],
  template: `
    <article #cardEl class="chart-card" [class]="colClasses()">
      <div class="chart-header">
        <div>
          <div class="chart-title">{{ cleanName() }}</div>
          <div class="chart-subtitle">Meta: {{ formatGoal() }}</div>
        </div>
        <div class="chart-header-actions">
          <span class="chart-tag">Progresso</span>
          <app-card-menu
            [title]="cleanName()"
            [result]="result()"
            [captureEl]="cardEl" />
        </div>
      </div>

      <div class="progress-body">
        @if (loading()) {
          <div class="state">carregando…</div>
        } @else if (error()) {
          <div class="state error">erro: {{ error() }}</div>
        } @else {
          <div class="progress-stats">
            <span class="progress-value">{{ formatValue() }}</span>
            <span class="progress-pct" [class.over]="pct() >= 100">
              {{ pct().toFixed(1) }}%
            </span>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              [class.over]="pct() >= 100"
              [style.width.%]="Math.min(100, pct())"></div>
          </div>
        }
      </div>
    </article>
  `,
  styles: [`
    .progress-body { padding: 24px 4px 8px; }
    .progress-stats {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .progress-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--edge-text);
    }
    .progress-pct {
      font-size: 13px;
      font-weight: 600;
      color: var(--edge-muted);
    }
    .progress-pct.over { color: var(--accent-green); }
    .progress-track {
      width: 100%;
      height: 10px;
      background: var(--edge-surface-alt);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--fd-primary) 0%, var(--accent-blue) 100%);
      border-radius: 999px;
      transition: width var(--fd-transition-slow);
    }
    .progress-fill.over {
      background: linear-gradient(90deg, var(--accent-green) 0%, var(--accent-green) 100%);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressCardComponent {
  private metabase = inject(MetabaseService);
  private filtersStore = inject(FiltersStore);

  dashcard = input.required<Dashcard>();
  dashboardMeta = input.required<any>();
  dashboardId = input.required<number>();

  cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');

  result = signal<CardResult | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // expose Math pro template
  Math = Math;

  cleanName = computed(() => stripLeadingEmoji(this.dashcard().card?.name ?? ''));
  colClasses = computed(() => dashcardColClasses(this.dashcard()));

  goal = computed<number>(() => {
    const vs = this.dashcard().card?.visualization_settings ?? {};
    return Number(vs['progress.goal'] ?? vs['scalar.goal'] ?? 100);
  });

  rawValue = computed<number>(() => {
    const r = this.result();
    if (!r?.rows?.length) return 0;
    const v = Object.values(r.rows[0])[0];
    return typeof v === 'number' ? v : Number(v) || 0;
  });

  pct = computed(() => {
    const g = this.goal();
    return g > 0 ? (this.rawValue() / g) * 100 : 0;
  });

  formatValue(): string { return formatNumber(this.rawValue()); }
  formatGoal(): string { return formatNumber(this.goal()); }

  constructor() {
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
