import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardMetrics } from '../../../../core/models/dashboard.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent implements OnInit {
  private readonly destroyRef      = inject(DestroyRef);
  private readonly dashboardService = inject(DashboardService);
  private readonly authService      = inject(AuthService);

  metrics = signal<DashboardMetrics | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  readonly currentUser = computed(() => this.authService.getCurrentUserValue());

  readonly hasDocuments = computed(() => (this.metrics()?.documents.total ?? 0) > 0);

  // Marca el paso "Abre el Chat IA" como hecho. Se mide por mensajes y no por
  // conversaciones: abrir el chat crea una conversación vacía al instante, así
  // que contarlas daba el paso por completado sin haber preguntado nada.
  readonly hasConversations = computed(() => (this.metrics()?.messages.total ?? 0) > 0);
  readonly isEmptyState     = computed(() => !!this.metrics() && !this.hasDocuments());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getMetrics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.metrics.set(data); this.loading.set(false); },
        // Sin esto la página quedaba en blanco: toda la plantilla vive dentro
        // de `@if (!loading() && metrics())`, así que un fallo dejaba las dos
        // condiciones en falso y no se dibujaba nada, ni un mensaje.
        error: ()   => {
          this.error.set('No se pudieron cargar las métricas.');
          this.loading.set(false);
        }
      });
  }
}
