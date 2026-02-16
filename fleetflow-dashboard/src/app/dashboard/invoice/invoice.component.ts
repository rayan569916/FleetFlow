import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { InvoiceItem } from '../../core/models/dashboard.models';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { UiStateService } from '../../services/ui-state.service';
import { modeOfDeliveryOptions, modeOfPaymentOptions } from '../../core/constants/dashboard.constants';



@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule, FormsModule, SidebarComponent, HeaderComponent],
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

  // Calculated totals
  subtotal = 0;
  customsCharge = 0;
  billCharge = 0;
  packingCharge = 0;
  discount = 0;
  grandTotal = 0;

  // Dropdown options
  modeOfDeliveryOptions = modeOfDeliveryOptions;

  modeOfPaymentOptions =   modeOfPaymentOptions;


  private uiStateService = inject(UiStateService);
  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  initializeForms(): void {
    // User Information Form
    this.userInfoForm = this.fb.group({
      // Sender/Shipper Information
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
    // Ensure grand total is not negative
    if (this.grandTotal < 0) {
      this.grandTotal = 0;
    }
  }

  submitInvoice(): void {
    if (this.userInfoForm.valid && this.items.length > 0) {
      const invoiceData = {
        userInfo: this.userInfoForm.value,
        items: this.items,
        charges: this.chargesForm.value,
        totals: {
          subtotal: this.subtotal,
          customsCharge: this.customsCharge,
          billCharge: this.billCharge,
          packingCharge: this.packingCharge,
          discount: this.discount,
          grandTotal: this.grandTotal
        }
      };
      
      console.log('Invoice Data:', invoiceData);
      // Here you would typically send this data to a backend service
      alert('Invoice created successfully! Check console for details.');
    } else {
      if (!this.userInfoForm.valid) {
        this.userInfoForm.markAllAsTouched();
      }
      if (this.items.length === 0) {
        alert('Please add at least one item to the invoice.');
      }
    }
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

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  closeSidebar(): void {
    this.uiStateService.setSidebarExpanded(false);
  }
}
