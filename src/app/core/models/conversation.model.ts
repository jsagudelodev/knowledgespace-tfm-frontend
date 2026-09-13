export interface Conversation {
  id: number;
  company_id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at?: string;
}

export interface ConversationCreate {
  title?: string;
}

export interface ConversationUpdate {
  title?: string;
}
