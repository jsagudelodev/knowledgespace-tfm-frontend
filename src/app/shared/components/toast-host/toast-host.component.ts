import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationType } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-host.component.html',
  styleUrls: ['./toast-host.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastHostComponent {
  protected readonly notifications = inject(NotificationService);

  protected icon(type: NotificationType): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error':   return 'error';
      default:        return 'info';
    }
  }
}
