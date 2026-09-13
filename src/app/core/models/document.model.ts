export interface Document {
  id: number;
  company_id: number;
  uploaded_by: number;
  category_id?: number | null;
  assistant_id?: number | null;
  filename: string;
  original_filename: string;
  file_size?: number;
  mime_type?: string;
  page_count?: number;
  chunk_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface DocumentUpdate {
  category_id?: number | null;
}
