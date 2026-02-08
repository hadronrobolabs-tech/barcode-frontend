import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KitService {
  private apiUrl = `${environment.BASE_URL}/api/kits`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  create(data: { name: string; prefix: string }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getComponentsForKit(kitId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${kitId}/components`);
  }

  addSubComponent(kitId: number, parentComponentId: number, data: {
    component: { name: string; category: string; is_packet?: boolean; packet_quantity?: number; description?: string };
    required_quantity: number;
    barcode_prefix: string;
  }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${kitId}/components/${parentComponentId}/sub-components`,
      data
    );
  }

  removeSubComponent(kitId: number, parentComponentId: number, componentId: number, deleteComponent?: boolean): Observable<any> {
    const params: { [key: string]: string } = {};
    if (deleteComponent) params['delete_component'] = 'true';
    return this.http.delete(
      `${this.apiUrl}/${kitId}/components/${parentComponentId}/sub-components/${componentId}`,
      Object.keys(params).length ? { params } : {}
    );
  }

  addComponent(data: {
    kit_id: number;
    component: {
      name: string;
      category: string;
      is_packet?: boolean;
      packet_quantity?: number;
      description?: string;
      component_id?: number; // Optional: if adding existing component
    };
    required_quantity: number;
    barcode_prefix?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/components`, data);
  }

  updateComponent(data: {
    kit_id: number;
    category_id: number;
    required_quantity: number;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/components`, data);
  }

  removeComponent(data: {
    kit_id: number;
    category_id?: number;
    component_id?: number;
  }): Observable<any> {
    return this.http.delete(`${this.apiUrl}/components`, { body: data });
  }

  updateComponentDetails(data: {
    kit_id: number;
    component_id: number;
    component: {
      name: string;
      category: string;
      is_packet?: boolean;
      packet_quantity?: number;
      description?: string;
      parent_component_id?: number | null;
    };
    required_quantity: number;
    barcode_prefix: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/components/details`, data);
  }

  deleteComponent(data: {
    kit_id: number;
    component_id: number;
    delete_component?: boolean;
  }): Observable<any> {
    return this.http.delete(`${this.apiUrl}/components/delete`, { body: data });
  }

  update(id: number, data: { kit_name: string; description?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

