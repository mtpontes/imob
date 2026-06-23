import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EvaluationService } from './evaluation.service';
import { EvaluationResponse, CreateEvaluationRequest, GenerateUploadUrlResponse } from '../types';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EvaluationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EvaluationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create evaluation', () => {
    const newRequest: CreateEvaluationRequest = { propertyId: 'prop-1', scriptId: 'script-1', answers: {}, notes: '', mediaKeys: [] };
    const dummyResponse: EvaluationResponse = { propertyId: 'prop-1', createdAt: '2026', scriptId: 'script-1', notes: '', answers: {}, mediaUrls: [] };

    service.createEvaluation(newRequest).subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/evaluations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newRequest);
    req.flush(dummyResponse);
  });

  it('should fetch evaluations by property', () => {
    const dummyEvaluations: EvaluationResponse[] = [
      { propertyId: 'prop-1', createdAt: '2026', scriptId: 'script-1', notes: '', answers: {}, mediaUrls: [] }
    ];

    service.getEvaluationsByProperty('prop-1').subscribe(evaluations => {
      expect(evaluations.length).toBe(1);
      expect(evaluations).toEqual(dummyEvaluations);
    });

    const req = httpMock.expectOne('/api/evaluations/property/prop-1');
    expect(req.request.method).toBe('GET');
    req.flush(dummyEvaluations);
  });

  it('should generate upload URL', () => {
    const dummyResponse: GenerateUploadUrlResponse = { uploadUrl: 'https://s3/upload', s3Key: 'key' };

    service.generateUploadUrl('file.jpg', 'image/jpeg').subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/evaluations/upload-url');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fileName: 'file.jpg', contentType: 'image/jpeg' });
    req.flush(dummyResponse);
  });

  it('should upload file direct to S3', () => {
    const blob = new Blob([''], { type: 'image/jpeg' });
    const file = new File([blob], 'file.jpg', { type: 'image/jpeg' });
    const uploadUrl = 'https://s3/upload-url';

    service.uploadFileToS3(uploadUrl, file).subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(uploadUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Content-Type')).toBe('image/jpeg');
    req.flush(null);
  });

  it('should calculate score correctly', () => {
    const dummyScript = {
      id: 'script-1',
      createdAt: '2026',
      name: 'Roteiro',
      criteria: [
        { id: 'crit-1', label: 'Item 1', type: 'bool' as const, isScorable: true, weight: 2 },
        { id: 'crit-2', label: 'Item 2', type: 'range' as const, isScorable: true, weight: 3, min: 1, max: 5 }
      ]
    };
    const answers = { 'crit-1': true, 'crit-2': 3 };

    const score = service.calculateScore(dummyScript, answers);
    expect(score).toBe(70);
  });

  it('should calculate score with negative weights correctly', () => {
    // Arrange
    const script = {
      id: 'script-1',
      createdAt: '2026',
      name: 'Roteiro com Penalizadores',
      criteria: [
        { id: 'crit-pos', label: 'Item Positivo', type: 'bool' as const, isScorable: true, weight: 4 },
        { id: 'crit-neg', label: 'Item Penalizador', type: 'bool' as const, isScorable: true, weight: -2 }
      ]
    };

    // Caso 1: Apenas o positivo está ativo
    const answers1 = { 'crit-pos': true, 'crit-neg': false };

    // Caso 2: Ambos estão ativos (positivo e penalizador)
    const answers2 = { 'crit-pos': true, 'crit-neg': true };

    // Act
    const score1 = service.calculateScore(script, answers1);
    const score2 = service.calculateScore(script, answers2);

    // Assert
    expect(score1).toBe(100);
    expect(score2).toBe(50);
  });

  it('should return negative score when negative weights exceed positive weights', () => {
    // Arrange
    const script = {
      id: 'script-1',
      createdAt: '2026',
      name: 'Roteiro com Alta Penalidade',
      criteria: [
        { id: 'crit-pos', label: 'Item Positivo', type: 'bool' as const, isScorable: true, weight: 2 },
        { id: 'crit-neg', label: 'Item Penalizador', type: 'bool' as const, isScorable: true, weight: -5 }
      ]
    };
    const answers = { 'crit-pos': true, 'crit-neg': true };

    // Act
    const score = service.calculateScore(script, answers);

    // Assert
    expect(score).toBe(-150);
  });

  it('should return earnedPoints directly when totalWeight is zero and negative points exist', () => {
    // Arrange
    const script = {
      id: 'script-1',
      createdAt: '2026',
      name: 'Roteiro Apenas Penalizadores',
      criteria: [
        { id: 'crit-neg1', label: 'Penalizador 1', type: 'bool' as const, isScorable: true, weight: -3 },
        { id: 'crit-neg2', label: 'Penalizador 2', type: 'range' as const, isScorable: true, weight: -4, min: 0, max: 5 }
      ]
    };
    const answers = { 'crit-neg1': true, 'crit-neg2': 3 };

    // Act
    const score = service.calculateScore(script, answers);

    // Assert
    expect(score).toBe(-5.4);
  });
});
