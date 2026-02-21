import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DailyReportData {
    date: string;
    total_invoice_grand: number;
    bank_transfer_swipe_sum: number;
    total_payment: number;
    total_purchase: number;
    total_receipt: number;
    previous_total: number;
    daily_total: number;
    is_stored: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/api/reports`;

    getDailyReport(date?: string): Observable<DailyReportData> {
        const url = date ? `${this.apiUrl}/daily?date=${date}` : `${this.apiUrl}/daily`;
        return this.http.get<DailyReportData>(url);
    }

    saveDailyReport(data: DailyReportData): Observable<any> {
        return this.http.post(`${this.apiUrl}/daily/save`, data);
    }
}
