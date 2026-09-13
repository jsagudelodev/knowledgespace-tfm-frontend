export type NotificationEntityType = 'document' | 'budget_limit' | 'knowledge_gap';

export interface NotificationTypeInfo {
  id: number;
  name: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
}

// Nombrada `AppNotification` (no `Notification`) para no chocar con la Web Notifications API del navegador.
export interface AppNotification {
  id: number;
  company_id: number;
  user_id?: number | null;
  notification_type: NotificationTypeInfo;
  title: string;
  message: string;
  entity_type?: NotificationEntityType | null;
  entity_id?: number | null;
  read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListParams {
  read?: boolean;
  type?: string;
  skip?: number;
  limit?: number;
}

export interface NotificationCounts {
  todas: number;
  unread: number;
  documents: number;
  budget: number;
  knowledge_gap: number;
}
