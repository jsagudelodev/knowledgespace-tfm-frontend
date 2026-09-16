import {
  Component, OnInit, Input, Output, EventEmitter,
  DestroyRef, inject, ChangeDetectorRef, signal
} from '@angular/core';
import {
  FormGroup, FormBuilder, FormArray, Validators,
  ReactiveFormsModule, FormsModule
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetService } from '../../services/widget.service';
import { Widget, WidgetCreate, WidgetUpdate } from '../../../../core/models/widget.model';
import { AssistantService } from '../../../assistants/services/assistant.service';
import { Assistant } from '../../../../core/models/assistant.model';

const DEFAULT_PRIMARY_COLOR = '#2563EB';

@Component({
  selector: 'app-widget-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './widget-form.component.html',
  styleUrls: ['./widget-form.component.scss']
})
export class WidgetFormComponent implements OnInit {
  @Input() widgetId: string | null = null;
  @Output() widgetSaved = new EventEmitter<void>();
  @Output() cancel      = new EventEmitter<void>();

  isEditMode = false;
  loading    = false;
  error: string | null = null;
  newReply   = '';
  readonly assistants = signal<Assistant[]>([]);

  readonly positions = [
    { value: 'bottom-right', label: 'Inferior derecha' },
    { value: 'bottom-left',  label: 'Inferior izquierda' },
    { value: 'top-right',    label: 'Superior derecha' },
    { value: 'top-left',     label: 'Superior izquierda' },
  ];
  readonly sizes = [
    { value: 'small',  label: 'Pequeño' },
    { value: 'medium', label: 'Mediano' },
    { value: 'large',  label: 'Grande' },
  ];
  readonly languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' },
  ];

  private readonly destroyRef        = inject(DestroyRef);
  private readonly cdr               = inject(ChangeDetectorRef);
  private readonly widgetService     = inject(WidgetService);
  private readonly assistantService  = inject(AssistantService);
  private readonly fb                = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    // Identidad
    name:             ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    bot_name:         ['Asistente Virtual', Validators.required],
    is_active:        [true],
    // Apariencia
    position:         ['bottom-right'],
    widget_size:      ['medium'],
    primary_color:    [DEFAULT_PRIMARY_COLOR],
    welcome_message:  ['¡Hola! ¿En qué puedo ayudarte hoy?'],
    placeholder_text: ['Escribe tu consulta aquí...'],
    border_radius:    ['12px'],
    // Límites e idioma
    daily_message_limit: [100, [Validators.min(1)]],
    default_language:    ['es'],
    // Quick replies como FormArray
    quick_replies: this.fb.array([]),
    // Asistente vinculado — obligatorio: el modelo/prompt/documentos que
    // usa el widget se heredan de este asistente, no se configuran aquí.
    assistant_id: [null as number | null, Validators.required],
  });

  get quickReplies(): FormArray {
    return this.form.get('quick_replies') as FormArray;
  }

  get primaryColor(): string {
    return (this.form.get('primary_color')?.value as string) || DEFAULT_PRIMARY_COLOR;
  }

  ngOnInit(): void {
    this.assistantService.getAssistants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (list) => this.assistants.set(list), error: () => {} });

    if (this.widgetId) {
      this.isEditMode = true;
      this.loadWidget();
    }
  }

  private loadWidget(): void {
    if (!this.widgetId) return;
    this.loading = true;
    this.widgetService.getWidget(this.widgetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (w: Widget) => {
          this.form.patchValue({
            name:                w.name,
            bot_name:            w.bot_name,
            is_active:           w.is_active,
            position:            w.position,
            widget_size:         w.widget_size,
            primary_color:       w.theme_config?.primary_color ?? DEFAULT_PRIMARY_COLOR,
            welcome_message:     w.theme_config?.welcome_message ?? '',
            placeholder_text:    w.theme_config?.placeholder_text ?? '',
            border_radius:       w.theme_config?.border_radius ?? '12px',
            daily_message_limit: w.daily_message_limit,
            default_language:    w.default_language,
            assistant_id:        w.assistant_id,
          });
          this.quickReplies.clear();
          (w.quick_replies ?? []).forEach(r => this.quickReplies.push(this.fb.control(r)));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error   = 'Error al cargar el widget';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  addReply(): void {
    const r = this.newReply.trim();
    if (!r || this.quickReplies.length >= 6) return;
    this.quickReplies.push(this.fb.control(r));
    this.newReply = '';
  }

  removeReply(index: number): void {
    this.quickReplies.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    this.error   = null;

    const v = this.form.value as {
      name: string; bot_name: string; is_active: boolean;
      position: string; widget_size: string; primary_color: string;
      welcome_message: string; placeholder_text: string; border_radius: string;
      daily_message_limit: number; default_language: string; quick_replies: string[];
      assistant_id: number;
    };

    const theme_config = {
      primary_color:      v.primary_color,
      chat_bg_color:      '#FFFFFF',
      bot_bubble_color:   '#F4F5F7',
      user_bubble_color:  v.primary_color,
      bot_text_color:     '#172B4D',
      user_text_color:    '#FFFFFF',
      placeholder_text:   v.placeholder_text,
      welcome_message:    v.welcome_message,
      font_family:        'Inter, sans-serif',
      border_radius:      v.border_radius,
    };

    const data: WidgetCreate | WidgetUpdate = {
      name: v.name, bot_name: v.bot_name,
      is_active: v.is_active,
      position: v.position, widget_size: v.widget_size,
      theme_config, daily_message_limit: v.daily_message_limit,
      default_language: v.default_language, quick_replies: v.quick_replies,
      assistant_id: v.assistant_id,
    };

    const req$ = this.isEditMode && this.widgetId
      ? this.widgetService.updateWidget(this.widgetId, data)
      : this.widgetService.createWidget(data as WidgetCreate);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  () => { this.loading = false; this.widgetSaved.emit(); },
      error: () => {
        this.error   = this.isEditMode ? 'Error al actualizar el widget' : 'Error al crear el widget';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  onCancel(): void { this.cancel.emit(); }
}
