import { Component, input, output } from '@angular/core';
import { IncomePeriod, IncomeSnapshot } from '../../core/models/dashboard.models';
import { INCOME_PERIOD_OPTIONS } from '../../core/constants/dashboard.constants';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-total-cargo-card',
  imports: [CardComponent],
  templateUrl: './total-cargo-card.component.html',
  styleUrl: './total-cargo-card.component.css',
})
export class TotalCargoCardComponent {
  readonly snapshot = input<IncomeSnapshot | null>(null);
  readonly selectedPeriod = input<IncomePeriod>('today');
  readonly periodChange = output<IncomePeriod>();
  readonly options = INCOME_PERIOD_OPTIONS;
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

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.periodChange.emit(target.value as IncomePeriod);
  }
}