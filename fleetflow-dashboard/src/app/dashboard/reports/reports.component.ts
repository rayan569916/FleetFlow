import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { ReportService, DailyReportData } from '../../services/report.service';
import { ToastService } from '../../services/toast.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './reports.component.css',
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  reportService = inject(ReportService);
  toastService = inject(ToastService);

  financialStats = toSignal(this.dashboardDataService.getFinancialStats('month'));
  efficiencyStats = toSignal(this.dashboardDataService.getEfficiencyStats());

  dailyReport = signal<DailyReportData | null>(null);
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  isLoading = signal<boolean>(false);

  ngOnInit() {
    this.loadDailyReport();
  }

  loadDailyReport() {
    this.isLoading.set(true);
    this.reportService.getDailyReport(this.selectedDate()).subscribe({
      next: (data) => {
        this.dailyReport.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading daily report:', err);
        this.toastService.show('Failed to load daily report', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onDateChange() {
    this.loadDailyReport();
  }

  saveReport() {
    const report = this.dailyReport();
    if (!report) return;

    this.isLoading.set(true);
    this.reportService.saveDailyReport(report).subscribe({
      next: (resp) => {
        this.toastService.show(resp.message || 'Report saved successfully!', 'success');
        this.loadDailyReport(); // Refresh to show is_stored status
      },
      error: (err) => {
        console.error('Error saving daily report:', err);
        this.toastService.show('Failed to save daily report', 'error');
        this.isLoading.set(false);
      }
    });
  }

  printReport() {
    window.print();
  }

  downloadExcel() {
    const stats = this.financialStats();
    const report = this.dailyReport();

    const data = [
      ['Metric', 'Value'],
      ['Revenue', String(stats?.revenue ?? 0)],
      ['Expenses', String(stats?.expenses ?? 0)],
      ['Profit', String(stats?.profit ?? 0)],
      ['Growth %', String(stats?.growth ?? 0)],
      ['Daily Invoice Grand Total', String(report?.total_invoice_grand ?? 0)],
      ['Daily Payments', String(report?.total_payment ?? 0)],
      ['Daily Purchases', String(report?.total_purchase ?? 0)],
      ['Daily Receipts', String(report?.total_receipt ?? 0)],
      ['Daily Final Total', String(report?.daily_total ?? 0)]
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + data.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `captain_cargo_report_${this.selectedDate()}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  }
}

