import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScriptResponse, CreateScriptRequest, UpdateScriptRequest } from '../types';

@Injectable({
  providedIn: 'root'
})
export class ScriptService {
  private apiUrl = '/api/scripts';

  constructor(private http: HttpClient) {}

  getActiveScripts(): Observable<ScriptResponse[]> {
    return this.http.get<ScriptResponse[]>(this.apiUrl);
  }

  createScript(request: CreateScriptRequest): Observable<ScriptResponse> {
    return this.http.post<ScriptResponse>(this.apiUrl, request);
  }

  updateScript(id: string, request: UpdateScriptRequest): Observable<ScriptResponse> {
    return this.http.put<ScriptResponse>(`${this.apiUrl}/${id}`, request);
  }
}
