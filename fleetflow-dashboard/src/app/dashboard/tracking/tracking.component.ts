import { Component, signal, inject, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { UnitPriceService } from '../../services/unit-price.service';
import { ToastService } from '../../services/toast.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-tracking',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './tracking.component.html',
    styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit {
    private dashboardDataService = inject(DashboardDataService);
    private unitPriceService = inject(UnitPriceService);
    private toastService = inject(ToastService);
    private cdr = inject(ChangeDetectorRef);
    private fb = inject(FormBuilder);
    private searchSubject = new Subject<string>();
    private locationSearchSubject = new Subject<string>();

    locationSuggestions = signal<{ id: number, name: string }[]>([]);
    activeLocationIndex = -1;
    invoices = signal<any[]>([]);
    trackingNumber = signal('');
    shipment = signal<any>(null);
    loading = signal(false);
    error = signal('');
    currentPage = signal(1);
    perPage = 50;
    filterStatus = signal<string>('all');
    totalPages = signal(1);
    totalItems = signal(0);
    filterContainerNumber = signal<string>('');
    isFetchingLocations = signal(false);

    FoundTrackingNumbers: any[] = [];
    showTrackingDropdown = false;
    activeTrackingSuggestionIndex = -1;

    isManualEventModalOpen = false;
    isExternalTrackingModalOpen = false;
    isContainerModalOpen = false;
    submitting = false;
    showManualStatusDropdown = false;
    activeManualStatusIndex = -1;
    manualStatusOptions: string[] = [];
    manualEventInvoiceNumber = '';
    selectedInvoiceIds: number[] = [];
    containerTarget: 'single' | 'bulk' = 'single';
    containerTargetInvoice: any = null;
    externalTrackingInvoiceNumber = '';

    containerForm = this.fb.group({
        container_number: ['', Validators.required],
        container_date: [new Date().toISOString().split('T')[0], Validators.required]
    });

    externalTrackingForm = this.fb.group({
        invoice_id: [null as string | null],
        external_tracking_number: [''],
        external_tracking_link: ['']
    });

    manualEventForm = this.fb.group({
        tracking_number: ['', Validators.required],
        status: ['', Validators.required],
        location_name: ['', Validators.required],
        location_id: [null as number | null],
        notes: ['']
    });

    bulkStatusForm = this.fb.group({
        status: ['', Validators.required],
        location_name: ['', Validators.required]
    });

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

    ngOnInit(): void {
        this.loadLoadingList();
        this.setupTrackingSearch();
        this.loadShipmentStatuses();

        this.locationSearchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(query => {
            if (query.trim() === '') {
                this.locationSuggestions.set([]);
                return;
            }
            this.isFetchingLocations.set(true);
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

    onLocationKeydown(event: KeyboardEvent, type: string): void {
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
                this.selectLocation(selected, type);
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

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.manual-status-lookup')) {
            this.showManualStatusDropdown = false;
            this.cdr.detectChanges();
        }
    }

    onTrackingNumber(event: any): void {
        const input = event.target as HTMLInputElement;
        const tracking = input.value || '';
        this.trackingNumber.set(tracking);
        this.searchSubject.next(tracking);
        this.activeTrackingSuggestionIndex = -1;
    }

    closeExternalTrackingModal() { this.isExternalTrackingModalOpen = false; }

    closeContainerModal() {
        this.isContainerModalOpen = false;
    }

    setupTrackingSearch(): void {
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(tracking => {
                if (!tracking || tracking.length < 2) {
                    this.FoundTrackingNumbers = [];
                    this.showTrackingDropdown = false;
                    return [];
                }
                return this.dashboardDataService.searchTrackingNumber(tracking);
            })
        ).subscribe(
            (res: any) => {
                this.FoundTrackingNumbers = res?.tracking_number || [];
                this.showTrackingDropdown = this.FoundTrackingNumbers.length > 0;
                this.activeTrackingSuggestionIndex = this.FoundTrackingNumbers.length > 0 ? 0 : -1;
                this.cdr.detectChanges();
            }
        );
    }

    onPhoneSearchKeydown(event: KeyboardEvent): void {
        if (!this.showTrackingDropdown || this.FoundTrackingNumbers.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.activeTrackingSuggestionIndex = (this.activeTrackingSuggestionIndex + 1) % this.FoundTrackingNumbers.length;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.activeTrackingSuggestionIndex = (this.activeTrackingSuggestionIndex - 1 + this.FoundTrackingNumbers.length) % this.FoundTrackingNumbers.length;
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const selected = this.FoundTrackingNumbers[this.activeTrackingSuggestionIndex];
            if (selected) this.selectTracking(selected.tracking_id);
        } else if (event.key === 'Escape') {
            this.showTrackingDropdown = false;
        }
    }

    selectTracking(trackingId: string) {
        this.trackingNumber.set(trackingId);
        this.FoundTrackingNumbers = [];
        this.showTrackingDropdown = false;
        this.trackShipment();
    }

    openContainerModal(inv?: any) {
        const targetInvoice = inv || this.getCurrentShipmentInvoice();

       if (targetInvoice) {
            this.containerTarget = 'single';
            this.containerTargetInvoice = targetInvoice;
            this.containerForm.reset({
                container_number: targetInvoice.container_number || '',
                container_date: targetInvoice.container_date || new Date().toISOString().split('T')[0]
            });
            this.isContainerModalOpen = true;
            return;
        }

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
        this.isContainerModalOpen = true;
    }

    openExternalTrackingModal(inv?: any) {
        const targetInvoice = inv || this.getCurrentShipmentInvoice();
        if (!targetInvoice) {
            this.toastService.show('Invoice data not found for external tracking update.', 'error');
            return;
        }

        this.externalTrackingInvoiceNumber = targetInvoice.invoice_number || this.shipment()?.tracking_number || '';
        this.externalTrackingForm.reset({
            invoice_id: targetInvoice.id,
            external_tracking_number: targetInvoice.external_tracking_number || '',
            external_tracking_link: targetInvoice.external_tracking_link || ''
        });
        this.isExternalTrackingModalOpen = true;
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

    private getCurrentShipmentInvoice(): any | null {
        const currentTracking = this.shipment()?.tracking_number || this.trackingNumber();
        if (!currentTracking) return null;
        return this.invoices().find(inv => inv.tracking_number === currentTracking || inv.invoice_number === currentTracking) || null;
    }

    trackShipment() {
        if (!this.trackingNumber()) {
            this.toastService.show('Please enter a tracking number.', 'error');
            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.shipment.set(null);

        this.dashboardDataService.getTrackingInfo(this.trackingNumber()).subscribe({
            next: (data: any) => {
                if (data.timeline && data.timeline.length > 0) {
                    data.timeline = data.timeline.map((event: any, index: number) => {
                        const style = this.getStatusStyle(event.status);
                        return {
                            ...event,
                            icon: style.icon,
                            color: style.color,
                            isLast: index === data.timeline.length - 1
                        };
                    });
                }
                this.shipment.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Tracking number not found.');
                this.loading.set(false);
            }
        });
    }

    getStatusStyle(status: string) {
        const s = status.toLowerCase();
        if (s.includes('create') || s.includes('added')) return { icon: 'package-plus', color: 'blue' };
        if (s.includes('transit') || s.includes('shipped') || s.includes('departed')) return { icon: 'truck', color: 'amber' };
        if (s.includes('delivered') || s.includes('received')) return { icon: 'check-circle', color: 'green' };
        if (s.includes('warehouse') || s.includes('facility')) return { icon: 'warehouse', color: 'indigo' };
        if (s.includes('hold') || s.includes('exception')) return { icon: 'alert-circle', color: 'red' };
        return { icon: 'map-pin', color: 'slate' };
    }

    // --- Manual Event Modal for Individual Invoice ---
    openManualEventModal(): void {
        if (!this.shipment()) return;
        const inv = this.getCurrentShipmentInvoice();
        this.manualEventInvoiceNumber = inv?.invoice_number || this.shipment()?.tracking_number || this.trackingNumber();
        this.manualEventForm.reset({
            tracking_number: this.shipment()?.tracking_number || this.trackingNumber(),
            status: this.manualStatusOptions[0] || 'Manual Stop Update',
            location_name: '',
            location_id: null,
            notes: ''
        });
        this.locationSuggestions.set([]);
        this.showManualStatusDropdown = false;
        this.activeManualStatusIndex = -1;
        this.isManualEventModalOpen = true;
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
        const options = this.getFilteredStatusOptions();
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

    getFilteredStatusOptions(): string[] {
        if (!this.shipment()) return this.manualStatusOptions;

        const m = (this.shipment().mode_of_delivery || '').toLowerCase();
        const isSea = (m.includes('sea') || m.includes('ship') || m.includes('water'));
        const order = isSea ? this.seaStatusOrder : this.airStatusOrder;

        const currentStatus = this.shipment().status;
        const currentIndex = order.indexOf(currentStatus);

        // Return only statuses strictly after the current one
        return order.slice(currentIndex + 1);
    }

    loadShipmentStatuses(): void {
        this.dashboardDataService.getShipmentStatus().subscribe({
            next: (res: any) => {
                this.manualStatusOptions = (res?.data || []).filter((s: string) => !!s);
                if (this.manualStatusOptions.length === 0) {
                    this.manualStatusOptions = ['Manual Stop Update'];
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load shipment statuses', err);
                this.manualStatusOptions = ['Manual Stop Update'];
            }
        });
    }
    closeManualEventModal() {
        this.isManualEventModalOpen = false;
        this.locationSuggestions.set([]);
        this.activeLocationIndex = -1;
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
            mode: inv?.mode_of_delivery
        }).subscribe({
            next: () => {
                this.submitting = false;
                this.toastService.show('Manual tracking update saved.', 'success');
                this.closeManualEventModal();
                this.loadLoadingList(this.currentPage());
                this.trackShipment();
            },
            error: (err) => {
                console.error(err);
                this.submitting = false;
                this.toastService.show('Failed to save manual tracking update.', 'error');
            }
        });
    }

    selectLocation(city: { id: number, name: string }, type: string): void {
        if (type === 'Manual') {
            this.manualEventForm.patchValue({
                location_name: city.name,
                location_id: city.id
            });
        } else if (type === 'bulk') {
            this.bulkStatusForm.patchValue({
                location_name: city.name
            });
        }
        this.locationSuggestions.set([]);
        this.activeLocationIndex = -1;
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
}
