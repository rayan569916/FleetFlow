import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { SettingsService } from '../../services/settings.service';
import { UiStateService } from '../../services/ui-state.service';
import { ReportService } from '../../services/report.service';
import { InvoiceService } from '../../services/invoice.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [CommonModule, AsyncPipe, SidebarComponent, HeaderComponent],
  templateUrl: './daily-report.html',
  styleUrl: './daily-report.css',
})
export class DailyReport implements OnInit {
  private uiStateService = inject(UiStateService);
  private reportService = inject(ReportService);
  private invoiceService = inject(InvoiceService);
  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;
  public settingsService = inject(SettingsService);

  submittedInvoices: any[] = [];
  previousBalance = 0;

  totalInvoiceAmount = 0;
  totalNumberOfBills = 0;
  totalWeightKg = 0;
  totalSwipeAmount = 0;
  totalBankTransferAmount = 0;
  totalCashAmount = 0;
  adjustedInvoiceAmount = 0;
  totalPayments = 0;
  totalPurchases = 0;
  totalReceipts = 0;
  finalAmount = 0;

  ngOnInit(): void {
    this.loadDailyData();
  }

  private loadDailyData(): void {
    const today = new Date().toISOString().split('T')[0];

    forkJoin({
      report: this.reportService.getDailyReport(today).pipe(catchError(() => of(null))),
      invoiceList: this.invoiceService.getInvoices({ date: today, per_page: 1000 }).pipe(catchError(() => of({ items: [], invoices: [] })))
    }).subscribe(({ report, invoiceList }) => {
      const invoices = (invoiceList?.items || invoiceList?.invoices || []).filter((inv: any) => inv.date === today);
      this.totalNumberOfBills = invoices.length;

      if (!report) {
        this.resetAmounts();
        return;
      }

      const detailCalls = invoices
        .filter((inv: any) => !!inv.id)
        .map((inv: any) =>
          this.invoiceService.getInvoiceById(inv.id).pipe(catchError(() => of(null)))
        );

      if (detailCalls.length === 0) {
        this.applyReportTotals(report, []);
        return;
      }

      forkJoin(detailCalls).subscribe((details) => {
        const validDetails = (details as any[]).filter(Boolean);
        this.applyReportTotals(report, validDetails);
      });
    });
  }

  private applyReportTotals(report: any, invoiceDetails: any[]): void {
    this.submittedInvoices = invoiceDetails;
    this.totalInvoiceAmount = Number(report.total_invoice_grand ?? 0);
    this.totalPayments = Number(report.total_payment ?? 0);
    this.totalPurchases = Number(report.total_purchase ?? 0);
    this.totalReceipts = Number(report.total_receipt ?? 0);
    this.previousBalance = Number(report.previous_total ?? 0);
    this.adjustedInvoiceAmount = this.totalInvoiceAmount - Number(report.bank_transfer_swipe_sum ?? 0);
    this.finalAmount = Number(report.daily_total ?? 0);

    this.totalWeightKg = this.submittedInvoices.reduce(
      (sum, inv) => sum + Number(inv?.invoice_details?.totalWeight ?? 0),
      0
    );
    this.totalSwipeAmount = this.submittedInvoices
      .filter((inv) => inv?.invoice_details?.modeOfPayment === 'swipe')
      .reduce((sum, inv) => sum + Number(inv?.amount ?? 0), 0);
    this.totalBankTransferAmount = this.submittedInvoices
      .filter((inv) => inv?.invoice_details?.modeOfPayment === 'bank_transfer' || inv?.invoice_details?.modeOfPayment === 'Direct Bank Transfer')
      .reduce((sum, inv) => sum + Number(inv?.amount ?? 0), 0);
    this.totalCashAmount = this.submittedInvoices
      .filter((inv) => inv?.invoice_details?.modeOfPayment === 'cash')
      .reduce((sum, inv) => sum + Number(inv?.amount ?? 0), 0);
  }

  private resetAmounts(): void {
    this.submittedInvoices = [];
    this.totalInvoiceAmount = 0;
    this.totalNumberOfBills = 0;
    this.totalWeightKg = 0;
    this.totalSwipeAmount = 0;
    this.totalBankTransferAmount = 0;
    this.totalCashAmount = 0;
    this.adjustedInvoiceAmount = 0;
    this.totalPayments = 0;
    this.totalPurchases = 0;
    this.totalReceipts = 0;
    this.previousBalance = 0;
    this.finalAmount = 0;
  }

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  closeSidebar(): void {
    this.uiStateService.setSidebarExpanded(false);
  }
}
