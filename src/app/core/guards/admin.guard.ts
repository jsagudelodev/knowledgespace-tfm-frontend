import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.getCurrentUserValue()?.role;
  if (role === 'admin' || role === 'superadmin') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
