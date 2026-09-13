import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from '../../../core/services/crud.service';
import { Company, CompanyCreate, CompanyUpdate } from '../../../core/models/company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService extends CrudService<Company, CompanyCreate, CompanyUpdate> {
  protected readonly basePath = '/v1/companies';

  getCompanies(skip = 0, limit = 100): Observable<Company[]> {
    return this.list({ skip, limit });
  }

  getCompany(id: number): Observable<Company> {
    return this.getById(id);
  }

  createCompany(data: CompanyCreate): Observable<Company> {
    return this.create(data);
  }

  updateCompany(id: number, data: CompanyUpdate): Observable<Company> {
    return this.update(id, data);
  }

  deleteCompany(id: number): Observable<void> {
    return this.remove(id);
  }
}
