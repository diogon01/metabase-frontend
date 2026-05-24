import {
  Component, ElementRef, computed, effect, inject, input, signal, viewChild,
} from '@angular/core';
import { CardResult, MetabaseService } from '../metabase.service';
import type { Dashcard } from '../core/models/metabase.model';
import { FiltersStore } from '../filters/filters-store';
import { stripLeadingEmoji } from '../core/util/format.util';
import { dashcardColClasses } from '../core/util/grid.util';
import { CardMenuComponent } from './card-menu.component';

/**
 * Fallback genérico: renderiza qualquer display em tabela.
 * Usado quando o display não tem renderer dedicado ainda (combo, funnel,
 * gauge, table, pivot, etc) — vai virar opcional após Fase 4.
 */
@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CardMenuComponent],
  template: `
    <article #cardEl class="chart-card" [class]="colClasses()">
      <div class="chart-header">
        <div>
          <div class="chart-title">{{ cleanName() }}</div>
          <div class="chart-subtitle">{{ subtitle() }}</div>
        </div>
        <div class="chart-header-actions">
          <span class="chart-tag">{{ dashcard().card.display }}</span>
          <app-card-menu
            [title]="cleanName()"
            [result]="result()"
            [captureEl]="cardEl" />
        </div>
      </div>
      <div class="chart-body" style="height:auto;overflow-x:auto">
        @if (loading()) {
          <div class="state">carregando…</div>
        } @else if (error()) {
          <div class="state error">erro: {{ error() }}</div>
        } @else if (!result()?.rows?.length) {
          <div class="state empty">sem dados</div>
        } @else {
          <table class="raw">
            <thead>
              <tr>
                @for (c of result()!.cols; track c.name) { <th>{{ c.display_name }}</th> }
              </tr>
            </thead>
            <tbody>
              @for (row of result()!.rows.slice(0, 50); track $index) {
                <tr>
                  @for (c of result()!.cols; track c.name) { <td>{{ row[c.name] }}</td> }
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </article>
  `,
})
export class TableCardComponent {
  private metabase = inject(MetabaseService);
  private filtersStore = inject(FiltersStore);

  dashcard = input.required<Dashcard>();
  dashboardMeta = input.required<any>();
  dashboardId = input.required<number>();

  cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');

  result = signal<CardResult | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  cleanName = computed(() => stripLeadingEmoji(this.dashcard().card.name ?? ''));
  colClasses = computed(() => dashcardColClasses(this.dashcard()));
  subtitle = computed(() => {
    const r = this.result();
    if (!r) return '';
    return `${r.rows.length} ${r.rows.length === 1 ? 'registro' : 'registros'}`;
  });

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
