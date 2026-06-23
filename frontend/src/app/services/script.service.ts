import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ScriptResponse, CreateScriptRequest, UpdateScriptRequest } from '../types';

@Injectable({
  providedIn: 'root'
})
export class ScriptService {
  private apiUrl = '/api/scripts';
  private scriptCache = new Map<string, ScriptResponse>();

  constructor(private http: HttpClient) {}

  getActiveScripts(): Observable<ScriptResponse[]> {
    return this.http.get<ScriptResponse[]>(this.apiUrl);
  }

  getScript(id: string): Observable<ScriptResponse> {
    if (this.scriptCache.has(id)) {
      return of(this.scriptCache.get(id)!);
    }
    return this.http.get<ScriptResponse>(`${this.apiUrl}/${id}`).pipe(
      tap(script => this.scriptCache.set(id, script))
    );
  }

  createScript(request: CreateScriptRequest): Observable<ScriptResponse> {
    return this.http.post<ScriptResponse>(this.apiUrl, request);
  }

  updateScript(id: string, request: UpdateScriptRequest): Observable<ScriptResponse> {
    return this.http.put<ScriptResponse>(`${this.apiUrl}/${id}`, request).pipe(
      tap(script => this.scriptCache.set(id, script))
    );
  }

  deleteScript(id: string): Observable<void> {
    this.scriptCache.delete(id);
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
