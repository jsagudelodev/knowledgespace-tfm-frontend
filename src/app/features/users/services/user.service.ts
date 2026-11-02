import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from '../../../core/services/crud.service';
import { User, UserCreate, UserUpdate } from '../../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService extends CrudService<User, UserCreate, UserUpdate> {
  protected readonly basePath = '/v1/users';

  getUsers(skip = 0, limit = 200): Observable<User[]> {
    return this.list({ skip, limit });
  }

  getUser(id: number): Observable<User> {
    return this.getById(id);
  }

  createUser(data: UserCreate): Observable<User> {
    return this.create(data);
  }

  updateUser(id: number, data: UserUpdate): Observable<User> {
    return this.update(id, data);
  }

  deleteUser(id: number): Observable<void> {
    return this.remove(id);
  }

  resetPassword(id: number, newPassword: string): Observable<{ message: string }> {
    // En el cuerpo, nunca en la URL: los query params quedan en los logs del
    // servidor y de los proxies. Antes iba como `?new_password=` y además el
    // backend (que lo espera en el body) respondía 422.
    return this.api.patch<{ message: string }>(
      `${this.basePath}/${id}/reset-password`,
      { new_password: newPassword }
    );
  }
}
