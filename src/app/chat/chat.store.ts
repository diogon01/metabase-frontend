/**
 * ChatStore — signal-based store das mensagens do chat.
 *
 * Phase 7.3 (UI esqueleto): mensagens vivem em localStorage + thread global
 * (mesma conversa entre dashboards). Resposta do agente é PLACEHOLDER (mock
 * "Aguardando integração com agente IA").
 *
 * Quando integrar com agente real (futura Phase de IA), o método `send()`
 * vai chamar API (POST /api/chat ou direto pro LLM provider) e streamar
 * a resposta. UI já está pronta.
 */
import { Injectable, computed, signal } from '@angular/core';
import { ChatContext, ChatMessage } from './chat.model';

const STORAGE_KEY = 'chat_thread';
const OPEN_KEY = 'chat_open';

@Injectable({ providedIn: 'root' })
export class ChatStore {
  private _messages = signal<ChatMessage[]>([]);
  private _open = signal<boolean>(this.loadOpen());
  private _sending = signal<boolean>(false);

  readonly messages = this._messages.asReadonly();
  readonly open = this._open.asReadonly();
  readonly sending = this._sending.asReadonly();
  readonly hasMessages = computed(() => this._messages().length > 0);

  constructor() {
    this.load();
  }

  toggleOpen(): void {
    this._open.update((v) => !v);
    localStorage.setItem(OPEN_KEY, String(this._open()));
  }

  setOpen(v: boolean): void {
    this._open.set(v);
    localStorage.setItem(OPEN_KEY, String(v));
  }

  /**
   * Adiciona mensagem do user e dispara resposta mock do "agente".
   * Quando agente real existir, troca o setTimeout por chamada HTTP.
   */
  send(content: string, context?: ChatContext): void {
    const trimmed = content.trim();
    if (!trimmed || this._sending()) return;

    const userMsg: ChatMessage = {
      id: this.newId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      context,
    };
    this._messages.update((arr) => [...arr, userMsg]);
    this.persist();

    // Simula thinking → resposta placeholder
    this._sending.set(true);
    setTimeout(() => {
      const reply: ChatMessage = {
        id: this.newId(),
        role: 'assistant',
        content: this.mockReply(trimmed, context),
        timestamp: Date.now(),
        placeholder: true,
      };
      this._messages.update((arr) => [...arr, reply]);
      this._sending.set(false);
      this.persist();
    }, 800);
  }

  clear(): void {
    this._messages.set([]);
    this.persist();
  }

  // ── internos ────────────────────────────────────────────────────

  private load(): void {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return;
      this._messages.set(JSON.parse(json) as ChatMessage[]);
    } catch {
      /* corrupted; ignore */
    }
  }

  private loadOpen(): boolean {
    return localStorage.getItem(OPEN_KEY) === 'true';
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._messages()));
    } catch {
      /* quota; ignore */
    }
  }

  private newId(): string {
    return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private mockReply(userText: string, ctx?: ChatContext): string {
    const ctxStr = ctx
      ? `\n\n*Contexto recebido: ${ctx.dashboardName} (id=${ctx.dashboardId}), filtros ${JSON.stringify(ctx.filters ?? {})}*`
      : '';
    return (
      `🤖 **Placeholder** — Agente IA ainda não integrado. ` +
      `Sua mensagem foi: _"${userText}"_.` +
      ctxStr
    );
  }
}
