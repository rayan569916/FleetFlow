import { Component, OnInit, inject, ChangeDetectorRef, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { finalize, timeout, Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { InvoiceItem } from '../../core/models/dashboard.models';
import { modeOfDeliveryOptions, modeOfPaymentOptions } from '../../core/constants/dashboard.constants';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SettingsService } from '../../services/settings.service';
import { UiStateService } from '../../services/ui-state.service';
import { UnitPriceService, UnitPriceInterface } from '../../services/unit-price.service';
import { InvoiceDetailsViewComponent } from './invoice-details-view.component';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { CargoItemsService, CargoItem } from '../../services/cargo-items.service';



@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe, InvoiceDetailsViewComponent],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.css'
})
export class InvoiceComponent implements OnInit {
  // Forms
  userInfoForm!: FormGroup;
  itemForm!: FormGroup;
  financialForm!: FormGroup;
  chargesForm!: FormGroup;

  // Invoice data
  items: InvoiceItem[] = [];
  itemIdCounter = 1;

  // List View Data
  invoices: Invoice[] = [];
  unitPricesData: UnitPriceInterface[] = [];
  viewMode: 'list' | 'create' | 'details' = 'list';
  isLoading = false;
  selectedInvoice: any = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserRole: string | null = null;
  @ViewChild('phoneSearchInput') phoneSearchInput!: ElementRef;

  // Calculated totals
  subtotal = 0;
  totalWeight = 0;
  customsCharge = 0;
  billCharge = 0;
  packingCharge = 0;
  discount = 0;
  grandTotal = 0;
  
  // Customer search
  private searchSubject = new Subject<string>();
  foundCustomers: any[] = [];
  showCustomerDropdown = false;
  
  // Item Autocomplete
  private itemSearchSubject = new Subject<string>();
  suggestedItems: CargoItem[] = [];
  showItemDropdown = false;


  // Dropdown options
  modeOfDeliveryOptions = modeOfDeliveryOptions;
  modeOfPaymentOptions = modeOfPaymentOptions;
  saudiMajorCities: string[] = [
    'Riyadh',
    'Jeddah',
    'Mecca',
    'Medina',
    'Dammam',
    'Khobar',
    'Dhahran',
    'Taif',
    'Tabuk',
    'Abha',
    'Buraidah',
    'Hail',
    'Najran',
    'Jizan',
    'Yanbu',
    'Al Jubail',
    'Al Ahsa',
    'Qatif',
    'Khamis Mushait',
    'Al Qunfudhah'
  ];
  countryOptions: string[] = [
    'Saudi Arabia',
    'United Arab Emirates',
    'Qatar',
    'Kuwait',
    'Bahrain',
    'Oman',
    'Jordan',
    'Egypt',
    'India',
    'Pakistan',
    'Bangladesh',
    'Philippines',
    'United Kingdom',
    'United States'
  ];
  countryCodeOptions: Array<{ code: string; label: string }> = [
    { code: '+966', label: 'Saudi Arabia (+966)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+974', label: 'Qatar (+974)' },
    { code: '+965', label: 'Kuwait (+965)' },
    { code: '+973', label: 'Bahrain (+973)' },
    { code: '+968', label: 'Oman (+968)' },
    { code: '+91', label: 'India (+91)' },
    { code: '+92', label: 'Pakistan (+92)' },
    { code: '+880', label: 'Bangladesh (+880)' },
    { code: '+63', label: 'Philippines (+63)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+1', label: 'USA (+1)' }
  ];

  private uiStateService = inject(UiStateService);
  private invoiceService = inject(InvoiceService);
  private unitPriceService = inject(UnitPriceService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationDialogService);
  private cdr = inject(ChangeDetectorRef);
  settingsService = inject(SettingsService);
  private cargoItemsService = inject(CargoItemsService);


  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$ as Observable<boolean>;

  get cartons(): FormArray {
    return this.financialForm.get('cartons') as FormArray;
  }

  constructor(private fb: FormBuilder) {
    this.currentUserRole = this.authService.currentUserRole();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadInvoices();
    this.loadCountries();
    this.setupCustomerSearch();
    this.setupItemAutocomplete();
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.showCustomerDropdown = false;
      this.showItemDropdown = false;
      this.cdr.detectChanges();
    }
  }


  setupCustomerSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(phone => {
        if (!phone || phone.length < 3) return of({ customers: [] });
        return this.invoiceService.searchCustomers(phone);
      })
    ).subscribe(res => {
      this.foundCustomers = res.customers || [];
      this.showCustomerDropdown = this.foundCustomers.length > 0;
      this.cdr.detectChanges();
    });
  }

  onSearchPhone(event: any): void {
    const phone = event.target.value;
    this.searchSubject.next(phone);
    // If no match selected, we still update the phone number in our form
    this.userInfoForm.patchValue({ phone: phone }, { emitEvent: false });
  }

  selectCustomer(customer: any): void {
    this.userInfoForm.patchValue({
      customerName: customer.customerName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      zipCode: customer.zipCode,
      senderCountryCode: customer.senderCountryCode || '+966'
    });
    this.showCustomerDropdown = false;
    this.foundCustomers = [];
    if (this.phoneSearchInput) {
      this.phoneSearchInput.nativeElement.value = customer.phone;
    }
    this.cdr.detectChanges();
  }

  setupItemAutocomplete(): void {
    this.itemSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => {
        if (!search || search.length < 1) return of({ items: [] });
        return this.cargoItemsService.getCargoItemsList(search);
      })
    ).subscribe(res => {
      this.suggestedItems = res.items || [];
      this.showItemDropdown = this.suggestedItems.length > 0;
      this.cdr.detectChanges();
    });
  }

  onItemSearch(event: any): void {
    const search = event.target.value;
    this.itemSearchSubject.next(search);
    // Sync the manual value to the form
    this.itemForm.patchValue({ description: search }, { emitEvent: false });
  }

  selectItem(item: CargoItem): void {
    this.itemForm.patchValue({
      description: item.item_name
    });
    this.showItemDropdown = false;
    this.suggestedItems = [];
    this.cdr.detectChanges();
  }


  loadCountries(): void {
    this.unitPriceService.getCountries().subscribe({
      next: (countries) => {
        if (countries && countries.length > 0) {
          this.countryOptions = countries;
        }
      },
      error: (err) => {
        console.error('Error loading countries:', err);
      }
    });

    this.unitPriceService.getUnitPrice().subscribe({
      next: (res: any) => {
        this.unitPricesData = Array.isArray(res) ? res : (res?.unit_prices ?? []);
      },
      error: (err) => {
        console.error('Error loading unit prices:', err);
      }
    });
  }

  initializeForms(): void {
    // User Information Form
    this.userInfoForm = this.fb.group({
      // Sender/Shipper Information
      trackingNumber: [{ value: '', disabled: true }],
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      senderCountryCode: ['+966', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\d{6,14}$/)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', Validators.required],
      zipCode: ['', Validators.required],
      locationLink: [''],

      // Delivery and Payment Details
      modeOfDelivery: ['', Validators.required],
      modeOfPayment: ['', Validators.required],

      // Consignee Information
      consigneeName: ['', [Validators.required, Validators.minLength(2)]],
      consigneeCountryCode: ['+966', Validators.required],
      consigneeMobile: ['', [Validators.required, Validators.pattern(/^\d{6,14}$/)]],
      consigneeAddress: ['', [Validators.required, Validators.minLength(5)]],
      consigneeCountry: ['', Validators.required],
      consigneeCity: ['', Validators.required]
    });

    // Item Form
    this.itemForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitWeight: [null] // Optional
    });

    // Financial Details Form (Refactored)
    this.financialForm = this.fb.group({
      totalCartons: [1, [Validators.required, Validators.min(1)]],
      pricePerKg: [0, [Validators.required, Validators.min(0.01)]],
      cartons: this.fb.array([this.createCartonGroup()])
    });

    // Watch totalCartons to dynamically sync FormArray
    this.financialForm.get('totalCartons')?.valueChanges.subscribe(val => {
      this.syncCartons(val);
    });

    // Charges Form (Removed individual charges that are now per-carton)
    this.chargesForm = this.fb.group({
      billCharge: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.required, Validators.min(0)]]
    });

    // Listen for country/mode changes to auto-populate price
    this.userInfoForm.get('consigneeCountry')?.valueChanges.subscribe(() => this.updateAutoPrice());
    this.userInfoForm.get('modeOfDelivery')?.valueChanges.subscribe(() => this.updateAutoPrice());

    // Listen to changes for auto-calculation
    this.financialForm.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.chargesForm.valueChanges.subscribe(() => {
      this.updateChargesAndTotal();
    });
  }

  createCartonGroup(): FormGroup {
    return this.fb.group({
      weight: [0, [Validators.required, Validators.min(0.01)]],
      customsCharge: [0, [Validators.required, Validators.min(0)]],
      packingCharge: [0, [Validators.required, Validators.min(0)]]
    });
  }

  syncCartons(total: number): void {
    if (total < 1) return;
    const currentCount = this.cartons.length;
    if (total > currentCount) {
      for (let i = currentCount; i < total; i++) {
        const newCarton = this.createCartonGroup();
        
        // Auto-populate packing charge for the new carton if price data is available
        const country = this.userInfoForm.get('consigneeCountry')?.value;
        const mode = this.userInfoForm.get('modeOfDelivery')?.value;
        if (country && mode && this.unitPricesData.length > 0) {
          const priceEntry = this.unitPricesData.find(p => p.country.toLowerCase() === country.toLowerCase());
          if (priceEntry) {
            newCarton.patchValue({ packingCharge: priceEntry.packing_charge });
          }
        }
        
        this.cartons.push(newCarton);
      }
    } else if (total < currentCount) {
      for (let i = currentCount; i > total; i--) {
        this.cartons.removeAt(i - 1);
      }
    }
    this.calculateTotals(); // Recalculate after sync
  }

  updateAutoPrice(): void {
    const country = this.userInfoForm.get('consigneeCountry')?.value;
    const mode = this.userInfoForm.get('modeOfDelivery')?.value;

    if (country && mode && this.unitPricesData.length > 0) {
      const priceEntry = this.unitPricesData.find(p => p.country.toLowerCase() === country.toLowerCase());
      if (priceEntry) {
        const price = mode === 'air' ? priceEntry.air_price : priceEntry.sea_price;
        this.financialForm.patchValue({ pricePerKg: price }, { emitEvent: true });
        
        // billCharge in chargesForm
        const billingCharge = priceEntry.bill_charge;
        this.chargesForm.patchValue({ billCharge: billingCharge }, { emitEvent: true });

        // packingCharge for each carton in cartons FormArray
        const packingCharge = priceEntry.packing_charge;
        this.cartons.controls.forEach(carton => {
          carton.patchValue({ packingCharge: packingCharge }, { emitEvent: true });
        });
      }
    }
  }

  generateTrackingNumber(): string {
    const prefix = 'CAP';
    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${random}-${timestamp}`;
  }

  // View Switching
  switchToCreate(): void {
    this.resetForm();
    this.userInfoForm.patchValue({
      trackingNumber: this.generateTrackingNumber()
    });
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

  async deleteInvoice(id: number): Promise<void> {
    const inv = this.invoices.find(i => i.id === id);
    const today = new Date().toISOString().split('T')[0];
    const invoiceDate = inv?.date ? inv.date.split('T')[0] : null;

    if (invoiceDate && invoiceDate !== today) {
      await this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot delete this invoice because the daily report for that day has already been calculated. Only invoices from today can be deleted.',
        confirmText: 'OK'
      });
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to permanently delete this invoice? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    // Check permissions locally (backend also enforces this)
    if (this.currentUserRole !== 'super_admin' && this.currentUserRole !== 'ceo') {
      this.toastService.show('Only Super Admin and CEO can delete invoices.', 'error');
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
      next: (data: any) => {
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
        price: 0, // No longer used for subtotal logic
        amount: 0,
        unitWeight: this.itemForm.value.unitWeight
      };
      this.items.push(newItem);
      this.itemForm.reset({ quantity: 1, description: '', unitWeight: null });
      // Total calculation is now triggered by financialForm
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
    const rate = this.financialForm.get('pricePerKg')?.value || 0;
    let totalCartonSum = 0;
    let totalWeight = 0;
    let totalCustoms = 0;
    let totalPacking = 0;

    this.cartons.controls.forEach(ctrl => {
      const weight = ctrl.get('weight')?.value || 0;
      const customs = ctrl.get('customsCharge')?.value || 0;
      const packing = ctrl.get('packingCharge')?.value || 0;

      totalWeight += weight;
      totalCustoms += customs;
      totalPacking += packing;
      totalCartonSum += (weight * rate);
    });
  // Calculated totals
  // subtotal = 0;
  // totalWeight = 0;
  // customsCharge = 0;
  // billCharge = 0;
  // packingCharge = 0;
  // discount = 0;
  // grandTotal = 0;
    this.subtotal = totalCartonSum; // subtotal now includes per-carton charges
    this.totalWeight = totalWeight;
    this.customsCharge = totalCustoms; // for display
    this.packingCharge = totalPacking; // for display
    this.calculateGrandTotal();
  }

  updateChargesAndTotal(): void {
    this.billCharge = this.chargesForm.value.billCharge || 0;
    this.discount = this.chargesForm.value.discount || 0;
    this.calculateGrandTotal();
  }

  calculateGrandTotal(): void {
    // subtotal already includes all per-carton (weight*rate + customs + packing)
    this.grandTotal = this.subtotal + this.billCharge - this.discount + this.customsCharge + this.packingCharge;
    if (this.grandTotal < 0) {
      this.grandTotal = 0;
    }
  }

  async submitInvoice(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.userInfoForm.invalid || this.financialForm.invalid) {
      this.userInfoForm.markAllAsTouched();
      this.financialForm.markAllAsTouched();
      this.toastService.show('Please fill in all required information.', 'error');
      this.cdr.detectChanges();
      return;
    }

    if (this.items.length === 0) {
      this.toastService.show('Please add at least one item to the invoice.', 'error');
      this.cdr.detectChanges();
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Submit Invoice',
      message: 'Are you sure you want to create this invoice?',
      confirmText: 'Submit',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    const formVal = this.userInfoForm.getRawValue(); // Use getRawValue because trackingNumber is disabled
    const finVal = this.financialForm.getRawValue();
    const description = `To: ${formVal.consigneeName}, By: ${formVal.modeOfDelivery}`;

    const invoiceData = {
      ...formVal,
      ...this.financialForm.getRawValue(),
      ...this.chargesForm.value,
      invoice_number: 'INV-' + Date.now(),
      amount: this.grandTotal,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      description: description,
      tracking_number: formVal.trackingNumber,
      items: this.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitWeight: i.unitWeight
      })),
      subtotal: this.subtotal,
      grandTotal: this.grandTotal,
      totalWeight: this.totalWeight,
      cartons: finVal.cartons || [],
      // Include original charges total in details if needed by backend
      customs_charge_total: this.customsCharge,
      packing_charge_total: this.packingCharge
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
    this.userInfoForm.patchValue({
      senderCountryCode: '+966',
      consigneeCountryCode: '+966'
    });
    this.financialForm.reset({ totalCartons: 1, pricePerKg: 0 });
    while (this.cartons.length !== 0) {
      this.cartons.removeAt(0);
    }
    this.cartons.push(this.createCartonGroup());
    this.itemForm.reset({ quantity: 1, description: '', unitWeight: null });
    this.chargesForm.reset({ billCharge: 0, discount: 0 });
    this.items = [];
    this.itemIdCounter = 1;
    this.subtotal = 0;
    this.totalWeight = 0;
    this.grandTotal = 0;
    this.customsCharge = 0;
    this.packingCharge = 0;
    if (this.phoneSearchInput) {
      this.phoneSearchInput.nativeElement.value = '';
    }
  }

  resetFormBasedOnButton(): void {
    const tracking = this.userInfoForm.get('trackingNumber')?.value;
    this.userInfoForm.reset();
    this.userInfoForm.patchValue({
      trackingNumber: tracking,
      senderCountryCode: '+966',
      consigneeCountryCode: '+966'
    });
    this.financialForm.reset({ totalCartons: 1, pricePerKg: 0 });
    while (this.cartons.length !== 0) {
      this.cartons.removeAt(0);
    }
    this.cartons.push(this.createCartonGroup());
    this.itemForm.reset({ quantity: 1, description: '', unitWeight: null });
    this.chargesForm.reset({ billCharge: 0, discount: 0 });
    this.items = [];
    this.itemIdCounter = 1;
    this.subtotal = 0;
    this.totalWeight = 0;
    this.grandTotal = 0;
    this.customsCharge = 0;
    this.packingCharge = 0;
    if (this.phoneSearchInput) {
      this.phoneSearchInput.nativeElement.value = '';
    }
  }

  printInvoice(): void {
    window.print();
  }
}
