import { TestBed } from '@angular/core/testing';
import { HttpEventType, HttpResponse, HttpDownloadProgressEvent } from '@angular/common/http';
import { of } from 'rxjs';
import { ChatService } from './chat.service';
import { ApiService } from '../../../core/services/api.service';
import { ChatStreamEvent } from '../../../core/models/message.model';

function progreso(partialText: string): HttpDownloadProgressEvent {
  return { type: HttpEventType.DownloadProgress, loaded: partialText.length, partialText };
}

describe('ChatService.sendMessageStream', () => {
  let service: ChatService;
  let apiMock: { postStream: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiMock = { postStream: vi.fn() };
    TestBed.configureTestingModule({
      providers: [ChatService, { provide: ApiService, useValue: apiMock }],
    });
    service = TestBed.inject(ChatService);
  });

  function enviar(): Promise<ChatStreamEvent[]> {
    return new Promise((resolve, reject) => {
      const eventos: ChatStreamEvent[] = [];
      service.sendMessageStream({ message: 'hola' }).subscribe({
        next: (e) => eventos.push(e),
        error: reject,
        complete: () => resolve(eventos),
      });
    });
  }

  it('parsea un evento SSE completo que llega en un solo trozo', async () => {
    const texto = 'data: {"type":"delta","content":"Hola"}\n\n';
    apiMock.postStream.mockReturnValue(of(progreso(texto), new HttpResponse({ body: texto })));

    const eventos = await enviar();

    expect(eventos).toEqual([{ type: 'delta', content: 'Hola' }]);
  });

  it('reconstruye un evento partido justo por la mitad entre dos trozos de red', async () => {
    // El borde "\n\n" cae a mitad del segundo trozo de red: sin acumular un
    // buffer, el primer trozo se perdería por no terminar en "\n\n" todavía.
    const completo = 'data: {"type":"delta","content":"Un agente de IA"}\n\n';
    const primerTrozo = completo.slice(0, 20); // corta en mitad del JSON
    const segundoTrozo = completo; // partialText es ACUMULADO, no incremental

    apiMock.postStream.mockReturnValue(
      of(progreso(primerTrozo), progreso(segundoTrozo), new HttpResponse({ body: segundoTrozo })),
    );

    const eventos = await enviar();

    expect(eventos).toEqual([{ type: 'delta', content: 'Un agente de IA' }]);
  });

  it('entrega varios eventos de la misma notificación de progreso, en orden', async () => {
    const texto =
      'data: {"type":"delta","content":"a"}\n\n' +
      'data: {"type":"delta","content":"b"}\n\n' +
      'data: {"type":"done","message_id":9,"conversation_id":1,"sources":[],"cost_usd":0.001}\n\n';
    apiMock.postStream.mockReturnValue(of(progreso(texto), new HttpResponse({ body: texto })));

    const eventos = await enviar();

    expect(eventos.map((e) => e.type)).toEqual(['delta', 'delta', 'done']);
    expect(eventos[2]).toMatchObject({ message_id: 9, cost_usd: 0.001 });
  });

  it('si no llegó ningún DownloadProgress, el cuerpo final de la respuesta basta', async () => {
    const texto = 'data: {"type":"error","etapa":"búsqueda vectorial"}\n\n';
    apiMock.postStream.mockReturnValue(of(new HttpResponse({ body: texto })));

    const eventos = await enviar();

    expect(eventos).toEqual([{ type: 'error', etapa: 'búsqueda vectorial' }]);
  });

  it('un trozo de JSON corrupto no rompe el resto del stream', async () => {
    const texto =
      'data: {esto no es json valido\n\n' +
      'data: {"type":"delta","content":"sigue llegando"}\n\n';
    apiMock.postStream.mockReturnValue(of(progreso(texto), new HttpResponse({ body: texto })));

    const eventos = await enviar();

    expect(eventos).toEqual([{ type: 'delta', content: 'sigue llegando' }]);
  });
});
