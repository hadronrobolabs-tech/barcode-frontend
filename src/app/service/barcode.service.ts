import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private apiUrl = `${environment.BASE_URL}/api/barcodes`;

  constructor(private http: HttpClient) {}

  getAll(filters?: {
    object_type?: string;
    object_id?: number;
    status?: string;
    limit?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] !== undefined) {
          params = params.set(key, filters[key as keyof typeof filters]!.toString());
        }
      });
    }
    return this.http.get(this.apiUrl, { params });
  }

  generate(data: {
    product_id: number;
    component_id: number | null;
    parent_component_id?: number | null;
    quantity: number;
    user_id?: number;
    object_type?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, data);
  }

  // TSPL Raw Printing (Direct to TSC TE244 printer)
  printTSPL(data: { 
    barcodes: string[]; 
    user_id?: number;
    printer_device?: string;
    step_text?: string;  // Optional: STEP text (default: "STEP 12")
    number_of_prints?: string;  // Optional: number of copies (default: "1")
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/print/tspl`, data);
  }

  downloadPdf(data: { barcodes: string[]; user_id?: number }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download/pdf`, data, {
      responseType: 'blob'
    });
  }

  preview(data: { barcode: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/preview`, data);
  }

  previewScan(barcode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/preview-scan`, { barcode });
  }

      scan(data: { barcode: string; user_id?: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/scan`, data);
      }

      unscan(data: { barcode: string; user_id?: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/unscan`, data);
      }

      getScannedNotBoxed(filters?: {
        kit_id?: number;
        start_date?: string;
        end_date?: string;
        limit?: number;
      }): Observable<any> {
        let params = new HttpParams();
        if (filters) {
          Object.keys(filters).forEach(key => {
            if (filters[key as keyof typeof filters] !== undefined) {
              params = params.set(key, filters[key as keyof typeof filters]!.toString());
            }
          });
        }
        return this.http.get(`${this.apiUrl}/scanned-not-boxed`, { params });
      }

      exportScannedNotBoxed(filters?: {
        kit_id?: number;
        start_date?: string;
        end_date?: string;
      }): Observable<Blob> {
        let params = new HttpParams();
        if (filters) {
          Object.keys(filters).forEach(key => {
            if (filters[key as keyof typeof filters] !== undefined) {
              params = params.set(key, filters[key as keyof typeof filters]!.toString());
            }
          });
        }
        return this.http.get(`${this.apiUrl}/export-scanned-not-boxed`, {
          params,
          responseType: 'blob'
        });
      }

      lookupBarcodesForBoxCode(data: {
        barcodes: string[];
        user_id?: number;
      }): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/lookup-box-code`, data, {
          responseType: 'blob'
        });
      }
    }

