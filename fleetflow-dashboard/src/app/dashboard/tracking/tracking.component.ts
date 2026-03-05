import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../services/dashboard-data.service';

interface TimelineEvent {
    status: string;
    location: string;
    timestamp: string;
    description: string;
    completed: boolean;
    icon?: string;
}

interface ShipmentDetails {
    id: string;
    tracking_number: string;
    status: string;
    origin: string;
    destination: string;
    estimated_delivery: string;
    current_location: string;
    serviceType?: string;
    weight?: string;
    timeline?: TimelineEvent[];
}

@Component({
    selector: 'app-tracking',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './tracking.component.html',
    styles: ``
})
export class TrackingComponent {
    private dashboardDataService = inject(DashboardDataService);

    trackingNumber = signal('');
    shipment = signal<any>(null);
    loading = signal(false);
    error = signal('');

    trackShipment() {
        if (!this.trackingNumber()) {
            this.error.set('Please enter a tracking number.');
            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.shipment.set(null);

        this.dashboardDataService.getTrackingInfo(this.trackingNumber()).subscribe({
            next: (data: any) => {
                this.shipment.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Tracking number not found. Please check and try again.');
                this.loading.set(false);
            }
        });
    }
}
