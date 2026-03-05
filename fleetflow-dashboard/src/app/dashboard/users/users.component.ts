import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, User } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './users.component.html',
    styles: [`
    .invoice-wrapper { max-width: 1200px; margin: 0 auto; padding: 20px; }
  `]
})
export class UsersComponent implements OnInit {
    private userService = inject(UserService);
    private router = inject(Router);

    users: User[] = [];
    errorMessage: string = '';

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.errorMessage = '';
        this.userService.getUsers().subscribe({
            next: (res) => {
                console.log('Users loaded:', res);
                this.users = res.users;
            },
            error: (err) => {
                console.error('Failed to load users', err);
                this.errorMessage = err.message || 'Unknown error occurred';
            }
        });
    }

    goBack() { this.router.navigate(['/dashboard/settings']); }
}
