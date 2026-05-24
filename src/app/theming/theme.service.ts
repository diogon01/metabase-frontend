/**
 * ThemeService — gerencia branding por grupo do Metabase.
 *
 * Phase 7.2: cada grupo de usuário tem seu branding. User loga → pegamos
 * 1º grupo dele → carregamos branding daquele grupo. Sem grupo → default.
 *
 * Storage atual: localStorage com keys por grupo (`branding:group:{id}`)
 * + global (`branding:default`). Phase 10 substitui a fonte pra backend
 * sem mudar a API pública.
 *
 *  initialize()                   - app bootstrap (carrega default)
 *  setActiveGroup(groupId|null)   - chamado pelo AuthService após login/logout
 *  save(config, groupId|null)     - persiste no key correto
 *  reset(groupId|null)            - limpa
 */
import { Injectable, computed, signal } from '@angular/core';
import {
  BrandingConfig,
  COMPLEMENTARY_PALETTE,
  DEFAULT_BRANDING,
} from './theme.model';

const STORAGE_PREFIX = 'branding';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Grupo cujo branding está ativo no momento (null = global). */
  private activeGroupId = signal<number | null>(null);
  private _config = signal<BrandingConfig>(DEFAULT_BRANDING);

  readonly config = this._config.asReadonly();
  readonly currentGroupId = this.activeGroupId.asReadonly();

  readonly brand = computed(() => this._config().brand);
  readonly brandSub = computed(() => this._config().brandSub ?? '');
  readonly logoText = computed(() => {
    const c = this._config();
    return c.logoText ?? (c.brand[0] ?? 'P').toUpperCase();
  });
  readonly logoUrl = computed(() => this._config().logoUrl ?? null);
  readonly hasLogoImage = computed(() => !!this._config().logoUrl);

  readonly chartScheme = computed(() => {
    const c = this._config().colors;
    return [c.primary, c.secondary, c.tertiary, ...COMPLEMENTARY_PALETTE];
  });

  /** Carrega branding global (sem grupo) no bootstrap. */
  initialize(): void {
    this.setActiveGroup(null);
  }

  /**
   * Define qual grupo está ativo e carrega o branding correspondente.
   * - null = usa o global ('branding:default')
   * - número = carrega 'branding:group:{id}' se existir, senão cai pro global
   */
  setActiveGroup(groupId: number | null): void {
    this.activeGroupId.set(groupId);
    const config = this.loadForGroup(groupId) ?? this.loadGlobal() ?? DEFAULT_BRANDING;
    this._config.set(config);
    this.applyTheme(config);
  }

  /** Carrega branding de um grupo específico (sem aplicar). Para a tela admin. */
  loadGroupConfig(groupId: number | null): BrandingConfig {
    return this.loadForGroup(groupId) ?? this.loadGlobal() ?? DEFAULT_BRANDING;
  }

  /**
   * Persiste config no key apropriado.
   * Se `groupId` casa com o `activeGroupId`, aplica imediatamente.
   */
  save(config: BrandingConfig, groupId: number | null): void {
    try {
      localStorage.setItem(this.storageKey(groupId), JSON.stringify(config));
    } catch (e) {
      console.error('[ThemeService.save] falhou', e);
    }
    if (groupId === this.activeGroupId()) {
      this._config.set(config);
      this.applyTheme(config);
    }
  }

  /** Remove branding de um grupo. Volta pro fallback. */
  reset(groupId: number | null): void {
    localStorage.removeItem(this.storageKey(groupId));
    if (groupId === this.activeGroupId()) {
      this.setActiveGroup(groupId);
    }
  }

  // ── internas ──────────────────────────────────────────────────────

  private storageKey(groupId: number | null): string {
    return groupId == null ? `${STORAGE_PREFIX}:default` : `${STORAGE_PREFIX}:group:${groupId}`;
  }

  private loadForGroup(groupId: number | null): BrandingConfig | null {
    if (groupId == null) return null;
    return this.parse(localStorage.getItem(this.storageKey(groupId)));
  }

  private loadGlobal(): BrandingConfig | null {
    return this.parse(localStorage.getItem(`${STORAGE_PREFIX}:default`));
  }

  private parse(json: string | null): BrandingConfig | null {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json) as BrandingConfig;
      return {
        ...DEFAULT_BRANDING,
        ...parsed,
        colors: { ...DEFAULT_BRANDING.colors, ...parsed.colors },
      };
    } catch {
      return null;
    }
  }

  private applyTheme(c: BrandingConfig): void {
    const root = document.documentElement.style;
    const fg = c.colors.primaryFg ?? autoFg(c.colors.primary);
    root.setProperty('--fd-primary', c.colors.primary);
    root.setProperty('--fd-primary-hover', darken(c.colors.primary, 0.1));
    root.setProperty('--fd-primary-fg', fg);
    root.setProperty('--accent-blue', c.colors.secondary);
    root.setProperty('--accent-green', c.colors.tertiary);

    if (c.faviconUrl) this.setFavicon(c.faviconUrl);
  }

  private setFavicon(url: string): void {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }
}

// ── helpers ────────────────────────────────────────────────────────

function autoFg(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#1F2937';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1F2937' : '#FFFFFF';
}

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const f = 1 - amount;
  const r = Math.round(parseInt(c.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(c.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(c.slice(4, 6), 16) * f);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
