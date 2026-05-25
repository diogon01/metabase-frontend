/**
 * ChatPanelComponent — splitter fixo à direita do dashboard.
 *
 * Phase 7.3 esqueleto: lista de mensagens + input + botão de anexar
 * contexto do dashboard atual. Resposta do agente é placeholder até
 * a integração com LLM real (Phase futura de IA).
 *
 * Toggle: botão no header da app abre/fecha; estado persiste em localStorage.
 */
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { ChatStore } from './chat.store';
import { DashboardContextService } from './dashboard-context.service';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <aside class="chat-panel" [class.is-open]="chat.open()">
      <header class="chat-header">
        <div class="chat-title">
          <mat-icon class="bot-icon">smart_toy</mat-icon>
          <div>
            <strong>Assistente</strong>
            <small>Placeholder — Agente IA em breve</small>
          </div>
        </div>
        <div class="chat-actions">
          <button mat-icon-button [matMenuTriggerFor]="moreMenu" title="Mais opções">
            <mat-icon>more_vert</mat-icon>
          </button>
          <button mat-icon-button (click)="chat.toggleOpen()" title="Fechar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <mat-menu #moreMenu>
          <button mat-menu-item (click)="clear()">
            <mat-icon>delete_outline</mat-icon>
            <span>Limpar conversa</span>
          </button>
        </mat-menu>
      </header>

      <div #scrollEl class="chat-messages">
        @if (!chat.hasMessages()) {
          <div class="chat-empty">
            <mat-icon>chat</mat-icon>
            <p>Sem mensagens ainda. Faça uma pergunta sobre seus dados.</p>
            <small>Sugestões: "Resumo do mês", "Quais cards estão piorando?", "Compare 2024 vs 2025"</small>
          </div>
        } @else {
          @for (m of chat.messages(); track m.id) {
            <article class="msg" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'">
              <div class="msg-bubble">
                <div class="msg-body" [innerHTML]="render(m.content)"></div>
                @if (m.context) {
                  <div class="msg-context">
                    <mat-icon>attachment</mat-icon>
                    {{ m.context.dashboardName }}
                    @if (m.context.filters && objectKeys(m.context.filters).length) {
                      · {{ objectKeys(m.context.filters).length }} filtros
                    }
                  </div>
                }
              </div>
              <div class="msg-meta">{{ formatTime(m.timestamp) }}</div>
            </article>
          }
          @if (chat.sending()) {
            <article class="msg assistant">
              <div class="msg-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </article>
          }
        }
      </div>

      <footer class="chat-input">
        @if (ctxService.current(); as c) {
          <div class="ctx-chip" title="Será anexado à próxima mensagem">
            <mat-icon>attachment</mat-icon>
            <span class="ctx-chip-text">{{ c.dashboardName }}</span>
            @if (attachContext()) {
              <button mat-icon-button (click)="attachContext.set(false)" class="ctx-remove" title="Desanexar">
                <mat-icon>close</mat-icon>
              </button>
            } @else {
              <button mat-button class="ctx-add" (click)="attachContext.set(true)">
                <mat-icon>add</mat-icon> Anexar
              </button>
            }
          </div>
        }

        <div class="chat-input-row">
          <textarea
            #inputEl
            class="chat-textarea"
            placeholder="Pergunte algo sobre seus dados…"
            [(ngModel)]="draft"
            (keydown.enter)="onEnter($event)"
            rows="1"></textarea>
          <button
            mat-icon-button
            class="send-btn"
            [disabled]="!draft().trim() || chat.sending()"
            (click)="onSend()"
            title="Enviar (Enter)">
            <mat-icon>send</mat-icon>
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

  scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  inputEl = viewChild<ElementRef<HTMLTextAreaElement>>('inputEl');

  private prevMsgCount = 0;

  ngAfterViewChecked(): void {
    const count = this.chat.messages().length;
    if (count !== this.prevMsgCount) {
      this.prevMsgCount = count;
      // Auto-scroll pro último
      const el = this.scrollEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  onEnter(ev: Event): void {
    const keyEv = ev as KeyboardEvent;
    if (keyEv.shiftKey) return; // Shift+Enter = nova linha
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
