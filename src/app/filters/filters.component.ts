/**
 * FiltersComponent — gera inputs dinamicamente a partir de
 * `dashboard.parameters[]`. Cada parameter vira um ParameterControl
 * apropriado. Sem hardcoding de slugs/labels.
 */
import { Component, computed, inject, input } from '@angular/core';
import { FiltersStore } from './filters-store';
import { ParameterControlComponent } from './parameter-control.component';
import type { Parameter } from '../core/models/metabase.model';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [ParameterControlComponent],
  template: `
    <div class="filter-bar">
      <span class="filter-label">Filtros:</span>

      @for (p of parameters(); track p.id) {
        <app-parameter-control [parameter]="p" />
      } @empty {
        <span style="font-size:12px;color:var(--text-3);font-style:italic">
          este dashboard não tem filtros configurados
        </span>
      }

      @if (parameters().length > 0) {
        <div class="filter-sep"></div>
        <button class="filter-reset" (click)="reset()">↺ Limpar</button>
      }
    </div>

    <!-- Debug strip: mostra o que está atualmente no store. -->
    @if (activeEntries().length > 0) {
      <div class="active-filters">
        <span class="filter-label" style="font-size:10px">Aplicados:</span>
        @for (e of activeEntries(); track e[0]) {
          <span class="active-pill">
            <strong>{{ e[0] }}</strong>: {{ e[1] }}
          </span>
        }
      </div>
    }
  `,
})
export class FiltersComponent {
  private store = inject(FiltersStore);

  parameters = input.required<Parameter[]>();

  /** Lista de [slug, value] para mostrar no strip de debug. */
  activeEntries = computed(() =>
    Object.entries(this.store.state())
      .filter(([_, v]) => v !== null && v !== undefined && v !== ''),
  );

  reset(): void {
    this.store.clear();
  }
}
