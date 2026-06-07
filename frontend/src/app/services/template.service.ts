import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TemplateResponse, CreateTemplateRequest, UpdateTemplateRequest } from '../types';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private apiUrl = '/api/templates';

  constructor(private http: HttpClient) {}

  getActiveTemplates(): Observable<TemplateResponse[]> {
    return this.http.get<TemplateResponse[]>(this.apiUrl);
  }

  createTemplate(request: CreateTemplateRequest): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(this.apiUrl, request);
  }

  updateTemplate(id: string, request: UpdateTemplateRequest): Observable<TemplateResponse> {
    return this.http.put<TemplateResponse>(`${this.apiUrl}/${id}`, request);
  }
}
