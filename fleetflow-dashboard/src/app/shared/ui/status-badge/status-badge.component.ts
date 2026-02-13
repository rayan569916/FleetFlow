import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  readonly text = input.required<string>();
}
