import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from '../../../core/services/crud.service';
import { Category, CategoryCreate, CategoryUpdate } from '../../../core/models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudService<Category, CategoryCreate, CategoryUpdate> {
  protected readonly basePath = '/v1/categories';

  getCategories(skip = 0, limit = 200): Observable<Category[]> { return this.list({ skip, limit }); }
  getCategory(id: number): Observable<Category>                  { return this.getById(id); }
  createCategory(data: CategoryCreate): Observable<Category>     { return this.create(data); }
  updateCategory(id: number, data: CategoryUpdate): Observable<Category> { return this.update(id, data); }
  deleteCategory(id: number): Observable<void>                   { return this.remove(id); }
}
