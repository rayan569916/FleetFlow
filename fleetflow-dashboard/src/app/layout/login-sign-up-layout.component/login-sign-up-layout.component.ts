import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {SignUpComponent} from '../../auth/sign-up/sign-up';
import {LoginComponent} from '../../auth/login/login'

@Component({
  selector: 'app-login-sign-up-layout.component',
  imports: [CommonModule,SignUpComponent,LoginComponent ],
  templateUrl: './login-sign-up-layout.component.html',
  styleUrl: './login-sign-up-layout.component.css',
})
export class LoginSignUpLayoutComponent {
  constructor (private router:Router) {}
  isLogin = true;

  toggleMode() {
    this.isLogin = !this.isLogin;
  }

  onSubmit() {
    console.log(this.isLogin ? 'Logging in...' : 'Signing up...');
    this.router.navigate(['/dashboard']);
  }
}
