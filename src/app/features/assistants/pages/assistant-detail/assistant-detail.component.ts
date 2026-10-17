import {
  Component, OnInit, OnDestroy, DestroyRef, inject,
  ChangeDetectorRef, signal, computed, ElementRef, ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssistantService } from '../../services/assistant.service';
import { DocumentService } from '../../../documents/services/document.service';
import { CategoryService } from '../../../categories/services/category.service';
import { Assistant } from '../../../../core/models/assistant.model';
import { Document } from '../../../../core/models/document.model';
import { Category } from '../../../../core/models/category.model';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { NotificationService } from '../../../../core/services/notification.service';
import { ChunksDrawerComponent } from '../../../../shared/components/chunks-drawer/chunks-drawer.component';

type Tab = 'documents' | 'info';

interface UploadingFile {
  name: string;
  progress: number;
  error?: string;
}

@Component({
  selector: 'app-assistant-detail',
  standalone: true,
  imports: [Paginator, ChunksDrawerComponent],
  templateUrl: './assistant-detail.component.html',
  styleUrls: ['./assistant-detail.component.scss']
})
export class AssistantDetailComponent implements OnInit, OnDestroy {

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // ── Data ──────────────────────────────────────────────────────────────
  readonly assistant  = signal<Assistant | null>(null);
  readonly documents  = signal<Document[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly activeTab  = signal<Tab>('documents');

  /** Documento cuyos fragmentos se muestran en el panel lateral, o null. */
  readonly chunksAbiertos = signal<number | null>(null);
  selectedCategoryId: number | null = null;

  readonly docPageSize = signal(10);
  readonly docPage     = signal(0);

  readonly sortedDocuments = computed(() =>
    [...this.documents()].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );

  readonly pagedDocuments = computed(() => {
    const start = this.docPage() * this.docPageSize();
    return this.sortedDocuments().slice(start, start + this.docPageSize());
  });

  // ── UI state ──────────────────────────────────────────────────────────
  loadingAssistant = true;
  loadingDocs      = false;
  errorAssistant: string | null = null;
  errorDocs: string | null      = null;

  uploadingFiles: UploadingFile[] = [];
  isDragOver     = false;
  deleteConfirmId: number | null = null;
  deletingId: number | null      = null;
  retryingId: number | null      = null;
  downloadingId: number | null   = null;
  pollingIds     = new Set<number>();

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private readonly destroyRef       = inject(DestroyRef);
  private readonly cdr              = inject(ChangeDetectorRef);
  private readonly notifications    = inject(NotificationService);
  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);
  private readonly assistantService = inject(AssistantService);
  private readonly documentService  = inject(DocumentService);
  private readonly categoryService  = inject(CategoryService);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/assistants']); return; }

    this.categoryService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (cats) => this.categories.set(cats.filter(c => c.is_active)), error: () => {} });

    this.assistantService.getAssistant(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.assistant.set(a);
          this.loadingAssistant = false;
          this.loadDocs();
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorAssistant   = 'No se pudo cargar el asistente.';
          this.loadingAssistant = false;
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  onCategoryChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId = v ? Number(v) : null;
  }

  // ── Documents load ────────────────────────────────────────────────────

  loadDocs(): void {
    const a = this.assistant();
    if (!a) return;
    this.loadingDocs = true;
    this.errorDocs   = null;

    this.assistantService.getAssistantDocuments(a.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (docs) => {
          this.documents.set(docs);
          this.loadingDocs = false;
          this.startPollingIfNeeded();
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorDocs   = 'No se pudieron cargar los documentos.';
          this.loadingDocs = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ── Upload ────────────────────────────────────────────────────────────

  triggerFileInput(): void { this.fileInputRef.nativeElement.click(); }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver = true; }
  onDragLeave(): void { this.isDragOver = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files) this.uploadFiles(Array.from(event.dataTransfer.files));
  }

  private uploadFiles(files: File[]): void {
    const allowed = ['pdf', 'docx', 'txt'];
    const a = this.assistant()!;

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowed.includes(ext)) {
        this.notifications.error(`Tipo no soportado: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.notifications.error(`${file.name} supera el límite de 10 MB`);
        continue;
      }

      const uploading: UploadingFile = { name: file.name, progress: 0 };
      this.uploadingFiles.push(uploading);
      this.cdr.detectChanges();

      this.documentService.uploadDocument(file, this.selectedCategoryId, a.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              uploading.progress = Math.round(100 * event.loaded / event.total);
              this.cdr.detectChanges();
            } else if (event.type === HttpEventType.Response) {
              this.uploadingFiles = this.uploadingFiles.filter(u => u !== uploading);
              const doc = event.body as Document;
              this.documents.update(ds => [doc, ...ds]);
              this.trackPolling(doc.id);
              this.notifications.success(`${file.name} subido correctamente.`);
              this.cdr.detectChanges();
            }
          },
          error: () => {
            uploading.error = 'Error al subir';
            uploading.progress = 0;
            setTimeout(() => {
              this.uploadingFiles = this.uploadingFiles.filter(u => u !== uploading);
              this.cdr.detectChanges();
            }, 3000);
            this.cdr.detectChanges();
          }
        });
    }
  }

  /** Abre o cierra el panel lateral de fragmentos. La carga la hace el
   *  propio `app-chunks-drawer` al recibir el identificador. */
  toggleChunks(id: number): void {
    this.chunksAbiertos.set(this.chunksAbiertos() === id ? null : id);
  }

  // ── Delete ────────────────────────────────────────────────────────────

  confirmDelete(id: number): void  { this.deleteConfirmId = id; }
  cancelDelete(): void             { this.deleteConfirmId = null; }

  deleteDocument(id: number): void {
    this.deletingId      = id;
    this.deleteConfirmId = null;
    this.cdr.detectChanges();

    this.documentService.deleteDocument(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.documents.update(ds => ds.filter(d => d.id !== id));
          this.deletingId = null;
          this.notifications.success('Documento eliminado.');
          this.cdr.detectChanges();
        },
        error: () => {
          this.deletingId = null;
          this.notifications.error('Error al eliminar el documento.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Download ──────────────────────────────────────────────────────────

  downloadDocument(id: number): void {
    this.downloadingId = id;
    this.cdr.detectChanges();

    this.documentService.getDownloadUrl(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url, filename }) => {
          this.downloadingId = null;
          const a = globalThis.document.createElement('a');
          a.href = url;
          a.download = filename;
          a.target = '_blank';
          a.click();
          this.cdr.detectChanges();
        },
        error: () => {
          this.downloadingId = null;
          this.notifications.error('Error al generar el enlace de descarga.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Retry ─────────────────────────────────────────────────────────────

  retryDocument(id: number): void {
    this.retryingId = id;
    this.cdr.detectChanges();

    this.documentService.retryDocument(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (doc) => {
          this.documents.update(ds => ds.map(d => d.id === id ? doc : d));
          this.retryingId = null;
          this.trackPolling(id);
          this.notifications.success('Procesamiento reiniciado.');
          this.cdr.detectChanges();
        },
        error: () => {
          this.retryingId = null;
          this.notifications.error('Error al reintentar.');
          this.cdr.detectChanges();
        }
      });
  }

  // ── Polling ───────────────────────────────────────────────────────────

  private trackPolling(id: number): void {
    this.pollingIds.add(id);
    if (!this.pollInterval) this.startPollInterval();
  }

  private startPollingIfNeeded(): void {
    this.documents()
      .filter(d => d.status === 'processing' || d.status === 'pending')
      .forEach(d => this.pollingIds.add(d.id));
    if (this.pollingIds.size > 0 && !this.pollInterval) this.startPollInterval();
  }

  private startPollInterval(): void {
    this.pollInterval = setInterval(() => {
      if (this.pollingIds.size === 0) {
        clearInterval(this.pollInterval!);
        this.pollInterval = null;
        return;
      }
      [...this.pollingIds].forEach(id => {
        this.documentService.getDocument(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (doc) => {
              this.documents.update(ds => ds.map(d => d.id === id ? doc : d));
              if (doc.status === 'completed' || doc.status === 'failed') {
                this.pollingIds.delete(id);
              }
              this.cdr.detectChanges();
            },
            error: () => this.pollingIds.delete(id)
          });
      });
    }, 3000);
  }

  onDocPageChange(event: PaginatorState): void {
    this.docPage.set(event.page ?? 0);
    if (event.rows) this.docPageSize.set(event.rows);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  goBack(): void   { this.router.navigate(['/assistants']); }
  goToEdit(): void {
    const a = this.assistant();
    if (a) this.router.navigate(['/assistants', a.id, 'edit']);
  }

  formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  fileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf')  return 'picture_as_pdf';
    return 'description';
  }
}
