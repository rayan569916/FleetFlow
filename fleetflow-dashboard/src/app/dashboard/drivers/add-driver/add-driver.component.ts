import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { ConfirmationDialogService } from '../../../services/confirmation-dialog.service';

@Component({
    selector: 'app-add-driver',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './add-driver.component.html',
    styleUrl: './add-driver.component.css'
})
export class AddDriverComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private confirmationService = inject(ConfirmationDialogService);
    public isSubmitting = false;

    driverForm = this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        licenseNumber: ['', Validators.required],
        status: ['active', Validators.required],
        joinDate: [new Date().toISOString().split('T')[0], Validators.required]
    });

    cancel() {
        this.router.navigate(['/dashboard/drivers']);
    }

    onSubmit() {
        if (this.driverForm.valid) {
            if (this.isSubmitting) return;
            this.isSubmitting = true;
            console.log('Driver Data:', this.driverForm.value);
            alert('Driver added successfully! (Mock)');
            this.router.navigate(['/dashboard/drivers']);
        }
    }

    async canDeactivate(): Promise<boolean> {
        if (this.isSubmitting || !this.driverForm.dirty) return true;

        return this.confirmationService.confirm({
            title: 'Unsaved Changes',
            message: 'You have an unsaved driver form. Leave this page and discard changes?',
            confirmText: 'Leave',
            cancelText: 'Stay'
        });
    }
}
