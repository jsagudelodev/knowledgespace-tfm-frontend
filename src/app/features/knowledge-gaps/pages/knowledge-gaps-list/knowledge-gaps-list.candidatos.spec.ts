import { describe, expect, it } from 'vitest';

import { KnowledgeGap } from '../../../../core/models/knowledge-gap.model';
import { KnowledgeGapsListComponent } from './knowledge-gaps-list.component';

// Las preguntas creadas antes de agrupar en el backend guardaron un candidato por
// fragmento: "Vincular documento" mostraba agentes_ia.md tres veces.
const lista = Object.create(KnowledgeGapsListComponent.prototype) as KnowledgeGapsListComponent;

function gap(candidates: KnowledgeGap['candidates']): KnowledgeGap {
  return { id: 33, candidates } as KnowledgeGap;
}

describe('KnowledgeGapsListComponent · candidatos', () => {
  it('muestra cada documento una vez, con su mejor fragmento', () => {
    const g = gap([
      { document_id: 45, chunk_id: 0, name: 'agentes_ia.md', score: 0.78 },
      { document_id: 45, chunk_id: 1, name: 'agentes_ia.md', score: 0.68 },
      { document_id: 7, chunk_id: 2, name: 'llm.md', score: 0.6 },
      { document_id: 45, chunk_id: 3, name: 'agentes_ia.md', score: 0.54 },
    ]);
    expect(lista.candidatesOf(g).map(c => [c.document_id, c.chunk_id])).toEqual([[45, 0], [7, 2]]);
  });

  it('sin candidatos devuelve una lista vacía', () => {
    expect(lista.candidatesOf(gap(null))).toEqual([]);
  });
});
