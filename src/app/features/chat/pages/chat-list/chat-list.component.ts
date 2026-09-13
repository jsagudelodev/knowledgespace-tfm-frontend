import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../../../core/models/conversation.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss']
})
export class ChatListComponent {
  readonly conversations = signal<Conversation[]>([]);
  readonly loading       = signal(false);

  private destroyRef   = inject(DestroyRef);
  private router       = inject(Router);
  private chatService  = inject(ChatService);
  private authService  = inject(AuthService);

  // Reactive URL para detectar conversación activa
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly activeId = computed(() => {
    const match = this.currentUrl().match(/\/chat\/(\d+)/);
    return match ? +match[1] : null;
  });

  constructor() {
    this.loadConversations();
  }

  loadConversations(): void {
    this.loading.set(true);
    this.chatService.getConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.conversations.set(list); this.loading.set(false); },
        error: (e)   => { console.error('Error al cargar las conversaciones:', e); this.loading.set(false); }
      });
  }

  createConversation(): void {
    const user = this.authService.getCurrentUserValue();
    if (!user) return;

    this.chatService.createConversation({ title: 'Nueva Conversación' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.router.navigate(['/chat', c.id]),
        error: (e) => console.error('Error al crear la conversación:', e)
      });
  }

  openConversation(id: number): void {
    this.router.navigate(['/chat', id]);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
