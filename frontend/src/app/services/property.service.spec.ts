import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PropertyService } from './property.service';
import { PropertyResponse, CreatePropertyRequest } from '../types';

describe('PropertyService', () => {
  let service: PropertyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PropertyService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(PropertyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch properties', () => {
    const dummyProperties: PropertyResponse[] = [
      { id: '1', address: 'Rua A', price: 100, sqm: 50, bedrooms: 1, bathrooms: 1, parking: 1, url: 'url', createdAt: '2026' }
    ];

    service.getProperties().subscribe(properties => {
      expect(properties.length).toBe(1);
      expect(properties).toEqual(dummyProperties);
    });

    const req = httpMock.expectOne('/api/properties');
    expect(req.request.method).toBe('GET');
    req.flush(dummyProperties);
  });

  it('should create property', () => {
    const newRequest: CreatePropertyRequest = { address: 'Rua A', price: 100, sqm: 50, bedrooms: 1, bathrooms: 1, parking: 1, url: 'url' };
    const dummyResponse: PropertyResponse = { id: '1', address: 'Rua A', price: 100, sqm: 50, bedrooms: 1, bathrooms: 1, parking: 1, url: 'url', createdAt: '2026' };

    service.createProperty(newRequest).subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne('/api/properties');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newRequest);
    req.flush(dummyResponse);
  });
});
