import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IncomePeriod, IncomeSnapshot } from '../../core/models/dashboard.models';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-income-card',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './income-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeCardComponent {
  readonly snapshot = input<IncomeSnapshot | null>(null);
  readonly selectedPeriod = input<IncomePeriod>('today');
  readonly periodChange = output<IncomePeriod>();

  readonly options: ReadonlyArray<{ label: string; value: IncomePeriod }> = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' }
  ];

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.periodChange.emit(target.value as IncomePeriod);
  }

  get budgetUsedPercent(): number {
    const current = this.snapshot();
    if (!current || current.budget <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((current.value / current.budget) * 100));
  }

  formatIncome(value: number | undefined): string {
    if (value == null) {
      return '€0';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }
}
