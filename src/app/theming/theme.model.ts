/**
 * Branding do tenant.
 *
 * Phase 7 (refator): configurável via tela /settings/branding (apenas admin).
 * Persistido em localStorage['branding'] como JSON com data URLs pras imagens.
 * Phase 10 (backend) migra pra DB compartilhada por tenant.
 *
 * Os tokens são aplicados como CSS vars em runtime pelo ThemeService.
 */
export interface BrandingConfig {
  /** Nome do produto/cliente exibido no header/sidebar/login. */
  brand: string;
  /** Sub-título exibido abaixo do brand (opcional). */
  brandSub?: string;
  /**
   * Letra usada no logo quando não há imagem (1 char).
   * Default = primeira letra do brand.
   */
  logoText?: string;
  /**
   * Data URL ou path da imagem do logo. Se setado, usa <img>;
   * senão usa logoText em badge colorido.
   */
  logoUrl?: string;
  /** Data URL ou path da imagem do favicon. */
  faviconUrl?: string;
  colors: {
    /** Cor principal — botões CTA, brand mark, hover indicators. */
    primary: string;
    /** Cor secundária — accent, hover states, segunda série de gráficos. */
    secondary: string;
    /** Cor terciária — terceira série de gráficos, destaques. */
    tertiary: string;
    /** Foreground do botão primary (texto sobre a cor principal). Auto-calculado se omitido. */
    primaryFg?: string;
  };
}

/** Branding padrão (Freedom DS yellow/indigo). Usado quando localStorage está vazio. */
export const DEFAULT_BRANDING: BrandingConfig = {
  brand: 'Plataforma Dados Nalk',
  brandSub: 'Consumo Metabase em tempo real',
  logoText: 'N',
  colors: {
    primary: '#FFD500',
    secondary: '#4E61F6',
    tertiary: '#22C55E',
    primaryFg: '#1F2937',
  },
};

/**
 * Paleta complementar para cards de gráfico — garante 10 cores distintas
 * mesmo que o admin defina só 3.
 */
export const COMPLEMENTARY_PALETTE = [
  '#E2413C', '#F97316', '#1B3A5C', '#8B3D50', '#2D6A4F',
  '#D4660A', '#C0392B', '#9B9690',
];
