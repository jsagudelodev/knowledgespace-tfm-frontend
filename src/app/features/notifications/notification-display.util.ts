import { AppNotification } from '../../core/models/notification.model';

const ICON_BY_TYPE: Record<string, string> = {
  document_uploaded:        'upload_file',
  document_processed:       'task_alt',
  document_failed:          'error',
  document_deleted:         'delete',
  document_requested:       'note_add',
  budget_warning:           'warning',
  budget_exceeded:          'report',
  budget_reset:             'refresh',
  user_invited:             'person_add',
  user_joined:              'group',
  system_alert:             'notifications',
};

export interface NotificationAction {
  text: string;
  commands: string[];
}

/** A dónde lleva una notificación al pulsarla; la usan la página y la campana. */
export function notificationAction(n: AppNotification): NotificationAction | null {
  const type = n.notification_type.name;

  // "Pedir documento" se retiró el 2026-11-03 y ya no se emiten; se conserva
  // para que los avisos ya creados sigan llevando a subir el documento.
  if (type === 'document_requested') {
    return { text: 'Subir documento', commands: ['/documents/upload'] };
  }
  if (type === 'document_processed' || type === 'document_failed' || type === 'document_uploaded') {
    // No existe una página de detalle `/documents/:id`: lleva a la lista.
    return { text: 'Ver documentos', commands: ['/documents'] };
  }
  // Las notificaciones de presupuesto no ofrecen acción: el módulo de
  // Presupuesto/Uso no está implementado y el dashboard no muestra costos
  // (el costo por respuesta se ve en el propio chat). Antes enlazaban a
  // /dashboard con el texto "Ver costos", que prometía algo que esa página
  // no tiene.
  if (type.startsWith('budget')) {
    return null;
  }
  if (type === 'user_invited' || type === 'user_joined') {
    return { text: 'Ver usuarios', commands: ['/users'] };
  }
  return null;
}

/** Los avisos de documento fallido antiguos incluían el error técnico
 *  ("Error descargando archivo de S3: ... NoSuchKey"), que no le sirve al
 *  usuario. Se muestra solo la parte legible. */
export function notificationMessage(n: AppNotification): string {
  const corte = n.message.indexOf(' no pudo procesarse:');
  if (n.notification_type.name === 'document_failed' && corte > 0) {
    return `${n.message.slice(0, corte)} no se pudo procesar. Puedes reintentarlo desde Documentos.`;
  }
  return n.message;
}

export function notificationIcon(typeName: string | undefined): string {
  return (typeName && ICON_BY_TYPE[typeName]) || 'notifications';
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const now   = new Date();
  const diffMs  = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH   = Math.floor(diffMin / 60);

  if (diffSec < 60)  return 'ahora mismo';
  if (diffMin < 60)  return `hace ${diffMin} min`;
  if (diffH   < 24)  return `hace ${diffH} h`;

  const today     = new Date(now);  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const dateDay   = new Date(date); dateDay.setHours(0, 0, 0, 0);

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (dateDay.getTime() === yesterday.getTime()) return `ayer ${hh}:${mm}`;

  const dd  = String(date.getDate()).padStart(2, '0');
  const mo  = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} ${hh}:${mm}`;
}
