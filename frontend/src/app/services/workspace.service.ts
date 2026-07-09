import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkspaceResponse, CreateWorkspaceRequest, ChangeActiveWorkspaceRequest, InviteResponse, InviteDetailsResponse } from '../types';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private apiUrl = '/api/workspaces';

  constructor(private http: HttpClient) {}

  getWorkspaces(): Observable<WorkspaceResponse[]> {
    return this.http.get<WorkspaceResponse[]>(this.apiUrl);
  }

  createWorkspace(request: CreateWorkspaceRequest): Observable<WorkspaceResponse> {
    return this.http.post<WorkspaceResponse>(this.apiUrl, request);
  }

  changeActiveWorkspace(workspaceId: string): Observable<void> {
    const request: ChangeActiveWorkspaceRequest = { workspaceId };
    return this.http.post<void>(`${this.apiUrl}/active`, request);
  }

  createInvite(role: string): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(`${this.apiUrl}/invite`, { role });
  }

  getInviteDetails(token: string): Observable<InviteDetailsResponse> {
    return this.http.get<InviteDetailsResponse>(`${this.apiUrl}/invite/${token}`);
  }

  acceptInvite(token: string): Observable<WorkspaceResponse> {
    return this.http.post<WorkspaceResponse>(`${this.apiUrl}/invite/${token}/accept`, {});
  }

  updateWorkspace(workspaceId: string, name: string): Observable<WorkspaceResponse> {
    return this.http.put<WorkspaceResponse>(`${this.apiUrl}/${workspaceId}`, { name });
  }

  deleteWorkspace(workspaceId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}`);
  }
}
