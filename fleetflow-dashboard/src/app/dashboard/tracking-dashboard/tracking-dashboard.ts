import { Component } from '@angular/core';
import { CardComponent } from '../../shared/ui/card/card.component';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-tracking-dashboard',
  imports: [CardComponent, RouterOutlet],
  templateUrl: './tracking-dashboard.html',
  styleUrl: './tracking-dashboard.css',
})
export class TrackingDashboard {

  constructor(private router: Router) {}

  navigateToLiveTracking(){
    this.router.navigate(['/dashboard/tracking-dashboard/live-tracking']);
  }
  navigateToDriver(){
    this.router.navigate(['/dashboard/tracking-dashboard/drivers']);
  }
  navigateToShipmentGroups(){
    this.router.navigate(['/dashboard/tracking-dashboard/shipment-groups']);
  }
  navigateToShipments(){
    this.router.navigate(['/dashboard/tracking-dashboard/shipments']);
  }
  navigateToTracking(){
    this.router.navigate(['/dashboard/tracking-dashboard/tracking']);
  }

}
