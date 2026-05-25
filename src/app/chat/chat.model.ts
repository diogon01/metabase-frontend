/**
 * Mensagem do chat. Estrutura preparada pra futura integração com LLM:
 *  - role: 'user' | 'assistant' | 'system' (compatível com OpenAI/Anthropic)
 *  - content: texto da mensagem
 *  - timestamp: pra ordenação e display "há 5 min"
 *  - context: dados anexados do dashboard atual (snapshot ao enviar)
 *  - placeholder: marca respostas mock enquanto não há agente real
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Snapshot do dashboard quando user anexou contexto (opcional). */
  context?: ChatContext;
  /** true = resposta placeholder do mock (sem agente real). */
  placeholder?: boolean;
}

export interface ChatContext {
  dashboardId: number;
  dashboardName: string;
  tabId?: number | null;
  /** Slugs e valores dos filtros ativos no momento do envio. */
  filters?: Record<string, any>;
}
