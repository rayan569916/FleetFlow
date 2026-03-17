import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BalanceShareRequest {
    id: number;
    sender_office_id: number;
    sender_office_name: string;
    receiver_office_id: number;
    receiver_office_name: string;
    amount: number;
    status: 'waiting' | 'accepted' | 'cancelled';
    comment: string | null;
    date: string;
    created_at: string;
    accepted_at: string | null;
}

export interface BalanceShareResponse {
    incoming: BalanceShareRequest[];
    outgoing: BalanceShareRequest[];
}



@Injectable({
    providedIn: 'root'
})
export class BalanceShareService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/balance_share`;

    getRequests(params?: any): Observable<BalanceShareResponse> {
        return this.http.get<BalanceShareResponse>(`${this.apiUrl}/requests`, { params });
    }

    getBalanceShareRecieved(params?: any): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/balance-share-received`, { params });
    }

    getBalanceShareRequests(params?: any): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/balance-share-requests`, { params });
    }

    createRequest(payload: { amount: number, receiver_office_id: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/request`, payload);
    }

    acceptRequest(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/accept/${id}`, {});
    }

    cancelRequest(id: number, comment: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/cancel/${id}`, { comment });
    }
}
