import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { ReportService, DailyReportData, InvoiceReportItem, FinanceReportItem, Category } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { InvoiceService } from '../../services/invoice.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { InvoiceDetailsViewComponent } from '../invoice/invoice-details-view.component';
import { DailyBreakdownViewComponent } from './daily-breakdown-view.component';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceDetailsViewComponent, DailyBreakdownViewComponent],
  styleUrl: './reports.component.css',
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  reportService = inject(ReportService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  invoiceService = inject(InvoiceService);

  financialStats = toSignal(this.dashboardDataService.getFinancialStats('month'));
  efficiencyStats = toSignal(this.dashboardDataService.getEfficiencyStats());

  dailyReport = signal<DailyReportData | null>(null);
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  
  // New Filters and State
  reportType = signal<'daily-list' | 'invoices' | 'payments' | 'purchases' | 'receipts'>('daily-list');
  startDate = signal<string>(new Date().toISOString().split('T')[0]);
  endDate = signal<string>(new Date().toISOString().split('T')[0]);
  selectedOfficeId = signal<number | undefined>(undefined);
  selectedCategoryId = signal<number | undefined>(undefined);
  
  categories = signal<Category[]>([]);
  offices = signal<any[]>([]);
  
  invoiceData = signal<InvoiceReportItem[]>([]);
  financeData = signal<FinanceReportItem[]>([]);
  dailyReportsList = signal<DailyReportData[]>([]);
  selectedInvoiceDetails = signal<any | null>(null);
  selectedDailyBreakdown = signal<{ report: DailyReportData; invoices: any[] } | null>(null);

  isLoading = signal<boolean>(false);

  reportTypes = [
    // { id: 'daily', label: 'Daily Summary', icon: 'grid' },
    { id: 'invoices', label: 'Invoices', icon: 'file-text' },
    { id: 'payments', label: 'Payments', icon: 'credit-card' },
    { id: 'purchases', label: 'Purchases', icon: 'shopping-cart' },
    { id: 'receipts', label: 'Receipts', icon: 'file' },
    { id: 'daily-list', label: 'History', icon: 'documents' }
  ] as const;

  ngOnInit() {
    this.loadDailyReport();
    this.fetchOffices();
  }

  fetchOffices() {
    this.authService.getOffices().subscribe({
      next: (data) => this.offices.set(data),
      error: (err) => console.error('Failed to fetch offices', err)
    });
  }

  onReportTypeChange() {
    this.selectedCategoryId.set(undefined);
    if (['payments', 'purchases', 'receipts'].includes(this.reportType())) {
      this.loadCategories();
    }
    this.loadReport();
  }

  loadCategories() {
    const typeMap: Record<string, 'payment' | 'purchase' | 'receipt'> = {
      'payments': 'payment',
      'purchases': 'purchase',
      'receipts': 'receipt'
    };
    const type = typeMap[this.reportType()];
    if (!type) return;

    this.reportService.getCategories(type).subscribe((cats) => {
      this.categories.set(cats);
    });
  }

  loadReport() {
    const type = this.reportType();
    // if (type === 'daily') {
    //   this.loadDailyReport();
    //   return;
    // }

    this.isLoading.set(true);
    const start = this.startDate();
    const end = this.endDate();
    const office = this.selectedOfficeId();
    const cat = this.selectedCategoryId();

    if (type === 'invoices') {
      this.reportService.getInvoiceReport(start, end, office).subscribe({
        next: (data) => {
          this.invoiceData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else if (['payments', 'purchases', 'receipts'].includes(type)) {
      this.reportService.getFinanceReport(type as any, start, end, office, cat).subscribe({
        next: (data) => {
          this.financeData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else if (type === 'daily-list') {
      this.reportService.getDailyReportsList(start, end, office).subscribe({
        next: (data) => {
          this.dailyReportsList.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  openInvoiceDetailsFromReport(row: any) {
    this.selectedDailyBreakdown.set(null);
    const rowId = row?.id;

    if (rowId) {
      this.invoiceService.getInvoiceById(Number(rowId)).subscribe({
        next: (details) => this.selectedInvoiceDetails.set(details),
        error: () => this.toastService.show('Failed to load invoice details', 'error')
      });
      return;
    }

    this.invoiceService.getInvoices(this.selectedOfficeId()).subscribe({
      next: (res: any) => {
        const inv = (res?.invoices || []).find((i: any) => i.invoice_number === row.invoice_number);
        if (!inv?.id) {
          this.toastService.show('Invoice details not found for this row', 'error');
          return;
        }
        this.invoiceService.getInvoiceById(Number(inv.id)).subscribe({
          next: (details) => this.selectedInvoiceDetails.set(details),
          error: () => this.toastService.show('Failed to load invoice details', 'error')
        });
      },
      error: () => this.toastService.show('Failed to find invoice details', 'error')
    });
  }

  openDailyBreakdown(row: DailyReportData) {
    this.selectedInvoiceDetails.set(null);
    const officeId = (row as any).office_id || this.selectedOfficeId();

    this.invoiceService.getInvoices(officeId).pipe(
      map((res: any) => (res?.invoices || []).filter((i: any) => i.date === row.date)),
      catchError(() => of([]))
    ).subscribe((invoiceList: any[]) => {
      if (invoiceList.length === 0) {
        this.selectedDailyBreakdown.set({ report: row, invoices: [] });
        return;
      }

      const detailCalls = invoiceList.map((i: any) =>
        this.invoiceService.getInvoiceById(i.id).pipe(catchError(() => of(null)))
      );

      forkJoin(detailCalls).subscribe((details: any) => {
        const valid = (details as any[]).filter(Boolean);
        this.selectedDailyBreakdown.set({ report: row, invoices: valid });
      });
    });
  }

  closeDetailPanels() {
    this.selectedInvoiceDetails.set(null);
    this.selectedDailyBreakdown.set(null);
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
    const type = this.reportType();
    let data: string[][] = [['Metric', 'Value']];

    // if (type === 'daily') {
    //     const stats = this.financialStats();
    //     const report = this.dailyReport();
    //     data = [
    //         ['Metric', 'Value'],
    //         ['Revenue', String(stats?.revenue ?? 0)],
    //         ['Expenses', String(stats?.expenses ?? 0)],
    //         ['Profit', String(stats?.profit ?? 0)],
    //         ['Growth %', String(stats?.growth ?? 0)],
    //         ['Daily Invoice Grand Total', String(report?.total_invoice_grand ?? 0)],
    //         ['Daily Payments', String(report?.total_payment ?? 0)],
    //         ['Daily Purchases', String(report?.total_purchase ?? 0)],
    //         ['Daily Receipts', String(report?.total_receipt ?? 0)],
    //         ['Daily Final Total', String(report?.daily_total ?? 0)]
    //     ];
    // } else 
      
    if (type === 'invoices') {
        data = [['Date', 'Invoice #', 'Tracking #', 'Payment Mode', 'Grand Total']];
        this.invoiceData().forEach(item => {
            data.push([item.date, item.invoice_number, item.tracking_number, item.mode_of_payment, String(item.grand_total)]);
        });
    } else if (['payments', 'purchases', 'receipts'].includes(type)) {
        data = [['Date', 'Amount', 'Description', 'Category']];
        this.financeData().forEach(item => {
            data.push([new Date(item.created_at).toLocaleDateString(), String(item.amount), item.description, item.category_name]);
        });
    } else if (type === 'daily-list') {
        data = [['Date', 'Invoices', 'Payments', 'Purchases', 'Receipts', 'Total']];
        this.dailyReportsList().forEach(item => {
            data.push([item.date, String(item.total_invoice_grand), String(item.total_payment), String(item.total_purchase), String(item.total_receipt), String(item.daily_total)]);
        });
    }

    const csvContent = "data:text/csv;charset=utf-8,"
      + data.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleetflow_report_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
