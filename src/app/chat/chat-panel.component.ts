/**
 * ChatPanelComponent — splitter fixo à direita do dashboard.
 *
 * UI polida com:
 *  - Empty state convidativo com chips de sugestão clicáveis
 *  - Header limpo (avatar IA + nome + status "online")
 *  - Mensagens com bubbles arredondadas, timestamps discretos
 *  - Input textarea com auto-resize (cresce até 4 linhas)
 *  - Indicador "digitando" animado
 *  - Botão "anexar dashboard atual" inline quando há contexto disponível
 *
 * Backend de IA ainda não conectado — respostas são mock natural-soando.
 */
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { ChatStore } from './chat.store';
import { DashboardContextService } from './dashboard-context.service';

const SUGGESTIONS = [
  'Resumo do mês atual',
  'Quais cards estão piorando?',
  'Compare 2024 vs 2025',
  'Top 5 clientes do período',
];

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  template: `
    <aside class="chat-panel">
      <header class="chat-header">
        <div class="chat-title">
          <div class="bot-avatar">
            <mat-icon>auto_awesome</mat-icon>
          </div>
          <div class="title-text">
            <strong>Assistente</strong>
            <span class="online-dot"></span>
            <small>Online</small>
          </div>
        </div>
        <div class="chat-actions">
          <button mat-icon-button [matMenuTriggerFor]="moreMenu" matTooltip="Mais">
            <mat-icon>more_vert</mat-icon>
          </button>
          <button mat-icon-button (click)="chat.toggleOpen()" matTooltip="Fechar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <mat-menu #moreMenu>
          <button mat-menu-item (click)="clear()" [disabled]="!chat.hasMessages()">
            <mat-icon>delete_sweep</mat-icon>
            <span>Limpar conversa</span>
          </button>
        </mat-menu>
      </header>

      <div #scrollEl class="chat-messages">
        @if (!chat.hasMessages()) {
          <div class="chat-empty">
            <div class="empty-glow"></div>
            <div class="empty-icon">
              <mat-icon>auto_awesome</mat-icon>
            </div>
            <h3>Como posso ajudar?</h3>
            <p>Faça perguntas sobre seus dashboards e métricas.</p>

            <div class="suggestion-chips">
              @for (s of suggestions; track s) {
                <button class="chip" (click)="useSuggestion(s)">
                  <mat-icon>auto_fix_high</mat-icon>
                  <span>{{ s }}</span>
                </button>
              }
            </div>
          </div>
        } @else {
          @for (m of chat.messages(); track m.id) {
            <article class="msg" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'">
              @if (m.role === 'assistant') {
                <div class="msg-avatar"><mat-icon>auto_awesome</mat-icon></div>
              }
              <div class="msg-wrap">
                <div class="msg-bubble">
                  <div class="msg-body" [innerHTML]="render(m.content)"></div>
                  @if (m.context) {
                    <div class="msg-context">
                      <mat-icon>attachment</mat-icon>
                      <span>{{ m.context.dashboardName }}</span>
                      @if (m.context.filters && objectKeys(m.context.filters).length) {
                        <span class="dot-sep">·</span>
                        <span>{{ objectKeys(m.context.filters).length }} filtros</span>
                      }
                    </div>
                  }
                </div>
                <div class="msg-meta">{{ formatTime(m.timestamp) }}</div>
              </div>
            </article>
          }
          @if (chat.sending()) {
            <article class="msg assistant">
              <div class="msg-avatar"><mat-icon>auto_awesome</mat-icon></div>
              <div class="msg-wrap">
                <div class="msg-bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </article>
          }
        }
      </div>

      <footer class="chat-input">
        @if (ctxService.current(); as c) {
          <div class="ctx-bar">
            <mat-icon class="ctx-icon">dashboard</mat-icon>
            <span class="ctx-label">{{ c.dashboardName }}</span>
            <button
              mat-button
              class="ctx-toggle"
              [class.active]="attachContext()"
              (click)="attachContext.set(!attachContext())">
              <mat-icon>{{ attachContext() ? 'check' : 'add_link' }}</mat-icon>
              <span>{{ attachContext() ? 'Anexado' : 'Anexar' }}</span>
            </button>
          </div>
        }

        <div class="chat-input-row">
          <textarea
            #inputEl
            class="chat-textarea"
            placeholder="Pergunte algo…"
            [(ngModel)]="draft"
            (input)="autoResize($event)"
            (keydown.enter)="onEnter($event)"
            rows="1"></textarea>
          <button
            class="send-btn"
            [class.active]="canSend()"
            [disabled]="!canSend()"
            (click)="onSend()"
            matTooltip="Enviar (Enter)">
            <mat-icon>arrow_upward</mat-icon>
          </button>
        </div>
      </footer>
    </aside>
  `,
  styleUrl: './chat-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPanelComponent implements AfterViewChecked {
  readonly chat = inject(ChatStore);
  readonly ctxService = inject(DashboardContextService);
  private sanitizer = inject(DomSanitizer);

  draft = signal('');
  attachContext = signal(false);
  suggestions = SUGGESTIONS;

  scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  inputEl = viewChild<ElementRef<HTMLTextAreaElement>>('inputEl');

  private prevMsgCount = 0;

  ngAfterViewChecked(): void {
    const count = this.chat.messages().length;
    if (count !== this.prevMsgCount) {
      this.prevMsgCount = count;
      const el = this.scrollEl()?.nativeElement;
      if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }

  canSend(): boolean {
    return !!this.draft().trim() && !this.chat.sending();
  }

  onEnter(ev: Event): void {
    const keyEv = ev as KeyboardEvent;
    if (keyEv.shiftKey) return;
    keyEv.preventDefault();
    this.onSend();
  }

  onSend(): void {
    const text = this.draft().trim();
    if (!text) return;
    const ctx = this.attachContext() ? this.ctxService.current() ?? undefined : undefined;
    this.chat.send(text, ctx);
    this.draft.set('');
    this.attachContext.set(false);
    // Reseta altura do textarea
    const el = this.inputEl()?.nativeElement;
    if (el) el.style.height = 'auto';
  }

  useSuggestion(text: string): void {
    this.draft.set(text);
    const el = this.inputEl()?.nativeElement;
    if (el) { el.focus(); this.autoResize({ target: el } as any); }
  }

  autoResize(ev: Event): void {
    const el = ev.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  clear(): void {
    this.chat.clear();
  }

  render(md: string): SafeHtml {
    if (!md) return '';
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(md, { async: false }));
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
