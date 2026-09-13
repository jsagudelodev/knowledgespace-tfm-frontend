import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardMetrics } from '../../../../core/models/dashboard.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent implements OnInit {
  private readonly destroyRef      = inject(DestroyRef);
  private readonly dashboardService = inject(DashboardService);
  private readonly authService      = inject(AuthService);

  metrics = signal<DashboardMetrics | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  readonly currentUser = computed(() => this.authService.getCurrentUserValue());

  readonly hasDocuments     = computed(() => (this.metrics()?.documents.total ?? 0) > 0);
  readonly hasConversations = computed(() => (this.metrics()?.conversations.total ?? 0) > 0);
  readonly isEmptyState     = computed(() => !!this.metrics() && !this.hasDocuments());

  ngOnInit(): void {
    this.dashboardService.getMetrics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.metrics.set(data); this.loading.set(false); },
        error: ()   => { this.loading.set(false); }
      });
  }
}
