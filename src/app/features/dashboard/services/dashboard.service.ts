import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { DashboardMetrics } from '../../../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getMetrics(): Observable<DashboardMetrics> {
    return this.api.get<DashboardMetrics>('/v1/dashboard/metrics');
  }
}
