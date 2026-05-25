/**
 * DashboardContextService — snapshot do dashboard ativo, exposto pro chat.
 *
 * DashboardsPageComponent mantém este service atualizado a cada mudança
 * de dashboard/tab/filtros. ChatPanelComponent lê via signal pra botão
 * "📎 Anexar dashboard atual".
 */
import { Injectable, signal } from '@angular/core';
import { ChatContext } from './chat.model';

@Injectable({ providedIn: 'root' })
export class DashboardContextService {
  private _ctx = signal<ChatContext | null>(null);
  readonly current = this._ctx.asReadonly();

  set(ctx: ChatContext | null): void {
    this._ctx.set(ctx);
  }
}
