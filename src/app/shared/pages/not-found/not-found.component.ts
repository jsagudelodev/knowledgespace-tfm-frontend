import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Página 404 real. Antes, cualquier ruta no reconocida (`**` en
 * `app.routes.ts`) redirigía directamente a `/auth/login`, sin avisar al
 * usuario de que la URL no existía — indistinguible de "tu sesión expiró" o
 * de un enlace de login cualquiera.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [EmptyStateComponent],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  volver(): void {
    const destino = this.authService.isAuthenticated() ? '/dashboard' : '/auth/login';
    this.router.navigate([destino]);
  }
}
