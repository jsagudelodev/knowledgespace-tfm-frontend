/**
 * Conversación del chat RAG: mensajes, fuentes citadas, costo y feedback.
 *
 * Tres cosas que conviene saber antes de tocar este archivo:
 *
 * **1. Se monta en dos sitios a la vez.** Una instancia vive en la ruta
 * `/chat/:id` y otra está montada permanentemente en `DashboardLayoutComponent`
 * como drawer lateral, accesible desde el header en cualquier módulo. Son
 * instancias **independientes**: cada una mantiene su propia conversación en
 * memoria y no se sincronizan. Abrir el drawer mientras estás en `/chat` te
 * deja con dos conversaciones distintas abiertas, y es el comportamiento
 * esperado.
 *
 * **2. El feedback se filtra en cliente.** `restoreFeedbackState()` pide
 * `/v1/feedback/me` **entero** y descarta en el navegador lo que no
 * corresponde a los mensajes visibles. No es por descuido: el backend no
 * expone un endpoint que filtre por lista de `message_id`. Funciona mientras
 * el historial de feedback de un usuario sea pequeño; con volumen alto habría
 * que añadir ese endpoint.
 *
 * **3. El costo por respuesta se muestra aquí.** El `cost_usd` que viaja en
 * cada mensaje del asistente es la única superficie de UI del tracking de
 * costo por solicitud LLM — los endpoints de `/v1/cost-tracking` exponen el
 * agregado, pero no los consume el frontend.
 *
 * Los errores de envío se muestran en un banner con mensaje según el código
 * HTTP (ver `showSendError`). Las cargas secundarias —historial, asistentes—
 * fallan en silencio salvo por `console.error`.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatService } from '../../services/chat.service';
import { FeedbackService } from '../../services/feedback.service';
import { Conversation } from '../../../../core/models/conversation.model';
import { Message, Source } from '../../../../core/models/message.model';

/** Los fragmentos de un mismo documento, agrupados para no repetir su nombre. */
interface FuenteAgrupada {
  documentId: number;
  nombre: string;
  mejorScore: number;
  fragmentos: Source[];
}
import { AuthService } from '../../../../core/services/auth.service';
import { UiStatusService } from '../../../../core/services/ui-status.service';
import { User } from '../../../../core/models/user.model';
import { DocumentService } from '../../../documents/services/document.service';
import { AssistantService } from '../../../assistants/services/assistant.service';
import { Assistant } from '../../../../core/models/assistant.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './chat-detail.component.html',
  styleUrls: ['./chat-detail.component.scss'],
})
export class ChatDetailComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private feedbackService = inject(FeedbackService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private documentService = inject(DocumentService);
  private assistantService = inject(AssistantService);
  private uiStatus = inject(UiStatusService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>;

  private readonly defaultSuggestions = [
    { icon: 'summarize', text: 'Dame un resumen de la documentación disponible' },
    { icon: 'policy', text: 'Explícame una política interna de la empresa' },
    { icon: 'manage_search', text: 'Busca información sobre un procedimiento' },
    { icon: 'help', text: '¿Qué temas puedo consultar?' },
  ];

  // ── Core signals ───────────────────────────────────────────────────────────
  readonly conversation = signal<Conversation | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly isTyping = signal(false);
  readonly isDrawerMode = signal(false);
  readonly currentUser = signal<User | null>(null);
  readonly copiedMessageId = signal<number | null>(null);
  readonly expandedSource = signal<Source | null>(null);
  readonly messageFeedback = signal<Record<number, 'up' | 'down'>>({});
  readonly feedbackSent = signal<number | null>(null);
  readonly feedbackPanelOpen = signal<number | null>(null);
  readonly feedbackComment = signal('');
  readonly sendError = signal<string | null>(null);

  readonly feedbackOptions = [
    'Respuesta incorrecta',
    'No siguió las instrucciones',
    'Información desactualizada',
    'No fue útil',
  ];
  readonly assistants = signal<Assistant[]>([]);
  readonly selectedAssistant = signal<Assistant | null>(null);
  readonly assistantId = signal<number | undefined>(undefined);

  readonly suggestions = computed(() => {
    const qp = this.selectedAssistant()?.quick_prompts;
    if (qp && qp.length > 0) {
      return qp.map((text) => ({ icon: 'lightbulb', text }));
    }
    return this.defaultSuggestions;
  });

  // ── Search signals ─────────────────────────────────────────────────────────
  readonly searchTerm = signal('');
  readonly searchActive = signal(false);

  // ── Pagination signals ─────────────────────────────────────────────────────
  readonly currentPage = signal(1);
  readonly pageSize = 20;

  // plain property — compatible con [(ngModel)]
  newMessage = '';

  // ── Computed: filtrado ─────────────────────────────────────────────────────
  readonly filteredMessages = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.messages();
    return this.messages().filter((m) => m.content.toLowerCase().includes(term));
  });

  // ── Computed: paginación ───────────────────────────────────────────────────
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMessages().length / this.pageSize)),
  );

  readonly paginatedMessages = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.filteredMessages().slice(start, start + this.pageSize);
  });

  readonly pageNumbers = computed((): number[] => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  });

  readonly companyLabel = computed(() => {
    const u = this.currentUser();
    return u?.full_name ? `empresa de ${u.full_name}` : 'tu empresa';
  });

  private destroyRef = inject(DestroyRef);
  private searchSubject = new Subject<string>();
  private errorTimer?: ReturnType<typeof setTimeout>;

  /**
   * Error de **carga** de la conversación, distinto de `sendError`.
   *
   * No se autodescarta a los 5 segundos como el del envío: si la conversación
   * no se pudo cargar, la pantalla está vacía y el usuario necesita ver el
   * motivo y poder reintentar. Antes esto solo se registraba con
   * `console.error`, así que un fallo de red dejaba el chat en blanco sin
   * ninguna explicación — en el módulo que es el núcleo del proyecto.
   */
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.currentUser.set(this.authService.getCurrentUserValue());
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.currentPage.set(1);
      });

    const initialId = this.route.snapshot.paramMap.get('id');

    if (!initialId) {
      // Modo drawer: no hay :id en la ruta
      this.isDrawerMode.set(true);
      this.createNewConversation();
    } else {
      // Modo ruta: reacciona a cambios de :id con switchMap para cancelar
      // requests anteriores en caso de navegación rápida entre conversaciones
      this.route.paramMap
        .pipe(
          switchMap((params) => {
            const id = params.get('id');
            if (!id) return EMPTY;

            this.conversation.set(null);
            this.messages.set([]);
            this.searchTerm.set('');
            this.searchActive.set(false);
            this.currentPage.set(1);
            this.loading.set(true);
            this.loadError.set(null);

            return forkJoin({
              conversation: this.chatService.getConversation(+id),
              messages: this.chatService.getMessages(+id),
            });
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: ({ conversation, messages }) => {
            this.conversation.set(conversation);
            this.messages.set(messages);
            this.loading.set(false);
            this.currentPage.set(this.totalPages());
            this.restoreFeedbackState(messages.map((m) => m.id));
            this.scrollToBottom();
          },
          error: (e) => {
            this.loading.set(false);
            this.loadError.set(this.mensajeDeCarga(e));
          },
        });
    }

    if (this.currentUser()?.company_id) {
      this.loadAssistants();
    }
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    clearTimeout(this.errorTimer);
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  toggleSearch(): void {
    const next = !this.searchActive();
    this.searchActive.set(next);
    if (!next) this.clearSearch();
  }

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(this.totalPages());
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  // ── Existing API methods ───────────────────────────────────────────────────

  loadAssistants(): void {
    this.assistantService
      .getAssistants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (all) => {
          const active = all.filter((a) => a.is_active);
          this.assistants.set(active);
          const first = active[0];
          if (first) {
            this.selectedAssistant.set(first);
            this.assistantId.set(first.id);
          }
        },
        error: () => {},
      });
  }

  selectAssistant(assistant: Assistant): void {
    this.selectedAssistant.set(assistant);
    this.assistantId.set(assistant.id);
  }

  createNewConversation(): void {
    this.loadError.set(null);
    this.chatService
      .createConversation({ title: 'Chat IA' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.conversation.set(c);
          this.loadMessages(c.id);
        },
        // Es el caso del drawer: si no hay conversación, no hay dónde escribir.
        // Dejarlo en console.error dejaba el chat en blanco sin explicación.
        error: (e) => this.loadError.set(this.mensajeDeCarga(e)),
      });
  }

  loadMessages(conversationId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.chatService
      .getMessages(conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msgs) => {
          this.messages.set(msgs);
          this.loading.set(false);
          this.currentPage.set(this.totalPages());
          this.restoreFeedbackState(msgs.map((m) => m.id));
        },
        error: (e) => {
          this.loading.set(false);
          this.loadError.set(this.mensajeDeCarga(e));
        },
      });
  }

  private restoreFeedbackState(messageIds: number[]): void {
    if (!messageIds.length) return;
    this.feedbackService
      .getMine(messageIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (feedbacks) => {
          const map: Record<number, 'up' | 'down'> = {};
          feedbacks.forEach((f) => {
            if (f.message_id != null) map[f.message_id] = f.rating >= 4 ? 'up' : 'down';
          });
          this.messageFeedback.set(map);
        },
        error: () => {},
      });
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    const conv = this.conversation();
    if (!text || !conv) return;

    this.newMessage = '';
    if (this.messageInput) this.messageInput.nativeElement.style.height = 'auto';
    this.isTyping.set(true);
    this.sending.set(true);

    this.messages.update((m) => [
      ...m,
      {
        id: Date.now(),
        conversation_id: conv.id,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      },
    ]);

    // Ir a última página para mostrar el mensaje nuevo (solo fuera de búsqueda)
    if (!this.searchTerm()) this.currentPage.set(this.totalPages());
    this.scrollToBottom();

    this.chatService
      .sendMessage({ conversation_id: conv.id, message: text, assistant_id: this.assistantId() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.sendError.set(null);
          this.messages.update((m) => [
            ...m,
            {
              id: r.message_id,
              conversation_id: conv.id,
              role: 'assistant',
              content: r.content,
              sources: r.sources,
              cost_usd: r.cost_usd,
              created_at: r.created_at,
            },
          ]);
          if (!this.searchTerm()) this.currentPage.set(this.totalPages());
          this.sending.set(false);
          this.isTyping.set(false);
          this.scrollToBottom();
        },
        error: (e) => {
          this.messages.update((m) => m.slice(0, -1));
          this.sending.set(false);
          this.isTyping.set(false);
          this.showSendError(e);
        },
      });
  }

  useSuggestion(text: string): void {
    this.newMessage = text;
    setTimeout(() => {
      const el = this.messageInput?.nativeElement;
      el?.focus();
      if (el) this.autoResizeTextarea(el);
    }, 0);
  }

  /** Crece el textarea con el contenido (hasta el max-height del CSS, 140px),
   * en vez de quedarse en una línea con scroll interno. Se llama en (input)
   * y también al setear texto por código (sugerencias, limpiar tras enviar). */
  autoResizeTextarea(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  goBack(): void {
    if (this.isDrawerMode()) {
      this.uiStatus.closeChat();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleSourcePreview(source: Source): void {
    this.expandedSource.set(this.expandedSource() === source ? null : source);
  }

  downloadSource(source: Source): void {
    if (!source.document_id) return;
    this.documentService
      .getDownloadUrl(source.document_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url, filename }) => {
          const a = window.document.createElement('a');
          a.href = url;
          a.download = filename || source.document_name || `documento_${source.document_id}`;
          a.target = '_blank';
          a.click();
        },
        error: () => {},
      });
  }

  copyMessage(content: string, messageId: number): void {
    navigator.clipboard.writeText(content).then(() => {
      this.copiedMessageId.set(messageId);
      setTimeout(() => this.copiedMessageId.set(null), 2000);
    });
  }

  // Aplica markdown + highlight del término buscado (XSS-safe)
  formatMessageWithHighlight(content: string): string {
    const term = this.searchTerm().trim();
    if (!term) return this.formatMessage(content);

    // Placeholders que sobreviven al HTML-escape y al procesado markdown
    const OPEN = '';
    const CLOSE = '';
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const marked = content.replace(new RegExp(safe, 'gi'), (match) => `${OPEN}${match}${CLOSE}`);

    return this.formatMessage(marked)
      .replaceAll(OPEN, '<mark class="search-highlight">')
      .replaceAll(CLOSE, '</mark>');
  }

  /**
   * Traduce el LaTeX que el modelo emite a texto legible.
   *
   * El corpus de este asistente trata de embeddings, distancias y métricas de
   * similitud, de modo que las respuestas incluyen fórmulas con frecuencia. El
   * modelo las escribe en LaTeX porque así aparecen en los documentos, y aquí
   * no hay nada que lo interprete: se leían literalmente, del estilo
   * `\text{cos } \theta = \frac{x \cdot y}{||x|| \cdot ||y||}`.
   *
   * No se incorpora un motor de fórmulas —KaTeX o similar— porque añadiría una
   * dependencia de peso para una necesidad marginal: las respuestas citan
   * fórmulas, no las componen. Basta con que se entiendan.
   *
   * La traducción es deliberadamente parcial. Cubre lo que este corpus
   * produce; ante un comando no contemplado se retira la barra invertida y se
   * conserva el nombre, que es más legible que la notación cruda.
   */
  private traducirLatex(texto: string): string {
    const SIMBOLOS: Record<string, string> = {
      alpha: 'α',
      beta: 'β',
      gamma: 'γ',
      delta: 'δ',
      epsilon: 'ε',
      theta: 'θ',
      lambda: 'λ',
      mu: 'μ',
      pi: 'π',
      sigma: 'σ',
      phi: 'φ',
      omega: 'ω',
      Delta: 'Δ',
      Sigma: 'Σ',
      Omega: 'Ω',
      cdot: '·',
      times: '×',
      div: '÷',
      pm: '±',
      leq: '≤',
      geq: '≥',
      neq: '≠',
      approx: '≈',
      equiv: '≡',
      infty: '∞',
      sum: '∑',
      prod: '∏',
      int: '∫',
      partial: '∂',
      in: '∈',
      notin: '∉',
      subset: '⊂',
      forall: '∀',
      exists: '∃',
      rightarrow: '→',
      leftarrow: '←',
      Rightarrow: '⇒',
      sqrt: '√',
      angle: '∠',
      perp: '⊥',
      parallel: '∥',
    };

    return (
      texto
        // `\frac{a}{b}` → `a / b`, con paréntesis solo si hacen falta.
        .replace(
          /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
          (_, num, den) =>
            `${/[\s+-]/.test(num.trim()) ? `(${num})` : num} / ` +
            `${/[\s+-]/.test(den.trim()) ? `(${den})` : den}`,
        )
        // `\text{...}`, `\mathbf{...}` y parientes: solo envuelven texto.
        .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1')
        // `\sqrt{x}` → `√(x)`
        .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
        // Cualquier otro comando con argumento —`\vec{v}`, `\hat{x}`— conserva
        // el argumento y pierde el comando. Va después de los casos concretos
        // para que aquellos tengan preferencia.
        .replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1')
        // Símbolos con nombre.
        .replace(/\\([a-zA-Z]+)/g, (completo, nombre) => SIMBOLOS[nombre] ?? nombre)
        // Dobles barras de la norma: `||x||` → `‖x‖`
        .replace(/\|\|/g, '‖')
        // Las llaves que quedan tras lo anterior ya no agrupan nada.
        .replace(/[{}]/g, '')
    );
  }

  formatMessage(content: string): string {
    return (
      this.traducirLatex(content)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // El LaTeX se traduce antes que el Markdown: `\frac{a}{b}` contiene
        // llaves que el resto de reglas no deben tocar.
        .replace(/\\\(\s*(.*?)\s*\\\)/g, '$1')
        .replace(/\\\[\s*(.*?)\s*\\\]/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
    );
  }

  // ── Fuentes agrupadas ─────────────────────────────────────────────────
  //
  // Una consulta recupera a menudo varios fragmentos del mismo documento —en
  // la evaluación ocurrió en la mitad de los casos, y con descomposición de
  // consultas se recuperan hasta diez—. Listarlos uno por uno repetía el
  // nombre del PDF hasta nueve veces y convertía el bloque de fuentes en lo
  // más largo de la respuesta.

  /** Mensajes cuyo bloque de fuentes está plegado. */
  private readonly fuentesPlegadas = new Set<number>();

  toggleFuentes(messageId: number): void {
    if (this.fuentesPlegadas.has(messageId)) this.fuentesPlegadas.delete(messageId);
    else this.fuentesPlegadas.add(messageId);
  }

  fuentesVisibles(messageId: number): boolean {
    return !this.fuentesPlegadas.has(messageId);
  }

  /**
   * Agrupa las fuentes por documento, conservando el orden de relevancia: el
   * documento cuyo mejor fragmento puntúa más alto aparece primero.
   */
  agruparFuentes(sources: Source[]): FuenteAgrupada[] {
    const porDocumento = new Map<string, FuenteAgrupada>();

    for (const s of sources) {
      const clave = s.document_name || `doc-${s.document_id}`;
      const grupo = porDocumento.get(clave);
      if (grupo) {
        grupo.fragmentos.push(s);
        grupo.mejorScore = Math.max(grupo.mejorScore, s.score ?? 0);
      } else {
        porDocumento.set(clave, {
          documentId: s.document_id,
          nombre: clave,
          mejorScore: s.score ?? 0,
          fragmentos: [s],
        });
      }
    }

    return [...porDocumento.values()].sort((a, b) => b.mejorScore - a.mejorScore);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  handleKeyDown(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  submitFeedback(messageId: number, type: 'up' | 'down', comment?: string): void {
    const current = this.messageFeedback()[messageId];
    if (current === type && !comment) {
      this.messageFeedback.update((m) => {
        const n = { ...m };
        delete n[messageId];
        return n;
      });
      return;
    }

    const rating = type === 'up' ? 5 : 1;
    this.feedbackService
      .submit({
        assistant_id: this.assistantId(),
        message_id: messageId,
        rating,
        comment: comment || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageFeedback.update((m) => ({ ...m, [messageId]: type }));
          this.feedbackSent.set(messageId);
          setTimeout(() => this.feedbackSent.set(null), 2000);
        },
        error: () => {},
      });
  }

  openFeedbackPanel(messageId: number): void {
    if (this.messageFeedback()[messageId] === 'down') {
      this.messageFeedback.update((m) => {
        const n = { ...m };
        delete n[messageId];
        return n;
      });
      return;
    }
    this.feedbackPanelOpen.set(messageId);
    this.feedbackComment.set('');
  }

  closeFeedbackPanel(): void {
    this.feedbackPanelOpen.set(null);
    this.feedbackComment.set('');
  }

  selectFeedbackOption(opt: string): void {
    this.feedbackComment.set(this.feedbackComment() === opt ? '' : opt);
  }

  submitNegativeFeedback(messageId: number): void {
    this.submitFeedback(messageId, 'down', this.feedbackComment() || undefined);
    this.closeFeedbackPanel();
  }

  dismissError(): void {
    clearTimeout(this.errorTimer);
    this.sendError.set(null);
  }

  /**
   * Traduce un fallo de carga a un mensaje accionable.
   *
   * Mismo criterio que `showSendError`, pero con textos propios: aquí lo que
   * falló fue abrir la conversación, no enviar un mensaje, y el 404 es un caso
   * real —un enlace a una conversación borrada— que en el envío no se da.
   */
  private mensajeDeCarga(e: unknown): string {
    const status = (e as { status?: number })?.status;
    if (!status || status === 0) return 'Sin conexión. Verifica tu red y vuelve a intentarlo.';
    if (status === 404) return 'Esta conversación ya no existe.';
    if (status === 403) return 'No tienes acceso a esta conversación.';
    if (status >= 500) return 'El servidor no responde. Intenta de nuevo en unos segundos.';
    return 'No se pudo cargar la conversación.';
  }

  /** Reintenta la carga de la conversación que está en la ruta. */
  reintentarCarga(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      conversation: this.chatService.getConversation(+id),
      messages: this.chatService.getMessages(+id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ conversation, messages }) => {
          this.conversation.set(conversation);
          this.messages.set(messages);
          this.loading.set(false);
          this.currentPage.set(this.totalPages());
          this.restoreFeedbackState(messages.map((m) => m.id));
          this.scrollToBottom();
        },
        error: (e) => {
          this.loading.set(false);
          this.loadError.set(this.mensajeDeCarga(e));
        },
      });
  }

  private showSendError(e: unknown): void {
    const status = (e as { status?: number })?.status;
    let msg: string;
    if (!status || status === 0) msg = 'Sin conexión. Verifica tu red e intenta de nuevo.';
    else if (status === 408) msg = 'La consulta tardó demasiado. Intenta de nuevo.';
    else if (status === 429) msg = 'Demasiadas consultas. Espera un momento antes de enviar.';
    else if (status >= 500) msg = 'Error del servidor. Intenta de nuevo en unos segundos.';
    else msg = 'No se pudo enviar el mensaje. Intenta de nuevo.';

    clearTimeout(this.errorTimer);
    this.sendError.set(msg);
    this.errorTimer = setTimeout(() => this.sendError.set(null), 5000);
  }
}
