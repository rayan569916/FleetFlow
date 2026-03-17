import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Category } from '../../core/models/dashboard.models';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { UiStateService } from '../../services/ui-state.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  private fb = inject(FormBuilder);
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  confirmationService = inject(ConfirmationDialogService);
  private uiStateService = inject(UiStateService);
  private toastService = inject(ToastService);

  payments = signal<any[]>([]);
  categories = signal<Category[]>([]);
  showForm = signal(false);
  editingItem = signal<any | null>(null);
  isSubmitting = signal(false);

  // Pagination & Filtering Signals
  searchTerm = signal('');
  selectedCategory = signal<number | null>(null);
  selectedDate = signal<string>('');
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);

  paymentForm = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required]],
    category_id: [null, [Validators.required]]
  });

  constructor() {
    effect(() => {
      this.fetchData();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.fetchCategories();
    
    // Check for pending edit from Report
    const pendingEdit = this.uiStateService.getPendingEdit();
    if (pendingEdit) {
      setTimeout(() => this.onEdit(pendingEdit), 100);
    }
  }

  fetchData() {
    const params = {
      page: this.currentPage(),
      per_page: this.pageSize(),
      search: this.searchTerm(),
      category_id: this.selectedCategory(),
      date: this.selectedDate()
    };

    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );

    this.dashboardDataService.getPayments(cleanParams).subscribe(data => {
      this.payments.set(data.items);
      this.totalItems.set(data.total);
      this.totalPages.set(data.pages);
    });
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  fetchCategories() {
    this.dashboardDataService.getPaymentCategories().subscribe(data => {
      this.categories.set(data);
    });
  }

  async toggleForm(forceClose = false): Promise<void> {
    if (this.showForm() && !forceClose) {
      const hasUnsaved = this.paymentForm.dirty || !!this.editingItem();
      if (hasUnsaved) {
        const confirmed = await this.confirmationService.confirm({
          title: 'Unsaved Changes',
          message: 'You have an unsaved payment form. Discard changes?',
          confirmText: 'Discard',
          cancelText: 'Stay'
        });
        if (!confirmed) return;
      }
    }

    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.paymentForm.reset();
      this.editingItem.set(null);
    }
  }

  onEdit(payment: any) {
    const today = new Date().toISOString().split('T')[0];
    const paymentDate = payment?.created_at ? payment.created_at.split('T')[0].split(' ')[0] : null;

    if (paymentDate && paymentDate !== today) {
      this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot edit this payment because the daily report for that day has already been calculated. Only payments from today can be edited.',
        confirmText: 'OK'
      });
      return;
    }

    this.editingItem.set(payment);
    this.paymentForm.patchValue({
      amount: payment.amount,
      description: payment.description,
      category_id: payment.category_id
    });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async onSubmit() {
    if (this.paymentForm.valid) {
      const isEdit = !!this.editingItem();
      const confirmed = await this.confirmationService.confirm({
        title: isEdit ? 'Update Payment' : 'Submit Payment',
        message: isEdit ? 'Are you sure you want to update this payment record?' : 'Are you sure you want to record this payment?',
        confirmText: isEdit ? 'Update' : 'Submit',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);

      const request = isEdit 
        ? this.dashboardDataService.updatePayment(this.editingItem().id, this.paymentForm.value)
        : this.dashboardDataService.createPayment(this.paymentForm.value);

      request.subscribe({
        next: () => {
          this.fetchData();
          this.toggleForm(true);
          this.toastService.show(`${isEdit ? 'Payment updated' : 'Payment created'} successfully`, 'success');
          this.isSubmitting.set(false);
        },
        error: (err: any) => {
          console.error(`Failed to ${isEdit ? 'update' : 'create'} payment`, err);
          if (err.status=400) {
            this.toastService.show(err.error.message, 'error');
          }else{
            this.toastService.show(`Failed to ${isEdit ? 'update' : 'create'} payment`, 'error');
          }

          this.isSubmitting.set(false);
        }
      });
    }
  }

  async deletePayment(id: number) {
    const payment = this.payments().find(p => p.id === id);
    const today = new Date().toISOString().split('T')[0];
    const paymentDate = payment?.created_at ? payment.created_at.split('T')[0].split(' ')[0] : null;

    if (paymentDate && paymentDate !== today) {
      await this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot delete this payment because the daily report for that day has already been calculated. Only payments from today can be deleted.',
        confirmText: 'OK'
      });
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.dashboardDataService.deletePayment(id).subscribe({
        next: () => {
          this.payments.update(prev => prev.filter(p => p.id !== id));
        },
        error: (err: any) => console.error('Failed to delete payment', err)
      });
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.showForm()) return true;
    if (!this.paymentForm.dirty && !this.editingItem()) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have an unsaved payment form. Leave this page and discard changes?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }
}
