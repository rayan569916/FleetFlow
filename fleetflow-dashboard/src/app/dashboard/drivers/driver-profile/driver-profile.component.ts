import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardDataService } from '../../../services/dashboard-data.service';

@Component({
    selector: 'app-driver-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './driver-profile.component.html',
    styleUrl: './driver-profile.component.css'
})
export class DriverProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private dashboardDataService = inject(DashboardDataService);

    driver: any = null;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.dashboardDataService.getDrivers().subscribe(drivers => {
                this.driver = drivers.find((d: any) => d.id === id);
            });
        }
    }

    goBack() { this.router.navigate(['/dashboard/drivers']); }
}
