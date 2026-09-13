import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ChatListComponent } from '../chat-list/chat-list.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-chat-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ChatListComponent],
  templateUrl: './chat-shell.component.html',
  styleUrls: ['./chat-shell.component.scss']
})
export class ChatShellComponent {
  private readonly router      = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef  = inject(DestroyRef);

  readonly creating = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly hasActiveConversation = computed(() =>
    /\/chat\/\d+/.test(this.currentUrl())
  );

  readonly firstName = computed(() => {
    const name = this.authService.getCurrentUserValue()?.full_name ?? '';
    return name.trim().split(' ')[0] || '';
  });

  // Capacidades destacadas del asistente — orientan al usuario sobre qué puede pedir
  readonly highlights = [
    { icon: 'forum',     title: 'Lenguaje natural',  text: 'Pregunta como hablarías con un colega, sin comandos ni filtros.' },
    { icon: 'menu_book', title: 'Fuentes citadas',   text: 'Cada respuesta indica el documento y fragmento de origen.' },
    { icon: 'verified',  title: 'Solo tu empresa',   text: 'Responde únicamente con la documentación interna, sin inventar.' },
  ];

  createConversation(): void {
    const user = this.authService.getCurrentUserValue();
    if (!user || this.creating()) return;

    this.creating.set(true);
    this.chatService.createConversation({ title: 'Nueva Conversación' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.router.navigate(['/chat', c.id]),
        error: (e) => { console.error('Error al crear la conversación:', e); this.creating.set(false); }
      });
  }
}
