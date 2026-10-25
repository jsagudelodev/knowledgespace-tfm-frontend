/**
 * Añade el JWT a cada petición saliente, y el contexto de empresa cuando un
 * `superadmin` está viendo los datos de otra (2026-10-25).
 *
 * Es el único punto del frontend que toca la cabecera `Authorization`: ningún
 * servicio la construye por su cuenta. Eso importa para el multi-tenant —
 * el backend saca el `company_id` del token, nunca del cuerpo de la petición,
 * así que el aislamiento entre empresas depende de que el token viaje siempre
 * y de que el frontend no pueda falsearlo.
 *
 * El token vive en `localStorage` bajo `access_token`. Si no hay ninguno, la
 * petición sale tal cual y es el backend quien responde 401: el interceptor no
 * decide qué rutas son públicas, eso lo hacen los guards.
 *
 * `X-Company-Context` solo se añade si el usuario es `superadmin` Y eligió
 * una empresa distinta de la suya (`AuthService.selectedCompany`) — para
 * cualquier otro rol el backend la ignora de todos modos
 * (`get_company_context`), pero no tiene sentido mandarla. Hoy solo la
 * respetan los endpoints de Documentos y Asistentes; el resto sigue
 * mostrando los datos del propio superadmin aunque la cabecera viaje.
 *
 * El manejo de la respuesta —401 por token caducado, 403, errores de
 * servidor— vive aparte, en `error.interceptor.ts`, registrado después de
 * este en `app.config.ts`.
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const authService = inject(AuthService);
  const token = storage.getItem<string>('access_token');

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const user = authService.getCurrentUserValue();
  const selected = authService.selectedCompany();
  if (user?.role === 'superadmin' && selected && selected.id !== user.company_id) {
    headers['X-Company-Context'] = String(selected.id);
  }

  if (Object.keys(headers).length === 0) return next(req);
  return next(req.clone({ setHeaders: headers }));
};
