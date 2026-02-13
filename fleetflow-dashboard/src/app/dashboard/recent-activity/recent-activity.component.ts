import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ActivityLog } from '../../core/models/dashboard.models';
import { CardComponent } from '../../shared/ui/card/card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CardComponent, StatusBadgeComponent],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentActivityComponent {
  readonly activity = input.required<ActivityLog[]>();

  trackById(index: number): number {
    return index;
  }
}
