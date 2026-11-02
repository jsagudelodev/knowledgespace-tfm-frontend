import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { ChatDetailComponent } from './chat-detail.component';

// El resaltado del buscador se rompió en silencio: los marcadores eran
// caracteres invisibles literales, se perdieron al guardar el archivo, y con
// cadenas vacías `replaceAll('', …)` metía un <mark> entre cada par de letras.
// Se prueba el método en el prototipo, sin montar el componente entero.
function resaltar(contenido: string, termino: string): string {
  const ctx = Object.create(ChatDetailComponent.prototype) as ChatDetailComponent;
  (ctx as unknown as { searchTerm: ReturnType<typeof signal<string>> }).searchTerm = signal(termino);
  return ctx.formatMessageWithHighlight(contenido);
}

describe('ChatDetailComponent · resaltado de búsqueda', () => {
  it('envuelve solo el término buscado', () => {
    expect(resaltar('Cerrada los sábados.', 'sábados')).toBe(
      'Cerrada los <mark class="search-highlight">sábados</mark>.',
    );
  });

  it('no mete marcas entre letras ni deja marcadores invisibles', () => {
    const html = resaltar('No, la cafetería permanece cerrada los sábados.', 'sábados');
    expect(html.match(/<mark/g)?.length).toBe(1);
    expect(html).not.toMatch(/[\uE000\uE001]/);
  });

  it('no ignora mayúsculas y escapa el HTML del mensaje', () => {
    expect(resaltar('<b>Hola</b> HOLA', 'hola')).toBe(
      '&lt;b&gt;<mark class="search-highlight">Hola</mark>&lt;/b&gt; <mark class="search-highlight">HOLA</mark>',
    );
  });

  it('sin término devuelve el mensaje formateado sin marcas', () => {
    expect(resaltar('**negrita**', '')).toBe('<strong>negrita</strong>');
  });
});
