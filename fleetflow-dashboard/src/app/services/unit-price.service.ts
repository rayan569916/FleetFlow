import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface UnitPriceInterface {
    id: number;
    air_price: number;
    sea_price: number;
    bill_charge: number;
    packing_charge: number;
    country: string;
}

@Injectable({
    providedIn: 'root'
})



export class UnitPriceService {
    private apiUrl = `${environment.apiBaseUrl}/api/unit_price`;
    private http = inject(HttpClient);

    getUnitPrice(): Observable<UnitPriceInterface[]> {
        return this.http.get<UnitPriceInterface[]>(`${this.apiUrl}/list_unit_price`);
    }

    getCountries(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/countries`);
    }

    createUnitPrice(unitPriceData: Omit<UnitPriceInterface, 'id'>): Observable<any> {
        return this.http.post<any>(this.apiUrl, unitPriceData);
    }

    updateUnitPrice(id: number, unitPriceData: Omit<UnitPriceInterface, 'id'>): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, unitPriceData);
    }

    // deleteUnitPrice(id: number): Observable<any> {
    //     return this.http.delete<any>(`${this.apiUrl}/${id}`);
    // }
}
