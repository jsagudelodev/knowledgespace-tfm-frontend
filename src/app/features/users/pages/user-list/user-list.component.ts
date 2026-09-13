import {
  Component, OnInit, DestroyRef, inject, ChangeDetectorRef,
  signal, computed, ViewChild, ElementRef
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { UserFormComponent } from '../user-form/user-form.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [NgClass, UserFormComponent, EmptyStateComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  // ── Data ──────────────────────────────────────────────────────────────
  readonly originalData    = signal<User[]>([]);
  readonly searchTerm      = signal('');
  readonly selectedRole    = signal('');
  readonly selectedStatus  = signal('');

  readonly filteredData = computed(() => {
    let data = this.originalData();
    const term   = this.searchTerm().toLowerCase().trim();
    const role   = this.selectedRole();
    const status = this.selectedStatus();

    if (term)   data = data.filter(u =>
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
    if (role)   data = data.filter(u => u.role === role);
    if (status) data = data.filter(u =>
      status === 'active' ? u.is_active : !u.is_active
    );
    return data;
  });

  // ── Pagination ────────────────────────────────────────────────────────
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
    !!this.selectedRole() || !!this.selectedStatus() || !!this.searchTerm().trim()
  );

  // ── UI State ──────────────────────────────────────────────────────────
  loading = true;
  error: string | null = null;
  isAdmin  = false;
  showCreateModal  = false;
  showEditModal    = false;
  showResetModal   = false;
  selectedUserId: number | null  = null;
  resetUserId: number | null     = null;
  deleteConfirmId: number | null = null;
  deletingId: number | null      = null;
  resetSubmitting  = false;
  resetError: string | null      = null;
  readonly resetNewPassword      = signal('');

  readonly resetUser = computed(() =>
    this.resetUserId != null
      ? (this.originalData().find(u => u.id === this.resetUserId) ?? null)
      : null
  );

  private readonly destroyRef     = inject(DestroyRef);
  private readonly cdr            = inject(ChangeDetectorRef);
  private readonly userService    = inject(UserService);
  private readonly authService    = inject(AuthService);
  private readonly notifications  = inject(NotificationService);
  private readonly searchSubject  = new Subject<string>();

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    this.isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

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

    this.loadUsers();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  loadUsers(): void {
    this.loading = true;
    this.error   = null;
    this.userService.getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: User[]) => {
          this.originalData.set(data);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error   = 'No se pudieron cargar los usuarios. Verifica tu conexión e intenta de nuevo.';
          this.loading = false;
          this.cdr.detectChanges();
        }
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
    if (this.searchInputRef) this.searchInputRef.nativeElement.value = '';
  }

  // ── Filters ───────────────────────────────────────────────────────────

  onRoleChange(event: Event): void {
    this.selectedRole.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  clearRoleFilter(): void {
    this.selectedRole.set('');
    this.currentPage.set(1);
  }

  clearStatusFilter(): void {
    this.selectedStatus.set('');
    this.currentPage.set(1);
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.selectedRole.set('');
    this.selectedStatus.set('');
    this.currentPage.set(1);
    if (this.searchInputRef) this.searchInputRef.nativeElement.value = '';
  }

  // ── Pagination ────────────────────────────────────────────────────────

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  // ── Modals ────────────────────────────────────────────────────────────

  openCreateModal(): void { this.showCreateModal = true; }

  openEditModal(id: number): void {
    this.selectedUserId = id;
    this.showEditModal  = true;
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal   = false;
    this.selectedUserId  = null;
    this.showResetModal  = false;
    this.resetUserId     = null;
    this.resetNewPassword.set('');
    this.resetError      = null;
  }

  openResetModal(id: number): void {
    this.resetUserId = id;
    this.resetNewPassword.set('');
    this.resetError = null;
    this.showResetModal = true;
  }

  submitResetPassword(): void {
    const password = this.resetNewPassword().trim();
    if (password.length < 8) {
      this.resetError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    this.resetError = null;
    this.resetSubmitting = true;
    this.cdr.detectChanges();

    this.userService.resetPassword(this.resetUserId!, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resetSubmitting = false;
          this.closeModals();
          this.notifications.success('Contraseña restablecida correctamente.');
        },
        error: () => {
          this.resetSubmitting = false;
          this.resetError = 'Error al restablecer la contraseña. Intenta de nuevo.';
          this.cdr.detectChanges();
        }
      });
  }

  onUserSaved(): void {
    this.closeModals();
    this.notifications.success('Usuario guardado correctamente.');
    this.loadUsers();
  }

  // ── Delete ────────────────────────────────────────────────────────────

  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void            { this.deleteConfirmId = null; }

  deleteUser(id: number): void {
    this.deleteConfirmId = null;
    this.deletingId = id;
    this.cdr.detectChanges();

    this.userService.deleteUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.notifications.success('Usuario eliminado correctamente.');
          this.loadUsers();
        },
        error: () => {
          this.deletingId = null;
          this.notifications.error('Error al eliminar el usuario. Intenta de nuevo.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Display helpers ───────────────────────────────────────────────────

  getRoleLabel(role: string): string {
    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin') return 'Admin';
    return 'Usuario';
  }

  getRoleClass(role: string): string {
    if (role === 'superadmin') return 'role-superadmin';
    if (role === 'admin') return 'role-admin';
    return 'role-user';
  }
}
