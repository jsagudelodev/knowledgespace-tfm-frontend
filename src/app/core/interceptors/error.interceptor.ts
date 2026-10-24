/**
 * Manejo global de errores HTTP (401/403/5xx). Complementa a `auth.interceptor`,
 * que solo toca la petición saliente — este reacciona a la respuesta.
 *
 * No sustituye el manejo de error específico que ya hace cada componente
 * (mensajes como "no se pudo eliminar el documento"): por eso solo actúa sobre
 * los casos que hoy nadie gestiona de forma centralizada, y siempre relanza el
 * error (`throwError`) para que el `catchError`/`error:` de quien hizo la
 * petición se siga ejecutando después.
 *
 * - 401: la sesión no es válida (token caducado o ausente). Se cierra sesión
 *   y se redirige al login — hoy esto solo ocurría si el usuario pulsaba
 *   "cerrar sesión" a propósito, nunca si el token expiraba a mitad de uso.
 *   Se excluye la propia petición de login: un 401 ahí es "contraseña
 *   incorrecta", no una sesión caducada, y forzar el mismo flujo sería
 *   confuso (el mensaje hablaría de una sesión que nunca existió).
 * - 403: el usuario está autenticado pero no tiene permiso. No hay por qué
 *   cerrar sesión, solo avisar.
 * - 0 o >=500: fallo de red o del servidor, no un error de negocio (404, 409,
 *   422...) que ya suele tener su propio mensaje más específico en el
 *   componente que hizo la llamada.
 */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const esLogin = req.url.includes('/auth/login');

      if (err.status === 401 && !esLogin) {
        authService.logout();
        notifications.error('Tu sesión expiró. Inicia sesión de nuevo.');
        router.navigate(['/auth/login']);
      } else if (err.status === 403) {
        notifications.error('No tienes permiso para realizar esta acción.');
      } else if (err.status === 0 || err.status >= 500) {
        notifications.error('Error del servidor. Intenta de nuevo en unos segundos.');
      }

      return throwError(() => err);
    })
  );
};
