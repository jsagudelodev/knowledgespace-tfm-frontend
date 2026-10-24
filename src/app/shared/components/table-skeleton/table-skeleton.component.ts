import { Component, Input } from '@angular/core';

/**
 * Placeholder genérico mientras carga una tabla/listado. No intenta imitar
 * las columnas exactas de cada página (nombre, color, fecha...) — eso
 * obligaría a un componente por página, que es justo la duplicación que esto
 * quiere evitar. En su lugar, filas con barras de ancho variable que dan la
 * sensación de contenido cargando, consistentes en todas las listas.
 */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  templateUrl: './table-skeleton.component.html',
  styleUrls: ['./table-skeleton.component.scss']
})
export class TableSkeletonComponent {
  @Input() rows = 5;
  @Input() columns = 3;

  get columnas(): number[] {
    return Array.from({ length: this.columns }, (_, i) => i);
  }

  get filas(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
