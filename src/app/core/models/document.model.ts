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

/** Un fragmento indexado, tal como lo guarda el índice vectorial. */
export interface DocumentChunk {
  chunk_id: string;
  chunk_index: number;
  text: string;
  caracteres: number;
}

/**
 * En qué quedó dividido un documento tras la ingesta.
 *
 * Los fragmentos se leen del índice vectorial y no de la base de datos,
 * porque es el índice el que responde a las consultas. `sincronizado` compara
 * ambos recuentos: que no coincidan es la señal de que el índice ha divergido
 * del registro, algo que el sistema no avisaba de ninguna otra forma.
 */
export interface DocumentChunks {
  document_id: number;
  document_name: string;
  status: Document['status'];
  chunk_count_registrado: number;
  chunk_count_indexado: number;
  sincronizado: boolean;
  chunks: DocumentChunk[];
}
