import {
  Component, OnInit, DestroyRef, inject,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssistantService } from '../../services/assistant.service';
import { AssistantCreate } from '../../../../core/models/assistant.model';

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];

const MODEL_HINTS: Record<string, string> = {
  'gpt-4o-mini':   'Rápido y económico. Ideal para la mayoría de casos.',
  'gpt-4o':        'Mayor capacidad de razonamiento. Respuestas más ricas.',
  'gpt-4-turbo':   'Alta capacidad, contexto amplio (128k tokens).',
  'gpt-3.5-turbo': 'Muy rápido y ligero. Para respuestas simples.',
};

@Component({
  selector: 'app-assistant-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './assistant-form.component.html',
  styleUrls: ['./assistant-form.component.scss']
})
export class AssistantFormComponent implements OnInit {

  isEdit      = false;
  assistantId: number | null = null;
  saving  = false;
  loading = false;
  error: string | null = null;

  readonly availableModels = MODELS;
  readonly avatarPresets   = ['🤖', '🧠', '💼', '📚', '🎯', '👔', '⚙️', '🔬', '🌐', '💡'];

  name         = '';
  description  = '';
  systemPrompt = '';
  model        = 'gpt-4o-mini';
  // Solo se muestra: la temperatura no es configurable y el backend usa
  // siempre `RAG_TEMPERATURA` (0), el valor que dio más fidelidad al medirlo.
  readonly temperature = 0;
  avatar       = '🤖';
  quickPrompts: string[] = [];
  newPromptText = '';

  private readonly destroyRef       = inject(DestroyRef);
  private readonly cdr              = inject(ChangeDetectorRef);
  private readonly router           = inject(Router);
  private readonly route            = inject(ActivatedRoute);
  private readonly assistantService = inject(AssistantService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit      = true;
      this.assistantId = Number(id);
      this.loadAssistant(this.assistantId);
    }
  }

  private loadAssistant(id: number): void {
    this.loading = true;
    this.assistantService.getAssistant(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.name         = a.name;
          this.description  = a.description ?? '';
          this.systemPrompt = a.system_prompt ?? '';
          this.model        = a.model;
          this.avatar       = a.avatar ?? '🤖';
          this.quickPrompts = a.quick_prompts ?? [];
          this.loading      = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error   = 'No se pudo cargar el asistente.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  selectAvatar(emoji: string): void { this.avatar = emoji; }

  modelHint(): string { return MODEL_HINTS[this.model] ?? ''; }

  addPrompt(): void {
    const text = this.newPromptText.trim();
    if (text && this.quickPrompts.length < 6) {
      this.quickPrompts = [...this.quickPrompts, text];
      this.newPromptText = '';
    }
  }

  removePrompt(index: number): void {
    this.quickPrompts = this.quickPrompts.filter((_, i) => i !== index);
  }

  save(): void {
    if (!this.name.trim()) { this.error = 'El nombre es obligatorio.'; return; }

    this.saving = true;
    this.error  = null;

    const payload: AssistantCreate = {
      name:          this.name.trim(),
      description:   this.description.trim() || null,
      system_prompt: this.systemPrompt.trim() || null,
      model:         this.model,
      avatar:        this.avatar.trim() || null,
      quick_prompts: this.quickPrompts.length > 0 ? this.quickPrompts : null,
    };

    const req$ = this.isEdit && this.assistantId
      ? this.assistantService.updateAssistant(this.assistantId, payload)
      : this.assistantService.createAssistant(payload);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => {
        this.saving = false;
        this.router.navigate(['/assistants', a.id]);
      },
      error: () => {
        this.saving = false;
        this.error  = 'Error al guardar el asistente. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    if (this.isEdit && this.assistantId) {
      this.router.navigate(['/assistants', this.assistantId]);
    } else {
      this.router.navigate(['/assistants']);
    }
  }
}
