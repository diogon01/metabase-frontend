/**
 * ParameterControlComponent — escolhe o input apropriado para um Parameter
 * Metabase baseado em `parameter.type` e `parameter.values_query_type`.
 *
 * Phase 2: cobre os tipos mais comuns (date/range, date/all-options,
 * temporal-unit, string/=, category, number/=). Tipos não mapeados caem
 * em input texto. Phase 4 pode incrementar com date-picker visual, etc.
 */
import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltersStore } from './filters-store';
import type { Parameter } from '../core/models/metabase.model';

type ControlKind = 'date-presets' | 'date-range' | 'temporal-unit' | 'select' | 'number' | 'text';

@Component({
  selector: 'app-parameter-control',
  standalone: true,
  imports: [FormsModule],
  template: `
    @switch (kind()) {
      @case ('date-presets') {
        <select
          class="filter-select"
          [ngModel]="value()"
          (ngModelChange)="set($event)"
          [attr.title]="parameter().name">
          <option [ngValue]="null">{{ parameter().name }}</option>
          <option value="today">Hoje</option>
          <option value="yesterday">Ontem</option>
          <option value="thisweek">Esta semana</option>
          <option value="thismonth">Este mês</option>
          <option value="thisyear">Este ano</option>
          <option value="past7days">Últimos 7 dias</option>
          <option value="past30days">Últimos 30 dias</option>
          <option value="past3months">Últimos 3 meses</option>
          <option value="past12months">Últimos 12 meses</option>
        </select>
      }
      @case ('date-range') {
        <select
          class="filter-select"
          [ngModel]="value()"
          (ngModelChange)="set($event)"
          [attr.title]="parameter().name">
          <option [ngValue]="null">{{ parameter().name }}</option>
          <option [ngValue]="currentMonth()">Este mês · {{ currentMonth() }}</option>
          <option [ngValue]="previousMonth()">Mês passado · {{ previousMonth() }}</option>
          <option [ngValue]="currentYear()">Este ano · {{ currentYear() }}</option>
          <option [ngValue]="previousYear()">Ano passado · {{ previousYear() }}</option>
          <option [ngValue]="last30days()">Últimos 30 dias · {{ last30days() }}</option>
          <option [ngValue]="last90days()">Últimos 90 dias · {{ last90days() }}</option>
          @if (value() && !knownRanges().includes(value())) {
            <option [ngValue]="value()">custom · {{ value() }}</option>
          }
        </select>
      }
      @case ('temporal-unit') {
        <select
          class="filter-select"
          [ngModel]="value()"
          (ngModelChange)="set($event)"
          [attr.title]="parameter().name">
          <option [ngValue]="null">{{ parameter().name }}</option>
          <option value="day">Dia</option>
          <option value="week">Semana</option>
          <option value="month">Mês</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Ano</option>
        </select>
      }
      @case ('select') {
        <select
          class="filter-select"
          [ngModel]="value()"
          (ngModelChange)="set($event)"
          [attr.title]="parameter().name">
          <option [ngValue]="null">{{ parameter().name }}</option>
          @for (o of options(); track o.value) {
            <option [ngValue]="o.value">{{ o.label }}</option>
          }
        </select>
      }
      @case ('number') {
        <input
          class="filter-input"
          type="number"
          [placeholder]="parameter().name"
          [ngModel]="value()"
          (ngModelChange)="setNumber($event)" />
      }
      @default {
        <input
          class="filter-input"
          type="text"
          [placeholder]="parameter().name"
          [ngModel]="value()"
          (ngModelChange)="set($event || null)" />
      }
    }
  `,
})
export class ParameterControlComponent {
  private store = inject(FiltersStore);

  parameter = input.required<Parameter>();

  /** Decide qual sub-controle renderizar. */
  kind = computed<ControlKind>(() => {
    const p = this.parameter();
    const t = p.type;
    if (t === 'date/range') return 'date-range';
    if (t === 'date/all-options' || t === 'date/single' || t === 'date/relative') return 'date-presets';
    if (t === 'temporal-unit') return 'temporal-unit';
    if (t === 'number/=' || t === 'number/!=' || t === 'number/between' || t === 'number/>=' || t === 'number/<=') return 'number';
    // string/= com values_query_type=list ou values_source_config → select
    if (p.values_query_type === 'list' && this.options().length > 0) return 'select';
    return 'text';
  });

  /** Opções de select extraídas do values_source_config. */
  options = computed<{ value: any; label: string }[]>(() => {
    const cfg = this.parameter().values_source_config;
    const vals = cfg?.values ?? [];
    return vals.map((v: any) => ({
      value: Array.isArray(v) ? v[0] : v,
      label: Array.isArray(v) ? String(v[1] ?? v[0]) : String(v),
    }));
  });

  /** Valor atual lido do store (re-render via signal). */
  value = computed(() => this.store.state()[this.parameter().slug] ?? null);

  set(v: any): void {
    this.store.set(this.parameter().slug, v);
  }

  // ── presets de date-range (todos no formato YYYY-MM-DD~YYYY-MM-DD) ──

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  currentMonth = computed(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${this.fmt(first)}~${this.fmt(last)}`;
  });

  previousMonth = computed(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return `${this.fmt(first)}~${this.fmt(last)}`;
  });

  currentYear = computed(() => {
    const y = new Date().getFullYear();
    return `${y}-01-01~${y}-12-31`;
  });

  previousYear = computed(() => {
    const y = new Date().getFullYear() - 1;
    return `${y}-01-01~${y}-12-31`;
  });

  last30days = computed(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return `${this.fmt(start)}~${this.fmt(now)}`;
  });

  last90days = computed(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return `${this.fmt(start)}~${this.fmt(now)}`;
  });

  knownRanges = computed(() => [
    this.currentMonth(), this.previousMonth(),
    this.currentYear(), this.previousYear(),
    this.last30days(), this.last90days(),
  ]);

  setNumber(v: any): void {
    if (v === '' || v === null || v === undefined) {
      this.store.set(this.parameter().slug, null);
    } else {
      this.store.set(this.parameter().slug, Number(v));
    }
  }
}
