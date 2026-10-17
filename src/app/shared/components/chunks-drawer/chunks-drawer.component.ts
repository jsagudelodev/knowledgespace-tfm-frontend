import {
  Component, DestroyRef, HostListener, inject, Input, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentChunks } from '../../../core/models/document.model';
import { DocumentService } from '../../../features/documents/services/document.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Panel lateral con los fragmentos en que quedó dividido un documento.
 *
 * Hasta ahora el sistema informaba de *cuántos* fragmentos generaba la
 * ingesta, pero no de cuáles. Un troceado defectuoso —un corte a mitad de una
 * tabla, una sección que la extracción del PDF se dejó— solo se detectaba por
 * sus efectos en las respuestas del chat, que es tarde y es indirecto.
 *
 * **Los fragmentos se leen del índice vectorial, no de la base de datos**,
 * porque es el índice quien responde a las consultas: si ambos divergieran, lo
 * que importa es lo que el índice contiene. La cabecera compara los dos
 * recuentos y avisa cuando no coinciden, que es la señal que el sistema no
 * daba cuando divergieron durante meses.
 *
 * Va en un panel lateral y no desplegado dentro de la fila porque un documento
 * puede tener decenas de fragmentos de mil caracteres, y al incrustarlo
 * empujaba el resto de la lista fuera de la pantalla.
 *
 * Se usa desde las dos pantallas que listan documentos —el detalle del
 * asistente y la lista general—, de ahí que esté aquí y no en una de ellas.
 */
@Component({
  selector: 'app-chunks-drawer',
  standalone: true,
  templateUrl: './chunks-drawer.component.html',
  styleUrls: ['./chunks-drawer.component.scss']
})
export class ChunksDrawerComponent {
  /** Documento a mostrar, o null para mantenerlo cerrado. */
  @Input() set documentId(id: number | null) {
    if (id === null) {
      this.datos.set(null);
      this.abierto.set(false);
      return;
    }
    this.cargar(id);
  }

  readonly abierto  = signal(false);
  readonly cargando = signal(false);
  readonly datos    = signal<DocumentChunks | null>(null);

  private readonly destroyRef      = inject(DestroyRef);
  private readonly documentService = inject(DocumentService);
  private readonly notifications   = inject(NotificationService);

  cerrar(): void {
    this.abierto.set(false);
    this.datos.set(null);
  }

  /** Se cierra con Escape, como cualquier capa superpuesta. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto()) this.cerrar();
  }

  private cargar(id: number): void {
    // Se piden bajo demanda y no junto al listado: un documento puede tener
    // decenas de fragmentos con su texto completo, y traerlos para todos cada
    // vez que se abre la pantalla sería un gasto inútil.
    this.abierto.set(true);
    this.datos.set(null);
    this.cargando.set(true);

    this.documentService.getChunks(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: datos => {
          this.cargando.set(false);
          this.datos.set(datos);
        },
        error: () => {
          this.cargando.set(false);
          this.abierto.set(false);
          this.notifications.error('No se pudieron leer los fragmentos del índice.');
        }
      });
  }
}
