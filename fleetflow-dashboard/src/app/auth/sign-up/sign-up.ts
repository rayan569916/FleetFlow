import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { passwordMatchValidator } from './password-match.validator';

import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUpComponent implements OnInit {
  signupForm!: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  private uiStateService = inject(UiStateService);
  sidebarExpanded$ = this.uiStateService.sidebarExpanded$;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) { }



  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    this.signupForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
      ConfirmPassword: ['', [Validators.required]]
    }, {
      validators: passwordMatchValidator
    });
  }

  onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const formData = this.signupForm.value;
    const registerData = {
      username: formData.email, // Mapping email to username
      full_name: formData.fullName,
      role: formData.role,
      password: formData.password
    };

    this.isLoading = true;
    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        console.log('Registration successful', response);
        this.toastService.show('User registered successfully!', 'success');
        this.signupForm.reset();
        this.isLoading = false;
        // Optional: navigating away or staying on page for more registrations
      },
      error: (error: any) => {
        console.error('Registration failed', error);
        const msg = error.error?.message || 'Registration failed.';
        this.toastService.show(msg, 'error');
        this.isLoading = false;
      }
    });
  }
}
