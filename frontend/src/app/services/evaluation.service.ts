import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EvaluationResponse, CreateEvaluationRequest, UpdateEvaluationRequest, GenerateUploadUrlResponse, ScriptResponse, Criteria } from '../types';

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

  getEvaluation(propertyId: string, createdAt: string): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(`${this.apiUrl}/${propertyId}/date/${createdAt}`);
  }

  updateEvaluation(propertyId: string, createdAt: string, request: UpdateEvaluationRequest): Observable<EvaluationResponse> {
    return this.http.put<EvaluationResponse>(`${this.apiUrl}/${propertyId}/date/${createdAt}`, request);
  }

  deleteEvaluation(propertyId: string, createdAt: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${propertyId}/date/${createdAt}`);
  }

  generateUploadUrl(fileName: string, contentType: string): Observable<GenerateUploadUrlResponse> {
    return this.http.post<GenerateUploadUrlResponse>(`${this.apiUrl}/upload-url`, { fileName, contentType });
  }

  uploadFileToS3(uploadUrl: string, file: File): Observable<any> {
    return this.http.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type
      }
    });
  }

  calculateScore(script: ScriptResponse, answers: { [key: string]: any }): number {
    if (!script || !script.criteria || !answers) {
      return 0;
    }

    let totalWeight = 0;
    let earnedPoints = 0;

    script.criteria.forEach((criteria: Criteria) => {
      if (!criteria.isScorable) {
        return;
      }

      const val = answers[criteria.id];
      if (val === null || val === undefined || val === '') {
        return;
      }

      const weight = criteria.weight;
      let points = 0;

      if (criteria.type === 'bool') {
        if (val === true || val === 'true') {
          points = weight;
        }
      } else if (criteria.type === 'range') {
        const numVal = Number(val);
        const min = criteria.min !== undefined ? criteria.min : 0;
        const max = criteria.max !== undefined ? criteria.max : 5;

        if (max > min) {
          if (numVal <= min) {
            points = 0;
          } else if (numVal >= max) {
            points = weight;
          } else {
            const proportion = (numVal - min) / (max - min);
            points = proportion * weight;
          }
        }
      }

      earnedPoints += points;
      if (weight > 0) {
        totalWeight += weight;
      }
    });

    if (totalWeight === 0) {
      return earnedPoints < 0 ? earnedPoints : 0;
    }

    const score = (earnedPoints / totalWeight) * 100;
    return Math.round(score * 100) / 100;
  }
}
