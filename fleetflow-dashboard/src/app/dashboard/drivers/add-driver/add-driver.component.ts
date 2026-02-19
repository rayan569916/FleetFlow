import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';

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
            console.log('Driver Data:', this.driverForm.value);
            alert('Driver added successfully! (Mock)');
            this.router.navigate(['/dashboard/drivers']);
        }
    }
}
