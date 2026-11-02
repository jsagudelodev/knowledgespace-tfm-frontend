import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { Assistant } from '../../../../core/models/assistant.model';
import { Message } from '../../../../core/models/message.model';
import { ChatDetailComponent } from './chat-detail.component';

// Al reabrir una conversación se seleccionaba el primer asistente activo, no el
// de la conversación: seguir escribiendo preguntaba a otro asistente y el
// feedback se atribuía mal. Ahora cada mensaje guarda su assistant_id.
interface Interno {
  assistants: ReturnType<typeof signal<Assistant[]>>;
  selectedAssistant: ReturnType<typeof signal<Assistant | null>>;
  assistantId: ReturnType<typeof signal<number | null>>;
  asistenteDeLaConversacion: ReturnType<typeof signal<number | null>>;
  recordarAsistente(m: Message[]): void;
}

const demo = { id: 2, name: 'Demo', is_active: true } as Assistant;
const ebis = { id: 1, name: 'EBIS', is_active: true } as Assistant;

function montar(asistentes: Assistant[]): Interno {
  const ctx = Object.create(ChatDetailComponent.prototype) as Interno;
  ctx.assistants = signal(asistentes);
  ctx.selectedAssistant = signal(asistentes[0] ?? null);
  ctx.assistantId = signal(asistentes[0]?.id ?? null);
  ctx.asistenteDeLaConversacion = signal<number | null>(null);
  return ctx;
}

function msg(id: number, assistant_id: number | null): Message {
  return { id, conversation_id: 7, role: 'assistant', content: 'x', created_at: '', assistant_id };
}

describe('ChatDetailComponent · asistente de la conversación', () => {
  it('selecciona el asistente del último mensaje, no el primero de la lista', () => {
    const c = montar([demo, ebis]);
    c.recordarAsistente([msg(1, 2), msg(2, 1)]);
    expect(c.selectedAssistant()?.id).toBe(1);
    expect(c.assistantId()).toBe(1);
  });

  it('ignora los mensajes antiguos sin asistente guardado', () => {
    const c = montar([demo, ebis]);
    c.recordarAsistente([msg(1, 1), msg(2, null)]);
    expect(c.selectedAssistant()?.id).toBe(1);
  });

  it('si los asistentes aún no cargaron, lo recuerda para cuando lleguen', () => {
    const c = montar([]);
    c.recordarAsistente([msg(1, 1)]);
    expect(c.asistenteDeLaConversacion()).toBe(1);
  });

  it('una conversación sin ningún asistente guardado deja la selección como estaba', () => {
    const c = montar([demo, ebis]);
    c.recordarAsistente([msg(1, null)]);
    expect(c.selectedAssistant()?.id).toBe(2);
  });
});
