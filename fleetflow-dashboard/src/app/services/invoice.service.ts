import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Invoice {
    id?: number;
    invoice_number?: string;
    amount: number;
    date: string;
    status: string;
    description: string;
    created_at?: string;
    full_name?: string; // Creator's name
    tracking_number?: string;
}

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {
    private apiUrl = 'http://127.0.0.1:5000/invoices';
    private http = inject(HttpClient);

    getInvoices(): Observable<any> {
        return this.http.get<any>(this.apiUrl);
    }

    createInvoice(invoiceData: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, invoiceData);
    }

    getInvoiceById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    updateStatus(id: number, status: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status });
    }

    deleteInvoice(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}
