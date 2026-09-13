export interface DashboardMetrics {
  documents: {
    total: number;
    completed: number;
    processing: number;
  };
  users: {
    total: number;
  };
  conversations: {
    total: number;
  };
  messages: {
    total: number;
  };
  recent_activity: Array<{
    id: number;
    title: string;
    updated_at: string;
  }>;
}
