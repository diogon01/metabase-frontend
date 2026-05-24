/**
 * EchartsCardComponent — componente base para charts que ngx-charts não cobre:
 * combo (line+bar), funnel, gauge.
 *
 * Cada renderer especializa via `[options]` (EChartsOption). O fetch dos dados
 * e o boilerplate (effect, loading, error, header) vivem aqui.
 *
 * Dispatcher: app-card-renderer escolhe entre combo/funnel/gauge baseado em
 * dashcard.card.display e injeta a função `buildOption` apropriada.
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
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { CardResult, MetabaseService } from '../metabase.service';
import type { Dashcard } from '../core/models/metabase.model';
import { FiltersStore } from '../filters/filters-store';
import { ThemeService } from '../theming/theme.service';
import { stripLeadingEmoji } from '../core/util/format.util';
import { dashcardColClasses } from '../core/util/grid.util';
import { CardMenuComponent } from './card-menu.component';

@Component({
  selector: 'app-echarts-card',
  standalone: true,
  imports: [NgxEchartsDirective, CardMenuComponent],
  template: `
    <article #cardEl class="chart-card" [class]="colClasses()">
      <div class="chart-header">
        <div>
          <div class="chart-title">{{ cleanName() }}</div>
          <div class="chart-subtitle">{{ subtitle() }}</div>
        </div>
        <div class="chart-header-actions">
          <span class="chart-tag">{{ displayLabel() }}</span>
          <app-card-menu
            [title]="cleanName()"
            [result]="result()"
            [captureEl]="cardEl" />
        </div>
      </div>

      <div class="chart-body">
        @if (loading()) {
          <div class="state">carregando…</div>
        } @else if (error()) {
          <div class="state error">erro: {{ error() }}</div>
        } @else if (!result()?.rows?.length) {
          <div class="state empty">sem dados</div>
        } @else if (chartOptions()) {
          <div echarts [options]="chartOptions()!" (chartClick)="onChartClick($event)" class="echarts-host"></div>
        } @else {
          <div class="state empty">não foi possível gerar o gráfico</div>
        }
      </div>
    </article>
  `,
  styles: [`
    .echarts-host { width: 100%; height: 100%; display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EchartsCardComponent {
  private metabase = inject(MetabaseService);
  private filtersStore = inject(FiltersStore);
  private themeService = inject(ThemeService);

  dashcard = input.required<Dashcard>();
  dashboardMeta = input.required<any>();
  dashboardId = input.required<number>();

  cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');

  /** Paleta reativa do tenant. */
  private get colors(): string[] { return this.themeService.chartScheme(); }

  result = signal<CardResult | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  cleanName = computed(() => stripLeadingEmoji(this.dashcard().card?.name ?? ''));
  colClasses = computed(() => dashcardColClasses(this.dashcard()));

  displayLabel = computed(() => {
    const map: Record<string, string> = {
      combo: 'Combo',
      funnel: 'Funil',
      gauge: 'Gauge',
      progress: 'Progresso',
    };
    return map[this.dashcard().card?.display ?? ''] ?? this.dashcard().card?.display ?? '';
  });

  subtitle = computed(() => {
    const r = this.result();
    if (!r) return '';
    return `${r.rows.length} ${r.rows.length === 1 ? 'registro' : 'registros'}`;
  });

  chartOptions = computed<EChartsOption | null>(() => {
    const r = this.result();
    if (!r?.rows?.length) return null;
    const display = this.dashcard().card?.display;
    if (display === 'combo') return this.buildComboOption(r);
    if (display === 'funnel') return this.buildFunnelOption(r);
    if (display === 'gauge') return this.buildGaugeOption(r);
    return null;
  });

  // ── option builders ──────────────────────────────────────────────

  private buildComboOption(r: CardResult): EChartsOption {
    const cols = r.cols;
    const xCol = cols[0]?.name;
    const isNum = (c: { base_type: string }) => /int|float|decimal|number/i.test(c.base_type ?? '');
    const numCols = cols.slice(1).filter(isNum);

    const categories = r.rows.map((row) => String(row[xCol]));
    const colors = this.colors;
    const series = numCols.map((c, idx) => ({
      name: c.display_name,
      type: idx === 0 ? 'bar' : 'line',
      data: r.rows.map((row) => Number(row[c.name] ?? 0)),
      smooth: true,
      itemStyle: { color: colors[idx % colors.length] },
    }));

    return {
      tooltip: { trigger: 'axis' },
      legend: { show: numCols.length > 1, bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: numCols.length > 1 ? 40 : 20 },
      xAxis: { type: 'category', data: categories, axisLine: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F1F2' } } },
      series: series as any,
      color: this.colors,
    };
  }

  private buildFunnelOption(r: CardResult): EChartsOption {
    const [xc, yc] = r.cols;
    const data = r.rows
      .map((row) => ({
        name: String(row[xc.name]),
        value: Number(row[yc?.name] ?? 0),
      }))
      .filter((d) => !isNaN(d.value));

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'funnel',
          left: '10%',
          width: '80%',
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: { show: true, position: 'inside' },
          labelLine: { length: 10 },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          data,
        },
      ],
      color: this.colors,
    };
  }

  private buildGaugeOption(r: CardResult): EChartsOption {
    const v = Number(Object.values(r.rows[0])[0] ?? 0);
    const vs = this.dashcard().card?.visualization_settings ?? {};
    const segments = (vs['gauge.segments'] as Array<{ min: number; max: number }>) ?? [];
    const min = segments.length ? segments[0].min : 0;
    const max = segments.length ? segments[segments.length - 1].max : 100;

    return {
      series: [
        {
          type: 'gauge',
          min,
          max,
          progress: { show: true, width: 18 },
          axisLine: { lineStyle: { width: 18 } },
          pointer: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 28,
            fontWeight: 700,
            color: '#1F2937',
            formatter: '{value}',
            offsetCenter: [0, '70%'],
          },
          data: [{ value: v }],
        },
      ],
      color: this.colors,
    };
  }

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

  /**
   * Cross-filter: echarts emite { name, value, seriesName, dataIndex, ... }
   * no click. Para combo/funnel/gauge, `name` é a categoria (eixo X / fatia).
   */
  onChartClick(params: any): void {
    const r = this.result();
    if (!r?.cols?.length) return;
    const columnName = r.cols[0].name;
    const clickedValue = params?.name;
    if (clickedValue == null) return;
    const meta = this.dashboardMeta();
    this.filtersStore.applyCrossFilter(meta?.parameters ?? [], columnName, clickedValue);
  }
}

// Cores agora vêm de ThemeService.chartScheme() (varia por tenant).
