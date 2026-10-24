import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentService } from '../../services/document.service';
import { CategoryService } from '../../../categories/services/category.service';
import { AssistantService } from '../../../assistants/services/assistant.service';
import { Category } from '../../../../core/models/category.model';
import { Assistant } from '../../../../core/models/assistant.model';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.scss'],
})
export class DocumentUploadComponent implements OnInit {
  private documentService = inject(DocumentService);
  private categoryService = inject(CategoryService);
  private assistantService = inject(AssistantService);
  private router = inject(Router);

  selectedFiles: File[] = [];
  uploading = false;
  error: string | null = null;
  success = false;
  uploadProgress = 0;
  uploadProgressMap = new Map<string, number>();
  uploadedCount = 0;
  totalFiles = 0;

  availableCategories: Category[] = [];
  selectedCategoryId: number | null = null;

  availableAssistants: Assistant[] = [];
  selectedAssistantId: number | null = null;

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.categoryService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => (this.availableCategories = categories.filter((c) => c.is_active)),
        error: () => {},
      });

    this.assistantService
      .getAssistants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (assistants) => (this.availableAssistants = assistants.filter((a) => a.is_active)),
        error: () => {},
      });
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId = value ? Number(value) : null;
  }

  onAssistantChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedAssistantId = value ? Number(value) : null;
  }

  private validateFile(file: File): boolean {
    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown', // .md — algunos sistemas operativos no lo registran y el navegador reporta '', que ya cae en el fallback de abajo
    ];
    const validExtensions = ['pdf', 'docx', 'txt', 'md'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';

    const extValid = validExtensions.includes(fileExtension);
    // Si el navegador detecta MIME type, debe coincidir; si no lo detecta (cadena vacía) se acepta solo la extensión
    const mimeValid = file.type ? validMimes.includes(file.type) : extValid;

    if (!extValid || !mimeValid) {
      this.error = 'Solo se permiten archivos PDF, DOCX, TXT y MD';
      return false;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'El archivo excede el tamaño máximo de 10MB';
      return false;
    }

    return true;
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.addFiles(Array.from(target.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.addFiles(Array.from(files));
    }
  }

  private addFiles(files: File[]): void {
    this.error = null;
    const validFiles: File[] = [];

    for (const file of files) {
      if (this.validateFile(file)) {
        // Evitar duplicados
        if (!this.selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
          validFiles.push(file);
        }
      }
    }

    this.selectedFiles = [...this.selectedFiles, ...validFiles];
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.error = null;
  }

  uploadFiles(): void {
    if (this.selectedFiles.length === 0) return;

    this.uploading = true;
    this.error = null;
    this.success = false;
    this.uploadProgress = 0;
    this.uploadProgressMap.clear();
    this.uploadedCount = 0;
    this.totalFiles = this.selectedFiles.length;

    // Subir archivos uno por uno
    this.selectedFiles.forEach((file) => {
      this.uploadProgressMap.set(file.name, 0);

      this.documentService
        .uploadDocument(file, this.selectedCategoryId, this.selectedAssistantId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const progress = Math.round((100 * event.loaded) / event.total);
              this.uploadProgressMap.set(file.name, progress);
              this.updateOverallProgress();
            } else if (event.type === HttpEventType.Response) {
              this.uploadProgressMap.set(file.name, 100);
              this.uploadedCount++;
              this.updateOverallProgress();

              if (this.uploadedCount === this.totalFiles) {
                this.success = true;
                this.uploading = false;
                this.uploadProgress = 100;
                setTimeout(() => {
                  this.router.navigate(['/documents']);
                }, 2000);
              }
            }
          },
          error: () => {
            this.error = `Error al subir ${file.name}`;
            this.uploadProgressMap.set(file.name, -1); // -1 indica error
            this.uploadedCount++;
            this.updateOverallProgress();

            if (this.uploadedCount === this.totalFiles) {
              this.uploading = false;
            }
          },
        });
    });
  }

  private updateOverallProgress(): void {
    const totalProgress = Array.from(this.uploadProgressMap.values()).reduce(
      (sum, progress) => sum + (progress >= 0 ? progress : 0),
      0,
    );
    this.uploadProgress = Math.round(totalProgress / this.totalFiles);
  }

  cancelUpload(): void {
    this.selectedFiles = [];
    this.error = null;
    this.success = false;
    this.uploadProgress = 0;
    this.uploadProgressMap.clear();
    this.uploadedCount = 0;
    this.totalFiles = 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension === 'pdf' ? 'picture_as_pdf' : 'description';
  }
}
