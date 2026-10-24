import { TestBed } from '@angular/core/testing';
import { ChunksDrawerComponent } from './chunks-drawer.component';
import { DocumentService } from '../../../features/documents/services/document.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('ChunksDrawerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChunksDrawerComponent],
      providers: [
        { provide: DocumentService, useValue: { getChunks: vi.fn() } },
        { provide: NotificationService, useValue: { error: vi.fn() } }
      ]
    });
  });

  function componente(): ChunksDrawerComponent {
    return TestBed.createComponent(ChunksDrawerComponent).componentInstance;
  }

  describe('esMarkdown', () => {
    it('reconoce un .md sin importar mayúsculas', () => {
      const c = componente();
      expect(c.esMarkdown('notas.md')).toBe(true);
      expect(c.esMarkdown('NOTAS.MD')).toBe(true);
    });

    it('no trata PDF/DOCX/TXT como Markdown', () => {
      const c = componente();
      expect(c.esMarkdown('informe.pdf')).toBe(false);
      expect(c.esMarkdown('contrato.docx')).toBe(false);
      expect(c.esMarkdown('notas.txt')).toBe(false);
    });

    it('no revienta si no hay nombre de documento todavía', () => {
      const c = componente();
      expect(c.esMarkdown(undefined)).toBe(false);
    });
  });

  describe('renderizarMarkdown', () => {
    it('convierte la sintaxis de marcado en HTML real', () => {
      const html = componente().renderizarMarkdown('# Título\n\nUn párrafo con **negrita**.');

      expect(html).toContain('<h1>Título</h1>');
      expect(html).toContain('<strong>negrita</strong>');
    });

    it('elimina HTML peligroso embebido en el .md — es un archivo subido, no código de confianza', () => {
      const html = componente().renderizarMarkdown(
        'Contenido normal <script>alert("robado")</script> más texto.'
      );

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(');
      expect(html).toContain('Contenido normal');
    });

    it('también elimina un manejador de evento inline, no solo <script>', () => {
      const html = componente().renderizarMarkdown('<img src="x" onerror="alert(1)">');

      expect(html).not.toContain('onerror');
    });
  });
});
