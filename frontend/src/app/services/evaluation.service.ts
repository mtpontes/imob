import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EvaluationResponse, CreateEvaluationRequest, GenerateUploadUrlResponse } from '../types';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private apiUrl = '/api/evaluations';

  constructor(private http: HttpClient) {}

  createEvaluation(request: CreateEvaluationRequest): Observable<EvaluationResponse> {
    return this.http.post<EvaluationResponse>(this.apiUrl, request);
  }

  getEvaluationsByProperty(propertyId: string): Observable<EvaluationResponse[]> {
    return this.http.get<EvaluationResponse[]>(`${this.apiUrl}/property/${propertyId}`);
  }

  generateUploadUrl(fileName: string): Observable<GenerateUploadUrlResponse> {
    return this.http.post<GenerateUploadUrlResponse>(`${this.apiUrl}/upload-url`, { fileName });
  }

  uploadFileToS3(uploadUrl: string, file: File): Observable<any> {
    return this.http.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type
      }
    });
  }
}
