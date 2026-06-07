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

  getScript(id: string, version: number): Observable<ScriptResponse> {
    const cacheKey = `${id}_v${version}`;
    if (this.scriptCache.has(cacheKey)) {
      return of(this.scriptCache.get(cacheKey)!);
    }
    return this.http.get<ScriptResponse>(`${this.apiUrl}/${id}/version/${version}`).pipe(
      tap(script => this.scriptCache.set(cacheKey, script))
    );
  }

  createScript(request: CreateScriptRequest): Observable<ScriptResponse> {
    return this.http.post<ScriptResponse>(this.apiUrl, request);
  }

  updateScript(id: string, request: UpdateScriptRequest): Observable<ScriptResponse> {
    return this.http.put<ScriptResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteScript(id: string): Observable<void> {
    this.scriptCache.forEach((_, key) => {
      if (key.startsWith(`${id}_`)) this.scriptCache.delete(key);
    });
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
