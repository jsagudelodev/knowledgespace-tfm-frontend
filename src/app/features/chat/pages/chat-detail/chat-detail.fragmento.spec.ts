import { describe, expect, it } from 'vitest';

import { ChatDetailComponent } from './chat-detail.component';

// El fragmento de un PDF llega con un salto por línea visual y las viñetas
// como caracteres de uso privado: en el panel se leía como una columna
// estrecha salpicada de □ (captura 09 del manual).
const ctx = Object.create(ChatDetailComponent.prototype) as ChatDetailComponent;
const ver = (texto: string) => ctx.textoFragmento(texto);

describe('ChatDetailComponent · texto del fragmento citado', () => {
  it('une las líneas partidas a mitad de frase', () => {
    expect(ver('Se establece que un\nembedding es una proyección\nde un objeto.'))
      .toBe('Se establece que un embedding es una proyección de un objeto.');
  });

  it('la viñeta de uso privado pasa a «•» delante del punto que introduce', () => {
    expect(ver('equivale a la similitud conceptual. \nRepresentación Multimodal: Se\nejemplifica.'))
      .toBe('equivale a la similitud conceptual.\n• Representación Multimodal: Se ejemplifica.');
  });

  it('conserva los saltos reales: tras un punto o ante mayúscula', () => {
    expect(ver('Primera idea.\nSegunda idea')).toBe('Primera idea.\nSegunda idea');
    expect(ver('# Agentes\n\n## Qué es')).toBe('# Agentes\n\n## Qué es');
  });

  it('sin texto devuelve cadena vacía', () => {
    expect(ver('')).toBe('');
  });
});
