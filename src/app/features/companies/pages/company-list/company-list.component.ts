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
import { DecimalPipe, NgClass } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CompanyService } from '../../services/company.service';
import { Company } from '../../../../core/models/company.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CompanyFormComponent } from '../company-form/company-form.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [NgClass, DecimalPipe, CompanyFormComponent, EmptyStateComponent, TableSkeletonComponent],
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyListComponent implements OnInit {
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly destroyRef     = inject(DestroyRef);
  private readonly companyService = inject(CompanyService);
  private readonly authService    = inject(AuthService);
  private readonly notifications  = inject(NotificationService);
  private readonly searchSubject  = new Subject<string>();

  // ── Roles (leídos una vez en ngOnInit, no cambian en la sesión) ───────────
  isAdmin      = false;
  isSuperadmin = false;

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly originalData   = signal<Company[]>([]);
  readonly searchTerm     = signal('');
  readonly selectedPlan   = signal('');
  readonly selectedStatus = signal('');

  readonly filteredData = computed(() => {
    let data = this.originalData();
    const term   = this.searchTerm().toLowerCase().trim();
    const plan   = this.selectedPlan();
    const status = this.selectedStatus();

    if (term)   data = data.filter(c =>
      c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)
    );
    if (plan)   data = data.filter(c => c.plan === plan);
    if (status) data = data.filter(c => (status === 'active') === c.is_active);
    return data;
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

  readonly hasActiveFilters = computed(() =>
    !!this.selectedPlan() || !!this.selectedStatus() || !!this.searchTerm().trim()
  );

  // ── Estado de UI ──────────────────────────────────────────────────────────
  readonly loading         = signal(true);
  readonly error           = signal<string | null>(null);
  readonly showEditModal   = signal(false);
  readonly showCreateModal = signal(false);
  readonly selectedCompanyId = signal<number | null>(null);
  readonly deleteConfirmId   = signal<number | null>(null);
  readonly deletingId        = signal<number | null>(null);

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    this.isAdmin      = user?.role === 'admin' || user?.role === 'superadmin';
    this.isSuperadmin = user?.role === 'superadmin';

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
    });

    this.destroyRef.onDestroy(() => this.searchSubject.complete());
    this.loadCompanies();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  loadCompanies(): void {
    this.loading.set(true);
    this.error.set(null);
    this.companyService.getCompanies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.originalData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las empresas. Verifica tu conexión e intenta de nuevo.');
          this.loading.set(false);
        }
      });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
    if (this.searchInputRef) this.searchInputRef.nativeElement.value = '';
  }

  onPlanChange(event: Event): void {
    this.selectedPlan.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.selectedPlan.set('');
    this.selectedStatus.set('');
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
    this.selectedCompanyId.set(id);
    this.showEditModal.set(true);
  }

  closeModals(): void {
    this.showEditModal.set(false);
    this.showCreateModal.set(false);
    this.selectedCompanyId.set(null);
  }

  onCompanySaved(): void {
    this.closeModals();
    this.notifications.success('Empresa guardada correctamente.');
    this.loadCompanies();
  }

  // ── Eliminación ───────────────────────────────────────────────────────────

  confirmDelete(id: number): void  { this.deleteConfirmId.set(id); }
  cancelDelete(): void             { this.deleteConfirmId.set(null); }

  deleteCompany(id: number): void {
    this.deleteConfirmId.set(null);
    this.deletingId.set(id);

    this.companyService.deleteCompany(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.notifications.success('Empresa eliminada correctamente.');
          this.loadCompanies();
        },
        error: () => {
          this.deletingId.set(null);
          this.notifications.error('Error al eliminar la empresa. Intenta de nuevo.');
        }
      });
  }

  // ── Helpers de presentación ───────────────────────────────────────────────

  getPlanClass(plan: string): string {
    const map: Record<string, string> = {
      basic: 'badge-basic', pro: 'badge-pro', enterprise: 'badge-enterprise'
    };
    return map[plan] ?? 'badge-basic';
  }

  getPlanLabel(plan: string): string {
    const map: Record<string, string> = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
    return map[plan] ?? plan;
  }
}
