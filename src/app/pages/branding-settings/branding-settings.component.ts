/**
 * BrandingSettingsPageComponent — tela admin de branding por grupo.
 *
 * Workflow:
 *   1. Admin escolhe um grupo no dropdown (ou "Global / Padrão")
 *   2. Form preenche com o branding salvo daquele grupo (ou DEFAULT)
 *   3. Edita cores/logo/favicon → preview ao vivo
 *   4. "Salvar e aplicar" persiste e — se o grupo selecionado for o
 *      grupo ativo do admin logado — aplica imediatamente
 *
 * Acesso restrito a superusers (adminGuard).
 * Persistência: localStorage keyed por groupId. Phase 10 migra pra backend.
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ThemeService } from '../../theming/theme.service';
import { BrandingConfig, DEFAULT_BRANDING } from '../../theming/theme.model';
import { MetabaseService } from '../../metabase.service';

interface GroupOption {
  id: number | null;        // null = "Global / Padrão"
  name: string;
  member_count?: number;
}

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div class="branding-page">
      <div class="page-header">
        <div>
          <h1 class="section-title">Configurações de Branding</h1>
          <p class="section-sub">
            Cada grupo do Metabase pode ter sua própria identidade visual.
            Selecione o grupo e edite cores, logo e favicon.
          </p>
        </div>
      </div>

      <!-- SELECTOR DE GRUPO -->
      <section class="branding-card group-selector">
        <label class="field">
          <span>Editando branding de:</span>
          <select class="filter-input" [ngModel]="selectedGroupId()" (ngModelChange)="onGroupChange($event)">
            <option [ngValue]="null">Global / Padrão (fallback)</option>
            @for (g of groups(); track g.id) {
              <option [ngValue]="g.id">{{ g.name }} {{ g.member_count ? '(' + g.member_count + ')' : '' }}</option>
            }
          </select>
          <small>
            @if (selectedGroupId() == null) {
              Aplicado a usuários sem grupo específico ou como fallback.
            } @else {
              Aplicado a todos usuários do grupo "{{ selectedGroupName() }}" que logarem no app.
            }
          </small>
        </label>
      </section>

      <div class="branding-grid">
        <!-- IDENTIDADE -->
        <section class="branding-card">
          <h2>Identidade</h2>

          <label class="field">
            <span>Nome do produto / cliente</span>
            <input type="text" class="filter-input" [(ngModel)]="form().brand" />
          </label>

          <label class="field">
            <span>Subtítulo</span>
            <input type="text" class="filter-input" [(ngModel)]="form().brandSub" />
          </label>

          <label class="field">
            <span>Letra do logo (fallback se sem imagem)</span>
            <input type="text" class="filter-input" maxlength="2" [(ngModel)]="form().logoText" />
          </label>
        </section>

        <!-- CORES -->
        <section class="branding-card">
          <h2>Cores</h2>

          <label class="field color-field">
            <span>Cor primária</span>
            <div class="color-row">
              <input type="color" [(ngModel)]="form().colors.primary" />
              <input type="text" class="filter-input color-hex" [(ngModel)]="form().colors.primary" />
            </div>
            <small>Botões principais, brand mark, indicadores ativos.</small>
          </label>

          <label class="field color-field">
            <span>Cor secundária</span>
            <div class="color-row">
              <input type="color" [(ngModel)]="form().colors.secondary" />
              <input type="text" class="filter-input color-hex" [(ngModel)]="form().colors.secondary" />
            </div>
            <small>Accent, segunda série de gráficos.</small>
          </label>

          <label class="field color-field">
            <span>Cor terciária</span>
            <div class="color-row">
              <input type="color" [(ngModel)]="form().colors.tertiary" />
              <input type="text" class="filter-input color-hex" [(ngModel)]="form().colors.tertiary" />
            </div>
            <small>Terceira série de gráficos, destaques secundários.</small>
          </label>
        </section>

        <!-- IMAGENS -->
        <section class="branding-card">
          <h2>Imagens</h2>

          <div class="field">
            <span>Logo</span>
            <div class="image-row">
              <div class="image-preview" [style.background]="form().colors.primary">
                @if (form().logoUrl) {
                  <img [src]="form().logoUrl" alt="Logo preview" />
                } @else {
                  <span [style.color]="logoFg()">{{ form().logoText || '?' }}</span>
                }
              </div>
              <div class="image-actions">
                <input #logoInput type="file" accept="image/*" hidden (change)="onLogoUpload($event)" />
                <button mat-stroked-button (click)="logoInput.click()">
                  <mat-icon>upload</mat-icon> Carregar imagem
                </button>
                @if (form().logoUrl) {
                  <button mat-button (click)="clearLogo()">
                    <mat-icon>close</mat-icon> Remover
                  </button>
                }
              </div>
            </div>
            <small>Recomendado: PNG/SVG quadrado, 128×128px, fundo transparente.</small>
          </div>

          <div class="field">
            <span>Favicon</span>
            <div class="image-row">
              <div class="image-preview small">
                @if (form().faviconUrl) {
                  <img [src]="form().faviconUrl" alt="Favicon preview" />
                } @else {
                  <mat-icon>public</mat-icon>
                }
              </div>
              <div class="image-actions">
                <input #faviconInput type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  hidden (change)="onFaviconUpload($event)" />
                <button mat-stroked-button (click)="faviconInput.click()">
                  <mat-icon>upload</mat-icon> Carregar imagem
                </button>
                @if (form().faviconUrl) {
                  <button mat-button (click)="clearFavicon()">
                    <mat-icon>close</mat-icon> Remover
                  </button>
                }
              </div>
            </div>
            <small>ICO, PNG ou SVG.</small>
          </div>
        </section>

        <!-- PREVIEW -->
        <section class="branding-card preview-card">
          <h2>Preview ao vivo</h2>
          <div class="preview-block">
            <div class="preview-header">
              <div class="preview-logo" [style.background]="form().colors.primary">
                @if (form().logoUrl) {
                  <img [src]="form().logoUrl" alt="" />
                } @else {
                  <span [style.color]="logoFg()">{{ form().logoText || '?' }}</span>
                }
              </div>
              <div class="preview-text">
                <strong>{{ form().brand || '—' }}</strong>
                <small>{{ form().brandSub || ' ' }}</small>
              </div>
            </div>
            <button class="preview-button" [style.background]="form().colors.primary" [style.color]="logoFg()">
              Botão primário
            </button>
            <div class="preview-swatches">
              <div class="swatch" [style.background]="form().colors.primary"></div>
              <div class="swatch" [style.background]="form().colors.secondary"></div>
              <div class="swatch" [style.background]="form().colors.tertiary"></div>
            </div>
          </div>
        </section>
      </div>

      <!-- ACTIONS -->
      <div class="branding-actions">
        <button mat-button (click)="resetGroup()">
          <mat-icon>refresh</mat-icon> Limpar este grupo
        </button>
        <button mat-flat-button color="primary" (click)="save()">
          <mat-icon>save</mat-icon> Salvar e aplicar
        </button>
      </div>
    </div>
  `,
  styleUrl: './branding-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandingSettingsPageComponent {
  private theme = inject(ThemeService);
  private metabase = inject(MetabaseService);
  private snackbar = inject(MatSnackBar);

  selectedGroupId = signal<number | null>(null);
  groups = signal<GroupOption[]>([]);
  form = signal<BrandingConfig>(this.theme.loadGroupConfig(null));

  constructor() {
    // Carrega grupos do Metabase
    this.metabase.listGroups().subscribe({
      next: (gs) => this.groups.set(gs),
      error: (e) => console.error('[BrandingSettings] falha listGroups', e),
    });
  }

  selectedGroupName(): string {
    const id = this.selectedGroupId();
    if (id == null) return 'Global';
    return this.groups().find((g) => g.id === id)?.name ?? '(grupo)';
  }

  onGroupChange(id: number | null): void {
    this.selectedGroupId.set(id);
    this.form.set(structuredClone(this.theme.loadGroupConfig(id)));
  }

  logoFg(): string {
    const hex = this.form().colors.primary.replace('#', '');
    if (hex.length !== 6) return '#1F2937';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? '#1F2937' : '#FFFFFF';
  }

  onLogoUpload(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileToDataUrl(file).then((url) => this.form.update((f) => ({ ...f, logoUrl: url })));
  }

  onFaviconUpload(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileToDataUrl(file).then((url) => this.form.update((f) => ({ ...f, faviconUrl: url })));
  }

  clearLogo(): void { this.form.update((f) => ({ ...f, logoUrl: undefined })); }
  clearFavicon(): void { this.form.update((f) => ({ ...f, faviconUrl: undefined })); }

  save(): void {
    const id = this.selectedGroupId();
    this.theme.save(this.form(), id);
    const target = id == null ? 'Global' : this.selectedGroupName();
    this.snackbar.open(`Branding de "${target}" salvo`, 'Fechar', {
      duration: 3000, panelClass: 'snackbar-success',
    });
  }

  resetGroup(): void {
    const id = this.selectedGroupId();
    this.theme.reset(id);
    this.form.set(structuredClone(this.theme.loadGroupConfig(id)));
    this.snackbar.open('Branding restaurado para o fallback', 'Fechar', { duration: 3000 });
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
