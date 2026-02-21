import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface User {
    id: number;
    username: string;
    role: string;
    full_name: string;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = environment.apiBaseUrl;

    constructor() { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.authService.getToken()}`
        });
    }

    getUsers(): Observable<{ users: User[] }> {
        return this.http.get<{ users: User[] }>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
    }
}
