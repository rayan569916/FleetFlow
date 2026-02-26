import { Component, OnInit, inject, signal } from '@angular/core';
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
  roles = signal<any[]>([]);
  offices = signal<any[]>([]);
  users = signal<any[]>([]);
  editingUser = signal<any | null>(null);

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
    this.fetchOffices();
    this.fetchUsers();
  }

  private fetchUsers(): void {
    this.authService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data.users);
      },
      error: (err) => console.error('Failed to fetch users', err)
    });
  }

  private fetchRoles(): void {
    this.authService.getRoles().subscribe({
      next: (data) => {
        const mappedRoles = data.map(role => ({
          ...role,
          displayName: role.name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        }));
        this.roles.set(mappedRoles);
      },
      error: (err) => console.error('Failed to fetch roles', err)
    });
  }

  private fetchOffices(): void {
    this.authService.getOffices().subscribe({
      next: (data) => {
        this.offices.set(data);
      },
      error: (err) => console.error('Failed to fetch offices', err)
    });
  }

  private buildForm(): void {
    const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    this.signupForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      officeId: ['', Validators.required],
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
      office_id: Number(formData.officeId),
      password: formData.password
    };

    this.isLoading = true;
    const editingUserId = this.editingUser()?.id;
    if (editingUserId) {
      this.authService.updateUser(editingUserId, registerData).subscribe({
        next: () => {
          this.toastService.show('User updated successfully!', 'success');
          this.resetForm();
          this.fetchUsers();
          this.isLoading = false;
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Update failed', 'error');
          this.isLoading = false;
        }
      });
    } else {
      this.authService.register(registerData).subscribe({
        next: (response: any) => {
          console.log('Registration successful', response);
          this.successMessage = 'User registered successfully!';
          this.errorMessage = null;
          this.toastService.show(this.successMessage || '', 'success');
          this.resetForm();
          this.fetchUsers();
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

  onEdit(user: any): void {
    this.editingUser.set(user);
    const roleId = this.roles().find((r: any) => r.name === user.role)?.id;
    this.signupForm.patchValue({
      fullName: user.full_name,
      email: user.username,
      role: roleId,
      officeId: user.office_id,
      password: '',
      ConfirmPassword: ''
    });
    // Remove password requirement when editing
    this.signupForm.get('password')?.setValidators([Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]);
    this.signupForm.get('ConfirmPassword')?.setValidators([]);
    this.signupForm.get('password')?.updateValueAndValidity();
    this.signupForm.get('ConfirmPassword')?.updateValueAndValidity();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(userId: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.authService.deleteUser(userId).subscribe({
        next: () => {
          this.toastService.show('User deleted successfully!', 'success');
          this.fetchUsers();
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Delete failed', 'error');
        }
      });
    }
  }

  resetForm(): void {
    this.editingUser.set(null);
    this.signupForm.reset();
    this.buildForm(); // Re-apply validators
    this.successMessage = null;
    this.errorMessage = null;
  }
}
