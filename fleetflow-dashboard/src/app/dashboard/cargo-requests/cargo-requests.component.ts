import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CargoRequestService, CargoRequest } from '../../services/cargo-request.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { MobileNavComponent } from '../../shared/ui/mobile-nav/mobile-nav.component';

@Component({
  selector: 'app-cargo-requests',
  templateUrl: './cargo-requests.component.html',
  styleUrls: ['./cargo-requests.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MobileNavComponent]
})
export class CargoRequestsComponent implements OnInit {
  requests: CargoRequest[] = [];
  loading = true;

  private cargoService = inject(CargoRequestService);
  private router = inject(Router);
  private toastMessage = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  authService = inject(AuthService);
  private location = inject(Location);

  // User status signal
  readonly isDriver = this.authService.isDriver;

  ngOnInit(): void {
    this.loadRequests();
  }

  goBack() {
    this.location.back();
  }

  loadRequests() {
    this.loading = true;
    this.cdr.markForCheck();
    this.cargoService.getRequests().subscribe({
      next: (data) => {
        this.requests = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.toastMessage.show('Failed to load cargo requests', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  handleAcceptAndCreateInvoice(request: CargoRequest) {
    if (request.status === 'Invoice_Created') {
      this.toastMessage.show('This request already has an invoice.', 'info');
      return;
    }

    this.cargoService.assignToMe(request.id).subscribe({
      next: () => {
        this.toastMessage.show('Request assigned successfully! Proceeding to invoice creation.', 'success');
        this.router.navigate(['/dashboard/invoice'], { 
          state: { cargoRequest: request } 
        });
      },
      error: (err) => {
        this.toastMessage.show(err.error?.message || 'Failed to assign request', 'error');
      }
    });
  }

  approvePayment(request: CargoRequest) {
    if (confirm('Are you sure you want to approve this payment? This will mark the invoice as Paid.')) {
      this.cargoService.approvePayment(request.id).subscribe({
        next: (res) => {
          this.toastMessage.show('Payment approved successfully! Invoice marked as Paid.', 'success');
          this.loadRequests();
        },
        error: (err) => {
          this.toastMessage.show(err.error?.message || 'Failed to approve payment', 'error');
        }
      });
    }
  }
}
