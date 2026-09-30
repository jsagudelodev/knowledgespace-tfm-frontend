export interface DashboardMetrics {
  documents: {
    total: number;
    completed: number;
    processing: number;
  };
  users: {
    total: number;
  };
  messages: {
    total: number;
  };
}
