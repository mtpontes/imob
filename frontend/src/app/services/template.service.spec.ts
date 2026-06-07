import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TemplateService } from './template.service';
import { TemplateResponse, CreateTemplateRequest, UpdateTemplateRequest } from '../types';

describe('TemplateService', () => {
  let service: TemplateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TemplateService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    // Arrange & Act & Assert
    expect(service).toBeTruthy();
  });

  it('should fetch active templates', () => {
    // Arrange
    const dummyTemplates: TemplateResponse[] = [
      { id: '1', version: 1, isActive: true, createdAt: '2026-06-04', criteria: [], name: 'Protocolo Padrao' }
    ];

    // Act
    service.getActiveTemplates().subscribe(templates => {
      // Assert
      expect(templates.length).toBe(1);
      expect(templates).toEqual(dummyTemplates);
    });

    const req = httpMock.expectOne('/api/templates');
    expect(req.request.method).toBe('GET');
    req.flush(dummyTemplates);
  });

  it('should create template', () => {
    // Arrange
    const newRequest: CreateTemplateRequest = { name: 'Novo Protocolo', criteria: [] };
    const dummyResponse: TemplateResponse = { id: '2', version: 1, isActive: true, createdAt: '2026-06-04', criteria: [], name: 'Novo Protocolo' };

    // Act
    service.createTemplate(newRequest).subscribe(response => {
      // Assert
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/templates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newRequest);
    req.flush(dummyResponse);
  });

  it('should update template', () => {
    // Arrange
    const updateRequest: UpdateTemplateRequest = { name: 'Protocolo Atualizado', newVersion: false, criteria: [] };
    const dummyResponse: TemplateResponse = { id: '1', version: 1, isActive: true, createdAt: '2026-06-04', criteria: [], name: 'Protocolo Atualizado' };

    // Act
    service.updateTemplate('1', updateRequest).subscribe(response => {
      // Assert
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/templates/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateRequest);
    req.flush(dummyResponse);
  });
});
