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
  knowledge_gap_found:      'help',
  knowledge_gap_resolved:   'check_circle',
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
  const id   = n.entity_id;

  // Un admin pidió un documento a este usuario: lo lleva a subirlo.
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
  if (type === 'knowledge_gap_found') {
    return id
      ? { text: 'Resolver',    commands: ['/knowledge-gaps', String(id)] }
      : { text: 'Ver la lista', commands: ['/knowledge-gaps'] };
  }
  if (type === 'knowledge_gap_resolved') {
    return id
      ? { text: 'Revisar',     commands: ['/knowledge-gaps', String(id)] }
      : { text: 'Ver la lista', commands: ['/knowledge-gaps'] };
  }
  if (type === 'user_invited' || type === 'user_joined') {
    return { text: 'Ver usuarios', commands: ['/users'] };
  }
  return null;
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
