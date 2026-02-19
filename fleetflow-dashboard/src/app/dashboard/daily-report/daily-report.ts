import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Entry, InvoiceRecord } from '../../core/models/dashboard.models';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { UiStateService } from '../../services/ui-state.service';
import { payments, purchases, receipts, submittedInvoices } from '../../core/constants/dashboard.constants';

@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [CommonModule, AsyncPipe, SidebarComponent, HeaderComponent],
  templateUrl: './daily-report.html',
  styleUrl: './daily-report.css',
})
export class DailyReport implements OnInit {

  private uiStateService = inject(UiStateService);
  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;

  // ─── DUMMY INVOICE DATA ──────────────────────────────────────────────────────
  /** Simulated submitted invoices (in a real app these come from a service/store) */
  submittedInvoices: InvoiceRecord[] = submittedInvoices;

  // ─── DUMMY TRANSACTION DATA ──────────────────────────────────────────────────
  payments: Entry[] = payments;

  purchases: Entry[] = purchases;

  receipts: Entry[] = receipts;

  /** Previous day balance (dummy constant) */
  readonly previousBalance = 1000;

  // ─── COMPUTED BUSINESS LOGIC VALUES ─────────────────────────────────────────

  /** 1. Total Invoice Amount */
  totalInvoiceAmount = 0;

  /** 2. Total Number of Bills */
  totalNumberOfBills = 0;

  /** 3. Total Weight (kg) */
  totalWeightKg = 0;

  /** 4a. Total Swipe Amount */
  totalSwipeAmount = 0;

  /** 4b. Total Direct Bank Transfer Amount */
  totalBankTransferAmount = 0;

  /** 4c. Total Direct Cash Amount */
  totalCashAmount = 0;

  /** 5. Adjusted Invoice = Total Invoice - (Swipe + Bank Transfer) */
  adjustedInvoiceAmount = 0;

  /** 6a. Total Payments */
  totalPayments = 0;

  /** 6b. Total Purchases */
  totalPurchases = 0;

  /** 7. Total Receipts */
  totalReceipts = 0;

  /**
   * 9. Final Amount =
   *   Adjusted Invoice
   *   - Total Payments
   *   - Total Purchases
   *   + Total Receipts
   *   + Previous Balance
   */
  finalAmount = 0;

  // ────────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.calculateBusinessLogic();
  }

  calculateBusinessLogic(): void {
    // 1. Total Invoice Amount
    this.totalInvoiceAmount = this.submittedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    // 2. Total Number of Bills
    this.totalNumberOfBills = this.submittedInvoices.length;

    // 3. Total Weight (kg)
    this.totalWeightKg = this.submittedInvoices.reduce((sum, inv) => sum + inv.totalWeight, 0);

    // 4. Payment Method Breakdown
    this.totalSwipeAmount = this.submittedInvoices
      .filter(inv => inv.modeOfPayment === 'swipe')
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    this.totalBankTransferAmount = this.submittedInvoices
      .filter(inv => inv.modeOfPayment === 'bank_transfer')
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    this.totalCashAmount = this.submittedInvoices
      .filter(inv => inv.modeOfPayment === 'cash')
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    // 5. Adjusted Invoice = Total Invoice - (Swipe + Bank Transfer)
    this.adjustedInvoiceAmount = this.totalInvoiceAmount - (this.totalSwipeAmount + this.totalBankTransferAmount);

    // 6. Expenses
    this.totalPayments = this.payments.reduce((sum, e) => sum + e.amount, 0);
    this.totalPurchases = this.purchases.reduce((sum, e) => sum + e.amount, 0);

    // 7. Receipts
    this.totalReceipts = this.receipts.reduce((sum, e) => sum + e.amount, 0);

    // 9. Final Amount
    this.finalAmount =
      this.adjustedInvoiceAmount
      - this.totalPayments
      - this.totalPurchases
      + this.totalReceipts
      + this.previousBalance;
  }

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  closeSidebar(): void {
    this.uiStateService.setSidebarExpanded(false);
  }
}
