import {
  Component, OnInit, DestroyRef, inject,
  ChangeDetectorRef, signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetService } from '../../services/widget.service';
import { Widget } from '../../../../core/models/widget.model';

@Component({
  selector: 'app-widget-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './widget-detail.component.html',
  styleUrls: ['./widget-detail.component.scss']
})
export class WidgetDetailComponent implements OnInit {

  // ── Data ──────────────────────────────────────────────────────────────
  readonly widget = signal<Widget | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────
  loadingWidget = true;
  errorWidget: string | null = null;

  private readonly destroyRef    = inject(DestroyRef);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly widgetService = inject(WidgetService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/widgets']); return; }

    this.widgetService.getWidget(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (w) => {
          this.widget.set(w);
          this.loadingWidget = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorWidget = 'No se pudo cargar el widget.';
          this.loadingWidget = false;
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void { this.router.navigate(['/widgets']); }
}
