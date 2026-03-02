import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface User {
    id: number;
    username: string;
    role: string;
    office_id: number | null;
    office_name: string | null;
    full_name: string;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiRoot = environment.apiBaseUrl.endsWith('/api')
        ? environment.apiBaseUrl
        : `${environment.apiBaseUrl}/api`;

    constructor() { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.authService.getToken()}`
        });
    }

    getUsers(): Observable<{ users: User[] }> {
        return this.http.get<{ users: User[] }>(`${this.apiRoot}/auth/users`, { headers: this.getHeaders() });
    }
}
