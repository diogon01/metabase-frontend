import {
  Component, ElementRef, computed, effect, inject, input, signal, viewChild,
} from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { CardResult, MetabaseService, Row } from '../metabase.service';
import type { Dashcard } from '../core/models/metabase.model';
import { FiltersStore } from '../filters/filters-store';
import { ThemeService } from '../theming/theme.service';
import { stripLeadingEmoji } from '../core/util/format.util';
import { dashcardColClasses } from '../core/util/grid.util';
import { CardMenuComponent } from './card-menu.component';
import { ScaleType } from '@swimlane/ngx-charts';

/**
 * Chart: line / area / bar / row / pie / advanced-pie via ngx-charts.
 *
 * Adaptadores:
 *  - seriesData(): para line/area. Detecta dimensão textual em col[1]
 *    e pivota; senão usa cada coluna numérica como série.
 *  - categoricalData(): para bar/pie/row. Assume col[0]=categoria,
 *    col[1]=valor.
 */
@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [NgxChartsModule, CardMenuComponent],
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
          <div class="state empty">sem dados para os filtros atuais</div>
        } @else {
          @switch (dashcard().card.display) {
            @case ('line') {
              <ngx-charts-line-chart
                [results]="seriesData()"
                [scheme]="scheme()"
                [xAxis]="true" [yAxis]="true"
                [legend]="seriesData().length > 1" [legendPosition]="legendPosBelow"
                [autoScale]="true" />
            }
            @case ('area') {
              <ngx-charts-area-chart
                [results]="seriesData()"
                [scheme]="scheme()"
                [xAxis]="true" [yAxis]="true" [autoScale]="true" />
            }
            @case ('bar') {
              <ngx-charts-bar-vertical
                [results]="categoricalData()"
                [scheme]="scheme()"
                [xAxis]="true" [yAxis]="true"
                (select)="onCategoricalSelect($event)" />
            }
            @case ('row') {
              <ngx-charts-bar-horizontal
                [results]="categoricalData()"
                [scheme]="scheme()"
                [xAxis]="true" [yAxis]="true"
                (select)="onCategoricalSelect($event)" />
            }
            @case ('pie') {
              <ngx-charts-advanced-pie-chart
                [results]="categoricalData()"
                [scheme]="scheme()"
                (select)="onCategoricalSelect($event)" />
            }
          }
        }
      </div>
    </article>
  `,
})
export class ChartCardComponent {
  private metabase = inject(MetabaseService);
  private filtersStore = inject(FiltersStore);
  private themeService = inject(ThemeService);

  dashcard = input.required<Dashcard>();
  dashboardMeta = input.required<any>();
  dashboardId = input.required<number>();

  /** Referência ao <article> pra captura PNG via html2canvas. */
  cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');

  result = signal<CardResult | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  /** Scheme reativo: muda quando o tenant muda. */
  scheme = computed(() => ({
    name: 'tenant-scheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: this.themeService.chartScheme(),
  }));
  legendPosBelow = 'below' as any;

  cleanName = computed(() => stripLeadingEmoji(this.dashcard().card.name ?? ''));
  colClasses = computed(() => dashcardColClasses(this.dashcard()));

  displayLabel = computed(() => {
    const map: Record<string, string> = {
      line: 'Série temporal',
      area: 'Área',
      bar: 'Barras',
      row: 'Barras horizontais',
      pie: 'Distribuição',
    };
    return map[this.dashcard().card.display] ?? this.dashcard().card.display;
  });

  subtitle = computed(() => {
    const r = this.result();
    if (!r) return '';
    return `${r.rows.length} ${r.rows.length === 1 ? 'registro' : 'registros'}`;
  });

  /** Pivot por dimensão textual se houver; senão cada col numérica = 1 série. */
  seriesData = computed(() => {
    const r = this.result();
    if (!r?.rows?.length) return [];
    const cols = r.cols;
    const xCol = cols[0]?.name;
    const isNum = (c: any) => /int|float|decimal|number/i.test(c.base_type ?? '');
    const textDims = cols.slice(1).filter((c) => !isNum(c));
    const yCols = cols.slice(1).filter(isNum);

    if (textDims.length && yCols.length) {
      const dim = textDims[0].name;
      const y = yCols[0].name;
      const groups = new Map<string, { name: string; value: number }[]>();
      for (const row of r.rows) {
        const key = String(row[dim]);
        const arr = groups.get(key) ?? [];
        arr.push({ name: String(row[xCol]), value: Number(row[y] ?? 0) });
        groups.set(key, arr);
      }
      return [...groups.entries()].map(([name, series]) => ({ name, series }));
    }

    return yCols.map((yc) => ({
      name: yc.display_name,
      series: r.rows.map((row) => ({
        name: String(row[xCol]),
        value: Number(row[yc.name] ?? 0),
      })),
    }));
  });

  /** col[0]=categoria, col[1]=valor. */
  categoricalData = computed(() => {
    const r = this.result();
    if (!r?.rows?.length) return [];
    const [xc, yc] = r.cols;
    return r.rows
      .map((row: Row) => ({
        name: String(row[xc.name]),
        value: Number(row[yc?.name] ?? 0),
      }))
      .filter((d) => d.name && !isNaN(d.value));
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

  /**
   * Cross-filter: ngx-charts (bar/row/pie) emite o objeto clicado.
   * Pra categorical: {name, value, label} ou {name, value, ...}.
   * Pegamos o `name`, mapeamos pra column[0] do resultado (categoria) e
   * tentamos achar um parameter no dashboard com slug correspondente.
   */
  onCategoricalSelect(event: any): void {
    const r = this.result();
    if (!r?.cols?.length) return;
    const columnName = r.cols[0].name;            // ex: 'canal', 'categoria'
    const clickedValue = event?.name ?? event;    // string clicada
    const meta = this.dashboardMeta();
    const parameters = meta?.parameters ?? [];
    this.filtersStore.applyCrossFilter(parameters, columnName, clickedValue);
  }
}
