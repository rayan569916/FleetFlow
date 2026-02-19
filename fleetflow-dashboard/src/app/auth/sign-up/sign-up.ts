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
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  roles: any[] = [];

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
    this.fetchRoles();
  }

  private fetchRoles(): void {
    this.authService.getRoles().subscribe({
      next: (data) => {
        this.roles = data.map(role => ({
          ...role,
          displayName: role.name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        }));
      },
      error: (err) => console.error('Failed to fetch roles', err)
    });
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
      role_id: formData.role, // This will now be the numeric ID from the select
      password: formData.password
    };

    this.isLoading = true;
    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        console.log('Registration successful', response);
        this.successMessage = 'User registered successfully!';
        this.errorMessage = null;
        this.toastService.show(this.successMessage || '', 'success');
        this.signupForm.reset();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Registration failed', error);
        this.errorMessage = error.error?.message || 'Registration failed.';
        this.successMessage = null;
        this.toastService.show(this.errorMessage || '', 'error');
        this.isLoading = false;
      }
    });
  }
}
