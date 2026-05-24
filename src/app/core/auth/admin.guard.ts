/**
 * adminGuard — bloqueia rotas administrativas para usuários não-superuser.
 * Aproveita `is_superuser` do Metabase user (auth.isSuperuser()).
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperuser()) return true;
  console.warn('[adminGuard] acesso negado — usuário não é superuser');
  router.navigate(['/']);
  return false;
};
