import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { InvoiceItem } from '../../core/models/dashboard.models';
import { modeOfDeliveryOptions, modeOfPaymentOptions } from '../../core/constants/dashboard.constants';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.css'
})
export class InvoiceComponent implements OnInit {
  // Forms
  userInfoForm!: FormGroup;
  itemForm!: FormGroup;
  chargesForm!: FormGroup;

  // Invoice data
  items: InvoiceItem[] = [];
  itemIdCounter = 1;

  // List View Data
  invoices: Invoice[] = [];
  viewMode: 'list' | 'create' | 'details' = 'list';
  isLoading = false;
  selectedInvoice: any = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserRole: string | null = null;

  // Calculated totals
  subtotal = 0;
  customsCharge = 0;
  billCharge = 0;
  packingCharge = 0;
  discount = 0;
  grandTotal = 0;

  // Dropdown options
  modeOfDeliveryOptions = modeOfDeliveryOptions;
  modeOfPaymentOptions = modeOfPaymentOptions;

  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  settingsService = inject(SettingsService);

  constructor(private fb: FormBuilder) {
    this.currentUserRole = this.authService.currentUserRole();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadInvoices();
  }

  initializeForms(): void {
    // User Information Form
    this.userInfoForm = this.fb.group({
      // Sender/Shipper Information
      trackingNumber: [''],
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', Validators.required],
      zipCode: ['', Validators.required],

      // Delivery and Payment Details
      modeOfDelivery: ['', Validators.required],
      modeOfPayment: ['', Validators.required],
      numberOfCartons: [1, [Validators.required, Validators.min(1)]],
      totalWeight: [0, [Validators.required, Validators.min(0.01)]],

      // Consignee Information
      consigneeName: ['', [Validators.required, Validators.minLength(2)]],
      consigneeMobile: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      consigneeAddress: ['', [Validators.required, Validators.minLength(5)]]
    });

    // Item Form
    this.itemForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0.01)]]
    });

    // Charges Form
    this.chargesForm = this.fb.group({
      customsCharge: [0, [Validators.required, Validators.min(0)]],
      billCharge: [0, [Validators.required, Validators.min(0)]],
      packingCharge: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.required, Validators.min(0)]]
    });

    // Listen to charges changes for auto-calculation
    this.chargesForm.valueChanges.subscribe(() => {
      this.updateChargesAndTotal();
    });
  }

  // View Switching
  switchToCreate(): void {
    this.resetForm();
    this.viewMode = 'create';
    this.errorMessage = null;
    this.successMessage = null;
  }

  switchToList(): void {
    this.viewMode = 'list';
    this.errorMessage = null;
    this.successMessage = null;
    this.selectedInvoice = null;
    this.loadInvoices();
  }

  // API Actions
  loadInvoices(): void {
    this.isLoading = true;
    this.invoiceService.getInvoices()
      .pipe(
        timeout(10000), // 10 second timeout
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: any) => {
          console.log('Invoices loaded:', data);
          this.invoices = data.invoices || [];
          // isLoading handled by finalize
        },
        error: (error) => {
          console.error('Error fetching invoices:', error);
          this.toastService.show('Failed to load invoices. Server may be unresponsive.', 'error');
          // isLoading handled by finalize
        }
      });
  }

  deleteInvoice(id: number): void {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    // Check permissions locally (backend also enforces this)
    if (this.currentUserRole !== 'super_admin' && this.currentUserRole !== 'ceo') {
      alert('Only Super Admin and CEO can delete invoices.');
      return;
    }

    this.invoiceService.deleteInvoice(id).subscribe({
      next: () => {
        this.toastService.show('Invoice deleted successfully.', 'success');
        this.loadInvoices();
      },
      error: (error) => {
        console.error('Error deleting invoice:', error);
        this.toastService.show('Failed to delete invoice.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  viewInvoice(id: number): void {
    this.isLoading = true;
    this.invoiceService.getInvoiceById(id).subscribe({
      next: (data) => {
        this.selectedInvoice = data;
        // Parse details if string, though backend handles it
        if (typeof this.selectedInvoice.invoice_details === 'string') {
          try { this.selectedInvoice.invoice_details = JSON.parse(this.selectedInvoice.invoice_details); } catch (e) { }
        }
        // Ensure invoice_details exists
        if (!this.selectedInvoice.invoice_details) {
          this.selectedInvoice.invoice_details = {};
        }

        this.viewMode = 'details';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading invoice details', err);
        this.toastService.show('Failed to load invoice details.', 'error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateInvoiceStatus(id: number, event: any): void {
    const newStatus = event.target.value;
    this.invoiceService.updateStatus(id, newStatus).subscribe({
      next: () => {
        this.toastService.show('Invoice status updated!', 'success');
        // Update local list if in list mode
        const inv = this.invoices.find(i => i.id === id);
        if (inv) inv.status = newStatus;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating status', err);
        this.toastService.show('Failed to update status.', 'error');
        // Revert change in UI if possible, or just reload
        this.loadInvoices();
      }
    });
  }

  addItem(): void {
    if (this.itemForm.valid) {
      const newItem: InvoiceItem = {
        id: this.itemIdCounter++,
        description: this.itemForm.value.description,
        quantity: this.itemForm.value.quantity,
        price: this.itemForm.value.price,
        amount: 0
      };

      // Calculate item amount
      newItem.amount = newItem.quantity * newItem.price;

      this.items.push(newItem);
      this.itemForm.reset({ quantity: 1, price: 0, description: '' });
      this.calculateTotals();
    } else {
      this.itemForm.markAllAsTouched();
    }
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
    this.calculateTotals();
  }

  updateItemAmount(item: InvoiceItem): void {
    item.amount = item.quantity * item.price;
    this.calculateTotals();
  }

  calculateTotals(): void {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.calculateGrandTotal();
  }

  updateChargesAndTotal(): void {
    this.customsCharge = this.chargesForm.value.customsCharge || 0;
    this.billCharge = this.chargesForm.value.billCharge || 0;
    this.packingCharge = this.chargesForm.value.packingCharge || 0;
    this.discount = this.chargesForm.value.discount || 0;
    this.calculateGrandTotal();
  }

  calculateGrandTotal(): void {
    this.grandTotal = this.subtotal + this.customsCharge + this.billCharge + this.packingCharge - this.discount;
    if (this.grandTotal < 0) {
      this.grandTotal = 0;
    }
  }

  submitInvoice(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.userInfoForm.invalid) {
      this.userInfoForm.markAllAsTouched();
      this.toastService.show('Please fill in all required user information.', 'error');
      this.cdr.detectChanges();
      return;
    }

    if (this.items.length === 0) {
      this.toastService.show('Please add at least one item to the invoice.', 'error');
      this.cdr.detectChanges();
      return;
    }

    const formVal = this.userInfoForm.value;
    const description = `To: ${formVal.consigneeName}, By: ${formVal.modeOfDelivery}`;

    const invoiceData = {
      invoice_number: 'INV-' + Date.now(),
      amount: this.grandTotal,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      description: description,
      tracking_number: formVal.trackingNumber
    };

    this.isLoading = true;
    this.invoiceService.createInvoice(invoiceData).subscribe({
      next: () => {
        this.isLoading = false;
        this.viewMode = 'list';
        this.toastService.show('Invoice created successfully!', 'success');
        this.loadInvoices();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating invoice:', error);
        const msg = error.error?.message || 'Failed to create invoice. Please try again.';
        this.toastService.show(msg, 'error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  resetForm(): void {
    this.userInfoForm.reset();
    this.itemForm.reset({ quantity: 1, price: 0, description: '' });
    this.chargesForm.reset({ customsCharge: 0, billCharge: 0, packingCharge: 0, discount: 0 });
    this.items = [];
    this.itemIdCounter = 1;
    this.subtotal = 0;
    this.grandTotal = 0;
  }

  printInvoice(): void {
    window.print();
  }
}
