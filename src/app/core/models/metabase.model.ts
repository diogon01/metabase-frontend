/**
 * Tipos baseados na API REST do Metabase (v1.59.x).
 * Apenas os campos que o frontend usa — o objeto real do Metabase tem muito
 * mais (cache_ttl, embedding_*, dependency_analysis_*, etc) que ignoramos.
 */

export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  tabs?: Tab[];
  parameters?: Parameter[];
  dashcards: Dashcard[];
}

export interface Tab {
  id: number;
  name: string;
  position: number;
  dashboard_id?: number;
}

export interface Dashcard {
  id: number;
  /** null em text/heading cards */
  card_id: number | null;
  dashboard_tab_id?: number | null;
  /** Grid 24-col do Metabase */
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  card: Card;
  visualization_settings: Record<string, any>;
  parameter_mappings?: ParameterMapping[];
}

export interface Card {
  id?: number;
  name?: string;
  display: CardDisplay;
  visualization_settings: Record<string, any>;
  /** Conteúdo de text/heading cards. */
  text?: string;
  dataset_query?: any;
}

export type CardDisplay =
  | 'scalar'
  | 'smartscalar'
  | 'line'
  | 'area'
  | 'bar'
  | 'row'
  | 'pie'
  | 'combo'
  | 'funnel'
  | 'gauge'
  | 'progress'
  | 'table'
  | 'pivot'
  | 'text'
  | 'heading';

export interface Parameter {
  id: string;
  name: string;
  slug: string;
  type: string; // 'date/range' | 'date/all-options' | 'string/=' | 'category' | 'temporal-unit' | 'number/=' | ...
  sectionId?: string;
  target?: any;
  default?: any;
  values_source_config?: { values?: any[]; card_id?: number };
  values_query_type?: 'list' | 'search' | 'none';
}

export interface ParameterMapping {
  parameter_id: string;
  card_id: number;
  target: any;
}
