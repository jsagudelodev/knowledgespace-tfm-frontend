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
import { CategoryService } from '../../services/category.service';
import { Category } from '../../../../core/models/category.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CategoryFormComponent, EmptyStateComponent, TableSkeletonComponent],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListComponent implements OnInit {
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly destroyRef    = inject(DestroyRef);
  private readonly categoryService = inject(CategoryService);
  private readonly notifications = inject(NotificationService);
  private readonly searchSubject = new Subject<string>();

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly originalData  = signal<Category[]>([]);
  readonly searchTerm    = signal('');
  readonly statusFilter  = signal<StatusFilter>('all');

  readonly filteredData = computed(() => {
    const term   = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    return this.originalData().filter(c => {
      const matchesSearch = !term ||
        c.name.toLowerCase().includes(term) ||
        (c.description ?? '').toLowerCase().includes(term);
      const matchesStatus =
        status === 'all'      ? true :
        status === 'active'   ? c.is_active :
                                !c.is_active;
      return matchesSearch && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchTerm() || this.statusFilter() !== 'all'
  );

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
  readonly loading          = signal(true);
  readonly error            = signal<string | null>(null);
  readonly showCreateModal  = signal(false);
  readonly showEditModal    = signal(false);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly deleteConfirmId  = signal<number | null>(null);
  readonly deletingId       = signal<number | null>(null);

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
    this.loadCategories();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoryService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.originalData.set(data); this.loading.set(false); },
        error: () => {
          this.error.set('No se pudieron cargar las categorías. Verifica tu conexión e intenta de nuevo.');
          this.loading.set(false);
        }
      });
  }

  // ── Búsqueda y filtros ────────────────────────────────────────────────────

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
    if (this.searchInputRef) this.searchInputRef.nativeElement.value = '';
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.clearSearch();
    this.statusFilter.set('all');
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
    this.selectedCategoryId.set(id);
    this.showEditModal.set(true);
  }

  closeModals(): void {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.selectedCategoryId.set(null);
  }

  onCategorySaved(): void {
    this.closeModals();
    this.notifications.success('Categoría guardada correctamente.');
    this.loadCategories();
  }

  // ── Eliminación ───────────────────────────────────────────────────────────

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void            { this.deleteConfirmId.set(null); }

  deleteCategory(id: number): void {
    this.deleteConfirmId.set(null);
    this.deletingId.set(id);
    this.categoryService.deleteCategory(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.notifications.success('Categoría eliminada correctamente.');
          this.loadCategories();
        },
        error: () => {
          this.deletingId.set(null);
          this.notifications.error('Error al eliminar la categoría. Intenta de nuevo.');
        }
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getCategoryColor(cat: Category): string { return cat.color ?? '#6366f1'; }
  getCategoryIcon(cat: Category): string  { return cat.icon  ?? 'folder'; }
}
