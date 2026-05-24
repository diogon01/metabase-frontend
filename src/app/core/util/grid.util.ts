/**
 * Adaptadores entre o grid 24-col do Metabase e nosso grid CSS 12-col.
 *
 * Metabase armazena cada dashcard com `row`, `col`, `size_x`, `size_y`
 * num grid de 24 colunas. Nós usamos um grid CSS de 12 colunas com
 * spans col-N. Mapeamos `size_x` (1..24) → span (1..12), ordenamos por
 * (row, col), e ignoramos posicionamento absoluto (reflow responsivo).
 */
import type { Dashcard } from '../models/metabase.model';

/**
 * Converte `size_x` do Metabase (1-24) em span CSS (1-12) do nosso grid.
 * Cards muito pequenos (size_x < 3) recebem mínimo de 3 (col-3) pra
 * não ficarem ilegíveis depois do reflow.
 */
export function mapSizeXToSpan(sizeX: number): number {
  const raw = Math.round(sizeX / 2);
  return Math.max(3, Math.min(12, raw));
}

/**
 * Traduz o span (1-12) numa cascata de classes col-{bp}-{n} mobile-first.
 * Em xs sempre vira col-12; em sm/md/lg vão progredindo até xl bater no span final.
 *
 * Exemplos:
 *   span=12 → 'col-12'
 *   span=8  → 'col-12 col-lg-12 col-xl-8'
 *   span=6  → 'col-12 col-md-6'
 *   span=4  → 'col-12 col-sm-6 col-xl-4'
 *   span=3  → 'col-12 col-sm-6 col-md-4 col-lg-3'
 */
export function spanToColClasses(span: number): string {
  switch (span) {
    case 12: return 'col-12';
    case 11:
    case 10:
    case 9:
    case 8:  return 'col-12 col-lg-12 col-xl-8';
    case 7:
    case 6:  return 'col-12 col-md-6';
    case 5:  return 'col-12 col-sm-6 col-lg-5';
    case 4:  return 'col-12 col-sm-6 col-xl-4';
    case 3:  return 'col-12 col-sm-6 col-md-4 col-lg-3';
    case 2:  return 'col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2';
    case 1:  return 'col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2';
    default: return 'col-12 col-md-6';
  }
}

/** Atalho: dashcard.size_x → classes col-* prontas pra usar no template. */
export function dashcardColClasses(d: Dashcard): string {
  return spanToColClasses(mapSizeXToSpan(d.size_x));
}

/**
 * Ordena dashcards na ordem em que o Metabase os apresenta:
 * primeiro por row (linha), depois por col (coluna).
 */
export function sortDashcards(cards: Dashcard[]): Dashcard[] {
  return [...cards].sort((a, b) => (a.row - b.row) || (a.col - b.col));
}

/**
 * Filtra dashcards de uma tab específica. Se tabId não for passado,
 * retorna cards sem tab (dashboards single-page).
 */
export function dashcardsOfTab(cards: Dashcard[], tabId: number | null): Dashcard[] {
  if (tabId == null) return cards.filter((c) => c.dashboard_tab_id == null);
  return cards.filter((c) => c.dashboard_tab_id === tabId);
}
