/**
 * MarkdownCardComponent — renderiza text/heading cards do Metabase.
 *
 * Estrutura no Metabase:
 *   dashcard.card_id == null
 *   dashcard.visualization_settings.virtual_card.display = 'text' | 'heading'
 *   dashcard.visualization_settings.text = "## markdown..."
 *
 * Conteúdo vem do próprio Metabase (admin escreve) — confiável; usamos
 * bypassSecurityTrustHtml depois do marked. Em prod com user-content,
 * adicionar DOMPurify.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import type { Dashcard } from '../core/models/metabase.model';
import { dashcardColClasses } from '../core/util/grid.util';

@Component({
  selector: 'app-markdown-card',
  standalone: true,
  template: `
    <article class="markdown-card" [class]="colClasses()" [class.heading]="isHeading()">
      <div class="markdown-body" [innerHTML]="renderedHtml()"></div>
    </article>
  `,
  styles: [`
    .markdown-card {
      background: transparent;
      padding: 8px 4px;
      min-width: 0;
    }
    .markdown-card.heading {
      padding: 18px 4px 8px;
    }
    .markdown-body :global(h1),
    .markdown-body :global(h2),
    .markdown-body :global(h3) {
      color: var(--edge-text);
      margin: 0 0 6px;
    }
    .markdown-body :global(h2) { font: 700 18px/1.3 var(--font-family); }
    .markdown-body :global(h3) { font: 600 15px/1.35 var(--font-family); }
    .markdown-body :global(p),
    .markdown-body :global(em) {
      color: var(--edge-muted);
      font-size: 13px;
      line-height: 1.5;
      margin: 4px 0;
    }
    .markdown-body :global(em) { font-style: italic; }
    .markdown-body :global(strong) { color: var(--edge-text); font-weight: 600; }
    .markdown-body :global(a) { color: var(--accent-blue); }
    .markdown-body :global(code) {
      background: var(--edge-surface-alt);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownCardComponent {
  private sanitizer = inject(DomSanitizer);

  dashcard = input.required<Dashcard>();

  text = computed(() => {
    const vs = this.dashcard().visualization_settings ?? {};
    return (vs['text'] as string) ?? '';
  });

  isHeading = computed(() => {
    const vs = this.dashcard().visualization_settings ?? {};
    const vc = (vs['virtual_card'] as { display?: string }) ?? {};
    return vc.display === 'heading';
  });

  colClasses = computed(() => dashcardColClasses(this.dashcard()));

  renderedHtml = computed<SafeHtml>(() => {
    const source = this.text();
    if (!source) return '';
    const html = marked.parse(source, { async: false });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });
}
