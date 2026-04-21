import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CargoRequest {
    id: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    pickup_address: string;
    pickup_lat: number | null;
    pickup_lng: number | null;
    pickup_place_id: string | null;
    dropoff_address: string;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    dropoff_place_id: string | null;
    cargo_description: string;
    estimated_weight?: number;
    number_of_packages?: number;
    status: string;
    invoice_status: string | null;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class CargoRequestService {
    private apiRoot = environment.apiBaseUrl.endsWith('/api')
        ? environment.apiBaseUrl
        : `${environment.apiBaseUrl}/api`;
        
    private apiUrl = `${this.apiRoot}/cargo_requests/`;
    private http = inject(HttpClient);

    getRequests(): Observable<CargoRequest[]> {
        return this.http.get<CargoRequest[]>(this.apiUrl);
    }

    getRequestById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    assignToMe(id: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${id}/assign`, {});
    }

    markAsInvoiced(id: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${id}/mark_invoiced`, {});
    }

    approvePayment(id: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${id}/approve_payment`, {});
    }
}
