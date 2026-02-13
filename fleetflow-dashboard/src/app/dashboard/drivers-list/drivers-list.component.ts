import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Driver } from '../../core/models/dashboard.models';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './drivers-list.component.html',
  styleUrl: './drivers-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriversListComponent {
  readonly drivers = input.required<Driver[]>();

  get activeCount(): number {
    return this.drivers().filter((driver) => driver.status === 'active').length;
  }

  trackById(index: number): number {
    return index;
  }
}
