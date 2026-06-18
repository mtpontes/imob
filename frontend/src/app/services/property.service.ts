import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PropertyResponse, CreatePropertyRequest } from '../types';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private apiUrl = '/api/properties';

  constructor(private http: HttpClient) {}

  getProperties(): Observable<PropertyResponse[]> {
    return this.http.get<PropertyResponse[]>(this.apiUrl);
  }

  createProperty(request: CreatePropertyRequest): Observable<PropertyResponse> {
    return this.http.post<PropertyResponse>(this.apiUrl, request);
  }

  deleteProperty(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
