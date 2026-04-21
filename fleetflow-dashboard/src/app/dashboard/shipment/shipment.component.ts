import { ChangeDetectorRef, Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { ToastService } from '../../services/toast.service';
import { ShipmentService } from '../../services/shipment.service';
import * as XLSX from 'xlsx-js-style';

@Component({
  selector: 'app-shipment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shipment.component.html',
  styleUrls: ['./shipment.component.css']
})
export class ShipmentComponent implements OnInit {
  private dashboardDataService = inject(DashboardDataService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private shipmentService = inject(ShipmentService);


  groups = signal<any[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 20;
  submitting = false;

  selectedGroup: any | null = null;
  selectedGroupDetails = signal<any>(null);

  isMoveModalOpen = false;
  isContainerModalOpen = false;
  isManualEventModalOpen = false;

  // Forms
  moveForm = this.fb.group({
    next_location_name: ['', Validators.required],
    status: ['Departed to Origin Warehouse', Validators.required],
    notes: ['', Validators.required],
    loading_date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  containerForm = this.fb.group({
    container_number: ['', Validators.required],
    container_date: [new Date().toISOString().split('T')[0], Validators.required],
    status: ['Container Loading Completed', Validators.required]
  });

  manualEventForm = this.fb.group({
    status: ['', Validators.required],
    location_name: [''],
    notes: ['']
  });

  seaStatusOrder = [
    'Shipment Picked Up',
    'In Shop',
    'Arrived at Origin Facility',
    'Departed to Origin Warehouse',
    'Container Loading in Progress',
    'Container Loading Completed',
    'Port Handling Completed',
    'Under Customs Inspection',
    'Customs Inspection Completed',
    'Loaded on Vessel',
    'Departed Origin Country',
    'Arrived at Destination Port',
    'Customs Clearance',
    'Customs Cleared – Transferred to Warehouse',
    'In Transit to Destination Hub',
    'Arrived at Destination Hub',
    'Out for Delivery',
    'Delivered'
  ];

  airStatusOrder = [
    'Shipment Picked Up',
    'In Shop',
    'Arrived at Origin Facility',
    'Booking done',
    'Departed Origin Country',
    'Arrived at Destination Port',
    'Customs Clearance',
    'Customs Cleared – Transferred to Warehouse',
    'In Transit to Destination Hub',
    'Arrived at Destination Hub',
    'Out for Delivery',
    'Delivered'
  ];

  manualStatusOptions: string[] = [];
  showMoveStatusDropdown = false;
  showContainerStatusDropdown = false;
  showManualStatusDropdown = false;
  activeMoveStatusIndex = -1;
  activeContainerStatusIndex = -1;
  activeManualStatusIndex = -1;

  ngOnInit(): void {
    this.loadGroups();
    this.getStatus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.move-status-lookup')) this.showMoveStatusDropdown = false;
    if (!target.closest('.container-status-lookup')) this.showContainerStatusDropdown = false;
    if (!target.closest('.manual-status-lookup')) this.showManualStatusDropdown = false;
    this.cdr.detectChanges();
  }

  getStatus() {
    this.dashboardDataService.getShipmentStatus().subscribe({
      next: (res) => {
        this.manualStatusOptions = res?.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading shipment status', err);
        this.toastService.show('Failed to load shipment status.', 'error');
      }
    });
  }

  toggleLookup(type: 'moveStatus' | 'containerStatus' | 'manualStatus'): void {
    if (type === 'moveStatus') {
      this.showMoveStatusDropdown = !this.showMoveStatusDropdown;
      this.activeMoveStatusIndex = this.showMoveStatusDropdown ? 0 : -1;
    } else if (type === 'containerStatus') {
      this.showContainerStatusDropdown = !this.showContainerStatusDropdown;
      this.activeContainerStatusIndex = this.showContainerStatusDropdown ? 0 : -1;
    } else {
      this.showManualStatusDropdown = !this.showManualStatusDropdown;
      this.activeManualStatusIndex = this.showManualStatusDropdown ? 0 : -1;
    }
    this.cdr.detectChanges();
  }


  onLookupBlur(type: 'moveStatus' | 'containerStatus' | 'manualStatus'): void {
    setTimeout(() => {
      if (type === 'moveStatus') this.showMoveStatusDropdown = false;
      else if (type === 'containerStatus') this.showContainerStatusDropdown = false;
      else this.showManualStatusDropdown = false;
      this.cdr.detectChanges();
    }, 200);
  }

  selectLookupOption(type: 'moveStatus' | 'containerStatus' | 'manualStatus', option: string): void {
    if (type === 'moveStatus') {
      this.moveForm.patchValue({ status: option });
      this.moveForm.get('status')?.markAsTouched();
      this.showMoveStatusDropdown = false;
      this.activeMoveStatusIndex = -1;
    } else if (type === 'containerStatus') {
      this.containerForm.patchValue({ status: option });
      this.containerForm.get('status')?.markAsTouched();
      this.showContainerStatusDropdown = false;
      this.activeContainerStatusIndex = -1;
    } else {
      this.manualEventForm.patchValue({ status: option });
      this.manualEventForm.get('status')?.markAsTouched();
      this.showManualStatusDropdown = false;
      this.activeManualStatusIndex = -1;
    }
    this.cdr.detectChanges();
  }

  exportToExcel(group: any) {
    this.loading.set(true);
    this.shipmentService.exportShipmentExcel(group.id).subscribe({
      next: (res) => {
        const exportDataList = res.data;
        if (!exportDataList || !Array.isArray(exportDataList) || exportDataList.length === 0) {
          this.toastService.show('No data to export.', 'error');
          this.loading.set(false);
          return;
        }

        const loadingDate = res.loading_date || '';
        const office = exportDataList[0]?.office || '';
        const titleRow = [`Loading List - ${loadingDate} - ${office}`];

        const exportData = exportDataList.map((inv: any) => ({
          'Bill No': inv.tracking_number,
          'Sender': (inv.sender_name || '') + ' ' + (inv.sender_phone || ''),
          'Weight': inv.total_weight,
          'Cartons': inv.total_cartons,
          'Consignee': (inv.consignee_name || '') + ' ' + (inv.consignee_mobile || ''),
          'Consignee_address':
            (inv.destination_address || '') +
            ', ' +
            (inv.destination_city || '') +
            ', ' +
            (inv.destination_country || '') +
            ', Postal Code: ' +
            (inv.postal_code || ''),
          'Destination': inv.destination || '',
          'Container': inv.container_number || '',
          'Container Loading Date': inv.container_date || '',
          'Office': inv.office || ''
        }));

        // Initialize worksheet with the Title row
        const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([titleRow]);

        // Add the JSON data starting at the second row (A2)
        XLSX.utils.sheet_add_json(worksheet, exportData, { origin: 'A2' });

        // Merge cells for the title row
        const colCount = Object.keys(exportData[0]).length;
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];

        // Styling
        const titleStyle = {
          font: { bold: true, size: 14, color: { rgb: "7C1C9A" } },
          alignment: { horizontal: "center", vertical: "center" }
        };

        const headerStyle = {
          fill: { fgColor: { rgb: "7C1C9A" } },
          font: { bold: true, color: { rgb: "f2d21b" } },
          alignment: { horizontal: "center", vertical: "center" }
        };

        // Apply title style
        worksheet['A1'].s = titleStyle;

        // Apply header style to the second row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || '');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = headerStyle;
          }
        }

        // Auto column width
        worksheet['!cols'] = Object.keys(exportData[0]).map((key) => ({
          wch: Math.max(key.length, 12) + 2
        }));

        const workbook: XLSX.WorkBook = {
          Sheets: { 'Shipment Data': worksheet },
          SheetNames: ['Shipment Data']
        };

        XLSX.writeFile(workbook, `Shipment_${group.group_code}_Export.xlsx`);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error exporting shipment', err);
        this.toastService.show('Failed to export shipment.', 'error');
        this.loading.set(false);
      }
    });
  }

  onLookupKeydown(type: 'moveStatus' | 'containerStatus' | 'manualStatus', event: KeyboardEvent): void {
      const options = this.getFilteredStatusOptions();
      if(options.length === 0) return;

      const isVisible = type === 'moveStatus'
        ? this.showMoveStatusDropdown
        : type === 'containerStatus'
          ? this.showContainerStatusDropdown
          : this.showManualStatusDropdown;

      let index = type === 'moveStatus'
        ? this.activeMoveStatusIndex
        : type === 'containerStatus'
          ? this.activeContainerStatusIndex
          : this.activeManualStatusIndex;

      if(!isVisible) {
        if (event.key === 'ArrowDown' || event.key === 'Enter') {
          event.preventDefault();
          this.toggleLookup(type);
        }
        return;
      }

    if(event.key === 'ArrowDown') {
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
      if (type === 'moveStatus') this.showMoveStatusDropdown = false;
      else if (type === 'containerStatus') this.showContainerStatusDropdown = false;
      else this.showManualStatusDropdown = false;
      this.cdr.detectChanges();
      return;
    }

    if (type === 'moveStatus') this.activeMoveStatusIndex = index;
    else if (type === 'containerStatus') this.activeContainerStatusIndex = index;
    else this.activeManualStatusIndex = index;
    this.cdr.detectChanges();
  }

  getGroupMode(): 'Sea' | 'Air' | null {
    const details = this.selectedGroupDetails();
    if (!details || !details.invoices || details.invoices.length === 0) {
      // Fallback: try to guess from status name or origin/destination if needed
      // But usually we have invoices after viewing details
      return 'Sea'; // Default fallback
    }
    const inv = details.invoices[0];
    const m = (inv.mode_of_delivery || '').toLowerCase();
    if (m.includes('sea') || m.includes('ship') || m.includes('water')) return 'Sea';
    if (m.includes('air')) return 'Air';
    return 'Sea';
  }

  getFilteredStatusOptions(): string[] {
    if (!this.selectedGroup) return this.manualStatusOptions;

    const mode = this.getGroupMode();
    const order = mode === 'Air' ? this.airStatusOrder : this.seaStatusOrder;

    const currentStatus = this.selectedGroup.status;
    const currentIndex = order.indexOf(currentStatus);

    // Return only statuses strictly after the current one
    return order.slice(currentIndex + 1);
  }

  loadGroups(page: number = 1): void {
    this.loading.set(true);
    this.dashboardDataService.getShipments({ page, per_page: this.perPage }).subscribe({
      next: (res) => {
        this.groups.set(res?.items || []);
        this.currentPage.set(res?.page || 1);
        this.totalPages.set(res?.pages || 1);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading shipment groups', err);
        this.toastService.show('Failed to load shipment groups.', 'error');
        this.loading.set(false);
      }
    });
  }

  viewGroupDetails(group: any): void {
    this.selectedGroup = group;
    this.dashboardDataService.getShipmentDetails(group.id).subscribe({
      next: (res) => this.selectedGroupDetails.set(res),
      error: (err) => {
        console.error('Failed to load group details', err);
        this.toastService.show('Failed to load group details.', 'error');
        this.selectedGroupDetails.set(null);
      }
    });
  }

  // --- Move Modal ---
  openMoveModal(group: any): void {
    this.getStatus();
    this.selectedGroup = group;
    this.moveForm.reset({
      next_location_name: '',
      status: 'Departed to Origin Warehouse',
      notes: `Moved group ${group.group_code} to next facility`,
      loading_date: new Date().toISOString().split('T')[0]
    });
    this.isMoveModalOpen = true;
  }

  closeMoveModal(): void {
    this.isMoveModalOpen = false;
  }

  submitMove(): void {
    if (!this.selectedGroup || this.moveForm.invalid) return;

    this.submitting = true;
    this.dashboardDataService.moveShipmentGroup(this.selectedGroup.id, this.moveForm.value).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Shipment group moved successfully.', 'success');
        this.closeMoveModal();
        this.loadGroups(this.currentPage());
        if (this.selectedGroupDetails() && this.selectedGroupDetails().id === this.selectedGroup.id) {
          this.viewGroupDetails(this.selectedGroup);
        }
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to move shipment group.', 'error');
      }
    });
  }

  // --- Container Modal ---
  openContainerModal(group: any): void {
    this.getStatus();
    this.selectedGroup = group;
    this.containerForm.reset({
      container_number: '',
      container_date: new Date().toISOString().split('T')[0],
      status: 'Container Loading Completed'
    });
    this.isContainerModalOpen = true;
  }

  closeContainerModal(): void {
    this.isContainerModalOpen = false;
  }

  submitContainer(): void {
    if (!this.selectedGroup || this.containerForm.invalid) return;

    this.submitting = true;
    this.dashboardDataService.assignShipmentGroupContainer(this.selectedGroup.id, this.containerForm.value).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Container assigned successfully.', 'success');
        this.closeContainerModal();
        this.loadGroups(this.currentPage());
        if (this.selectedGroupDetails() && this.selectedGroupDetails().id === this.selectedGroup.id) {
          this.viewGroupDetails(this.selectedGroup);
        }
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to assign container.', 'error');
      }
    });
  }

  // --- Manual Event Modal ---
  openManualEventModal(group: any): void {
    this.getStatus();
    this.selectedGroup = group;
    this.manualEventForm.reset({
      status: '',
      location_name: '',
      notes: ''
    });
    this.isManualEventModalOpen = true;
  }

  closeManualEventModal(): void {
    this.isManualEventModalOpen = false;
  }

  submitManualEvent(): void {
    if (!this.selectedGroup || this.manualEventForm.invalid) return;

    this.submitting = true;
    const formValue = this.manualEventForm.value;
    this.dashboardDataService.addLoadingListManualEvent({
      shipment_group_id: this.selectedGroup.id,
      status: formValue.status,
      location_name: formValue.location_name,
      notes: formValue.notes || formValue.status
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.show('Manual event added successfully.', 'success');
        this.closeManualEventModal();
        this.loadGroups(this.currentPage());
        if (this.selectedGroupDetails() && this.selectedGroupDetails().id === this.selectedGroup.id) {
          this.viewGroupDetails(this.selectedGroup);
        }
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
        this.toastService.show('Failed to add manual event.', 'error');
      }
    });
  }

  async canDeactivate(): Promise<boolean> {
    return true;
  }
}
