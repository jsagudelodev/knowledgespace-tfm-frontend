import {
  Component, OnInit, OnDestroy, DestroyRef, inject,
  ChangeDetectorRef, signal, computed, HostListener
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { DocumentService } from '../../services/document.service';
import { CategoryService } from '../../../categories/services/category.service';
import { Document, DocumentChunks } from '../../../../core/models/document.model';
import { Category } from '../../../../core/models/category.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [DatePipe, RouterLink, Paginator],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────────────────────────────────
  readonly originalData        = signal<Document[]>([]);
  readonly searchTerm          = signal('');
  readonly selectedStatus      = signal('');
  readonly selectedCategory    = signal('');
  readonly availableCategories = signal<Category[]>([]);

  readonly categoryMap = computed(() => {
    const map = new Map<number, Category>();
    this.availableCategories().forEach(c => map.set(c.id, c));
    return map;
  });

  readonly activeCategories = computed(() =>
    this.availableCategories().filter(c => c.is_active)
  );

  readonly filteredData = computed(() => {
    let data = this.originalData();
    const term       = this.searchTerm().toLowerCase().trim();
    const status     = this.selectedStatus();
    const categoryId = this.selectedCategory() ? Number(this.selectedCategory()) : null;

    if (term)   data = data.filter(d => d.original_filename.toLowerCase().includes(term));
    if (status) data = data.filter(d => d.status === status);
    if (categoryId != null) data = data.filter(d => d.category_id === categoryId);
    return data;
  });

  // ── Pagination ────────────────────────────────────────────────────────
  readonly currentPage = signal(1);
  readonly pageSize    = signal(10);

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

  readonly hasActiveFilters = computed(() =>
    !!this.selectedStatus() || !!this.selectedCategory() || !!this.searchTerm().trim()
  );

  // ── UI state ──────────────────────────────────────────────────────────
  loading = true;
  error: string | null = null;

  deleteConfirmId: number | null = null;
  deletingIds     = new Set<number>();
  downloadingIds  = new Set<number>();

  categoryPickerDocId: number | null = null;
  categoryActionIds   = new Set<number>();

  private destroyRef     = inject(DestroyRef);
  private cdr             = inject(ChangeDetectorRef);
  private notifications   = inject(NotificationService);
  private searchSubject   = new Subject<string>();

  constructor(
    private documentService: DocumentService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
    });

    this.loadDocuments();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  // ── Close category picker on outside click ───────────────────────────

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.categoryPickerDocId !== null) {
      this.categoryPickerDocId = null;
      this.cdr.detectChanges();
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────

  loadDocuments(): void {
    this.loading = true;
    this.error   = null;
    this.documentService.getDocuments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.originalData.set(data);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error   = 'No se pudieron cargar los documentos. Verifica tu conexión e intenta de nuevo.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadCategories(): void {
    this.categoryService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.availableCategories.set(categories),
        error: () => {}
      });
  }

  // ── Search ────────────────────────────────────────────────────────────

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
  }

  // ── Filters ───────────────────────────────────────────────────────────

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  clearStatusFilter(): void   { this.selectedStatus.set('');   this.currentPage.set(1); }
  clearCategoryFilter(): void { this.selectedCategory.set(''); this.currentPage.set(1); }

  clearAllFilters(): void {
    this.selectedStatus.set('');
    this.selectedCategory.set('');
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
  }

  // ── Pagination ────────────────────────────────────────────────────────

  onPageChange(event: PaginatorState): void {
    this.currentPage.set((event.page ?? 0) + 1);
    if (event.rows) this.pageSize.set(event.rows);
  }

  // ── Display helpers ───────────────────────────────────────────────────

  getCategory(doc: Document): Category | undefined {
    return doc.category_id != null ? this.categoryMap().get(doc.category_id) : undefined;
  }

  getCategoryName(categoryId: number): string {
    return this.categoryMap().get(categoryId)?.name ?? '';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      completed:  'status-completed',
      processing: 'status-processing',
      failed:     'status-failed',
    };
    return map[status] ?? 'status-pending';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      completed:  'Completado',
      processing: 'Procesando...',
      failed:     'Fallido',
    };
    return map[status] ?? 'Pendiente';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      completed:  'check_circle',
      processing: 'autorenew',
      failed:     'cancel',
    };
    return map[status] ?? 'schedule';
  }

  getStatusChipLabel(status: string): string {
    const map: Record<string, string> = {
      pending:    'Pendiente',
      processing: 'Procesando',
      completed:  'Completado',
      failed:     'Fallido',
    };
    return map[status] ?? status;
  }

  truncateError(msg: string, max = 70): string {
    return msg.length > max ? msg.slice(0, max) + '…' : msg;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Category picker ───────────────────────────────────────────────────

  toggleCategoryPicker(docId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.categoryPickerDocId = this.categoryPickerDocId === docId ? null : docId;
    this.cdr.detectChanges();
  }

  setDocumentCategory(docId: number, categoryId: number | null, event: MouseEvent): void {
    event.stopPropagation();
    if (this.categoryActionIds.has(docId)) return;

    const previous = this.originalData().find(d => d.id === docId)?.category_id ?? null;
    if (previous === categoryId) {
      this.categoryPickerDocId = null;
      this.cdr.detectChanges();
      return;
    }

    this.categoryActionIds = new Set(this.categoryActionIds).add(docId);
    this.categoryPickerDocId = null;

    // Optimistic update
    this.originalData.update(docs =>
      docs.map(d => d.id === docId ? { ...d, category_id: categoryId } : d)
    );
    this.cdr.detectChanges();

    this.documentService.updateDocument(docId, { category_id: categoryId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.categoryActionIds.delete(docId);
          this.categoryActionIds = new Set(this.categoryActionIds);
        },
        error: () => {
          // Revert optimistic update
          this.originalData.update(docs =>
            docs.map(d => d.id === docId ? { ...d, category_id: previous } : d)
          );
          this.categoryActionIds.delete(docId);
          this.categoryActionIds = new Set(this.categoryActionIds);
          this.notifications.error('No se pudo cambiar la categoría. Intenta de nuevo.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Download ──────────────────────────────────────────────────────────

  downloadDocument(id: number): void {
    if (this.downloadingIds.has(id)) return;
    this.downloadingIds = new Set(this.downloadingIds).add(id);
    this.cdr.detectChanges();

    this.documentService.getDownloadUrl(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url, filename }) => {
          this.downloadingIds.delete(id);
          this.downloadingIds = new Set(this.downloadingIds);
          const a = globalThis.document.createElement('a');
          a.href = url;
          a.download = filename;
          a.target = '_blank';
          a.click();
          this.cdr.detectChanges();
        },
        error: () => {
          this.downloadingIds.delete(id);
          this.downloadingIds = new Set(this.downloadingIds);
          this.notifications.error('Error al generar el enlace de descarga.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Fragmentos indexados ──────────────────────────────────────────────
  //
  // Permite ver en qué quedó dividido un documento tras la ingesta. Hasta
  // ahora la lista decía cuántos fragmentos tenía, pero no cuáles, de modo que
  // un troceado defectuoso —un corte a mitad de una tabla, una sección que la
  // extracción del PDF se dejó— solo se notaba por sus efectos en las
  // respuestas del chat.

  /** Documento cuyos fragmentos están desplegados, o null. Solo uno a la vez. */
  readonly chunksAbiertos = signal<number | null>(null);
  readonly chunksCargando = signal(false);
  readonly chunksDatos    = signal<DocumentChunks | null>(null);

  toggleChunks(id: number): void {
    if (this.chunksAbiertos() === id) {
      this.chunksAbiertos.set(null);
      this.chunksDatos.set(null);
      return;
    }

    // Se piden bajo demanda: un documento puede tener decenas de fragmentos
    // con su texto, y traerlos para toda la lista sería un gasto inútil.
    this.chunksAbiertos.set(id);
    this.chunksDatos.set(null);
    this.chunksCargando.set(true);

    this.documentService.getChunks(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: datos => {
          this.chunksCargando.set(false);
          this.chunksDatos.set(datos);
          this.cdr.detectChanges();
        },
        error: () => {
          this.chunksCargando.set(false);
          this.chunksAbiertos.set(null);
          this.notifications.error('No se pudieron leer los fragmentos del índice.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Delete ────────────────────────────────────────────────────────────

  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void            { this.deleteConfirmId = null; }

  deleteDocument(id: number): void {
    if (this.deletingIds.has(id)) return;
    this.deleteConfirmId = null;
    this.deletingIds = new Set(this.deletingIds).add(id);
    this.cdr.detectChanges();

    this.documentService.deleteDocument(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingIds.delete(id);
          this.deletingIds = new Set(this.deletingIds);
          this.notifications.success('Documento eliminado correctamente.');
          this.loadDocuments();
        },
        error: () => {
          this.deletingIds.delete(id);
          this.deletingIds = new Set(this.deletingIds);
          this.notifications.error('Error al eliminar el documento. Intenta de nuevo.');
          this.cdr.detectChanges();
        }
      });
  }
}
