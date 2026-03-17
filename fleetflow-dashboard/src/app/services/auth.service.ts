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

export interface OfficePayload {
    name: string;
    location?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiRoot = environment.apiBaseUrl.endsWith('/api')
        ? environment.apiBaseUrl
        : `${environment.apiBaseUrl}/api`;
    private apiUrl = `${this.apiRoot}/auth`;

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
    currentUserOfficeId = signal<string | null>(localStorage.getItem('user_office_id'));

    register(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, userData);
    }

    getRoles(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/roles`);
    }

    getOffices(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/offices`);
    }

    getOfficesForBalanceSharing(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/offices_for_balance_sharing`);
    }

    createOffice(payload: OfficePayload): Observable<any> {
        return this.http.post(`${this.apiUrl}/offices`, payload);
    }

    updateOffice(officeId: number, payload: OfficePayload): Observable<any> {
        return this.http.put(`${this.apiUrl}/offices/${officeId}`, payload);
    }

    getUsers(params?: { page?: number; per_page?: number; office_id?: number; role_id?: number }): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/users`, { params: params as any });
    }

    updateUser(userId: number, userData: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/users/${userId}`, userData);
    }

    deleteUser(userId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/users/${userId}`);
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

    hasFullAccess = computed(() => {
        const role = this.currentUserRole();
        return role === 'Super_admin' || role === 'super_admin' || role === 'management';
    });

    isAdmin = computed(() => {
        return this.currentUserRole() === 'Super_admin';
    });

    isShopManager = computed(() => {
        return this.currentUserRole() === 'shop_manager';
    });

    isDriver = computed(() => {
        return this.currentUserRole() === 'driver';
    });

    isManagement = computed(() => {
        return this.currentUserRole() === 'management';
    });

    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }
}
