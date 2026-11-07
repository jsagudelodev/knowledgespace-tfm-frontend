import { describe, expect, it } from 'vitest';

import { ChatDetailComponent } from './chat-detail.component';

// El modelo copia las fórmulas en LaTeX porque así aparecen en los documentos.
// Los comandos de espaciado (`\,`, `\;`…) no tienen nombre y se colaban
// literales: la figura 3 de la memoria mostraba `cos \, θ`.
const ctx = Object.create(ChatDetailComponent.prototype) as ChatDetailComponent;
const formatear = (texto: string) => ctx.formatMessage(texto);

describe('ChatDetailComponent · LaTeX en las respuestas', () => {
  it('traduce la fórmula de la similitud coseno sin restos de LaTeX', () => {
    const html = formatear('cos \\, \\theta = \\frac{x \\cdot y}{||x|| \\cdot ||y||}');
    expect(html).toBe('cos θ = (x · y) / (‖x‖ · ‖y‖)');
    expect(html).not.toContain('\\');
  });

  it('los espacios finos y medios se vuelven un espacio; el negativo desaparece', () => {
    expect(formatear('a\\;b\\:c\\ d')).toBe('a b c d');
    expect(formatear('x\\!y')).toBe('xy');
    expect(formatear('a\\quad b')).toBe('a b');
  });

  it('no toca una barra que no es LaTeX: el texto sin comandos queda igual', () => {
    expect(formatear('Hola, ¿qué tal?')).toBe('Hola, ¿qué tal?');
  });
});
