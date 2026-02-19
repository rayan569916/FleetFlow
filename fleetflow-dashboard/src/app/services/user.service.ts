import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

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
    private apiUrl = 'http://localhost:5000';

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
