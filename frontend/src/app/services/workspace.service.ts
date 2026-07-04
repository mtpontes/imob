import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkspaceResponse, CreateWorkspaceRequest, ChangeActiveWorkspaceRequest, InviteUserRequest } from '../types';

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

  inviteUser(email: string): Observable<any> {
    const request: InviteUserRequest = { email };
    return this.http.post<any>(`${this.apiUrl}/invite`, request);
  }
}
