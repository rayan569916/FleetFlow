import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
      <!-- Username Field -->
      <div>
        <label class="block text-sm font-medium text-slate-700">Username</label>
        <div class="mt-1">
          <input type="text" formControlName="username"
            class="block w-full px-3 py-2 bg-slate-50 border rounded-md text-sm shadow-sm focus:ring-1 outline-none transition-all"
            [class.border-red-500]="loginForm.get('username')?.touched && loginForm.get('username')?.invalid"
            [class.border-slate-300]="!(loginForm.get('username')?.touched && loginForm.get('username')?.invalid)"
            [class.focus:ring-red-500]="loginForm.get('username')?.touched && loginForm.get('username')?.invalid"
            [class.focus:ring-indigo-500]="!(loginForm.get('username')?.touched && loginForm.get('username')?.invalid)">
        </div>
        
        <p *ngIf="loginForm.get('username')?.touched && loginForm.get('username')?.invalid" class="mt-1 text-xs text-red-500">
          Username is required.
        </p>
      </div>

      <!-- Password Field -->
      <div>
        <label class="block text-sm font-medium text-slate-700">Password</label>
        <div class="mt-1">
          <input type="password" formControlName="password"
            class="block w-full px-3 py-2 bg-slate-50 border rounded-md text-sm shadow-sm focus:ring-1 outline-none transition-all"
            [class.border-red-500]="loginForm.get('password')?.touched && loginForm.get('password')?.invalid"
            [class.border-slate-300]="!(loginForm.get('password')?.touched && loginForm.get('password')?.invalid)"
            [class.focus:ring-red-500]="loginForm.get('password')?.touched && loginForm.get('password')?.invalid"
            [class.focus:ring-indigo-500]="!(loginForm.get('password')?.touched && loginForm.get('password')?.invalid)">
        </div>

        <p *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="mt-1 text-xs text-red-500">
          Password is required.
        </p>
      </div>

      <!-- Submit Button -->
      <div>
        <button type="submit" [disabled]="loginForm.invalid" 
          [class.opacity-50]="loginForm.invalid"
          [class.cursor-not-allowed]="loginForm.invalid"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Sign In
        </button>
      </div>
    </form>
  `,
  styles: [`
    /* Add any component-specific styles here if needed */
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

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
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    })
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        // Delay slightly for smoother UX
        setTimeout(() => {
          this.toastService.show('Welcome back!', 'success');
          this.router.navigate(['/dashboard']);
          this.isLoading = false;
        }, 500);
      },
      error: (error: any) => {
        console.error('Login failed', error);
        const msg = error.error?.message || 'Login failed. Please try again.';
        this.toastService.show(msg, 'error');
        this.errorMessage = msg;
        this.isLoading = false;
      }
    });
  }
}
