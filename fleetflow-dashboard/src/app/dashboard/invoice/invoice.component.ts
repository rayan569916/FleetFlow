import { Component, OnInit, inject, ChangeDetectorRef, HostListener, ViewChild, ElementRef, signal } from '@angular/core';
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
import { MobileNavComponent } from '../../shared/ui/mobile-nav/mobile-nav.component';


@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe, InvoiceDetailsViewComponent, MobileNavComponent],
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
  isSubmitting = signal(false);
  selectedInvoice: any = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserRole: string | null = null;
  @ViewChild('phoneSearchInput') phoneSearchInput!: ElementRef;
  @ViewChild('itemDescriptionInput') itemDescriptionInput!: ElementRef<HTMLInputElement>;
  @ViewChild('customerNameInput') customerNameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @ViewChild('senderCityInput') senderCityInput!: ElementRef<HTMLInputElement>;
  @ViewChild('zipCodeInput') zipCodeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('locationLinkInput') locationLinkInput!: ElementRef<HTMLInputElement>;
  @ViewChild('consigneeNameInput') consigneeNameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('consigneeMobileInput') consigneeMobileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('consigneeAddressInput') consigneeAddressInput!: ElementRef<HTMLInputElement>;
  @ViewChild('consigneeCityInput') consigneeCityInput!: ElementRef<HTMLInputElement>;
  @ViewChild('senderCodeLookup') senderCodeLookup!: ElementRef<HTMLElement>;
  @ViewChild('consigneeCodeLookup') consigneeCodeLookup!: ElementRef<HTMLElement>;
  @ViewChild('consigneeCountryLookup') consigneeCountryLookup!: ElementRef<HTMLElement>;
  @ViewChild('modeOfDeliveryLookup') modeOfDeliveryLookup!: ElementRef<HTMLElement>;
  @ViewChild('modeOfPaymentLookup') modeOfPaymentLookup!: ElementRef<HTMLElement>;
  @ViewChild('quantityInput') quantityInput!: ElementRef<HTMLInputElement>;
  @ViewChild('unitWeightInput') unitWeightInput!: ElementRef<HTMLInputElement>;
  @ViewChild('totalCartonsInput') totalCartonsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pricePerKgInput') pricePerKgInput!: ElementRef<HTMLInputElement>;
  @ViewChild('discountInput') discountInput!: ElementRef<HTMLInputElement>;
  @ViewChild('advanceInput') advanceInput!: ElementRef<HTMLInputElement>;
  @ViewChild('packingChargesInput') packingChargesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('docChargesInput') docChargesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('otherChargesInput') otherChargesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fuelSurchargeInput') fuelSurchargeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('billChargeInput') billChargeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('addItemButton') addItemButton!: ElementRef<HTMLButtonElement>;

  isMobile = window.innerWidth <= 768;
  isEditMode = false;
  editingInvoiceId: number | null = null;

  // Calculated totals
  subtotal = 0;
  totalWeight = 0;
  customsCharge = 0;
  billCharge = 0;
  packingCharge = 0;
  discount = 0;
  grandTotal = 0;
  invoiceNumber: string = '';
  trackingNumber: string = '';

  // Customer search
  private searchSubject = new Subject<string>();
  foundCustomers: any[] = [];
  showCustomerDropdown = false;
  activeCustomerSuggestionIndex = -1;

  // Item Autocomplete
  private itemSearchSubject = new Subject<string>();
  suggestedItems: CargoItem[] = [];
  showItemDropdown = false;
  activeItemSuggestionIndex = -1;

  // City Autocomplete
  private senderCitySearchSubject = new Subject<string>();
  private consigneeCitySearchSubject = new Subject<string>();
  senderCitySuggestions: string[] = [];
  consigneeCitySuggestions: string[] = [];
  showSenderCityDropdown = false;
  showConsigneeCityDropdown = false;
  activeConsigneeCitySuggestionIndex = -1;
  activeSenderCitySuggestionIndex = -1;
  showSenderCodeDropdown = false;
  showConsigneeCodeDropdown = false;
  showConsigneeCountryDropdown = false;
  activeSenderCodeIndex = -1;
  activeConsigneeCodeIndex = -1;
  activeConsigneeCountryIndex = -1;
  showModeOfDeliveryDropdown = false;
  showModeOfPaymentDropdown = false;
  activeModeOfDeliveryIndex = -1;
  activeModeOfPaymentIndex = -1;
  senderMaxMobileLength = 9;
  consigneeMaxMobileLength = 9;

  // Pagination Signals
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  selectedOfficeId = 0;

  // Dropdown options
  modeOfDeliveryOptions = modeOfDeliveryOptions;
  modeOfPaymentOptions = modeOfPaymentOptions;
  countryOptions: any[] = [];
  saudiMajorCities = [
    'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Sultanah', 'Dammam', 'Taif', 'Tabuk', 'Al Kharj', 'Buraidah',
    'Abha', 'Khamis Mushait', 'Al Hofuf', 'Al Mubarraz', 'Hail', 'Najran', 'Hafar Al-Batin', 'Jubail', 'Al Qatif', 'Al Khobar'
  ];
  saudiCities: string[] = [];
  cityOptions: { [key: string]: string[] } = {};
  countryCodeOptions = [
    { label: 'KSA (+966)', code: '+966', phoneLength: 9 },
    { label: 'UAE (+971)', code: '+971', phoneLength: 9 },
    { label: 'Qatar (+974)', code: '+974', phoneLength: 8 },
    { label: 'Oman (+968)', code: '+968', phoneLength: 8 },
    { label: 'Kuwait (+965)', code: '+965', phoneLength: 8 },
    { label: 'Bahrain (+973)', code: '+973', phoneLength: 8 },
    { label: 'India (+91)', code: '+91', phoneLength: 10 },
    { label: 'Pakistan (+92)', code: '+92', phoneLength: 10 },
    { label: 'Bangladesh (+880)', code: '+880', phoneLength: 10 },
    { label: 'Sri Lanka (+94)', code: '+94', phoneLength: 9 },
    { label: 'Nepal (+977)', code: '+977', phoneLength: 10 },
    { label: 'Philippines (+63)', code: '+63', phoneLength: 10 },
    { label: 'Indonesia (+62)', code: '+62', phoneLength: 10 }
  ];

  // Navigation Map
  fieldSequence = [
    'senderName', 'senderCode', 'phone', 'address', 'city', 'zipCode', 'email', 'locationLink',
    'consigneeName', 'consigneeCode', 'consigneeMobile', 'consigneeAddress', 'consigneeCountry', 'consigneeCity',
    'modeOfDelivery', 'modeOfPayment', 'itemDescription', 'quantity', 'unitWeight', 'addItemButton',
    'totalCartons', 'pricePerKg', 'billCharge', 'discount'
  ];

  authService = inject(AuthService);
  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationDialogService,
    private unitPriceService: UnitPriceService,
    private cargoItemsService: CargoItemsService,
    private uiStateService: UiStateService,
    public settingsService: SettingsService
  ) {
    this.currentUserRole = this.authService.currentUserRole();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadInvoices();
    this.loadCountries();
    this.setupCustomerSearch();
    this.setupItemAutocomplete();
    this.setupCityAutocomplete();

    // Check for pending edit from Report
    const pendingEdit = this.uiStateService.getPendingEdit();
    if (pendingEdit) {
      setTimeout(() => this.onEditInvoice(pendingEdit), 100);
    }
  }

  @HostListener('window:resize')
  onResize(){
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close customer dropdown if click outside
    if (this.showCustomerDropdown && this.phoneSearchInput && !this.phoneSearchInput.nativeElement.contains(event.target)) {
      this.showCustomerDropdown = false;
      this.cdr?.detectChanges();
    }
    // Close item dropdown if click outside
    if (this.showItemDropdown && event.target instanceof HTMLElement && !event.target.closest('.item-autocomplete-input')) {
      this.showItemDropdown = false;
      this.cdr.detectChanges();
    }
    // Close city dropdowns if click outside
    if (this.showSenderCityDropdown && event.target instanceof HTMLElement && !event.target.closest('.sender-city-autocomplete')) {
      this.showSenderCityDropdown = false;
      this.cdr.detectChanges();
    }
    if (this.showConsigneeCityDropdown && event.target instanceof HTMLElement && !event.target.closest('.consignee-city-autocomplete')) {
      this.showConsigneeCityDropdown = false;
      this.cdr.detectChanges();
    }
    // New Lookups
    if (this.showSenderCodeDropdown && event.target instanceof HTMLElement && !event.target.closest('.sender-code-lookup')) {
      this.showSenderCodeDropdown = false;
      this.cdr.detectChanges();
    }
    if (this.showConsigneeCodeDropdown && event.target instanceof HTMLElement && !event.target.closest('.consignee-code-lookup')) {
      this.showConsigneeCodeDropdown = false;
      this.cdr.detectChanges();
    }
    if (this.showConsigneeCountryDropdown && event.target instanceof HTMLElement && !event.target.closest('.consignee-country-lookup')) {
      this.showConsigneeCountryDropdown = false;
      this.cdr.detectChanges();
    }
    if (this.showModeOfDeliveryDropdown && event.target instanceof HTMLElement && !event.target.closest('.mode-of-delivery-lookup')) {
      this.showModeOfDeliveryDropdown = false;
      this.cdr.detectChanges();
    }
    if (this.showModeOfPaymentDropdown && event.target instanceof HTMLElement && !event.target.closest('.mode-of-payment-lookup')) {
      this.showModeOfPaymentDropdown = false;
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
      this.activeCustomerSuggestionIndex = this.foundCustomers.length > 0 ? 0 : -1;
      this.cdr.detectChanges();
    });
  }

  onSearchPhone(event: any): void {
    const input = event.target as HTMLInputElement;
    let phone = (input.value || '').replace(/\D+/g, '');
    phone = phone.replace(/^0+/, '');

    if (input.value !== phone) {
      input.value = phone;
    }

    this.searchSubject.next(phone);
    this.activeCustomerSuggestionIndex = -1;
    // If no match selected, we still update the phone number in our form
    this.userInfoForm.patchValue({ phone: phone }, { emitEvent: false });
  }

  onPhoneSearchKeydown(event: KeyboardEvent): void {
    if (!this.showCustomerDropdown || this.foundCustomers.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.activeCustomerSuggestionIndex =
        (this.activeCustomerSuggestionIndex + 1) % this.foundCustomers.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.activeCustomerSuggestionIndex =
        (this.activeCustomerSuggestionIndex - 1 + this.foundCustomers.length) % this.foundCustomers.length;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const selected =
        this.foundCustomers[this.activeCustomerSuggestionIndex] || this.foundCustomers[0];
      if (selected) {
        this.selectCustomer(selected);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.showCustomerDropdown = false;
      this.activeCustomerSuggestionIndex = -1;
    }
  }

  selectCustomer(customer: any): void {
    this.userInfoForm.patchValue({
      customerName: customer.customerName,
      email: customer.email,
      phone: (customer.phone || '').replace(/^0+/, ''),
      address: customer.address,
      city: customer.city,
      zipCode: customer.zipCode,
      senderCountryCode: customer.senderCountryCode || '+966',
      consigneeName: customer.consigneeName,
      consigneeCountryCode: customer.consigneeCountryCode || '+966',
      consigneeMobile: (customer.consigneeMobile || '').replace(/^0+/, ''),
      consigneeAddress: customer.consigneeAddress,
      consigneeCountry: customer.consigneeCountry,
      consigneeCity: customer.consigneeCity,
    });
    this.showCustomerDropdown = false;
    this.foundCustomers = [];
    if (this.phoneSearchInput) {
      this.phoneSearchInput.nativeElement.value = (customer.phone || '').replace(/^0+/, '');
    }
    this.cdr.detectChanges();
  }

  setupItemAutocomplete(): void {
    this.itemSearchSubject.pipe(
      debounceTime(200),
      switchMap(search => {
        // Show all or top items if search is empty on focus
        return this.cargoItemsService.getCargoItemsList(search || '');
      })
    ).subscribe(res => {
      const searchVal = this.itemForm.get('description')?.value || '';
      this.suggestedItems = (res.items || []).filter((item: any) => item.item_name.toLowerCase() !== searchVal.toLowerCase());
      this.showItemDropdown = this.suggestedItems.length > 0;
      this.activeItemSuggestionIndex = this.suggestedItems.length > 0 ? 0 : -1;
      this.cdr.detectChanges();
    });
  }

  onItemFocus(): void {
    const val = this.itemForm.get('description')?.value || '';
    this.itemSearchSubject.next(val);
  }

  onItemSearch(event: any): void {
    const search = event.target.value;
    this.itemSearchSubject.next(search);
    // Sync the manual value to the form
    this.itemForm.patchValue({ description: search }, { emitEvent: false });
  }

  onItemDescriptionKeydown(event: KeyboardEvent): void {
    if (!this.showItemDropdown || this.suggestedItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.activeItemSuggestionIndex =
        (this.activeItemSuggestionIndex + 1) % this.suggestedItems.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.activeItemSuggestionIndex =
        (this.activeItemSuggestionIndex - 1 + this.suggestedItems.length) % this.suggestedItems.length;
      return;
    }

    if (event.key === 'Enter') {
      if (this.showItemDropdown && this.suggestedItems.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        const selected = this.suggestedItems[this.activeItemSuggestionIndex] || this.suggestedItems[0];
        if (selected) {
          this.selectItem(selected);
        }
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.showItemDropdown = false;
      this.activeItemSuggestionIndex = -1;
    }
  }

  selectItem(item: CargoItem): void {
    this.itemForm.patchValue({
      description: item.item_name
    });
    this.showItemDropdown = false;
    this.activeItemSuggestionIndex = -1;
    this.suggestedItems = [];
    setTimeout(() => this.quantityInput?.nativeElement?.focus());
    this.cdr.detectChanges();
  }

  setupCityAutocomplete(): void {
    // Sender City Search
    this.senderCitySearchSubject.pipe(
      debounceTime(300),
      switchMap(search => {
        return this.unitPriceService.getCities('Saudi Arabia', search);
      })
    ).subscribe(cities => {
      const searchVal = this.userInfoForm.get('city')?.value || '';
      this.senderCitySuggestions = (cities || []).filter(c => c.toLowerCase() !== searchVal.toLowerCase());
      this.showSenderCityDropdown = this.senderCitySuggestions.length > 0;
      this.activeSenderCitySuggestionIndex = this.senderCitySuggestions.length > 0 ? 0 : -1;
      this.cdr.detectChanges();
    });

    // Consignee City Search
    this.consigneeCitySearchSubject.pipe(
      debounceTime(300),
      switchMap(search => {
        const country = this.userInfoForm.get('consigneeCountry')?.value || '';
        if (!country) return of([]);
        return this.unitPriceService.getCities(country, search);
      })
    ).subscribe(cities => {
      const searchVal = this.userInfoForm.get('consigneeCity')?.value || '';
      this.consigneeCitySuggestions = (cities || []).filter(c => c.toLowerCase() !== searchVal.toLowerCase());
      this.showConsigneeCityDropdown = this.consigneeCitySuggestions.length > 0;
      this.activeConsigneeCitySuggestionIndex = this.consigneeCitySuggestions.length > 0 ? 0 : -1;
      this.cdr.detectChanges();
    });
  }

  onCityInput(type: 'sender' | 'consignee', event: any): void {
    const search = event.target.value;
    if (type === 'sender') {
      this.senderCitySearchSubject.next(search);
      this.userInfoForm.patchValue({ city: search }, { emitEvent: false });
    } else {
      this.consigneeCitySearchSubject.next(search);
      this.userInfoForm.patchValue({ consigneeCity: search }, { emitEvent: false });
    }
  }

  onCityFocus(type: 'sender' | 'consignee'): void {
    const currentVal = type === 'sender' ? this.userInfoForm.get('city')?.value : this.userInfoForm.get('consigneeCity')?.value;
    if (type === 'sender') {
      this.senderCitySearchSubject.next(currentVal || '');
    } else {
      this.consigneeCitySearchSubject.next(currentVal || '');
    }
  }

  selectCity(type: 'sender' | 'consignee', city: string): void {
    if (type === 'sender') {
      this.userInfoForm.patchValue({ city });
      this.showSenderCityDropdown = false;
      this.activeSenderCitySuggestionIndex = -1;
      setTimeout(() => this.zipCodeInput?.nativeElement?.focus());
    } else {
      this.userInfoForm.patchValue({ consigneeCity: city });
      this.showConsigneeCityDropdown = false;
      this.activeConsigneeCitySuggestionIndex = -1;
      setTimeout(() => this.modeOfDeliveryLookup?.nativeElement?.focus());
    }
    this.cdr.detectChanges();
  }

  onCityBlur(type: 'sender' | 'consignee'): void {
    // Small delay to allow click on dropdown to trigger first
    setTimeout(() => {
      const controlName = type === 'sender' ? 'city' : 'consigneeCity';
      const val = this.userInfoForm.get(controlName)?.value;
      if (!val) return;

      if (type === 'sender') {
        const isValid = this.saudiCities.some(c => c.toLowerCase() === val.toLowerCase());
        if (!isValid) {
          this.userInfoForm.patchValue({ city: '' });
          this.toastService.show('Please select a valid city from the list', 'warning');
        } else {
          // Sync casing with the lookup
          const matched = this.saudiCities.find(c => c.toLowerCase() === val.toLowerCase());
          if (matched && matched !== val) {
            this.userInfoForm.patchValue({ city: matched });
          }
        }
        this.showSenderCityDropdown = false;
      } else {
        // Consignee city restriction could be added here if needed,
        // but user specifically asked for sender city.
        this.showConsigneeCityDropdown = false;
      }
      this.cdr.detectChanges();
    }, 200);
  }

  onCityKeydown(type: 'sender' | 'consignee', event: KeyboardEvent): void {
    const isDropdownVisible = type === 'sender' ? this.showSenderCityDropdown : this.showConsigneeCityDropdown;
    const suggestions = type === 'sender' ? this.senderCitySuggestions : this.consigneeCitySuggestions;
    let activeIndex = type === 'sender' ? this.activeSenderCitySuggestionIndex : this.activeConsigneeCitySuggestionIndex;

    if (!isDropdownVisible || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      activeIndex = (activeIndex + 1) % suggestions.length;
      if (type === 'sender') this.activeSenderCitySuggestionIndex = activeIndex;
      else this.activeConsigneeCitySuggestionIndex = activeIndex;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      if (type === 'sender') this.activeSenderCitySuggestionIndex = activeIndex;
      else this.activeConsigneeCitySuggestionIndex = activeIndex;
      return;
    }

    if (event.key === 'Enter') {
      if (isDropdownVisible && suggestions.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        const selected = suggestions[activeIndex];
        if (selected) {
          this.selectCity(type, selected);
        }
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (type === 'sender') {
        this.showSenderCityDropdown = false;
        this.activeSenderCitySuggestionIndex = -1;
      } else {
        this.showConsigneeCityDropdown = false;
        this.activeConsigneeCitySuggestionIndex = -1;
      }
    }
  }


  onPhoneInput(controlName: 'phone' | 'consigneeMobile', event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove non-digits and leading zeros
    let value = (input.value || '').replace(/\D+/g, '');
    value = value.replace(/^0+/, '');

    if (input.value !== value) {
      input.value = value;
    }
    this.userInfoForm.patchValue({ [controlName]: value }, { emitEvent: false });
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

    // Fetch Saudi Cities for restriction
    this.unitPriceService.getCities('Saudi Arabia', '').subscribe(cities => {
      this.saudiCities = cities || [];
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
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      email: [''],
      senderCountryCode: ['+966', Validators.required],
      phone: ['', [Validators.required, (control: any) => {
        const pattern = new RegExp('^[1-9]\\d{' + (this.senderMaxMobileLength - 1) + '}$');
        return pattern.test(control.value) ? null : { pattern: true };
      }]],
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
      consigneeMobile: ['', [Validators.required, (control: any) => {
        const pattern = new RegExp('^[1-9]\\d{' + (this.consigneeMaxMobileLength - 1) + '}$');
        return pattern.test(control.value) ? null : { pattern: true };
      }]],
      consigneeAddress: ['', [Validators.required, Validators.minLength(5)]],
      consigneeCountry: ['', Validators.required],
      consigneeCity: ['', Validators.required]
    });

    // Item Form
    this.itemForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitWeight: [null, [Validators.pattern(/^\d*\.?\d*$/)]] // Optional decimal
    });

    // Financial Details Form (Refactored)
    this.financialForm = this.fb.group({
      totalCartons: [1, [Validators.required, Validators.min(1)]],
      pricePerKg: [0, [Validators.required, Validators.min(0.01)]],
      cartons: this.fb.array([this.createCartonGroup()])
    });

    // Watch totalCartons to dynamically sync FormArray
    this.financialForm.get('totalCartons')?.valueChanges.subscribe(val => {
      this.syncCartons(+val || 1);
      this.cdr.detectChanges();
    });

    // Charges Form (Removed individual charges that are now per-carton)
    this.chargesForm = this.fb.group({
      billCharge: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.required, Validators.min(0)]]
    });

    this.userInfoForm.get('consigneeCountry')?.valueChanges.subscribe(() => {
      this.updateAutoPrice();
      // Clear consignee city when country changes
      this.userInfoForm.patchValue({ consigneeCity: '' }, { emitEvent: false });
      this.consigneeCitySuggestions = [];
      this.showConsigneeCityDropdown = false;
    });
    this.userInfoForm.get('modeOfDelivery')?.valueChanges.subscribe(() => this.updateAutoPrice());

    // Listen to changes for auto-calculation
    this.financialForm.valueChanges.subscribe(() => {
      this.calculateTotals();
      this.cdr.detectChanges();
    });

    this.chargesForm.valueChanges.subscribe(() => {
      this.updateChargesAndTotal();
      this.cdr.detectChanges();
    });
  }

  get cartons(): FormArray {
    return this.financialForm.get('cartons') as FormArray;
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
    const prefix = 'TRK';
    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${random}-${timestamp}`;
  }

  generateInvoiceNumber(): string {
    const prefix = 'CAP';
    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${random}-${timestamp}`;
  }

  // View Switching
  switchToCreate(): void {
    this.resetForm();
    this.isEditMode = false;
    this.editingInvoiceId = null;
    this.invoiceNumber = this.generateInvoiceNumber();
    this.trackingNumber = this.generateTrackingNumber();
    this.viewMode = 'create';
    this.errorMessage = null;
    this.successMessage = null;
  }

  onEditInvoice(invoice: any): void {
    const today = new Date().toISOString().split('T')[0];
    const invoiceDate = invoice?.date ? invoice.date.split('T')[0] : null;

    if (invoiceDate && invoiceDate !== today) {
      this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot edit this invoice because the daily report for that day has already been calculated. Only invoices from today can be edited.',
        confirmText: 'OK'
      });
      return;
    }

    this.isEditMode = true;
    this.editingInvoiceId = invoice.id;
    this.isLoading = true;

    this.invoiceService.getInvoiceById(invoice.id).subscribe({
      next: (data: any) => {
        this.resetForm();
        this.isEditMode = true;
        this.editingInvoiceId = data.id;
        this.invoiceNumber = data.invoice_number;
        this.trackingNumber = data.tracking_number;

        const details = data.invoice_details || {};

        // Patch User Info
        this.userInfoForm.patchValue({
          customerName: details.customerName,
          email: details.email,
          senderCountryCode: details.senderCountryCode || '+966',
          phone: details.phone,
          address: details.address,
          city: details.city,
          zipCode: details.zipCode,
          locationLink: details.locationLink,
          modeOfDelivery: details.modeOfDelivery,
          modeOfPayment: details.modeOfPayment,
          consigneeName: details.consigneeName,
          consigneeCountryCode: details.consigneeCountryCode || '+966',
          consigneeMobile: details.consigneeMobile,
          consigneeAddress: details.consigneeAddress,
          consigneeCountry: details.consigneeCountry,
          consigneeCity: details.consigneeCity
        });

        if (this.phoneSearchInput) {
          this.phoneSearchInput.nativeElement.value = details.phone || '';
        }

        // Patch Items
        this.items = (details.items || []).map((item: any) => ({
          id: this.itemIdCounter++,
          description: item.description,
          quantity: item.quantity,
          unitWeight: item.unitWeight,
          amount: 0,
          price: 0
        }));

        // Patch Financial Details
        let cartons = details.cartons || [];
        if (typeof cartons === 'string') {
          try { cartons = JSON.parse(cartons); } catch (e) { cartons = []; }
        }

        this.financialForm.patchValue({
          totalCartons: details.totalCartons || cartons.length || 1,
          pricePerKg: details.pricePerKg || 0
        });

        // Clear and rebuild cartons FormArray
        while (this.cartons.length !== 0) {
          this.cartons.removeAt(0);
        }
        if (cartons.length > 0) {
          cartons.forEach((c: any) => {
            this.cartons.push(this.fb.group({
              weight: [c.weight || 0, [Validators.required, Validators.min(0.01)]],
              customsCharge: [c.customsCharge || 0, [Validators.required, Validators.min(0)]],
              packingCharge: [c.packingCharge || 0, [Validators.required, Validators.min(0)]]
            }));
          });
        } else {
          this.cartons.push(this.createCartonGroup());
        }

        // Patch Charges
        this.chargesForm.patchValue({
          billCharge: details.billCharge || 0,
          discount: details.discount || 0
        });

        this.viewMode = 'create';
        this.isLoading = false;
        this.calculateTotals();
        this.cdr?.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching invoice for edit', err);
        this.toastService.show('Failed to load invoice details for editing.', 'error');
        this.isLoading = false;
        this.cdr?.detectChanges();
      }
    });
  }

  async switchToList(): Promise<void> {
    if (this.viewMode === 'create') {
      const hasUnsavedChanges = this.isEditMode
        || this.userInfoForm?.dirty
        || this.itemForm?.dirty
        || this.financialForm?.dirty
        || this.chargesForm?.dirty
        || this.items.length > 0;

      if (hasUnsavedChanges) {
        const confirmed = await this.confirmationService.confirm({
          title: 'Unsaved Changes',
          message: 'You have an unsaved invoice. Go back to list and discard changes?',
          confirmText: 'Leave',
          cancelText: 'Stay'
        });
        if (!confirmed) return;
      }
    }

    this.viewMode = 'list';
    this.errorMessage = null;
    this.successMessage = null;
    this.selectedInvoice = null;
    this.loadInvoices();
  }

  // API Actions
  loadInvoices(officeId?: number): void {
    if (officeId !== undefined) {
      this.selectedOfficeId = officeId;
    }
    this.isLoading = true;

    const params: any = {
      page: this.currentPage,
      per_page: this.pageSize
    };
    if (this.selectedOfficeId) params.office_id = this.selectedOfficeId;

    this.invoiceService.getInvoices(params)
      .pipe(
        timeout(10000), // 10 second timeout
        finalize(() => {
          this.isLoading = false;
          this.cdr?.detectChanges();
        })
      )
      .subscribe({
        next: (data: any) => {
          if (data.items) {
            this.invoices = data.items;
            this.totalItems = data.total;
            this.totalPages = data.pages;
          } else {
            this.invoices = data.invoices || [];
            this.totalItems = this.invoices.length;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          }
        },
        error: (error) => {
          console.error('Error fetching invoices:', error);
          this.toastService.show('Failed to load invoices. Server may be unresponsive.', 'error');
        }
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadInvoices();
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadInvoices();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadInvoices();
    }
  }

  async deleteInvoice(id: number): Promise<void> {
    if (!id) return;
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
    if (this.currentUserRole !== 'Super_admin' && this.currentUserRole !== 'management') {
      this.toastService.show('Only Super Admin and Management can delete invoices.', 'error');
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
        this.cdr?.detectChanges();
      }
    });
  }

  viewInvoice(id: number): void {
    if (!id) {
      console.warn('viewInvoice called with undefined ID');
      return;
    }
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
        this.cdr?.detectChanges();
      },
      error: (err) => {
        console.error('Error loading invoice details', err);
        this.toastService.show('Failed to load invoice details.', 'error');
        this.isLoading = false;
        this.cdr?.detectChanges();
      }
    });
  }

  updateInvoiceStatus(id: number, event: any): void {
    if (!id) return;
    const newStatus = event.target.value;
    this.invoiceService.updateStatus(id, newStatus).subscribe({
      next: () => {
        this.toastService.show('Invoice status updated!', 'success');
        // Update local list if in list mode
        const inv = this.invoices.find(i => i.id === id);
        if (inv) inv.status = newStatus;
        this.cdr?.detectChanges();
      },
      error: (err) => {
        console.error('Error updating status', err);
        this.toastService.show('Failed to update status.', 'error');
        // Revert change in UI if possible, or just reload
        this.loadInvoices();
      }
    });
  }

  addItem(refocusDescription = false): void {
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
      this.itemForm.markAsPristine();

      if (refocusDescription && this.itemDescriptionInput?.nativeElement) {
        setTimeout(() => {
          this.itemDescriptionInput.nativeElement.focus();
        }, 0);
      }
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
    const rate = +(this.financialForm.get('pricePerKg')?.value || 0);
    let totalCartonSum = 0;
    let totalWeight = 0;
    let totalCustoms = 0;
    let totalPacking = 0;

    this.cartons.controls.forEach(ctrl => {
      const weight = +(ctrl.get('weight')?.value || 0);
      const customs = +(ctrl.get('customsCharge')?.value || 0);
      const packing = +(ctrl.get('packingCharge')?.value || 0);

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
    this.billCharge = +(this.chargesForm.value.billCharge || 0);
    this.discount = +(this.chargesForm.value.discount || 0);
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

    if (this.isSubmitting()) return;

    if (this.userInfoForm.invalid || this.financialForm.invalid) {
      this.userInfoForm.markAllAsTouched();
      this.financialForm.markAllAsTouched();
      const message = this.buildValidationMessage();
      this.toastService.show(message, 'error');
      this.scrollToFirstInvalidField();
      this.cdr.detectChanges();
      return;
    }

    if (this.items.length === 0) {
      this.toastService.show('Add at least one item in Add Items section before submitting.', 'error');
      this.scrollToItemsSection();
      this.cdr?.detectChanges();
      return;
    }

    const isConfirmed = await this.confirmationService.confirm({
      title: this.isEditMode ? 'Update Invoice' : 'Submit Invoice',
      message: this.isEditMode ? 'Are you sure you want to update this invoice?' : 'Are you sure you want to create this invoice?',
      confirmText: this.isEditMode ? 'Update' : 'Submit',
      cancelText: 'Cancel'
    });

    if (!isConfirmed) return;

    const formVal = this.userInfoForm.getRawValue(); // Use getRawValue because trackingNumber is disabled
    const finVal = this.financialForm.getRawValue();
    const description = `To: ${formVal.consigneeName}, By: ${formVal.modeOfDelivery}`;

    const invoiceData = {
      ...formVal,
      ...this.financialForm.getRawValue(),
      ...this.chargesForm.value,
      invoice_number: this.invoiceNumber,
      amount: this.grandTotal,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      description: description,
      tracking_number: this.trackingNumber,
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

    this.isSubmitting.set(true);
    this.isLoading = true;
    const request = this.isEditMode
      ? this.invoiceService.updateInvoice(this.editingInvoiceId!, invoiceData)
      : this.invoiceService.createInvoice(invoiceData);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isLoading = false;
        this.viewMode = 'list';
        this.toastService.show(`Invoice ${this.isEditMode ? 'updated' : 'created'} successfully!`, 'success');
        this.loadInvoices();
        this.cdr?.detectChanges();
      },
      error: (error) => {
        console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} invoice:`, error);
        const msg = error.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} invoice. Please try again.`;
        this.toastService.show(msg, 'error');
        this.isSubmitting.set(false);
        this.isLoading = false;
        this.cdr?.detectChanges();
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
    this.invoiceNumber = '';
    this.trackingNumber = '';
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
    const tracking = this.trackingNumber;
    this.userInfoForm.reset();
    this.trackingNumber = tracking;
    this.userInfoForm.patchValue({
      senderCountryCode: '+966',
      consigneeCountryCode: '+966'
    });
    // Note: invoiceNumber is NOT reset here because it should persist 
    // for the "Generate New" but keep same data flow if that was the intent,
    // though usually resetFormBasedOnButton is for keeping partial data.
    // However, for a fresh invoice number, we rely on switchToCreate calling resetForm.
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

  printInvoice() {
    const printableArea = document.getElementById('printable-area');
    if (!printableArea) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      // Fallback if popup is blocked
      window.print();
      return;
    }

    const content = printableArea.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: white;
              color: #000;
              padding: 20px;
            }
            .text-3xl { font-size: 1.875rem; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1.125rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .items-start { align-items: flex-start; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
            .gap-8 { gap: 2rem; }
            .gap-4 { gap: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-12 { margin-top: 3rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .ml-2 { margin-left: 0.5rem; }
            .p-8 { padding: 2rem; }
            .p-4 { padding: 1rem; }
            .pt-8 { padding-top: 2rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-b-2 { border-bottom: 2px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border { border: 1px solid #e5e7eb; }
            .border-gray-100 { border-color: #f3f4f6; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded-lg { border-radius: 0.5rem; }
            .shadow-lg { box-shadow: none; }
            .overflow-hidden { overflow: hidden; }
            .w-full { width: 100%; }
            .w-72 { width: 18rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .italic { font-style: italic; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-white { background-color: #ffffff; }
            /* All text explicitly black */
            p, span, div, td, th, h1, h2, h3, h4, h5, h6, b {
              color: #000000 !important;
            }
            .text-yellow-600 { color: #d97706 !important; }
            .text-green-600 { color: #16a34a !important; }
            .text-red-600 { color: #dc2626 !important; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  private buildValidationMessage(): string {
    const issues: string[] = [];

    if (this.userInfoForm.get('phone')?.invalid) {
      issues.push('Sender mobile must be digits only (6 to 14 numbers).');
    }
    if (this.userInfoForm.get('consigneeMobile')?.invalid) {
      issues.push('Receiver mobile must be digits only (6 to 14 numbers).');
    }
    if (this.userInfoForm.get('modeOfDelivery')?.invalid) {
      issues.push('Select mode of delivery.');
    }
    if (this.userInfoForm.get('modeOfPayment')?.invalid) {
      issues.push('Select mode of payment.');
    }
    if (this.financialForm.get('totalCartons')?.invalid) {
      issues.push('Total cartons must be at least 1.');
    }
    if (this.financialForm.get('pricePerKg')?.invalid) {
      issues.push('Price per Kg must be greater than 0.');
    }
    if (this.cartons.controls.some((c) => c.invalid)) {
      issues.push('Complete all carton fields: weight, customs charge, and packing charge.');
    }

    if (issues.length === 0) {
      return 'Please complete all required fields in Invoice Information and Billing Details.';
    }
    return issues.slice(0, 3).join(' ');
  }

  private scrollToFirstInvalidField(): void {
    setTimeout(() => {
      const firstInvalid = document.querySelector(
        '.invoice-container .ng-invalid[formcontrolname], .invoice-container input.ng-invalid, .invoice-container select.ng-invalid, .invoice-container textarea.ng-invalid'
      ) as HTMLElement | null;

      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
    }, 0);
  }

  private scrollToItemsSection(): void {
    setTimeout(() => {
      const section = document.querySelector('.items-section') as HTMLElement | null;
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  // Code and Country Lookups
  toggleLookup(type: 'senderCode' | 'consigneeCode' | 'consigneeCountry' | 'modeOfDelivery' | 'modeOfPayment'): void {
    if (type === 'senderCode') {
      this.showSenderCodeDropdown = !this.showSenderCodeDropdown;
      if (this.showSenderCodeDropdown) this.activeSenderCodeIndex = 0;
    } else if (type === 'consigneeCode') {
      this.showConsigneeCodeDropdown = !this.showConsigneeCodeDropdown;
      if (this.showConsigneeCodeDropdown) this.activeConsigneeCodeIndex = 0;
    } else if (type === 'consigneeCountry') {
      this.showConsigneeCountryDropdown = !this.showConsigneeCountryDropdown;
      if (this.showConsigneeCountryDropdown) this.activeConsigneeCountryIndex = 0;
    } else if (type === 'modeOfDelivery') {
      this.showModeOfDeliveryDropdown = !this.showModeOfDeliveryDropdown;
      if (this.showModeOfDeliveryDropdown) this.activeModeOfDeliveryIndex = 0;
    } else if (type === 'modeOfPayment') {
      this.showModeOfPaymentDropdown = !this.showModeOfPaymentDropdown;
      if (this.showModeOfPaymentDropdown) this.activeModeOfPaymentIndex = 0;
    }
    this.cdr.detectChanges();
  }

  selectLookupOption(type: 'senderCode' | 'consigneeCode' | 'consigneeCountry' | 'modeOfDelivery' | 'modeOfPayment', option: any): void {
    if (type === 'senderCode') {
      this.userInfoForm.patchValue({ senderCountryCode: option.code });
      this.showSenderCodeDropdown = false;
      this.maxLength(option.code, 'senderCode');
      setTimeout(() => this.phoneInput?.nativeElement?.focus());
    } else if (type === 'consigneeCode') {
      this.userInfoForm.patchValue({ consigneeCountryCode: option.code });
      this.showConsigneeCodeDropdown = false;
      this.maxLength(option.code, 'consigneeCode');
      setTimeout(() => this.consigneeMobileInput?.nativeElement?.focus());
    } else if (type === 'consigneeCountry') {
      this.userInfoForm.patchValue({ consigneeCountry: option });
      this.showConsigneeCountryDropdown = false;
      setTimeout(() => {
        if (this.consigneeCityInput) {
          this.consigneeCityInput.nativeElement.focus();
        }
      });
    } else if (type === 'modeOfDelivery') {
      this.userInfoForm.patchValue({ modeOfDelivery: option.value });
      this.showModeOfDeliveryDropdown = false;
      setTimeout(() => this.modeOfPaymentLookup?.nativeElement?.focus());
    } else if (type === 'modeOfPayment') {
      this.userInfoForm.patchValue({ modeOfPayment: option.value });
      this.showModeOfPaymentDropdown = false;
      setTimeout(() => {
        if (this.itemDescriptionInput) {
          this.itemDescriptionInput.nativeElement.focus();
        }
      });
    }
    this.cdr.detectChanges();
  }

  onLookupKeydown(type: 'senderCode' | 'consigneeCode' | 'consigneeCountry' | 'modeOfDelivery' | 'modeOfPayment', event: KeyboardEvent): void {
    const isVisible = type === 'senderCode' ? this.showSenderCodeDropdown :
      type === 'consigneeCode' ? this.showConsigneeCodeDropdown :
        type === 'consigneeCountry' ? this.showConsigneeCountryDropdown :
          type === 'modeOfDelivery' ? this.showModeOfDeliveryDropdown :
            this.showModeOfPaymentDropdown;

    const options = type === 'consigneeCountry' ? this.countryOptions :
      type === 'modeOfDelivery' ? this.modeOfDeliveryOptions :
        type === 'modeOfPayment' ? this.modeOfPaymentOptions :
          this.countryCodeOptions;

    let index = type === 'senderCode' ? this.activeSenderCodeIndex :
      type === 'consigneeCode' ? this.activeConsigneeCodeIndex :
        type === 'consigneeCountry' ? this.activeConsigneeCountryIndex :
          type === 'modeOfDelivery' ? this.activeModeOfDeliveryIndex :
            this.activeModeOfPaymentIndex;

    if (!isVisible) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        this.toggleLookup(type);
      } else if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
        // Quick search for character
        const char = event.key.toLowerCase();
        const found = options.find((opt: any) => {
          const label = typeof opt === 'string' ? opt : (opt.label || opt.code || '');
          return label.toLowerCase().startsWith(char);
        });
        if (found) {
          this.selectLookupOption(type, found);
          event.preventDefault();
        }
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      index = (index + 1) % options.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      index = (index - 1 + options.length) % options.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectLookupOption(type, options[index]);
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (type === 'senderCode') this.showSenderCodeDropdown = false;
      else if (type === 'consigneeCode') this.showConsigneeCodeDropdown = false;
      else if (type === 'consigneeCountry') this.showConsigneeCountryDropdown = false;
      else if (type === 'modeOfDelivery') this.showModeOfDeliveryDropdown = false;
      else if (type === 'modeOfPayment') this.showModeOfPaymentDropdown = false;
    }

    if (type === 'senderCode') this.activeSenderCodeIndex = index;
    else if (type === 'consigneeCode') this.activeConsigneeCodeIndex = index;
    else if (type === 'consigneeCountry') this.activeConsigneeCountryIndex = index;
    else if (type === 'modeOfDelivery') this.activeModeOfDeliveryIndex = index;
    else if (type === 'modeOfPayment') this.activeModeOfPaymentIndex = index;
    this.cdr.detectChanges();
  }

  async canDeactivate(): Promise<boolean> {
    if (this.viewMode !== 'create') return true;

    const hasUnsavedChanges = this.isEditMode
      || this.userInfoForm?.dirty
      || this.itemForm?.dirty
      || this.financialForm?.dirty
      || this.chargesForm?.dirty
      || this.items.length > 0;

    if (!hasUnsavedChanges) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have an unsaved invoice. Leave this page and discard changes?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }

  maxLength(code: any, type: string) {
    const country = this.countryCodeOptions.find((c: any) => c.code === code);
    const length = country?.phoneLength || 9;
    if (type === 'senderCode') {
      this.senderMaxMobileLength = length;
      this.userInfoForm.get('phone')?.updateValueAndValidity();
    } else if (type === 'consigneeCode') {
      this.consigneeMaxMobileLength = length;
      this.userInfoForm.get('consigneeMobile')?.updateValueAndValidity();
    }
  }

  onNumberInputKeydown(event: KeyboardEvent): void {
    const isControlKey = ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'End', 'Home'].includes(event.key);
    const isNumber = /[0-9]/.test(event.key);
    const isDecimal = event.key === '.' && !(event.target as HTMLInputElement).value.includes('.');

    if (!isControlKey && !isNumber && !isDecimal) {
      event.preventDefault();
    }
  }

  onGeneralKeydown(event: KeyboardEvent, currentField: string): void {
    // If it's a lookup field and dropdown is visible, don't intercept navigation
    const isLookup = ['senderCode', 'consigneeCode', 'consigneeCountry', 'modeOfDelivery', 'modeOfPayment'].includes(currentField);
    if (isLookup) {
      const isVisible = currentField === 'senderCode' ? this.showSenderCodeDropdown :
        currentField === 'consigneeCode' ? this.showConsigneeCodeDropdown :
          currentField === 'consigneeCountry' ? this.showConsigneeCountryDropdown :
            currentField === 'modeOfDelivery' ? this.showModeOfDeliveryDropdown :
              this.showModeOfPaymentDropdown;
      if (isVisible) return;
    }

    // Similar for City and Item Autocomplete
    if (currentField === 'city' && this.showSenderCityDropdown) return;
    if (currentField === 'consigneeCity' && this.showConsigneeCityDropdown) return;
    if (currentField === 'itemDescription' && this.showItemDropdown) return;

    if (event.key === 'Enter' || event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const isEnter = event.key === 'Enter';
      const isRight = event.key === 'ArrowRight';
      const isLeft = event.key === 'ArrowLeft';

      // For normal inputs, only navigate on Arrow keys if cursor is at bounds OR if it's a lookup div
      const target = event.target as HTMLInputElement;
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      const isAtEnd = target.selectionStart === target.value?.length && target.selectionEnd === target.value?.length;

      if (isEnter || (isRight && (isAtEnd || isLookup)) || (isLeft && (isAtStart || isLookup))) {
        // For the Add button, let the default Enter behavior trigger its own (keydown.enter) handler
        // which calls addItem(true), refocusing the description automatically.
        if (currentField === 'addItemButton' && isEnter) return;

        event.preventDefault();

        // Handle Carton Navigation
        if (currentField === 'pricePerKg' && (isEnter || isRight)) {
          this.focusField('cartonWeight_0');
          return;
        }

        if (currentField === 'billCharge' && isLeft) {
          const lastIndex = this.cartons.length - 1;
          this.focusField('cartonPacking_' + lastIndex);
          return;
        }

        if (currentField.startsWith('carton')) {
          const parts = currentField.split('_');
          const fieldType = parts[0];
          const index = parseInt(parts[1]);

          if (isEnter || isRight) {
            if (fieldType === 'cartonWeight') {
              this.focusField('cartonCustoms_' + index);
            } else if (fieldType === 'cartonCustoms') {
              this.focusField('cartonPacking_' + index);
            } else if (fieldType === 'cartonPacking') {
              if (index < this.cartons.length - 1) {
                this.focusField('cartonWeight_' + (index + 1));
              } else {
                this.focusField('billCharge');
              }
            }
          } else if (isLeft) {
            if (fieldType === 'cartonWeight') {
              if (index > 0) {
                this.focusField('cartonPacking_' + (index - 1));
              } else {
                this.focusField('pricePerKg');
              }
            } else if (fieldType === 'cartonCustoms') {
              this.focusField('cartonWeight_' + index);
            } else if (fieldType === 'cartonPacking') {
              this.focusField('cartonCustoms_' + index);
            }
          }
          return;
        }

        const currentIndex = this.fieldSequence.indexOf(currentField);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (isEnter || isRight) {
          nextIndex = (currentIndex + 1) % this.fieldSequence.length;
        } else if (isLeft) {
          nextIndex = (currentIndex - 1 + this.fieldSequence.length) % this.fieldSequence.length;
        }

        const nextField = this.fieldSequence[nextIndex];
        this.focusField(nextField);
      }
    }
  }

  private focusField(field: string): void {
    const fieldMap: { [key: string]: ElementRef | undefined } = {
      'senderName': this.customerNameInput,
      'senderCode': this.senderCodeLookup,
      'phone': this.phoneInput,
      'address': this.addressInput,
      'city': this.senderCityInput,
      'zipCode': this.zipCodeInput,
      'email': this.emailInput,
      'locationLink': this.locationLinkInput,
      'consigneeName': this.consigneeNameInput,
      'consigneeCode': this.consigneeCodeLookup,
      'consigneeMobile': this.consigneeMobileInput,
      'consigneeAddress': this.consigneeAddressInput,
      'consigneeCountry': this.consigneeCountryLookup,
      'consigneeCity': this.consigneeCityInput,
      'modeOfDelivery': this.modeOfDeliveryLookup,
      'modeOfPayment': this.modeOfPaymentLookup,
      'itemDescription': this.itemDescriptionInput,
      'quantity': this.quantityInput,
      'unitWeight': this.unitWeightInput,
      'addItemButton': this.addItemButton,
      'totalCartons': this.totalCartonsInput,
      'pricePerKg': this.pricePerKgInput,
      'billCharge': this.billChargeInput,
      'discount': this.discountInput
    };

    const target = fieldMap[field];
    if (target) {
      target.nativeElement.focus();
    } else if (field.startsWith('carton')) {
      // Dynamic focus for carton fields using ID
      const element = document.getElementById(field);
      if (element) {
        element.focus();
      }
    }
  }
}
