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
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.css']
})
export class PurchaseComponent implements OnInit {
  private fb = inject(FormBuilder);
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  private confirmationService = inject(ConfirmationDialogService);
  private uiStateService = inject(UiStateService);
  private toastService = inject(ToastService);

  purchases = signal<any[]>([]);
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

  purchaseForm = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required]],
    category_id: [null, [Validators.required]]
  });

  constructor() {
    // Automatically refetch metadata when filters or page change
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

    // Filter out null/empty values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );

    this.dashboardDataService.getPurchases(cleanParams).subscribe(data => {
      this.purchases.set(data.items);
      this.totalItems.set(data.total);
      this.totalPages.set(data.pages);
    });
  }

  onFilterChange() {
    this.currentPage.set(1); // Reset to page 1 when filters change
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
    this.dashboardDataService.getPurchaseCategories().subscribe(data => {
      this.categories.set(data);
    });
  }

  async toggleForm(forceClose = false): Promise<void> {
    if (this.showForm() && !forceClose) {
      const hasUnsaved = this.purchaseForm.dirty || !!this.editingItem();
      if (hasUnsaved) {
        const confirmed = await this.confirmationService.confirm({
          title: 'Unsaved Changes',
          message: 'You have an unsaved purchase form. Discard changes?',
          confirmText: 'Discard',
          cancelText: 'Stay'
        });
        if (!confirmed) return;
      }
    }

    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.purchaseForm.reset();
      this.editingItem.set(null);
    }
  }

  onEdit(purchase: any) {
    const today = new Date().toISOString().split('T')[0];
    const purchaseDate = purchase?.created_at ? purchase.created_at.split('T')[0].split(' ')[0] : null;

    if (purchaseDate && purchaseDate !== today) {
      this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot edit this purchase because the daily report for that day has already been calculated. Only purchases from today can be edited.',
        confirmText: 'OK'
      });
      return;
    }

    this.editingItem.set(purchase);
    this.purchaseForm.patchValue({
      amount: purchase.amount,
      description: purchase.description,
      category_id: purchase.category_id
    });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async onSubmit() {
    if (this.purchaseForm.valid) {
      const isEdit = !!this.editingItem();
      const confirmed = await this.confirmationService.confirm({
        title: isEdit ? 'Update Purchase' : 'Submit Purchase',
        message: isEdit ? 'Are you sure you want to update this purchase record?' : 'Are you sure you want to record this purchase?',
        confirmText: isEdit ? 'Update' : 'Submit',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);

      const request = isEdit 
        ? this.dashboardDataService.updatePurchase(this.editingItem().id, this.purchaseForm.value)
        : this.dashboardDataService.createPurchase(this.purchaseForm.value);

      request.subscribe({
        next: () => {
          this.fetchData();
          this.toggleForm(true);
          this.toastService.show(isEdit ? 'Purchase updated successfully' : 'Purchase recorded successfully','success');
          this.isSubmitting.set(false);
        },
        error: (err: any) => {
          if (err.status === 400) {
            this.toastService.show(err.error.message,'error');
          } else {
            this.toastService.show(`Failed to ${isEdit ? 'update' : 'create'} purchase`,'error');
          }
          console.error(`Failed to ${isEdit ? 'update' : 'create'} purchase`, err);
          this.isSubmitting.set(false);
        }
      });
    }
  }

  async deletePurchase(id: number) {
    const purchase = this.purchases().find(p => p.id === id);
    const today = new Date().toISOString().split('T')[0];
    const purchaseDate = purchase?.created_at ? purchase.created_at.split('T')[0].split(' ')[0] : null;

    if (purchaseDate && purchaseDate !== today) {
      await this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot delete this purchase because the daily report for that day has already been calculated. Only purchases from today can be deleted.',
        confirmText: 'OK'
      });
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Purchase',
      message: 'Are you sure you want to delete this purchase record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.dashboardDataService.deletePurchase(id).subscribe({
        next: () => {
          this.purchases.update(prev => prev.filter(p => p.id !== id));
        },
        error: (err: any) => console.error('Failed to delete purchase', err)
      });
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.showForm()) return true;
    if (!this.purchaseForm.dirty && !this.editingItem()) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have an unsaved purchase form. Leave this page and discard changes?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }
}
