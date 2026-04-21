import { ChangeDetectorRef, Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { UnitPriceService } from '../../services/unit-price.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastService } from '../../services/toast.service';

import * as XLSX from 'xlsx-js-style';
@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shipments.component.html',
  styleUrl: './shipments.component.css'
})
export class ShipmentsComponent implements OnInit {
  private dashboardDataService = inject(DashboardDataService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private unitPriceService = inject(UnitPriceService);

  invoices = signal<any[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  perPage = 50;

  // Filters
  filterStatus = signal<string>('all'); // 'all', 'unassigned', 'current_shop', 'moved'
  filterContainerNumber = signal<string>('');
  filterDestinationCountry = signal<string>('');
  filterLoadingDate = signal<string>('');
  filterContainerDate = signal<string>('');

  shipmentStatusOptions: string[] = [];
  showManualStatusDropdown = false;
  activeManualStatusIndex = -1;

  selectedInvoiceIds: number[] = [];

  // Modals state
  isCreateGroupModalOpen = false;
  isExternalTrackingModalOpen = false;
  isManualEventModalOpen = false;
  isContainerModalOpen = false;
  isBulkStatusModalOpen = false;
  submitting = false;

  // Location Autocomplete for manual events
  locationSuggestions = signal<{id: number, name: string}[]>([]);
  isFetchingLocations = signal(false);
  activeLocationIndex = -1;
  private locationSearchSubject = new Subject<string>();

  countryOptions: any[] = [];

  // Forms
  containerForm = this.fb.group({
    container_number: ['', Validators.required],
    container_date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  bulkStatusForm = this.fb.group({
    status: ['', Validators.required],
    location_name: ['', Validators.required],
  });

  createGroupForm = this.fb.group({
    group_code: [{ value: '', disabled: true }, Validators.required],
    origin: ['', Validators.required],
    destination: ['', Validators.required],
    loading_date: [new Date().toISOString().split('T')[0], Validators.required],
    status: ['Arrived at Origin Facility', Validators.required]
  });

  externalTrackingForm = this.fb.group({
    invoice_id: [null as string | null],
    external_tracking_number: [''],
    external_tracking_link: ['']
  });
  externalTrackingInvoiceNumber = '';

  manualEventForm = this.fb.group({
    tracking_number: ['', Validators.required],
    status: ['', Validators.required],
    location_name: ['', Validators.required],
    location_id: [null as number | null],
    notes: ['']
  });
  manualEventInvoiceNumber = '';

  // Mode-specific status sequences
  seaStatusOrder = [
    'Shipment Picked Up', 'In Shop', 'Arrived at Origin Facility', 'Departed to Origin Warehouse',
    'Container Loading in Progress', 'Container Loading Completed', 'Port Handling Completed',
    'Under Customs Inspection', 'Customs Inspection Completed', 'Loaded on Vessel',
    'Departed Origin Country', 'Arrived at Destination Port', 'Customs Clearance',
    'Customs Cleared – Transferred to Warehouse', 'In Transit to Destination Hub',
    'Arrived at Destination Hub', 'Out for Delivery', 'Delivered'
  ];

  airStatusOrder = [
    'Shipment Picked Up', 'In Shop', 'Arrived at Origin Facility', 'Booking done',
    'Departed Origin Country', 'Arrived at Destination Port', 'Customs Clearance',
    'Customs Cleared – Transferred to Warehouse', 'In Transit to Destination Hub',
    'Arrived at Destination Hub', 'Out for Delivery', 'Delivered'
  ];

  activeBulkMode: 'Sea' | 'Air' | null = null;

  // Container context
  containerTarget: 'single' | 'bulk' = 'single';
  containerTargetInvoice: any = null;
  Math = Math;

  ngOnInit() {
    this.loadLoadingList();
    this.loadShipmentStatuses();
    this.loadCountries();

    this.locationSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim() === '') {
        this.locationSuggestions.set([]);
        return;
      }
      this.isFetchingLocations.set(true);
      // Let's assume global shipments or defaulting to Saudi Arabia for this app's main use case
      this.unitPriceService.getCitiesWithIds('', query).subscribe({
        next: (cities) => {
          this.locationSuggestions.set(cities);
          this.isFetchingLocations.set(false);
        },
        error: () => {
          this.isFetchingLocations.set(false);
        }
      });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.manual-status-lookup')) {
      this.showManualStatusDropdown = false;
      this.cdr.detectChanges();
    }
  }

  clearFilters() {
    this.filterStatus.set('all');
    this.filterContainerNumber.set('');
    this.filterDestinationCountry.set('');
    this.filterLoadingDate.set('');
    this.filterContainerDate.set('');
    this.loadLoadingList();
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
    })
  }

  checkBulkModeStatus() {
    const selectedInvoices = this.invoices().filter(inv => this.selectedInvoiceIds.includes(inv.id));
    return selectedInvoices.every(inv => inv.mode_of_delivery === 'sea' || inv.mode_of_delivery === 'water');
  }

  checkIfGroupCreated() {
    const selectedInvoices = this.invoices().filter(inv => this.selectedInvoiceIds.includes(inv.id))
    return selectedInvoices.every(inv => !inv.loading_date);
  }

  loadLoadingList(page: number = 1) {
    this.loading.set(true);
    let params: any = { page, per_page: this.perPage };

    if (this.filterStatus() !== 'all') {
      params['filter_status'] = this.filterStatus();
    }
    if (this.filterContainerNumber()) {
      params['container_number'] = this.filterContainerNumber();
    }
    if (this.filterDestinationCountry()) {
      params['destination_country'] = this.filterDestinationCountry();
    }
    if (this.filterLoadingDate()) {
      params['loading_date'] = this.filterLoadingDate();
    }
    if (this.filterContainerDate()) {
      params['container_date'] = this.filterContainerDate();
    }

    this.dashboardDataService.getLoadingList(params).subscribe({
      next: (res) => {
        if (res && res.items) {
          this.invoices.set(res.items);
          this.currentPage.set(res.page || 1);
          this.totalPages.set(res.pages || 1);
          this.totalItems.set(res.total || 0);
        } else if (Array.isArray(res)) {
          this.invoices.set(res);
          this.totalPages.set(1);
          this.totalItems.set(res.length);
        }
        // clear selection on reload
        this.selectedInvoiceIds = [];
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading list', err);
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.loadLoadingList(1);
  }

  toggleSelection(id: number) {
    const idx = this.selectedInvoiceIds.indexOf(id);
    if (idx > -1) {
      this.selectedInvoiceIds.splice(idx, 1);
    } else {
      this.selectedInvoiceIds.push(id);
    }
  }

  selectAll(event: any) {
    if (event.target.checked) {
      this.selectedInvoiceIds = this.invoices().map(inv => inv.id);
    } else {
      this.selectedInvoiceIds = [];
    }
  }

  // --- Modals ---
  openCreateGroupModal() {
    if (this.selectedInvoiceIds.length === 0) {
      this.toastService.show('Please select at least one invoice to group.', 'error');
      return;
    }

    const mode = this.validateSelectionMode();
    if (!mode) {
      this.toastService.show('Selected items must have the same delivery mode (Sea/Air).', 'error');
      return;
    }

    this.createGroupForm.reset({
      group_code: this.generateGroupCode(),
      origin: '',
      destination: '',
      loading_date: new Date().toISOString().split('T')[0],
      status: mode === 'Sea' ? this.seaStatusOrder[0] : this.airStatusOrder[0]
    });
    this.isCreateGroupModalOpen = true;
  }
  closeCreateGroupModal() { this.isCreateGroupModalOpen = false; }

  submitCreateGroup() {
    if (this.createGroupForm.invalid) {
      this.toastService.show('Please provide Origin and Destination.', 'error');
      return;
    }

    const formValue = this.createGroupForm.getRawValue();
    this.submitting = true;
    const payload = {
      invoice_ids: this.selectedInvoiceIds,
      group_code: formValue.group_code,
      origin: formValue.origin,
      destination: formValue.destination,
      loading_date: formValue.loading_date,
      status: formValue.status
    };

    this.dashboardDataService.createShipmentGroupFromLoadingList(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Shipment group created successfully.', 'success');
        this.closeCreateGroupModal();
        this.loadLoadingList(this.currentPage());
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to create shipment group.', 'error');
      }
    });
  }

  openExternalTrackingModal(inv: any) {
    this.externalTrackingInvoiceNumber = inv.invoice_number;
    this.externalTrackingForm.reset({
      invoice_id: inv.id,
      external_tracking_number: inv.external_tracking_number || '',
      external_tracking_link: inv.external_tracking_link || ''
    });
    this.isExternalTrackingModalOpen = true;
  }
  closeExternalTrackingModal() { this.isExternalTrackingModalOpen = false; }

  submitExternalTracking() {
    if (!this.externalTrackingForm.get('invoice_id')?.value) {
      this.toastService.show('Invoice ID is missing for external tracking update.', 'error');
      return;
    }

    const formValue = this.externalTrackingForm.getRawValue();
    this.submitting = true;
    this.dashboardDataService.updateExternalTracking({
      invoice_id: formValue.invoice_id,
      external_tracking_number: formValue.external_tracking_number,
      external_tracking_link: formValue.external_tracking_link
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('External tracking saved.', 'success');
        this.closeExternalTrackingModal();
        this.loadLoadingList(this.currentPage());
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to save external tracking.', 'error');
      }
    });
  }

  // --- Manual Event Modal ---
  openManualEventModal(inv: any) {
    this.manualEventInvoiceNumber = inv.invoice_number;
    this.manualEventForm.reset({
      tracking_number: inv.tracking_number || inv.invoice_number,
      status: this.shipmentStatusOptions[0] || 'Manual Status Update',
      location_name: '',
      location_id: null,
      notes: ''
    });
    this.locationSuggestions.set([]);
    this.showManualStatusDropdown = false;
    this.activeManualStatusIndex = -1;
    this.isManualEventModalOpen = true;
  }

  closeManualEventModal() { 
    this.isManualEventModalOpen = false; 
    this.locationSuggestions.set([]);
    this.activeLocationIndex = -1;
  }

  onLocationInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.manualEventForm.get('location_id')?.setValue(null);
    this.activeLocationIndex = -1;
    this.locationSearchSubject.next(input);
  }

  onLocationBlur(): void {
    setTimeout(() => {
      this.locationSuggestions.set([]);
      this.activeLocationIndex = -1;
      this.cdr.detectChanges();
    }, 200);
  }

  onLocationKeydown(event: KeyboardEvent,type:string): void {
    const suggestions = this.locationSuggestions();
    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.activeLocationIndex = (this.activeLocationIndex + 1) % suggestions.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.activeLocationIndex = (this.activeLocationIndex - 1 + suggestions.length) % suggestions.length;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const selected = suggestions[this.activeLocationIndex !== -1 ? this.activeLocationIndex : 0];
      if (selected) {
        this.selectLocation(selected,type);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.locationSuggestions.set([]);
      this.activeLocationIndex = -1;
    }
  }

  selectLocation(city: {id: number, name: string}, type: string): void {
    if(type=='Manual'){
      this.manualEventForm.patchValue({
        location_name: city.name,
        location_id: city.id
      });
    }
    else if(type=='bulk'){
      this.bulkStatusForm.patchValue({
        location_name:city.name})
    }
    this.locationSuggestions.set([]);
    this.activeLocationIndex = -1;
  }

  submitManualEvent() {
    if (this.manualEventForm.invalid) return;

    const newStatus = this.manualEventForm.getRawValue().status as string;
    const inv = this.invoices().find(i => i.invoice_number === this.manualEventInvoiceNumber);

    if (inv && !this.isForwardStatus(inv, newStatus)) {
      this.toastService.show('Status can only move forward.', 'error');
      return;
    }

    this.submitting = true;
    const formValue = this.manualEventForm.getRawValue();
    this.dashboardDataService.addLoadingListManualEvent({
      tracking_number: formValue.tracking_number,
      status: formValue.status,
      location_name: formValue.location_name,
      location_id: formValue.location_id,
      notes: formValue.notes || formValue.status,
      mode: inv.mode_of_delivery
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Manual tracking update saved.', 'success');
        this.closeManualEventModal();
        this.loadLoadingList(this.currentPage());
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to save manual tracking update.', 'error');
      }
    });
  }

  // --- Container Assignment ---
  openContainerModal(inv?: any) {
    if (inv) {
      this.containerTarget = 'single';
      this.containerTargetInvoice = inv;
      this.containerForm.reset({
        container_number: inv.container_number || '',
        container_date: inv.container_date || new Date().toISOString().split('T')[0]
      });
    } else {
      if (this.selectedInvoiceIds.length === 0) {
        this.toastService.show('Please select at least one invoice.', 'error');
        return;
      }
      const mode = this.validateSelectionMode();
      if (!mode) {
        this.toastService.show('Selected items must have the same delivery mode (Sea/Air).', 'error');
        return;
      }
      this.containerTarget = 'bulk';
      this.containerTargetInvoice = null;
      this.containerForm.reset({
        container_number: '',
        container_date: new Date().toISOString().split('T')[0]
      });
    }
    this.isContainerModalOpen = true;
  }

  closeContainerModal() {
    this.isContainerModalOpen = false;
  }

  submitContainer() {
    if (this.containerForm.invalid) return;

    const ids = this.containerTarget === 'single' ? [this.containerTargetInvoice.id] : this.selectedInvoiceIds;
    const payload = {
      invoice_ids: ids,
      ...this.containerForm.value
    };

    this.submitting = true;
    this.dashboardDataService.assignContainer(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Container assigned successfully.', 'success');
        this.closeContainerModal();
        this.loadLoadingList(this.currentPage());
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to assign container.', 'error');
      }
    });
  }

  // --- Bulk Status Update ---
  openBulkStatusModal() {
    if (this.selectedInvoiceIds.length === 0) {
      this.toastService.show('Please select at least one invoice.', 'error');
      return;
    }
    const mode = this.validateSelectionMode();
    if (!mode) {
      this.toastService.show('Selected items must have the same delivery mode (Sea/Air).', 'error');
      return;
    }
    this.activeBulkMode = mode as any;
    this.bulkStatusForm.reset({ status: '' });
    this.isBulkStatusModalOpen = true;
  }

  closeBulkStatusModal() {
    this.isBulkStatusModalOpen = false;
  }

  submitBulkStatus() {
    if (this.bulkStatusForm.invalid) return;

    const newStatus = this.bulkStatusForm.value.status;
    const selectedInvoices = this.invoices().filter(inv => this.selectedInvoiceIds.includes(inv.id));
    const allSameStatus = selectedInvoices.length > 0 &&
            selectedInvoices.every(inv => inv.cargo_status === selectedInvoices[0].cargo_status);
    if(!allSameStatus){
      this.toastService.show('All selected invoices do not have the same status.', 'error');
      return;
    }
  

    // Validate forward flow
    const invalidInvoices = selectedInvoices.filter(inv => !this.isForwardStatus(inv, newStatus as string));
    if (invalidInvoices.length > 0) {
      this.toastService.show('Status can only move forward. Check selected items.', 'error');
      return;
    }

    const payload = {
      invoice_ids: this.selectedInvoiceIds,
      status: newStatus,
      location_name: this.bulkStatusForm.value.location_name
    };

    this.submitting = true;
    this.dashboardDataService.updateCargoStatus(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Statuses updated successfully.', 'success');
        this.closeBulkStatusModal();
        this.loadLoadingList(this.currentPage());
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to update statuses.', 'error');
      }
    });
  }

  // --- Helpers ---
  validateSelectionMode(): 'Sea' | 'Air' | null {
    const selected = this.invoices().filter(inv => this.selectedInvoiceIds.includes(inv.id));
    if (selected.length === 0) return null;

    const modes = selected.map(inv => {
      const m = (inv.mode_of_delivery || '').toLowerCase();
      if (m.includes('sea') || m.includes('ship') || m.includes('water')) return 'Sea';
      if (m.includes('air')) return 'Air';
      return 'Other';
    });

    const firstMode = modes[0];
    if (firstMode === 'Other') return null;

    return modes.every(m => m === firstMode) ? (firstMode as any) : null;
  }

  isForwardStatus(invoice: any, newStatus: string): boolean {
    const m = (invoice.mode_of_delivery || '').toLowerCase();
    const order = (m.includes('sea') || m.includes('ship') || m.includes('water')) ? this.seaStatusOrder : this.airStatusOrder;

    const currentIndex = order.indexOf(invoice.cargo_status);
    const newIndex = order.indexOf(newStatus);

    // If current status not in list, allow any valid new status
    if (currentIndex === -1) return newIndex !== -1;

    return newIndex > currentIndex;
  }

  getFilteredStatusOptions(): string[] {
    let mode: 'Sea' | 'Air' | null = null;
    let currentStatuses: string[] = [];

    if (this.isBulkStatusModalOpen) {
      mode = this.validateSelectionMode();
      const selected = this.invoices().filter(inv => this.selectedInvoiceIds.includes(inv.id));
      currentStatuses = selected.map(inv => inv.cargo_status);
    } else if (this.isManualEventModalOpen) {
      const inv = this.invoices().find(i => i.invoice_number === this.manualEventInvoiceNumber);
      if (inv) {
        const m = (inv.mode_of_delivery || '').toLowerCase();
        mode = (m.includes('sea') || m.includes('ship') || m.includes('water')) ? 'Sea' : 'Air';
        currentStatuses = [inv.cargo_status];
      }
    }

    if (!mode) return this.shipmentStatusOptions;

    const order = mode === 'Air' ? this.airStatusOrder : this.seaStatusOrder;
    if (currentStatuses.length === 0) return order;

    // Find the highest status index among selected items
    const indices = currentStatuses.map(s => order.indexOf(s));
    const maxIndex = Math.max(...indices);

    // Return only statuses strictly after the most advanced one
    return order.slice(maxIndex + 1);
  }

  toggleLookup(type: 'manualStatus'): void {
    if (type === 'manualStatus') {
      this.showManualStatusDropdown = !this.showManualStatusDropdown;
      this.activeManualStatusIndex = this.showManualStatusDropdown ? 0 : -1;
      this.cdr.detectChanges();
    }
  }

  onLookupBlur(type: 'manualStatus'): void {
    if (type === 'manualStatus') {
      setTimeout(() => {
        this.showManualStatusDropdown = false;
        this.cdr.detectChanges();
      }, 200);
    }
  }

  onLookupKeydown(type: 'manualStatus', event: KeyboardEvent): void {
    if (type !== 'manualStatus') return;
    const options = this.shipmentStatusOptions;
    if (options.length === 0) return;

    if (!this.showManualStatusDropdown) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        this.toggleLookup('manualStatus');
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeManualStatusIndex = (this.activeManualStatusIndex + 1) % options.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeManualStatusIndex = (this.activeManualStatusIndex - 1 + options.length) % options.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectLookupOption('manualStatus', options[this.activeManualStatusIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.showManualStatusDropdown = false;
    }
    this.cdr.detectChanges();
  }

  selectLookupOption(type: 'manualStatus', status: string): void {
    if (type !== 'manualStatus') return;
    this.manualEventForm.patchValue({ status });
    this.manualEventForm.get('status')?.markAsTouched();
    this.showManualStatusDropdown = false;
    this.activeManualStatusIndex = -1;
    this.cdr.detectChanges();
  }

  loadShipmentStatuses(): void {
    this.dashboardDataService.getShipmentStatus().subscribe({
      next: (res: any) => {
        this.shipmentStatusOptions = (res?.data || []).filter((s: string) => !!s);
        if (this.shipmentStatusOptions.length === 0) {
          this.shipmentStatusOptions = ['In Shop'];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load shipment statuses', err);
        this.shipmentStatusOptions = ['In Shop'];
      }
    });
  }

  exportToExcel() {
    this.loading.set(true);
    let params: any = { page: 1, per_page: 100000 };

    if (this.filterStatus() !== 'all') {
      params['filter_status'] = this.filterStatus();
    }
    if (this.filterContainerNumber()) {
      params['container_number'] = this.filterContainerNumber();
    }
    if (this.filterDestinationCountry()) {
      params['destination_country'] = this.filterDestinationCountry();
    }
    if (this.filterLoadingDate()) {
      params['loading_date'] = this.filterLoadingDate();
    }
    if (this.filterContainerDate()) {
      params['container_date'] = this.filterContainerDate();
    }

    this.dashboardDataService.getLoadingList(params).subscribe({
      next: (res) => {
        let exportDataList = res.items || res;
        if (!exportDataList || !Array.isArray(exportDataList) || exportDataList.length === 0) {
          this.toastService.show('No data to export.', 'error');
          this.loading.set(false);
          return;
        }

        const exportData = exportDataList.map((inv: any) => ({
          'Bill No': inv.invoice_number,
          'Cartons': inv.total_cartons,
          'Weight': inv.total_weight,
          'Mode': inv.mode_of_delivery,
          'Destination Address': inv.destination_address || '',
          'Destination City': inv.destination_city || '',
          'Destination Country': inv.destination_country || '',
          'Postal Code': inv.destination_postal_code || '',
          'Consignee Name': inv.consignee_name || '',
          'Consignee Mobile': inv.consignee_mobile || '',
          'Status': inv.cargo_status || '',
          'Loading Date': inv.loading_date || '',
          'Container Number': inv.container_number ? `#${inv.container_number}` : '',
          'Container Date': inv.container_date || '',
          'Created By': inv.created_by || '',
          'Office': inv.office_name || ''
        }));

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

        // 🎨 Header Styling
        const headerStyle = {
          fill: {
            fgColor: { rgb: "7C1C9A" } // brand purple
          },
          font: {
            bold: true,
            color: { rgb: "f2d21b" } // white text
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        };

        // Apply style to header row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || '');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = headerStyle;
          }
        }

        // Optional: Auto column width
        worksheet['!cols'] = Object.keys(exportData[0]).map(key => ({
          wch: key.length + 5
        }));

        const workbook: XLSX.WorkBook = {
          Sheets: { 'Loading List': worksheet },
          SheetNames: ['Loading List']
        };

        XLSX.writeFile(workbook, `Loading_List_Export.xlsx`);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Export error', err);
        this.toastService.show('Failed to export to excel.', 'error');
        this.loading.set(false);
      }
    });
  }

  generateGroupCode(): string {
    const prefix = 'SG';
    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${random}-${timestamp}`;
  }

  getPagesArray(): number[] {
    const total = this.totalPages();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    // For more pages, show first, last, and window around current
    const current = this.currentPage();
    const pages: number[] = [1];

    if (current > 3) pages.push(-1); // indicator for ellipsis

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }

    if (current < total - 2) pages.push(-1);

    if (total > 1) pages.push(total);

    return pages;
  }
}
