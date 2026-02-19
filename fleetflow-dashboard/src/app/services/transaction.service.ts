import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Entry } from '../core/models/dashboard.models';

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5000/api/transactions';

    getTransactions(type: string): Observable<Entry[]> {
        return this.http.get<Entry[]>(`${this.apiUrl}`, {
            params: { type }
        });
    }

    addTransaction(transaction: Omit<Entry, 'id'>): Observable<Entry> {
        return this.http.post<Entry>(this.apiUrl, transaction);
    }

    deleteTransaction(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
