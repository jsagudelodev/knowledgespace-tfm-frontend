import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TagService } from '../../services/tag.service';
import { Tag } from '../../../../core/models/tag.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { TagFormComponent } from '../tag-form/tag-form.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [TagFormComponent, EmptyStateComponent],
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagListComponent implements OnInit {
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly destroyRef    = inject(DestroyRef);
  private readonly tagService    = inject(TagService);
  private readonly notifications = inject(NotificationService);
  private readonly searchSubject = new Subject<string>();

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly originalData = signal<Tag[]>([]);
  readonly searchTerm   = signal('');

  readonly filteredData = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return term
      ? this.originalData().filter(t => t.name.toLowerCase().includes(term))
      : this.originalData();
  });

  // ── Paginación ────────────────────────────────────────────────────────────
  readonly currentPage = signal(1);
  readonly pageSize    = signal(20);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredData().length / this.pageSize()))
  );

  readonly paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  });

  readonly paginationStart = computed(() =>
    this.filteredData().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.filteredData().length)
  );

  // ── Estado de UI ──────────────────────────────────────────────────────────
  readonly loading         = signal(true);
  readonly error           = signal<string | null>(null);
  readonly showCreateModal = signal(false);
  readonly showEditModal   = signal(false);
  readonly selectedTagId   = signal<number | null>(null);
  readonly deleteConfirmId = signal<number | null>(null);
  readonly deletingId      = signal<number | null>(null);

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
    });

    this.destroyRef.onDestroy(() => this.searchSubject.complete());
    this.loadTags();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  loadTags(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tagService.getTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.originalData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las etiquetas. Verifica tu conexión e intenta de nuevo.');
          this.loading.set(false);
        }
      });
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
    if (this.searchInputRef) this.searchInputRef.nativeElement.value = '';
  }

  // ── Paginación ────────────────────────────────────────────────────────────

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  // ── Modales ───────────────────────────────────────────────────────────────

  openCreateModal(): void { this.showCreateModal.set(true); }

  openEditModal(id: number): void {
    this.selectedTagId.set(id);
    this.showEditModal.set(true);
  }

  closeModals(): void {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.selectedTagId.set(null);
  }

  onTagSaved(): void {
    this.closeModals();
    this.notifications.success('Etiqueta guardada correctamente.');
    this.loadTags();
  }

  // ── Eliminación ───────────────────────────────────────────────────────────

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void            { this.deleteConfirmId.set(null); }

  deleteTag(id: number): void {
    this.deleteConfirmId.set(null);
    this.deletingId.set(id);

    this.tagService.deleteTag(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.notifications.success('Etiqueta eliminada correctamente.');
          this.loadTags();
        },
        error: () => {
          this.deletingId.set(null);
          this.notifications.error('Error al eliminar la etiqueta. Intenta de nuevo.');
        }
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getTagColor(tag: Tag): string {
    return tag.color ?? '#6366f1';
  }
}
