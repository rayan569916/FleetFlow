import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './reports.component.css',
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);

  financialStats = toSignal(this.dashboardDataService.getFinancialStats('month'));
  efficiencyStats = toSignal(this.dashboardDataService.getEfficiencyStats());

  printReport() {
    window.print();
  }

  downloadExcel() {
    const data = [
      ['Metric', 'Value', 'Trend'],
      ['Revenue', '125000', '+12.5%'],
      ['Expenses', '85000', '-'],
      ['Profit', '40000', '-'],
      ['Efficiency', '89%', '-'],
      ['Fuel Usage', '12450 L', '+2.4%'],
      ['Maintenance', '3200', '-0.8%']
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + data.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "captain_cargo_report.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  }
}

