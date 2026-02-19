import { Component, inject } from '@angular/core';
import { CommonModule, KeyValuePipe, DecimalPipe, AsyncPipe } from '@angular/common'; // Add AsyncPipe
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, DecimalPipe, AsyncPipe],
  templateUrl: './income.component.html',
  styleUrl: './income.component.css'
})
export class IncomeComponent {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);

  // Default to today, or user selection
  incomeStats$ = this.dashboardDataService.getSelectedIncome();

  onPeriodChange(event: any) {
    const period = event.target.value;
    this.dashboardDataService.setIncomePeriod(period);
  }
}

