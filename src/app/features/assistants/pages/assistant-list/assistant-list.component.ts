import {
  Component, OnInit, DestroyRef, inject,
  ChangeDetectorRef, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssistantService } from '../../services/assistant.service';
import { Assistant } from '../../../../core/models/assistant.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { CardSkeletonComponent } from '../../../../shared/components/card-skeleton/card-skeleton.component';

@Component({
  selector: 'app-assistant-list',
  standalone: true,
  imports: [CardSkeletonComponent],
  templateUrl: './assistant-list.component.html',
  styleUrls: ['./assistant-list.component.scss']
})
export class AssistantListComponent implements OnInit {

  readonly originalData   = signal<Assistant[]>([]);
  readonly searchTerm     = signal('');
  readonly selectedStatus = signal('');

  readonly filteredData = computed(() => {
    let data = this.originalData();
    const term   = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatus();
    if (term)   data = data.filter(a =>
      a.name.toLowerCase().includes(term) ||
      (a.description ?? '').toLowerCase().includes(term)
    );
    if (status) data = data.filter(a =>
      status === 'active' ? a.is_active : !a.is_active
    );
    return data;
  });

  readonly currentPage = signal(1);
  readonly pageSize    = signal(20);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredData().length / this.pageSize()))
  );

  readonly paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  });

  readonly hasActiveFilters = computed(() =>
    !!this.selectedStatus() || !!this.searchTerm().trim()
  );

  readonly paginationStart = computed(() =>
    this.filteredData().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.filteredData().length)
  );

  loading = true;
  error: string | null = null;
  deleteConfirmId: number | null = null;
  deletingId: number | null      = null;

  private readonly destroyRef        = inject(DestroyRef);
  private readonly cdr               = inject(ChangeDetectorRef);
  private readonly router            = inject(Router);
  private readonly assistantService  = inject(AssistantService);
  private readonly notifications     = inject(NotificationService);
  private readonly searchSubject     = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
    });

    this.destroyRef.onDestroy(() => {
      this.searchSubject.complete();
    });

    this.loadAssistants();
  }

  loadAssistants(): void {
    this.loading = true;
    this.error   = null;
    this.assistantService.getAssistants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.originalData.set(data);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error   = 'No se pudieron cargar los asistentes. Verifica tu conexión e intenta de nuevo.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  clearStatusFilter(): void {
    this.selectedStatus.set('');
    this.currentPage.set(1);
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.selectedStatus.set('');
    this.currentPage.set(1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  goToNew(): void     { this.router.navigate(['/assistants/new']); }
  goToDetail(id: number): void { this.router.navigate(['/assistants', id]); }
  goToEdit(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/assistants', id, 'edit']);
  }

  confirmDelete(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.deleteConfirmId = id;
  }

  cancelDelete(): void { this.deleteConfirmId = null; }

  deleteAssistant(id: number): void {
    this.deleteConfirmId = null;
    this.deletingId = id;
    this.cdr.detectChanges();

    this.assistantService.deleteAssistant(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.notifications.success('Asistente eliminado correctamente.');
          this.loadAssistants();
        },
        error: () => {
          this.deletingId = null;
          this.notifications.error('Error al eliminar el asistente. Intenta de nuevo.');
          this.cdr.detectChanges();
        }
      });
  }
}
