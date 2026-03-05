import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { interval, Subscription, switchMap } from 'rxjs';
import { LiveTrackingParams } from '../../core/models/dashboard.models';

@Component({
    selector: 'app-live-tracking',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './live-tracking.component.html',
    styleUrl: './live-tracking.component.css'
})
export class LiveTrackingComponent implements OnInit, OnDestroy {
    private dashboardDataService = inject(DashboardDataService);
    drivers = signal<LiveTrackingParams[]>([]);
    private updateSubscription?: Subscription;

    // Mock scaling for demo map (Berlin/Europe center approx)
    // Lat: 45 to 55 maps to 100% height
    // Lon: 5 to 15 maps to 100% width
    scaleLat(lat: number): number {
        const minLat = 55;
        const maxLat = 45;
        return ((lat - minLat) / (maxLat - minLat)) * 100;
    }

    scaleLon(lon: number): number {
        const minLon = 5;
        const maxLon = 15;
        return ((lon - minLon) / (maxLon - minLon)) * 100;
    }

    ngOnInit() {
        // Initial fetch
        this.fetchData();

        // Poll every 5 seconds
        this.updateSubscription = interval(5000).pipe(
            switchMap(() => this.dashboardDataService.getLiveTrackingLocations())
        ).subscribe(data => {
            this.drivers.set(data);
        });
    }

    fetchData() {
        this.dashboardDataService.getLiveTrackingLocations().subscribe(data => {
            this.drivers.set(data);
        });
    }

    ngOnDestroy() {
        this.updateSubscription?.unsubscribe();
    }
}
