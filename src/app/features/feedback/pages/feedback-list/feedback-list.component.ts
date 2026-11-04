import {
  Component, OnInit, DestroyRef, inject, signal, computed,
  HostListener, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { FeedbackService } from '../../../chat/services/feedback.service';
import {
  FeedbackResponse,
  FeedbackStats,
  FeedbackStatus,
  FeedbackPeriod,
  ThemeCount,
} from '../../../../core/models/feedback.model';
import { AssistantService } from '../../../assistants/services/assistant.service';

@Component({
  selector: 'app-feedback-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feedback-list.component.html',
  styleUrls: ['./feedback-list.component.scss'],
})
export class FeedbackListComponent implements OnInit {
  private readonly destroyRef    = inject(DestroyRef);
  private readonly feedbackSvc   = inject(FeedbackService);
  private readonly assistantSvc  = inject(AssistantService);
  private readonly el            = inject(ElementRef);

  // ── Estado ────────────────────────────────────────────────────────────
  readonly loadingStats      = signal(true);
  readonly loadingList       = signal(true);
  readonly errorStats        = signal(false);
  readonly errorList         = signal(false);
  readonly feedbacks         = signal<FeedbackResponse[]>([]);
  readonly stats             = signal<FeedbackStats | null>(null);
  readonly assistants        = signal<{ id: number; name: string }[]>([]);
  readonly selectedAssistant = signal<number | null>(null);
  readonly assistOpen        = signal(false);
  readonly period            = signal<FeedbackPeriod>('month');
  readonly mode              = signal<'comments' | 'themes'>('comments');
  readonly ratingFilter      = signal<number | null>(null);
  readonly themeSearch       = signal('');
  readonly openTheme         = signal<string | null>(null);
  readonly convertingFb      = signal<FeedbackResponse | null>(null);
  readonly convertingTheme   = signal<ThemeCount | null>(null);
  readonly convertQuestion   = signal('');
  readonly converting        = signal(false);

  // ── Opciones de período tipadas ───────────────────────────────────────
  readonly periodOptions: { value: FeedbackPeriod; label: string }[] = [
    { value: 'month', label: 'Este mes' },
    { value: '90d',   label: '90 días'  },
    { value: '12m',   label: '12 meses' },
  ];

  // ── Asistentes activos de la empresa (desde el servicio) ──────────────
  readonly assistantOptions = computed(() => this.assistants());

  // ── Paginación: de 10 en 10 ───────────────────────────────────────────
  // Antes se pedía la lista sin límite y el backend devolvía 50: a partir del
  // comentario 51 la lista se cortaba sin avisar, y el filtro por estrellas se
  // aplicaba en el navegador solo sobre esos 50. Ahora el filtro lo aplica el
  // backend y la lista se completa con "Ver más". 10 y no 25: cada tarjeta mide
  // unos 200 px y 25 eran cinco o seis pantallas de scroll.
  readonly pageSize          = 10;
  readonly hasMore           = signal(false);
  readonly loadingMore       = signal(false);
  private listSub?: Subscription;

  /** Total del período con el filtro activo, según las stats (no lo cargado). */
  readonly listTotal = computed(() => {
    const d  = this.stats()?.distribution;
    if (!d) return null;
    const rf = this.ratingFilter();
    if (rf != null) return d[rf] ?? 0;
    return Object.values(d).reduce<number>((acc, v) => acc + (v ?? 0), 0);
  });

  // ── Distribución: máximo para escalar barras ──────────────────────────
  readonly maxDistCount = computed(() => {
    const d = this.stats()?.distribution ?? {};
    const vals = Object.values(d).filter((v): v is number => v !== undefined);
    return vals.length ? Math.max(1, ...vals) : 1;
  });

  // ── Texto del contador de la lista ────────────────────────────────────
  readonly listCountLabel = computed(() => {
    if (this.mode() === 'themes') {
      const themeCount = this.stats()?.themes?.length ?? 0;
      const negCount   = this.stats()?.negatives ?? 0;
      const item = themeCount === 1 ? 'tema' : 'temas';
      return `${themeCount} ${item} · ${negCount.toLocaleString('es-CO')} comentarios negativos ${this.periodSuffix()}`;
    }
    const loaded = this.feedbacks().length;
    const total  = this.listTotal();
    const count  = total != null && total > loaded ? total : loaded;
    const rf     = this.ratingFilter();
    const item   = count === 1 ? 'comentario' : 'comentarios';
    const stars  = rf == null ? '' : ` de ${rf} ${rf === 1 ? 'estrella' : 'estrellas'}`;
    const shown  = count > loaded ? ` · mostrando ${loaded}` : '';
    return `${count} ${item}${stars}${shown}`;
  });

  // ── Modal activo (feedback individual o tema) ─────────────────────────
  readonly modalOpen = computed(() => !!this.convertingFb() || !!this.convertingTheme());

  ngOnInit(): void {
    this.assistantSvc.getAssistants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list =>
        this.assistants.set(
          list
            .filter(a => a.is_active)
            .map(a => ({ id: a.id, name: a.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      );
    this.load();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.assistOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.assistOpen.set(false);
  }

  private load(): void {
    const aid = this.selectedAssistant();
    const per = this.period();

    // Stats y lista cargan de forma independiente
    this.loadingStats.set(true);
    this.errorStats.set(false);
    this.feedbackSvc.getStats(aid ?? undefined, per)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: s => {
          this.stats.set(s);
          this.loadingStats.set(false);
          // Primer tema abierto por defecto
          if (s.themes?.length) {
            this.openTheme.set(s.themes[0].label);
          }
        },
        error: () => {
          this.loadingStats.set(false);
          this.errorStats.set(true);
        },
      });

    this.loadList();
  }

  /** Primera página de la lista. Cancela la petición anterior para que una
   *  respuesta tardía de otro filtro no pise la actual. */
  private loadList(): void {
    this.listSub?.unsubscribe();
    this.loadingList.set(true);
    this.loadingMore.set(false);
    this.errorList.set(false);
    this.listSub = this.fetchPage(0).subscribe({
      next: list => {
        this.feedbacks.set(list);
        this.hasMore.set(list.length === this.pageSize);
        this.loadingList.set(false);
      },
      error: () => {
        this.loadingList.set(false);
        this.errorList.set(true);
      },
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.listSub = this.fetchPage(this.feedbacks().length).subscribe({
      next: list => {
        this.feedbacks.update(cur => [...cur, ...list]);
        this.hasMore.set(list.length === this.pageSize);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  private fetchPage(skip: number) {
    return this.feedbackSvc
      .getAll({
        assistant_id: this.selectedAssistant() ?? undefined,
        period: this.period(),
        rating: this.ratingFilter() ?? undefined,
        skip,
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef));
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  toggleAssistantDropdown(): void {
    this.assistOpen.update(v => !v);
  }

  selectAssistantFromDropdown(id: number | null): void {
    this.selectedAssistant.set(id);
    this.assistOpen.set(false);
    this.ratingFilter.set(null);
    this.load();
  }

  selectPeriod(p: FeedbackPeriod): void {
    this.period.set(p);
    this.ratingFilter.set(null);
    this.load();
  }

  selectMode(m: 'comments' | 'themes'): void {
    this.mode.set(m);
  }

  toggleRating(rating: number): void {
    if (this.mode() === 'themes') {
      this.mode.set('comments');
    }
    this.ratingFilter.update(cur => (cur === rating ? null : rating));
    this.loadList();
  }

  clearRatingFilter(): void {
    this.ratingFilter.set(null);
    this.loadList();
  }

  toggleTheme(label: string): void {
    this.openTheme.update(cur => (cur === label ? null : label));
  }

  openConvertDialog(fb: FeedbackResponse): void {
    this.convertingFb.set(fb);
    this.convertingTheme.set(null);
    this.convertQuestion.set(fb.question ?? '');
  }

  openThemeConvertDialog(theme: ThemeCount): void {
    this.convertingTheme.set(theme);
    this.convertingFb.set(null);
    this.convertQuestion.set(theme.label);
  }

  cancelConvert(): void {
    this.convertingFb.set(null);
    this.convertingTheme.set(null);
    this.convertQuestion.set('');
  }

  confirmConvert(): void {
    if (this.converting()) return;

    // Conversión individual (feedback con ID)
    const fb = this.convertingFb();
    if (fb) {
      this.converting.set(true);
      this.feedbackSvc
        .convertToGap(fb.id, this.convertQuestion())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: updated => {
            this.feedbacks.update(list => list.map(f => f.id === updated.id ? updated : f));
            this.converting.set(false);
            this.cancelConvert();
            this.feedbackSvc.getStats(this.selectedAssistant() ?? undefined, this.period())
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(s => this.stats.set(s));
          },
          error: () => this.converting.set(false),
        });
      return;
    }

    // Conversión de tema (bloque — pendiente de implementación backend)
    this.cancelConvert();
  }

  updateStatus(fb: FeedbackResponse, newStatus: FeedbackStatus): void {
    this.feedbackSvc
      .updateStatus(fb.id, { status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(updated =>
        this.feedbacks.update(list => list.map(f => f.id === updated.id ? updated : f))
      );
  }

  exportCsv(): void {
    this.feedbackSvc
      .exportCsv(this.selectedAssistant() ?? undefined, this.period())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = 'feedback.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  // ── Helpers de período ────────────────────────────────────────────────

  periodSuffix(): string {
    const map: Record<FeedbackPeriod, string> = {
      month: 'del mes',
      '90d': 'de los últimos 90 días',
      '12m': 'de los últimos 12 meses',
    };
    return map[this.period()];
  }

  deltaPeriodLabel(): string {
    if (this.period() === 'month') {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      return `vs. ${prev.toLocaleDateString('es-CO', { month: 'long' })}`;
    }
    return 'vs. período anterior';
  }

  // ── Helpers de presentación ───────────────────────────────────────────

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  assistantName(): string {
    const id = this.selectedAssistant();
    if (id == null) return 'Todos';
    return this.assistantOptions().find(a => a.id === id)?.name ?? 'Todos';
  }

  statusLabel(status: FeedbackStatus): string {
    const map: Record<FeedbackStatus, string> = {
      new:       'Sin acción',
      reviewed:  'Revisado',
      converted: 'Convertido',
      dismissed: 'Descartado',
      stale:     'Obsoleto',
    };
    return map[status] ?? status;
  }

  gapPillClass(fb: FeedbackResponse): string {
    if (fb.status === 'converted' && fb.knowledge_gap_id) {
      return fb.knowledge_gap_status === 'resolved'
        ? 'status-pill status-pill--resolved'
        : 'status-pill status-pill--converted';
    }
    return `status-pill status-pill--${fb.status}`;
  }

  isNegative(rating: number): boolean { return rating <= 2; }
  isNegOrNeutral(rating: number): boolean { return rating <= 3; }

  roundRating(r: number): number { return Math.round(r); }

  deltaIsPositive(d: number | null | undefined): boolean { return d != null && d > 0; }
  deltaIsNegative(d: number | null | undefined): boolean { return d != null && d < 0; }

  deltaSign(delta: number | null): string {
    if (delta == null || delta === 0) return '';
    return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  }
}
