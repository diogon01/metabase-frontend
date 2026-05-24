/**
 * Shapes da auth pass-through Metabase.
 *
 * Metabase endpoints:
 *  - POST /api/session       → cria sessão {id: token}
 *  - GET  /api/user/current  → user info do dono do token
 *  - DELETE /api/session     → invalida sessão
 */

export interface LoginRequest {
  username: string;     // email no Metabase
  password: string;
}

export interface MetabaseSessionResponse {
  id: string;           // session token (cola em X-Metabase-Session)
}

/** Subset de fields que usamos do GET /api/user/current */
export interface MetabaseUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  common_name?: string;
  is_superuser?: boolean;
  is_active?: boolean;
  /** Grupos do user. Cada item: { id: groupId, is_group_manager: boolean } */
  user_group_memberships?: Array<{ id: number; is_group_manager: boolean }>;
}

/** Item retornado por GET /api/permissions/group */
export interface MetabaseGroup {
  id: number;
  name: string;
  member_count?: number;
}
