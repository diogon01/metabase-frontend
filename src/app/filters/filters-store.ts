/**
 * FiltersStore — signal global compartilhado entre todos os cards.
 *
 * Estado: Record<slug, value> onde slug = nome do parameter no Metabase
 * (vem de `/api/dashboard/{id}.parameters[].slug`).
 *
 * - Cards reagem a mudanças via signal (re-disparam runDashcard)
 * - `applyDefaults()` é chamado pelo DashboardComponent quando carrega
 *   o meta, populando defaults sem sobrescrever valores já existentes
 */
import { Injectable, signal } from '@angular/core';
import type { Parameter } from '../core/models/metabase.model';

@Injectable({ providedIn: 'root' })
export class FiltersStore {
  private _state = signal<Record<string, any>>({});

  /** Signal read-only — para componentes que precisam reagir. */
  readonly state = this._state.asReadonly();

  /** Snapshot imutável atual. */
  snapshot(): Record<string, any> {
    return this._state();
  }

  /** Define um valor pra um slug específico. */
  set(slug: string, value: any): void {
    console.log('[FiltersStore.set]', slug, '=', value);
    this._state.update((s) => ({ ...s, [slug]: value }));
  }

  /** Limpa todos os filtros. */
  clear(): void {
    this._state.set({});
  }

  /**
   * Aplica defaults dos parameters do dashboard, sem sobrescrever
   * valores que o usuário já tenha definido.
   */
  applyDefaults(parameters: Parameter[]): void {
    const current = this._state();
    const patch: Record<string, any> = {};
    for (const p of parameters) {
      if (p.default !== undefined && current[p.slug] === undefined) {
        patch[p.slug] = p.default;
      }
    }
    if (Object.keys(patch).length) {
      console.log('[FiltersStore.applyDefaults]', patch);
      this._state.update((s) => ({ ...s, ...patch }));
    }
  }

  /**
   * Cross-filter: tenta achar um parameter cujo slug case com a coluna
   * clicada (case-insensitive, ignorando underscores/espaços).
   * Se encontrar, seta o valor — outros cards vão re-renderizar.
   *
   * Heurística: normalizado(slug) == normalizado(columnName).
   * Ex: clicar em fatia de "Canal" do pie → busca parameter slug=canal.
   */
  applyCrossFilter(parameters: Parameter[], columnName: string, value: any): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
    const target = norm(columnName);
    const param = parameters.find((p) => norm(p.slug) === target);
    if (!param) {
      console.warn(`[FiltersStore.applyCrossFilter] no parameter matches column "${columnName}"`);
      return false;
    }
    console.log(`[FiltersStore.applyCrossFilter] ${param.slug} = ${value} (from column "${columnName}")`);
    this.set(param.slug, value);
    return true;
  }
}
