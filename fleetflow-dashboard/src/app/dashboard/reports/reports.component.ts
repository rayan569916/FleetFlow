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
import { Router } from '@angular/router';
import { UiStateService } from '../../services/ui-state.service';

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
  private router = inject(Router);
  private uiStateService = inject(UiStateService);

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
  selectedDailyBreakdown = signal<{ report: DailyReportData; invoices: any[]; payments: any[]; purchases: any[]; receipts: any[] } | null>(null);
  viewMode = signal<'list' | 'invoice-detail' | 'daily-breakdown'>('list');

  isLoading = signal<boolean>(false);

  // Pagination Signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  totalPages = signal<number>(0);

  reportTypes = [
    // { id: 'daily', label: 'Daily Summary', icon: 'grid' },
    { id: 'invoices', label: 'Invoices', icon: 'file-text' },
    { id: 'payments', label: 'Payments', icon: 'credit-card' },
    { id: 'purchases', label: 'Purchases', icon: 'shopping-cart' },
    { id: 'receipts', label: 'Receipts', icon: 'file' },
    { id: 'daily-list', label: 'Daily Report', icon: 'documents' }
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
    this.currentPage.set(1); // Reset to first page
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
    this.isLoading.set(true);

    const start = this.startDate();
    const end = this.endDate();
    const officeId = this.selectedOfficeId();
    const categoryId = this.selectedCategoryId();
    const page = this.currentPage();
    const per_page = this.pageSize();

    if (type === 'invoices') {
      this.reportService.getInvoiceReport(start, end, officeId, page, per_page).subscribe({
        next: (res) => {
          this.invoiceData.set(res.items || []);
          this.totalItems.set(res.total || 0);
          this.totalPages.set(res.pages || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load invoice report', err);
          this.isLoading.set(false);
        }
      });
    } else if (['payments', 'purchases', 'receipts'].includes(type)) {
      this.reportService.getFinanceReport(type as any, start, end, officeId, categoryId, page, per_page).subscribe({
        next: (res) => {
          this.financeData.set(res.items || []);
          this.totalItems.set(res.total || 0);
          this.totalPages.set(res.pages || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load finance report', err);
          this.isLoading.set(false);
        }
      });
    } else if (type === 'daily-list') {
      this.reportService.getDailyReportsList(start, end, officeId, page, per_page).subscribe({
        next: (res) => {
          this.dailyReportsList.set(res.items || []);
          this.totalItems.set(res.total || 0);
          this.totalPages.set(res.pages || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load daily reports list', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadReport();
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadReport();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadReport();
    }
  }

  openInvoiceDetailsFromReport(row: any) {
    this.selectedDailyBreakdown.set(null);
    const rowId = row?.id;

    if (!rowId) {
      console.warn('openInvoiceDetailsFromReport: row.id is undefined', row);
      // Fallback: try to find by invoice number if possible
      if (!row.invoice_number) return;
    }

    if (rowId) {
      this.invoiceService.getInvoiceById(Number(rowId)).subscribe({
        next: (details) => {
          this.selectedInvoiceDetails.set(details);
          this.viewMode.set('invoice-detail');
        },
        error: () => this.toastService.show('Failed to load invoice details', 'error')
      });
      return;
    }

    this.invoiceService.getInvoices({ office_id: this.selectedOfficeId() }).subscribe({
      next: (res: any) => {
        const results = res?.items || res?.invoices || [];
        const inv = results.find((i: any) => i.invoice_number === row.invoice_number);
        if (!inv?.id) {
          this.toastService.show('Invoice details not found for this row', 'error');
          return;
        }
        this.invoiceService.getInvoiceById(Number(inv.id)).subscribe({
          next: (details) => {
            this.selectedInvoiceDetails.set(details);
            this.viewMode.set('invoice-detail');
          },
          error: () => this.toastService.show('Failed to load invoice details', 'error')
        });
      },
      error: () => this.toastService.show('Failed to find invoice details', 'error')
    });
  }

  openDailyBreakdown(row: DailyReportData) {
    this.selectedInvoiceDetails.set(null);
    this.isLoading.set(true);
    const officeId = (row as any).office_id || this.selectedOfficeId();
    const dateStr = row.date.split('T')[0];

    import('rxjs').then(({ forkJoin, of }) => {
      import('rxjs/operators').then(({ catchError, map, switchMap, finalize }) => {
        forkJoin({
          invoices: this.reportService.getInvoiceReport(dateStr, dateStr, officeId, 1, 1000),
          payments: this.reportService.getFinanceReport('payments', dateStr, dateStr, officeId, undefined, 1, 1000),
          purchases: this.reportService.getFinanceReport('purchases', dateStr, dateStr, officeId, undefined, 1, 1000),
          receipts: this.reportService.getFinanceReport('receipts', dateStr, dateStr, officeId, undefined, 1, 1000)
        }).pipe(
          catchError(err => {
            console.error('Failed to load daily breakdown details', err);
            this.toastService.show('Failed to load itemized details for this day.', 'error');
            return of({ 
              invoices: { items: [] }, 
              payments: { items: [] }, 
              purchases: { items: [] }, 
              receipts: { items: [] } 
            });
          }),
          switchMap((res: any) => {
            const invoiceItems = res.invoices.items || res.invoices || [];
            if (invoiceItems.length === 0) {
              return of({
                invoices: [],
                payments: res.payments.items || res.payments || [],
                purchases: res.purchases.items || res.purchases || [],
                receipts: res.receipts.items || res.receipts || []
              });
            }
            return forkJoin(invoiceItems.map((i: any) => {
              if (!i.id) return of(null);
              return this.invoiceService.getInvoiceById(i.id).pipe(catchError(() => of(null)));
            })).pipe(
              map((details: any) => ({
                invoices: (details as any[]).filter(Boolean).map((d: any) => {
                  if (typeof d.invoice_details === 'string') {
                    try { d.invoice_details = JSON.parse(d.invoice_details); } catch (e) { }
                  }
                  return d;
                }),
                payments: res.payments.items || res.payments || [],
                purchases: res.purchases.items || res.purchases || [],
                receipts: res.receipts.items || res.receipts || []
              }))
            );
          }),
          finalize(() => this.isLoading.set(false))
        ).subscribe(processed => {
          this.selectedDailyBreakdown.set({
            report: row,
            invoices: processed.invoices,
            payments: processed.payments,
            purchases: processed.purchases,
            receipts: processed.receipts
          });
          this.viewMode.set('daily-breakdown');
          // No need to scroll if we are switching views
        });
      });
    });
  }

  closeDetailPanels() {
    this.selectedInvoiceDetails.set(null);
    this.selectedDailyBreakdown.set(null);
    this.viewMode.set('list');
  }

  triggerInvoiceEdit(invoice: any): void {
    if (invoice) {
      this.uiStateService.setPendingEdit(invoice);
      this.router.navigate(['/dashboard/invoice']);
    }
  }

  triggerPaymentEdit(payment: any): void {
    if (payment) {
      this.uiStateService.setPendingEdit(payment);
      this.router.navigate(['/dashboard/payment']);
    }
  }

  triggerPurchaseEdit(purchase: any): void {
    if (purchase) {
      this.uiStateService.setPendingEdit(purchase);
      this.router.navigate(['/dashboard/purchase']);
    }
  }

  triggerReceiptEdit(receipt: any): void {
    if (receipt) {
      this.uiStateService.setPendingEdit(receipt);
      this.router.navigate(['/dashboard/receipt']);
    }
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
