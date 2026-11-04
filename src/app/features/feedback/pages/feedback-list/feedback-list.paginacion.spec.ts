import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { FeedbackResponse } from '../../../../core/models/feedback.model';
import { FeedbackListComponent } from './feedback-list.component';

// Antes la lista se pedía sin límite, el backend devolvía 50 y el filtro por
// estrellas se aplicaba en el navegador solo sobre esos 50.
interface Pedido { skip?: number; limit?: number; rating?: number }

interface Interno {
  feedbacks: ReturnType<typeof signal<FeedbackResponse[]>>;
  ratingFilter: ReturnType<typeof signal<number | null>>;
  hasMore: ReturnType<typeof signal<boolean>>;
  loadMore(): void;
  toggleRating(r: number): void;
}

function fb(id: number): FeedbackResponse {
  return { id, rating: 1 } as FeedbackResponse;
}

function montar(paginas: FeedbackResponse[][]) {
  const pedidos: Pedido[] = [];
  const ctx = Object.create(FeedbackListComponent.prototype) as Record<string, unknown>;
  Object.assign(ctx, {
    destroyRef: { onDestroy: () => () => undefined },
    feedbackSvc: {
      getAll: (p: Pedido) => {
        pedidos.push(p);
        return of(paginas[pedidos.length - 1] ?? []);
      },
    },
    feedbacks: signal<FeedbackResponse[]>([]),
    loadingList: signal(false),
    loadingMore: signal(false),
    errorList: signal(false),
    hasMore: signal(false),
    mode: signal('comments'),
    ratingFilter: signal<number | null>(null),
    selectedAssistant: signal<number | null>(null),
    period: signal('month'),
    pageSize: 10,
  });
  return { c: ctx as unknown as Interno, pedidos };
}

const pagina = (desde: number, n: number) => Array.from({ length: n }, (_, i) => fb(desde + i));

describe('FeedbackListComponent · paginación', () => {
  it('pide de 10 en 10 y añade la página siguiente', () => {
    const { c, pedidos } = montar([pagina(1, 10), pagina(11, 4)]);
    c.toggleRating(1);
    expect(c.feedbacks().length).toBe(10);
    expect(c.hasMore()).toBe(true);

    c.loadMore();
    expect(pedidos[1]).toMatchObject({ skip: 10, limit: 10 });
    expect(c.feedbacks().length).toBe(14);
    expect(c.hasMore()).toBe(false);
  });

  it('el filtro por estrellas lo aplica el backend', () => {
    const { c, pedidos } = montar([pagina(1, 3)]);
    c.toggleRating(1);
    expect(pedidos[0]).toMatchObject({ rating: 1, skip: 0, limit: 10 });
  });
});
