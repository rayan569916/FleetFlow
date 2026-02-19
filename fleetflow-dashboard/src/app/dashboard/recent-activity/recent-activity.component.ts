import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ActivityLog } from '../../core/models/dashboard.models';
import { CardComponent } from '../../shared/ui/card/card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CardComponent, StatusBadgeComponent, CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentActivityComponent {
  readonly activity = input.required<ActivityLog[]>();
  readonly settingsService = inject(SettingsService);

  trackById(index: number): number {
    return index;
  }
}
