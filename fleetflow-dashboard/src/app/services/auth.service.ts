import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
    token: string;
    role: string;
    username: string;
    full_name: string;
    office_id: number | null;
    office_name: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiBaseUrl}/api/auth`;

    // Signal to hold the current user's role
    currentUserRole = signal<string | null>(localStorage.getItem('user_role'));

    constructor(private http: HttpClient, private router: Router) { }

    login(credentials: { username: string, password: string }): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('user_role', response.role);
                localStorage.setItem('user_name', response.username);
                localStorage.setItem('user_full_name', response.full_name || response.username);
                localStorage.setItem('user_office_id', response.office_id !== null ? String(response.office_id) : '');
                localStorage.setItem('user_office_name', response.office_name || '');
                // Update the signal
                this.currentUserRole.set(response.role);
                this.currentUserOfficeName.set(response.office_name || '');
                this.currentUserName.set(response.username);
                this.currentUserFullName.set(response.full_name || response.username);
            })
        );
    }

    currentUserName = signal<string | null>(localStorage.getItem('user_name'));
    currentUserFullName = signal<string | null>(localStorage.getItem('user_full_name'));
    currentUserOfficeName = signal<string | null>(localStorage.getItem('user_office_name'));

    register(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, userData);
    }

    getRoles(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/roles`);
    }

    getOffices(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/offices`);
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_full_name');
        localStorage.removeItem('user_office_id');
        localStorage.removeItem('user_office_name');
        this.currentUserRole.set(null);
        this.currentUserName.set(null);
        this.currentUserFullName.set(null);
        this.currentUserOfficeName.set(null);
        this.router.navigate(['/login']);
    }

    isSuperAdminOrCEO = computed(() => {
        const role = this.currentUserRole();
        return role === 'super_admin' || role === 'ceo';
    });

    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }
}
