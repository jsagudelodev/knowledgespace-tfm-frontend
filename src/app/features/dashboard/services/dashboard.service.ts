import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { DashboardMetrics } from '../../../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);

  getMetrics(): Observable<DashboardMetrics> {
    return this.api.get<DashboardMetrics>('/v1/dashboard/metrics');
  }
}
