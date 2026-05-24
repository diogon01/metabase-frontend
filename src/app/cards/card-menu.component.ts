/**
 * CardMenuComponent — botão "..." que abre menu de export pra um card.
 *
 * Inputs:
 *  - title: nome do card (usado como filename)
 *  - result: CardResult atual (pra CSV); pode ser null
 *  - elementRef: ElementRef<HTMLElement> do <article> que será capturado pra PNG
 *
 * Itens do menu:
 *  - Exportar CSV (desabilitado se result vazio)
 *  - Exportar PNG (sempre disponível)
 */
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import type { CardResult } from '../metabase.service';
import { ExportService } from '../core/export/export.service';

@Component({
  selector: 'app-card-menu',
  standalone: true,
  imports: [MatMenuModule, MatIconModule, MatButtonModule],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      class="card-menu-trigger"
      aria-label="Mais opções">
      <mat-icon>more_vert</mat-icon>
    </button>

    <mat-menu #menu="matMenu" xPosition="before">
      <button
        mat-menu-item
        [disabled]="!result()?.rows?.length"
        (click)="exportCsv()">
        <mat-icon>description</mat-icon>
        <span>Exportar CSV</span>
      </button>
      <button mat-menu-item (click)="exportPng()">
        <mat-icon>image</mat-icon>
        <span>Exportar PNG</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    :host { display: inline-block; }
    .card-menu-trigger {
      width: 28px;
      height: 28px;
      line-height: 28px !important;
      color: var(--edge-mute-2) !important;
    }
    .card-menu-trigger:hover { color: var(--edge-text) !important; }
    .card-menu-trigger mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardMenuComponent {
  private exportService = inject(ExportService);

  title = input.required<string>();
  result = input.required<CardResult | null>();
  /** Elemento DOM a ser capturado pelo PNG (passado direto via template ref). */
  captureEl = input.required<HTMLElement | undefined>();

  exportCsv(): void {
    const r = this.result();
    if (!r?.rows?.length) return;
    this.exportService.downloadCsv(this.title(), r);
  }

  exportPng(): void {
    const el = this.captureEl();
    if (!el) return;
    this.exportService.downloadPng(this.title(), el);
  }
}
