import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { BalanceShareService, BalanceShareRequest } from '../../services/balance-share.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { AuthService } from '../../services/auth.service';
import { MobileNavComponent } from '../../shared/ui/mobile-nav/mobile-nav.component';
import { ReportService } from '../../services/report.service';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
    selector: 'app-balance-share',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MobileNavComponent],
    templateUrl: './balance-share.component.html',
    styleUrl: './balance-share.component.css'
})
export class BalanceShareComponent implements OnInit {
 
  // Pagination Signals
    pageSize = 10;
    currentPage = 1;
    totalPages = 0;
    totalItems = 0;


    currentPageRecieved = 1;
    totalPagesRecieved = 0;
    totalItemsRecieved = 0;

    daily_total = 0;


    private balanceShareService = inject(BalanceShareService);
    private toastService = inject(ToastService);
    private confirmationService = inject(ConfirmationDialogService);
    public authService = inject(AuthService);
    public reportService = inject(ReportService);
    private fb = inject(FormBuilder);

    readonly incomingRequests = signal<BalanceShareRequest[]>([]);
    readonly outgoingRequests = signal<BalanceShareRequest[]>([]);
    readonly isLoading = signal(false);
    readonly isSubmitting = signal(false);
    readonly isShareModalOpen = signal(false);
    readonly isCancelModalOpen = signal(false);
    currentUserOfficeId = signal<number | null>(null);

    readonly offices = signal<any[]>([]);


    cancelForm = this.fb.group({
        id: [null as number | null, Validators.required],
        comment: ['', Validators.required]
    });
    balanceShareForm = this.fb.group({
        amount: [null as number | null, Validators.required],
        receiver_office_id: ['', Validators.required]
    });

    ngOnInit() {
        this.currentUserOfficeId.set(Number(localStorage.getItem('user_office_id')));
        this.loadData();
        this.loadOffices();
    }



    private hasUnsavedChanges(): boolean {
        const shareFormDirty = this.isShareModalOpen();
        const cancelFormDirty = this.isCancelModalOpen();
        return shareFormDirty || cancelFormDirty;
    }

    async canDeactivate(): Promise<boolean> {
        if (!this.hasUnsavedChanges()) return true;

        return this.confirmationService.confirm({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Leave this page and discard them?',
            confirmText: 'Leave',
            cancelText: 'Stay'
        });
    }

    prevPageBalanceShareRequests(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadBalanceShareRequests();
        }
    }

    nextPageBalanceShareRequests(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadBalanceShareRequests();
        }
    }

    prevPageBalanceShareRecieved(): void {
        if (this.currentPageRecieved > 1) {
            this.currentPageRecieved--;
            this.loadBalanceShareRecieved();
        }
    }

    nextPageBalanceShareRecieved(): void {
        if (this.currentPageRecieved < this.totalPagesRecieved) {
            this.currentPageRecieved++;
            this.loadBalanceShareRecieved();
        }
    }

    loadBalanceShareRequests() {
        this.isLoading.set(true);
        const params: any = {
            page: this.currentPage,
            per_page: this.pageSize
        };
        this.balanceShareService.getBalanceShareRequests(params).subscribe({
            next: (res) => {
                this.outgoingRequests.set(res.outgoing || []);
                this.totalItems = res.total;
                this.totalPages = res.pages;
                this.isLoading.set(false);
            },
            error: () => {
                this.toastService.show('Failed to load balance share requests', 'error');
                this.isLoading.set(false);
            }
        });
    }

    loadBalanceShareRecieved() {
        this.isLoading.set(true);
        const params: any = {
            page: this.currentPageRecieved,
            per_page: this.pageSize
        };
        this.balanceShareService.getBalanceShareRecieved(params).subscribe({
            next: (res) => {
                this.incomingRequests.set(res.incoming || []);
                this.totalItemsRecieved = res.total;
                this.totalPagesRecieved = res.pages;
                this.isLoading.set(false);
            },
            error: () => {
                this.toastService.show('Failed to load balance share requests', 'error');
                this.isLoading.set(false);
            }
        });
    }

    loadData() {
        this.loadBalanceShareRecieved();
        this.loadBalanceShareRequests();
        this.reportService.getDailyReport(
            undefined,
            this.currentUserOfficeId() ?? undefined
        ).subscribe(res => {
            this.daily_total = res?.daily_total ?? 0;
        });
    }

    loadRequestData() {
        this.isLoading.set(true);
        const params: any = {
            page: this.currentPage,
            per_page: this.pageSize
        };
        this.balanceShareService.getRequests(params).subscribe({
            next: (res) => {
                this.incomingRequests.set(res.incoming || []);
                this.outgoingRequests.set(res.outgoing || []);
                this.isLoading.set(false);
            },
            error: () => {
                this.toastService.show('Failed to load balance share requests', 'error');
                this.isLoading.set(false);
            }
        });
    }

    loadOffices() {
        this.authService.getOfficesForBalanceSharing().subscribe({
            next: (res) => {
                this.offices.set(res || []);
            }
        });
    }


    openShareModal() {
        this.balanceShareForm.reset();
        this.reportService.getDailyReport(
            undefined,
            this.currentUserOfficeId() ?? undefined
        ).subscribe(report => {
            this.daily_total = report?.daily_total ?? 0;
            this.balanceShareForm.setValue({
                amount: this.daily_total,
                receiver_office_id: ''
            });
        });
        this.isShareModalOpen.set(true);
    }

    closeShareModal() {
        this.isShareModalOpen.set(false);
        this.balanceShareForm.reset();
        this.balanceShareForm.markAsPristine();
        this.balanceShareForm.markAsUntouched();
    }

    submitShare() {
        if (this.balanceShareForm.invalid) {
            this.balanceShareForm.markAllAsTouched();
            this.toastService.show('Please fill in all the fields', 'error');
            return;
        }

        if (this.outgoingRequests().length > 0) {
            const waitingStatusReq = this.outgoingRequests().find(req => req.status === 'waiting');
            if (waitingStatusReq) {
                this.toastService.show('You have a waiting balance share request', 'error');
                return;
            }
        }

        if (!this.balanceShareForm.value.amount || this.balanceShareForm.value.amount <= 0) {
            this.toastService.show('Please enter a valid amount', 'error');
            return;
        }
        if (!this.balanceShareForm.value.receiver_office_id) {
            this.toastService.show('Please select a receiver office', 'error');
            return;
        }

        if (this.balanceShareForm.value.amount > this.daily_total) {
            this.toastService.show('Insufficient balance', 'error');
            return;
        }

        if (this.isSubmitting()) return;
        this.isSubmitting.set(true);

        this.balanceShareService.createRequest({
            amount: this.balanceShareForm.value.amount,
            receiver_office_id: Number(this.balanceShareForm.value.receiver_office_id)
        }).subscribe({
            next: (res) => {
                this.toastService.show('Balance share requested successfully', 'success');
                this.closeShareModal();
                this.loadData();
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.toastService.show(err.error?.message || 'Failed to request balance share', 'error');
                this.isSubmitting.set(false);
            }
        });
    }

    async acceptRequest(req: BalanceShareRequest) {
        const confirmed = await this.confirmationService.confirm({
            title: 'Accept Balance Share',
            message: `Are you sure you want to accept ${req.amount} from ${req.sender_office_name}? This will create a Receipt for your office and a Payment for the sender.`,
            confirmText: 'Accept',
            cancelText: 'Back'
        });

        if (!confirmed) return;

        if (this.isSubmitting()) return;
        this.isSubmitting.set(true);

        this.balanceShareService.acceptRequest(req.id).subscribe({
            next: () => {
                this.toastService.show('Balance share accepted successfully', 'success');
                this.loadData();
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.toastService.show(err.error?.message || 'Failed to accept', 'error');
                this.isSubmitting.set(false);
            }
        });
    }

    openCancelModal(req: BalanceShareRequest) {
        this.cancelForm.patchValue({
            id: req.id,
            comment: ''
        });
        this.isCancelModalOpen.set(true);
    }

    closeCancelModal() {
        this.isCancelModalOpen.set(false);
        this.cancelForm.reset();
        this.cancelForm.markAsPristine();
        this.cancelForm.markAsUntouched();
    }

    submitCancel() {
        if (!this.cancelForm.value.comment?.trim()) {
            this.cancelForm.get('comment')?.markAsTouched();
            this.toastService.show('Please enter a cancellation comment', 'error');
            return;
        }

        if (!this.cancelForm.value.id) return;

        if (this.isSubmitting()) return;
        this.isSubmitting.set(true);

        this.balanceShareService.cancelRequest(this.cancelForm.value.id, this.cancelForm.value.comment).subscribe({
            next: () => {
                this.toastService.show('Request cancelled successfully', 'success');
                this.closeCancelModal();
                this.loadData();
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.toastService.show(err.error?.message || 'Failed to cancel', 'error');
                this.isSubmitting.set(false);
            }
        });
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'waiting': return 'bg-yellow-100 text-yellow-800 border bg-yellow-100';
            case 'accepted': return 'bg-green-100 text-green-800 border bg-green-100';
            case 'cancelled': return 'bg-red-100 text-red-800 border bg-red-100';
            default: return 'bg-slate-100 text-slate-800 border bg-slate-100';
        }
    }
}
