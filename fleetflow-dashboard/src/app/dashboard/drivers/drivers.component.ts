import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { DashboardDataService } from '../../services/dashboard-data.service';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.css'
})
export class DriversComponent {
  private router = inject(Router);
  private dashboardDataService = inject(DashboardDataService);

  drivers$ = this.dashboardDataService.getDrivers();

  onAddDriver() {
    this.router.navigate(['/dashboard/drivers/add']);
  }

  onViewProfile(driver: any) {
    this.router.navigate(['/dashboard/drivers', driver.id, 'profile']);
  }

  onViewRoute(driver: any) {
    this.router.navigate(['/dashboard/drivers', driver.id, 'route']);
  }
}

