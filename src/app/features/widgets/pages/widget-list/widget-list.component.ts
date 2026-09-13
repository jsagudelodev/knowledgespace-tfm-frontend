import {
  Component, OnInit, DestroyRef, inject,
  ChangeDetectorRef, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetService } from '../../services/widget.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Widget } from '../../../../core/models/widget.model';
import { WidgetFormComponent } from '../widget-form/widget-form.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-widget-list',
  standalone: true,
  imports: [WidgetFormComponent],
  templateUrl: './widget-list.component.html',
  styleUrls: ['./widget-list.component.scss']
})
export class WidgetListComponent implements OnInit {

  // ── Signals de datos ──────────────────────────────────────────────────
  readonly widgets        = signal<Widget[]>([]);
  readonly searchTerm     = signal('');
  readonly selectedStatus = signal('');

  // ── Filtrado combinado ────────────────────────────────────────────────
  readonly filteredWidgets = computed(() => {
    let data = this.widgets();
    const term   = this.searchTerm().toLowerCase().trim();
    const status = this.selectedStatus();

    if (term)   data = data.filter(w =>
      w.name.toLowerCase().includes(term) ||
      w.bot_name.toLowerCase().includes(term)
    );
    if (status) data = data.filter(w =>
      status === 'active' ? w.is_active : !w.is_active
    );

    return data;
  });

  // ── Chips activos ─────────────────────────────────────────────────────
  readonly hasActiveFilters = computed(() =>
    !!this.searchTerm().trim() || !!this.selectedStatus()
  );

  // ── UI state ──────────────────────────────────────────────────────────
  loading           = true;
  error: string | null = null;
  showCreateModal   = false;
  showEditModal     = false;
  selectedWidgetId: string | null = null;
  deleteConfirmId: string | null  = null;
  deletingId: string | null       = null;
  copiedId: string | null         = null;

  private readonly destroyRef    = inject(DestroyRef);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly widgetService = inject(WidgetService);
  private readonly authService   = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(term => this.searchTerm.set(term));

    this.load();
  }

  load(): void {
    this.loading = true;
    this.error   = null;
    this.widgetService.getWidgets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.widgets.set(data); this.loading = false; this.cdr.detectChanges(); },
        error: () => { this.error = 'No se pudieron cargar los widgets.'; this.loading = false; this.cdr.detectChanges(); }
      });
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  onSearch(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
  }

  clearSearch(): void { this.searchTerm.set(''); this.searchSubject.next(''); }
  clearStatus(): void { this.selectedStatus.set(''); }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.selectedStatus.set('');
  }

  // ── Modales ───────────────────────────────────────────────────────────

  openCreate(): void { this.showCreateModal = true; }

  openDetail(id: string): void {
    this.router.navigate(['/widgets', id]);
  }

  openEdit(id: string): void {
    this.selectedWidgetId = id;
    this.showEditModal = true;
  }

  closeModals(): void {
    this.showCreateModal  = false;
    this.showEditModal    = false;
    this.selectedWidgetId = null;
  }

  onSaved(): void {
    this.closeModals();
    this.load();
    this.notifications.success('Widget guardado correctamente.');
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  confirmDelete(id: string): void { this.deleteConfirmId = id; }
  cancelDelete(): void            { this.deleteConfirmId = null; }

  deleteWidget(id: string): void {
    if (this.deletingId) return;
    this.deletingId      = id;
    this.deleteConfirmId = null;
    this.cdr.detectChanges();

    this.widgetService.deleteWidget(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.widgets.update(ws => ws.filter(w => w.id !== id));
          this.deletingId = null;
          this.notifications.success('Widget eliminado.');
        },
        error: () => {
          this.deletingId = null;
          this.notifications.error('Error al eliminar el widget.');
          this.cdr.detectChanges();
        }
      });
  }

  copyEmbedCode(widget: Widget): void {
    const primaryColor = widget.theme_config?.primary_color ?? '#2563EB';
    const code =
`<!-- KnowledgeSpace Chat Widget -->
<script src="https://cdn.knowledgespace.ai/widget.js"></script>
<knowledgespace-chat-widget
  bot-id="${widget.id}"
  bot-name="${widget.bot_name}"
  primary-color="${primaryColor}"
  token="TU_JWT_TOKEN">
</knowledgespace-chat-widget>`;
    navigator.clipboard.writeText(code).then(() => {
      this.copiedId = widget.id;
      setTimeout(() => { this.copiedId = null; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  positionLabel(pos: string): string {
    const map: Record<string, string> = {
      'bottom-right': 'Inf. derecha', 'bottom-left': 'Inf. izquierda',
      'top-right': 'Sup. derecha',   'top-left': 'Sup. izquierda',
    };
    return map[pos] ?? pos;
  }
}
