/**
 * Cliente Metabase + tipos + interceptor.
 * Tudo num arquivo só pra POC ficar fácil de ler.
 *
 * Endpoints usados:
 *  - GET  /api/dashboard/{id}                                                  → metadata (cards, tabs, params)
 *  - POST /api/dashboard/{dash}/dashcard/{dashcard}/card/{card}/query          → executa card no contexto do dashboard (respeita filtros)
 *  - POST /api/card/{id}/query/json                                            → executa card avulso
 *
 * Auth: header X-Metabase-Session (session token).
 */
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';

// ── tipos ────────────────────────────────────────────────────────────

/** Resposta crua do /query endpoint do Metabase. */
export interface MetabaseQueryResult {
  data: {
    rows: any[][];
    cols: { name: string; display_name: string; base_type: string }[];
    /** Para smartscalar: análise da última observação vs anterior. */
    insights?: ScalarInsight[];
  };
  row_count: number;
}

/** Métricas calculadas pelo Metabase para smartscalar/scalar com série temporal. */
export interface ScalarInsight {
  col: string;
  unit?: string;                       // 'day' | 'month' | 'year' | ...
  'last-value': number;
  'previous-value': number;
  'last-change': number;               // delta em decimal: 0.23 = +23%
  slope?: number;
  offset?: number;
}

/** Linha já mapeada para objeto (colNome → valor). */
export type Row = Record<string, any>;

/** Resultado processado pelo service — pronto pra mandar pro ngx-charts. */
export interface CardResult {
  rows: Row[];
  cols: { name: string; display_name: string; base_type: string }[];
  /** Smartscalar insights, se disponíveis. */
  insights?: ScalarInsight[];
}

/** Item retornado por GET /api/dashboard/ (subset). */
export interface DashboardListItem {
  id: number;
  name: string;
  description?: string;
  collection_id?: number | null;
  archived?: boolean;
}

/** Item retornado por GET /api/collection/ (subset). */
export interface CollectionItem {
  id: number | 'root';
  name: string;
  slug?: string;
  location?: string;       // ex: "/", "/587/", "/587/1378/"
  parent_id?: number | null;
  archived?: boolean;
}

// ── interceptor ──────────────────────────────────────────────────────

/**
 * Interceptor: injeta auth no Metabase API.
 *
 * Prioridade:
 *  1. Se logado (auth.getToken()): X-Metabase-Session (sessão do user)
 *  2. Fallback dev: X-API-KEY do environment (API key compartilhada — POC)
 *
 * Erros 401 disparam logout automático e redirect /login (sessão expirada).
 * Exceção: /session (login endpoint) — 401 ali significa credenciais erradas,
 * não sessão expirada.
 */
export const metabaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.METABASE_BASE)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const sessionToken = auth.getToken();

  const headers: Record<string, string> = sessionToken
    ? { 'X-Metabase-Session': sessionToken }
    : { 'X-API-KEY': environment.METABASE_SESSION };

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      const isLoginRequest = req.url.endsWith('/session') && req.method === 'POST';
      if (err.status === 401 && !isLoginRequest && sessionToken) {
        // sessão expirada → limpa e manda pro login
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};

// ── service ──────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MetabaseService {
  private http = inject(HttpClient);
  private base = environment.METABASE_BASE;

  /** Metadata do dashboard (cards, tabs, parameters). */
  getDashboard(dashboardId: number): Observable<any> {
    return this.http.get(`${this.base}/dashboard/${dashboardId}`);
  }

  /** Lista todos os dashboards visíveis para o user atual (respeita perms da sessão). */
  listDashboards(): Observable<DashboardListItem[]> {
    return this.http.get<DashboardListItem[]>(`${this.base}/dashboard/`).pipe(
      map((arr) =>
        arr
          .filter((d) => !d.archived)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      ),
    );
  }

  /** Lista todos os grupos (Permissions Groups) do Metabase. */
  listGroups(): Observable<{ id: number; name: string; member_count?: number }[]> {
    return this.http.get<{ id: number; name: string; member_count?: number }[]>(
      `${this.base}/permissions/group`,
    ).pipe(
      map((arr) =>
        arr
          .filter((g) => g.id !== 1)            // skip "All Users" (todos)
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    );
  }

  /** Lista todas as coleções do Metabase. */
  listCollections(): Observable<CollectionItem[]> {
    return this.http.get<CollectionItem[]>(`${this.base}/collection/`).pipe(
      map((arr) =>
        arr
          .filter((c) => !c.archived)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      ),
    );
  }

  /**
   * Executa um card *no contexto do dashboard* — assim respeita os
   * filtros declarados em /api/dashboard/{id}.parameters.
   */
  runDashcard(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    filters: Record<string, any>,
    dashboardMeta?: any,
  ): Observable<CardResult> {
    const body = {
      parameters: this.buildParameters(filters, dashboardMeta),
    };
    return this.http
      .post<MetabaseQueryResult>(
        `${this.base}/dashboard/${dashboardId}/dashcard/${dashcardId}/card/${cardId}/query`,
        body,
      )
      .pipe(map((r) => this.toRows(r)));
  }

  // ── helpers ───────────────────────────────────────────────────────

  /**
   * Converte o estado dos filtros (Record<slug, value>) para o array
   * `parameters` que o Metabase espera. Para cada parameter do dashboard,
   * busca um valor no store pelo slug; se houver, inclui no payload.
   *
   * Phase 2: itera `dashboardMeta.parameters[]` diretamente — não há mais
   * mapping hardcoded. Funciona para qualquer dashboard.
   */
  private buildParameters(filters: Record<string, any>, dashboardMeta?: any): any[] {
    if (!dashboardMeta) return [];
    const params = dashboardMeta.parameters || [];
    const out: any[] = [];

    for (const p of params) {
      const value = filters[p.slug];
      if (value === null || value === undefined || value === '') continue;

      out.push({
        id: p.id,
        type: p.type,
        // target removido: Metabase ignora se ausente e usa parameter_mappings
        // do dashcard pra mapear o parameter na query.
        value,
      });
    }
    if (out.length) console.log('[buildParameters] →', out);
    return out;
  }

  /** Pivot {rows, cols} → array de objetos com nomes de coluna como chave. */
  private toRows(r: MetabaseQueryResult): CardResult {
    const cols = r.data.cols;
    const rows = r.data.rows.map((row) => {
      const o: Row = {};
      cols.forEach((c, i) => (o[c.name] = row[i]));
      return o;
    });
    return { rows, cols, insights: r.data.insights };
  }
}
