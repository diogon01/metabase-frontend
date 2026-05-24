/**
 * Paleta padrão para ngx-charts. Em Fase 5 (white-label) vai virar
 * dinâmica via ThemeService.chartScheme.
 */
import { Color, ScaleType } from '@swimlane/ngx-charts';

export const DEFAULT_SCHEME: Color = {
  name: 'wine-gold',
  selectable: true,
  group: ScaleType.Ordinal,
  domain: [
    '#6B2D3E', '#C9A96E', '#4A1520', '#DFC08A',
    '#1B3A5C', '#2D6A4F', '#D4660A', '#C0392B',
    '#8B3D50', '#9B9690',
  ],
};
