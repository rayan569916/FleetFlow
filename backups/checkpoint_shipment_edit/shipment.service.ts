import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Shipment {
    id?: number;
    tracking_number: string;
    status: string;
    origin?: string;
    destination?: string;
    estimated_delivery?: string;
    carrier?: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ShipmentService {
    private apiUrl = 'http://localhost:5000/shipments';
    private http = inject(HttpClient);

    getShipments(): Observable<Shipment[]> {
        return this.http.get<Shipment[]>(this.apiUrl);
    }

    createShipment(shipment: Shipment): Observable<any> {
        return this.http.post<any>(this.apiUrl, shipment);
    }

    updateShipment(id: number, shipment: Shipment): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, shipment);
    }

    deleteShipment(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}
