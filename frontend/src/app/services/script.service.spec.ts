import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ScriptService } from './script.service';
import { ScriptResponse, CreateScriptRequest, UpdateScriptRequest } from '../types';

describe('ScriptService', () => {
  let service: ScriptService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ScriptService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ScriptService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch active scripts', () => {
    const dummyScripts: ScriptResponse[] = [
      { id: '1', createdAt: '2026-06-04', criteria: [], name: 'Roteiro Padrao' }
    ];

    service.getActiveScripts().subscribe(scripts => {
      expect(scripts.length).toBe(1);
      expect(scripts).toEqual(dummyScripts);
    });

    const req = httpMock.expectOne('/api/scripts');
    expect(req.request.method).toBe('GET');
    req.flush(dummyScripts);
  });

  it('should create script', () => {
    const newRequest: CreateScriptRequest = { name: 'Novo Roteiro', criteria: [] };
    const dummyResponse: ScriptResponse = { id: '2', createdAt: '2026-06-04', criteria: [], name: 'Novo Roteiro' };

    service.createScript(newRequest).subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/scripts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newRequest);
    req.flush(dummyResponse);
  });

  it('should update script', () => {
    const updateRequest: UpdateScriptRequest = { name: 'Roteiro Atualizado', criteria: [] };
    const dummyResponse: ScriptResponse = { id: '1', createdAt: '2026-06-04', criteria: [], name: 'Roteiro Atualizado' };

    service.updateScript('1', updateRequest).subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/scripts/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateRequest);
    req.flush(dummyResponse);
  });
});
