import { Component, computed, input } from '@angular/core';
import type { Dashcard } from '../core/models/metabase.model';
import { KpiCardComponent } from './kpi-card.component';
import { ChartCardComponent } from './chart-card.component';
import { TableCardComponent } from './table-card.component';
import { MarkdownCardComponent } from './markdown-card.component';
import { EchartsCardComponent } from './echarts-card.component';
import { ProgressCardComponent } from './progress-card.component';

/**
 * Dispatcher que escolhe o renderer apropriado baseado em:
 *  - `dashcard.card_id == null` + virtual_card.display in ('text','heading') → markdown
 *  - `card.display in ('scalar','smartscalar')` → kpi (smartscalar inclui badge ↑/↓)
 *  - `card.display in ('line','area','bar','row','pie')` → chart (ngx-charts)
 *  - `card.display in ('combo','funnel','gauge')` → echarts
 *  - `card.display === 'progress'` → progress bar (HTML)
 *  - outros (table, pivot, ...) → table fallback
 */
@Component({
  selector: 'app-card-renderer',
  standalone: true,
  imports: [
    KpiCardComponent,
    ChartCardComponent,
    TableCardComponent,
    MarkdownCardComponent,
    EchartsCardComponent,
    ProgressCardComponent,
  ],
  template: `
    @switch (kind()) {
      @case ('markdown') {
        <app-markdown-card [dashcard]="dashcard()" />
      }
      @case ('kpi') {
        <app-kpi-card
          [dashcard]="dashcard()"
          [dashboardMeta]="dashboardMeta()"
          [dashboardId]="dashboardId()"
          [highlight]="highlight()" />
      }
      @case ('chart') {
        <app-chart-card
          [dashcard]="dashcard()"
          [dashboardMeta]="dashboardMeta()"
          [dashboardId]="dashboardId()" />
      }
      @case ('echarts') {
        <app-echarts-card
          [dashcard]="dashcard()"
          [dashboardMeta]="dashboardMeta()"
          [dashboardId]="dashboardId()" />
      }
      @case ('progress') {
        <app-progress-card
          [dashcard]="dashcard()"
          [dashboardMeta]="dashboardMeta()"
          [dashboardId]="dashboardId()" />
      }
      @default {
        <app-table-card
          [dashcard]="dashcard()"
          [dashboardMeta]="dashboardMeta()"
          [dashboardId]="dashboardId()" />
      }
    }
  `,
})
export class CardRendererComponent {
  dashcard = input.required<Dashcard>();
  dashboardMeta = input.required<any>();
  dashboardId = input.required<number>();
  highlight = input<boolean>(false);

  kind = computed<'markdown' | 'kpi' | 'chart' | 'echarts' | 'progress' | 'table'>(() => {
    const d = this.dashcard();

    if (d.card_id == null) {
      const vc = (d.visualization_settings?.['virtual_card'] as { display?: string }) ?? {};
      if (vc.display === 'text' || vc.display === 'heading') return 'markdown';
      return 'table';
    }

    const display = d.card?.display;
    if (display === 'scalar' || display === 'smartscalar') return 'kpi';
    if (
      display === 'line' || display === 'area' || display === 'bar' ||
      display === 'row' || display === 'pie'
    ) return 'chart';
    if (display === 'combo' || display === 'funnel' || display === 'gauge') return 'echarts';
    if (display === 'progress') return 'progress';
    return 'table';
  });
}
