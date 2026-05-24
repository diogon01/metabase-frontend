/**
 * AuthService — pass-through Metabase.
 *
 * Fluxo:
 *  login(email, senha) → POST /api/session → recebe {id: token}
 *                      → GET /api/user/current com header X-Metabase-Session
 *                      → guarda token + user em localStorage
 *  logout()           → DELETE /api/session + limpa localStorage + redirect /login
 *  loadFromStorage()  → restore na inicialização
 *
 * Phase 3b: token vive em localStorage (vulnerável a XSS mas OK pra POC).
 * Phase 11 promove pra HttpOnly cookie via backend proxy.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, MetabaseSessionResponse, MetabaseUser } from './auth.models';
import { ThemeService } from '../../theming/theme.service';

const TOKEN_KEY = 'metabase_session';
const USER_KEY = 'metabase_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<MetabaseUser | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isSuperuser = computed(() => !!this._user()?.is_superuser);
  /** Primeiro grupo do user. Usado pra resolver branding por grupo. */
  readonly primaryGroupId = computed<number | null>(() => {
    const groups = this._user()?.user_group_memberships ?? [];
    // Ignora "All Users" (id=1) — não é grupo customizável
    const real = groups.filter((g) => g.id !== 1);
    return real[0]?.id ?? null;
  });

  constructor() {
    this.loadFromStorage();
  }

  /** Snapshot síncrono do token (pra interceptor que não pode ser reativo). */
  getToken(): string | null {
    return this._token();
  }

  /**
   * Loga no Metabase. Em sucesso, popula token+user no signal e localStorage.
   * Em erro, propaga o HttpErrorResponse (subscribe trata).
   */
  login(req: LoginRequest): Observable<MetabaseUser> {
    return this.http
      .post<MetabaseSessionResponse>(`${environment.METABASE_BASE}/session`, req)
      .pipe(
        tap((res) => {
          this._token.set(res.id);
          localStorage.setItem(TOKEN_KEY, res.id);
        }),
        switchMap(() =>
          this.http.get<MetabaseUser>(`${environment.METABASE_BASE}/user/current`).pipe(
            tap((user) => {
              this._user.set(user);
              localStorage.setItem(USER_KEY, JSON.stringify(user));
              this.theme.setActiveGroup(this.primaryGroupId());
            }),
          ),
        ),
      );
  }

  /** Limpa sessão. Tenta DELETE /api/session mas ignora erro (token pode já ser inválido). */
  logout(): void {
    const token = this._token();
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.theme.setActiveGroup(null);

    if (token) {
      this.http
        .delete(`${environment.METABASE_BASE}/session`, { body: { session_id: token } })
        .pipe(catchError(() => EMPTY))
        .subscribe();
    }

    this.router.navigate(['/login']);
  }

  /** Restaura sessão do localStorage. Chamado no construtor. */
  private loadFromStorage(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (!token) return;
    this._token.set(token);
    if (userJson) {
      try {
        this._user.set(JSON.parse(userJson));
        // Refresh: aplica branding do grupo do user restaurado
        this.theme.setActiveGroup(this.primaryGroupId());
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
  }
}
