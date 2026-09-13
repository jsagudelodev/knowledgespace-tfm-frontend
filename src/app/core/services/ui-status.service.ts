import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class UiStatusService {
  private _chatOpen = signal<boolean>(false);
  chatOpen$ = toObservable(this._chatOpen);
  get chatOpen() { return this._chatOpen.asReadonly(); }

  toggleChat(): void { this._chatOpen.update(open => !open); }
  openChat(): void   { this._chatOpen.set(true); }
  closeChat(): void  { this._chatOpen.set(false); }
}
