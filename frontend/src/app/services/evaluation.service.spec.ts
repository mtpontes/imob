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
    const newRequest: CreateEvaluationRequest = { propertyId: 'prop-1', templateId: 'temp-1', templateVersion: 1, answers: {}, notes: '', mediaKeys: [] };
    const dummyResponse: EvaluationResponse = { propertyId: 'prop-1', createdAt: '2026', templateId: 'temp-1', templateVersion: 1, finalScore: 100, notes: '', answers: {}, mediaUrls: [] };

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
      { propertyId: 'prop-1', createdAt: '2026', templateId: 'temp-1', templateVersion: 1, finalScore: 100, notes: '', answers: {}, mediaUrls: [] }
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

    service.generateUploadUrl('file.jpg').subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/evaluations/upload-url');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fileName: 'file.jpg' });
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
});
