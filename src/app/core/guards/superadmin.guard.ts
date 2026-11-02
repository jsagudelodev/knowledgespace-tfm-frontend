import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Empresas es de plataforma: el backend exige superadmin en todo
 * `/companies` salvo `/me`. Con `adminGuard` un admin de empresa entraba a una
 * pantalla que solo recibía 403. */
export const superadminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getCurrentUserValue()?.role === 'superadmin') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
