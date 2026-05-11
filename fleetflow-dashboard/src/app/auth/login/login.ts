import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { UsersLoginList, UserLogin } from '../../core/models/dashboard.models';
import { toSignal } from '@angular/core/rxjs-interop';



@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.component.css'
})


export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  isOpen = false;

  // users = computed(()=> )


  private formBuilder= inject(FormBuilder);
  private router= inject(Router);
  private authService= inject(AuthService);
  private toastService= inject(ToastService);


  users = toSignal(this.authService.getUsersLoginList(), { initialValue: [] })
  // usersLoginList = computed(()=>{
  //   if(this.users().length > 0){
  //     for (let user of this.users()){
        
  //     }
  //   }
  // })

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    })
  }



  // getUsersLoginList(){
  //   this.authService.getUsersLoginList().subscribe({
  //     next: (response: UsersLoginList[]) => {
  //         this.usersLoginList = response;
  //         console.log(this.usersLoginList);
  //     }
  //   })
  // }

  // users: UserLogin[] = [
  //   {
  //     id: 1,
  //     name: 'Wade Cooper',
  //     avatar: 'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc'
  //   },
  //   {
  //     id: 2,
  //     name: 'Arlene Mccoy',
  //     avatar: 'https://images.unsplash.com/photo-1550525811-e5869dd03032'
  //   },
  //   {
  //     id: 3,
  //     name: 'Devon Webb',
  //     avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'
  //   },
  //   {
  //     id: 4,
  //     name: 'Tom Cook',
  //     avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
  //   }
  // ];

  selectedUser: UsersLoginList | null = null;
  searchTerm = signal('');

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.users();
    if (!term) return list;
    return list.filter(u => 
      u.full_name.toLowerCase().includes(term) || 
      u.username.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchTerm.set('');
    }
  }

  selectUser(user: UsersLoginList) {
    this.loginForm.patchValue({ username: user.username });
    this.selectedUser = user;
    this.isOpen = false;
  }

  getUserIcon(role: string): string {
    if (!role) return '/icons/driver.jpg';
    const r = role.toLowerCase();
    if (r.includes('admin')) return '/icons/admin.jpg';
    if (r.includes('management') || r.includes('shop_manager')) return '/icons/management.jpg';
    return '/icons/driver.jpg';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
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
