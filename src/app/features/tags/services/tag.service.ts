import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from '../../../core/services/crud.service';
import { Tag, TagCreate, TagUpdate } from '../../../core/models/tag.model';

@Injectable({ providedIn: 'root' })
export class TagService extends CrudService<Tag, TagCreate, TagUpdate> {
  protected readonly basePath = '/v1/tags';

  getTags(skip = 0, limit = 200): Observable<Tag[]> {
    return this.list({ skip, limit });
  }

  getTag(id: number): Observable<Tag> {
    return this.getById(id);
  }

  createTag(data: TagCreate): Observable<Tag> {
    return this.create(data);
  }

  updateTag(id: number, data: TagUpdate): Observable<Tag> {
    return this.update(id, data);
  }

  deleteTag(id: number): Observable<void> {
    return this.remove(id);
  }
}
