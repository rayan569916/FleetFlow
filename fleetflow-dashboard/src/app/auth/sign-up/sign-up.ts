import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup,ReactiveFormsModule,Validators } from '@angular/forms';
import { email } from '@angular/forms/signals';
import { passwordMatchValidator } from './password-match.validator';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { designations, offices } from '../../core/constants/dashboard.constants';


@Component({
  selector: 'app-sign-up',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUpComponent implements OnInit {
  signupForm!: FormGroup;

  designations = designations;

  offices = offices;
  constructor(private formBuilder: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    this.signupForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      designationId: ['', Validators.required], // New field
      officeId: ['', Validators.required],      // New field
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
    console.log('Form Value:', this.signupForm.value);
    this.router.navigate(['/dashboard']);
  }
}
