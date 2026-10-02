/**
 * Añade el JWT a cada petición saliente.
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
 * Pendiente conocido: no hay interceptor de respuesta. Un 401 por token
 * caducado lo gestiona hoy cada módulo por su cuenta, en vez de forzar el
 * logout de forma centralizada.
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const token = storage.getItem<string>('access_token');

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }

  return next(req);
};
