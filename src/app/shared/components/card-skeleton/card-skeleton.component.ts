import { Component, Input } from '@angular/core';

/**
 * Placeholder genérico para cuadrículas de tarjetas (hoy solo `assistant-list`).
 * Hermano de `TableSkeletonComponent`: incluso con la misma animación
 * compartida (`sk-pulse`, en styles.scss), pero con la forma de una tarjeta
 * —avatar circular, dos líneas de texto, una fila de insignias— en vez de
 * filas de tabla, porque forzar el mismo componente en una cuadrícula de
 * tarjetas se habría visto mal.
 */
@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  templateUrl: './card-skeleton.component.html',
  styleUrls: ['./card-skeleton.component.scss']
})
export class CardSkeletonComponent {
  @Input() cards = 6;

  get tarjetas(): number[] {
    return Array.from({ length: this.cards }, (_, i) => i);
  }
}
