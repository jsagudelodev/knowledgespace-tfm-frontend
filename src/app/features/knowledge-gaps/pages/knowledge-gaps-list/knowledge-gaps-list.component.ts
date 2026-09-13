import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { KnowledgeGapsService } from '../../services/knowledge-gaps.service';
import { UserService } from '../../../users/services/user.service';
import { User } from '../../../../core/models/user.model';
import {
  KnowledgeGap,
  KnowledgeGapSummary,
  GapTab,
  GapSort,
  ResMode,
  IgnoreReason,
} from '../../../../core/models/knowledge-gap.model';

@Component({
  selector: 'app-knowledge-gaps-list',
  standalone: true,
  imports: [RouterModule, FormsModule],
  templateUrl: './knowledge-gaps-list.component.html',
  styleUrl: './knowledge-gaps-list.component.scss',
})
export class KnowledgeGapsListComponent implements OnInit {
  private readonly svc        = inject(KnowledgeGapsService);
  private readonly userSvc    = inject(UserService);
  private readonly route      = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$    = new Subject<string>();

  // ── UI state ──────────────────────────────────────────────────────────────
  gapTab       = signal<GapTab>('open');
  gapSort      = signal<GapSort>('impact');
  gapQuery     = signal('');
  selectedId   = signal<number | null>(null);
  resMode      = signal<ResMode>('link');
  showModes    = signal(false);
  linkSel      = signal(0);
  ignoring     = signal(false);
  ignoreReason = signal<IgnoreReason>('out_of_scope');
  submitting   = signal(false);
  assigneeId   = signal<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  private readonly pageSize = 25;

  gaps        = signal<KnowledgeGap[]>([]);
  summary     = signal<KnowledgeGapSummary | null>(null);
  assignees   = signal<User[]>([]);
  loading     = signal(false);
  loadingMore = signal(false);
  hasMore     = signal(false);
  error       = signal<string | null>(null);

  // ── Form fields (not signals — bound via ngModel) ─────────────────────────
  answerText  = '';
  requestNote = '';

  // ── Computed ──────────────────────────────────────────────────────────────
  selectedGap = computed(() => this.gaps().find(g => g.id === this.selectedId()) ?? null);

  gapImpacts = computed(() => {
    const list = this.gaps();
    if (!list.length) return new Map<number, number>();
    const raws = list.map(g => {
      const cw = g.channel === 'widget' ? 1.4 : 1.0;
      const tw = g.trend === 'rising' ? 1.35 : g.trend === 'declining' ? 0.6 : 1.0;
      return (g.volume || 1) * cw * tw;
    });
    const maxRaw = Math.max(...raws);
    const map = new Map<number, number>();
    list.forEach((g, i) => map.set(g.id, maxRaw > 0 ? Math.round(100 * raws[i] / maxRaw) : 0));
    return map;
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadAssignees();

    const idParam = this.route.snapshot.paramMap.get('id');
    const deepLinkId = idParam ? Number(idParam) : null;

    if (deepLinkId) {
      this.svc.getById(deepLinkId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: gap => {
          this.gapTab.set(gap.status === 'resolved' ? 'resolved' : gap.status === 'ignored' ? 'ignored' : 'open');
          this.selectedId.set(gap.id);
          this.loadGaps();
        },
        error: () => this.loadGaps(),
      });
    } else {
      this.loadGaps();
    }

    this.search$.pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.selectedId.set(null);
      this.loadGaps();
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadSummary(): void {
    this.svc.getSummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: s => this.summary.set(s),
    });
  }

  private loadAssignees(): void {
    this.userSvc.getUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => this.assignees.set(list),
    });
  }

  loadGaps(): void {
    this.loading.set(true);
    this.error.set(null);
    const pendingId = this.selectedId();
    this.svc.getList({
      status: this.gapTab(),
      sort:   this.gapSort(),
      q:      this.gapQuery() || undefined,
      skip:   0,
      limit:  this.pageSize,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        this.gaps.set(list);
        this.hasMore.set(list.length === this.pageSize);
        this.loading.set(false);
        this.resolvePendingSelection(pendingId);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar las preguntas. Intenta de nuevo.');
      },
    });
  }

  /** Carga la página siguiente dentro del área de scroll (25 en 25). */
  loadMore(onDone?: () => void): void {
    if (this.loadingMore() || !this.hasMore()) {
      onDone?.();
      return;
    }
    this.loadingMore.set(true);
    this.svc.getList({
      status: this.gapTab(),
      sort:   this.gapSort(),
      q:      this.gapQuery() || undefined,
      skip:   this.gaps().length,
      limit:  this.pageSize,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        this.gaps.update(cur => [...cur, ...list]);
        this.hasMore.set(list.length === this.pageSize);
        this.loadingMore.set(false);
        onDone?.();
      },
      error: () => {
        this.loadingMore.set(false);
        onDone?.();
      },
    });
  }

  onListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      this.loadMore();
    }
  }

  /** Selecciona la pregunta pendiente (deep link o selección previa), cargando páginas
   *  adicionales si aún no está entre las cargadas. */
  private resolvePendingSelection(pendingId: number | null): void {
    const list = this.gaps();
    if (!list.length) {
      this.selectedId.set(null);
      return;
    }
    if (pendingId) {
      const target = list.find(g => g.id === pendingId);
      if (target) {
        this.selectGap(target);
        return;
      }
      if (this.hasMore()) {
        this.loadMore(() => this.resolvePendingSelection(pendingId));
        return;
      }
    }
    this.selectGap(list[0]);
  }

  // ── Selection & navigation ────────────────────────────────────────────────

  selectGap(gap: KnowledgeGap): void {
    this.selectedId.set(gap.id);
    this.showModes.set(false);
    this.ignoring.set(false);
    this.answerText  = '';
    this.requestNote = '';
    this.linkSel.set(0);
    this.assigneeId.set(null);
    const hasCandidates = !!(gap.candidates?.length);
    this.resMode.set(hasCandidates ? 'link' : 'request');
  }

  setTab(tab: GapTab): void {
    this.gapTab.set(tab);
    this.selectedId.set(null);
    this.loadGaps();
  }

  setSort(sort: GapSort): void {
    this.gapSort.set(sort);
    this.loadGaps();
  }

  onSearchChange(q: string): void {
    this.gapQuery.set(q);
    this.search$.next(q);
  }

  private advanceToNext(resolvedId: number): void {
    const remaining = this.gaps().filter(g => this.isOpen(g) && g.id !== resolvedId);
    if (remaining.length) {
      this.selectGap(remaining[0]);
    } else {
      this.loadGaps();
    }
  }

  private patchInList(updated: KnowledgeGap): void {
    this.gaps.update(list => list.map(g => g.id === updated.id ? updated : g));
    this.loadSummary();
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  impactOf(gap: KnowledgeGap): number {
    return this.gapImpacts().get(gap.id) ?? 0;
  }

  priorityOf(gap: KnowledgeGap): 'alta' | 'media' | 'baja' {
    const i = this.impactOf(gap);
    return i >= 70 ? 'alta' : i >= 40 ? 'media' : 'baja';
  }

  gapTypeLabel(gap: KnowledgeGap): string {
    return gap.gap_type === 'hard' ? 'falta contenido' : 'no se encuentra';
  }

  channelLabel(gap: KnowledgeGap): string {
    return gap.channel === 'widget' ? 'widget' : 'chat';
  }

  trendLabel(gap: KnowledgeGap): string {
    if (!gap.trend) return '';
    return gap.trend === 'rising' ? 'subiendo' : gap.trend === 'declining' ? 'bajando' : 'estable';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      open: 'abierta', in_progress: 'en curso', resolved: 'resuelta', ignored: 'ignorada',
    };
    return map[s] ?? s;
  }

  ignoreReasonLabel(r: string | null): string {
    if (!r) return '';
    const map: Record<string, string> = {
      out_of_scope: 'Fuera de alcance',
      one_off:      'Puntual, no se repite',
      duplicate:    'Duplicada',
    };
    return map[r] ?? r;
  }

  relativeTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now  = new Date();
    const ms   = now.getTime() - date.getTime();
    const min  = Math.floor(ms / 60000);
    const h    = Math.floor(ms / 3600000);
    const d    = Math.floor(ms / 86400000);
    if (min < 1) return 'ahora mismo';
    if (min < 60) return `hace ${min} min`;
    if (h < 24)   return `hace ${h} h`;
    if (d < 2) {
      const t = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      return `ayer ${t}`;
    }
    return `hace ${d} días`;
  }

  tabCount(tab: GapTab): number {
    const s = this.summary();
    if (!s) return 0;
    if (tab === 'open')     return s.open_count;
    if (tab === 'resolved') return s.resolved_count;
    return s.ignored_count;
  }

  footerLabel(): string {
    const tab = this.gapTab();
    const label = tab === 'open' ? 'abiertas' : tab === 'resolved' ? 'resueltas' : 'ignoradas';
    const query = this.gapQuery();
    const total = query ? this.gaps().length : this.tabCount(tab);
    return `${total} preguntas en ${label}${query ? ' que coinciden con la búsqueda' : ''}`;
  }

  isOpen(gap: KnowledgeGap): boolean {
    return gap.status === 'open' || gap.status === 'in_progress';
  }

  isInProgress(gap: KnowledgeGap): boolean {
    return gap.status === 'in_progress';
  }

  isRecurrent(gap: KnowledgeGap): boolean {
    return (gap.recurrence_count ?? 0) > 0;
  }

  hasCandidates(gap: KnowledgeGap): boolean {
    return !!(gap.candidates?.length);
  }

  recommendationText(gap: KnowledgeGap): string {
    if (this.hasCandidates(gap)) {
      const name = gap.candidates![0].name;
      return `Recomendado: el contenido ya existe en "${name}". Vincúlalo y se reindexa con estas variantes.`;
    }
    return 'Recomendado: ningún documento pasa el umbral. Pide el documento a quien lo tenga.';
  }

  variantTop3(gap: KnowledgeGap) {
    return (gap.variants ?? []).slice(0, 3);
  }

  // ── Quick actions (from list row) ─────────────────────────────────────────

  quickLink(gap: KnowledgeGap, event: Event): void {
    event.stopPropagation();
    if (!gap.candidates?.length) return;
    this.submitting.set(true);
    const best = gap.candidates[0];
    this.svc.link(gap.id, { document_id: best.document_id, chunk_id: best.chunk_id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.patchInList(updated);
          this.submitting.set(false);
          this.advanceToNext(gap.id);
        },
        error: () => this.submitting.set(false),
      });
  }

  openRequestPanel(gap: KnowledgeGap, event: Event): void {
    event.stopPropagation();
    this.selectedId.set(gap.id);
    this.resMode.set('request');
    this.showModes.set(false);
  }

  // ── Panel resolution actions ──────────────────────────────────────────────

  doLink(): void {
    const gap = this.selectedGap();
    if (!gap?.candidates?.length) return;
    const chosen = gap.candidates[this.linkSel()];
    this.submitting.set(true);
    this.svc.link(gap.id, { document_id: chosen.document_id, chunk_id: chosen.chunk_id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.patchInList(updated);
          this.submitting.set(false);
          this.advanceToNext(gap.id);
        },
        error: () => this.submitting.set(false),
      });
  }

  doAnswer(): void {
    const gap = this.selectedGap();
    if (!gap || !this.answerText.trim()) return;
    this.submitting.set(true);
    this.svc.answer(gap.id, { answer_text: this.answerText.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.patchInList(updated);
          this.submitting.set(false);
          this.answerText = '';
          this.advanceToNext(gap.id);
        },
        error: () => this.submitting.set(false),
      });
  }

  doRequestDocument(): void {
    const gap = this.selectedGap();
    const assigneeId = this.assigneeId();
    if (!gap || !assigneeId) return;
    this.submitting.set(true);
    this.svc.requestDocument(gap.id, { assignee_id: assigneeId, note: this.requestNote || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.patchInList(updated);
          this.submitting.set(false);
          this.requestNote = '';
          this.selectGap(updated);
        },
        error: () => this.submitting.set(false),
      });
  }

  doIgnore(): void {
    const gap = this.selectedGap();
    if (!gap) return;
    this.submitting.set(true);
    this.svc.ignore(gap.id, { reason: this.ignoreReason() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.patchInList(updated);
          this.submitting.set(false);
          this.ignoring.set(false);
          this.advanceToNext(gap.id);
        },
        error: () => this.submitting.set(false),
      });
  }

  doVerify(): void {
    const gap = this.selectedGap();
    if (!gap) return;
    this.submitting.set(true);
    this.svc.verify(gap.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.patchInList(updated);
          this.submitting.set(false);
        },
        error: () => this.submitting.set(false),
      });
  }
}
