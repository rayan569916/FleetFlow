import { Component, input, output, inject } from '@angular/core';
import { IncomePeriod, IncomeSnapshot } from '../../core/models/dashboard.models';
import { INCOME_PERIOD_OPTIONS } from '../../core/constants/dashboard.constants';
import { CardComponent } from '../../shared/ui/card/card.component';
import { ReportService } from '../../services/report.service';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-total-cargo-card',
  imports: [CardComponent,CommonModule],
  templateUrl: './total-cargo-card.component.html',
  styleUrl: './total-cargo-card.component.css',
})
export class TotalCargoCardComponent {
  private reportService = inject(ReportService);
  // readonly snapshot = input<IncomeSnapshot | null>(null);
  readonly selectedPeriod = input<IncomePeriod>('today');
  readonly periodChange = output<IncomePeriod>();
  readonly options = INCOME_PERIOD_OPTIONS;
  readonly reportDetails$ = this.reportService.getDailyReport();
  private settingsService = inject(SettingsService);

  // get budgetUsedPercent(): number {
  //   const current = this.snapshot();
  //   if (!current || current.budget <= 0) {
  //     return 0;
  //   }

  //   return Math.min(100, Math.round((current.value / current.budget) * 100));
  // }

  formatIncome(value: number | undefined): string {
    if (value == null) {
      return `${this.settingsService.currencySymbol()}0`;
    }

    // Use specific locale/currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.settingsService.settings().currency, // Assumes settings() returns { currency:string, ... }
      maximumFractionDigits: 0
    }).format(value);
  }


  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.periodChange.emit(target.value as IncomePeriod);
  }
}