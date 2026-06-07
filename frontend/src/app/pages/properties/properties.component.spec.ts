import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PropertiesComponent } from './properties.component';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse } from '../../types';
import { ScriptService } from '../../services/script.service';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule, 
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard
} from 'lucide-angular';

describe('PropertiesComponent', () => {
  let component: PropertiesComponent;
  let fixture: ComponentFixture<PropertiesComponent>;
  let propertyServiceMock: any;
  let evaluationServiceMock: any;
  let scriptServiceMock: any;
  let router: Router;

  const mockProperties: PropertyResponse[] = [
    {
      id: 'prop-1',
      address: 'Rua das Flores, 123',
      price: 500000,
      sqm: 100,
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      url: 'https://anuncio.com/1',
      createdAt: '2026-06-04T10:00:00Z'
    },
    {
      id: 'prop-2',
      address: 'Av. Principal, 456',
      price: 800000,
      sqm: 150,
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      url: '',
      createdAt: '2026-06-04T09:00:00Z'
    }
  ];

  beforeEach(async () => {
    propertyServiceMock = {
      getProperties: jasmine.createSpy('getProperties').and.returnValue(of(mockProperties))
    };

    evaluationServiceMock = {
      getEvaluationsByProperty: jasmine.createSpy('getEvaluationsByProperty').and.returnValue(of([])),
      calculateScore: () => 100
    };

    scriptServiceMock = {
      getScript: jasmine.createSpy('getScript').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, PropertiesComponent],
      providers: [
        { provide: PropertyService, useValue: propertyServiceMock },
        { provide: EvaluationService, useValue: evaluationServiceMock },
        { provide: ScriptService, useValue: scriptServiceMock },
        importProvidersFrom(
          LucideAngularModule.pick({
            Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
            Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
            Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
            EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard
          })
        )
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesComponent);
    component = fixture.componentInstance;
    
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    fixture.detectChanges();
  });

  it('should create and load properties on init', () => {
    // Arrange & Act (occorre no setup/beforeEach)

    // Assert
    expect(component).toBeTruthy();
    expect(propertyServiceMock.getProperties).toHaveBeenCalled();
    expect(component.properties.length).toBe(2);
    expect(component.properties[0].id).toBe('prop-1');
  });

  it('should handle error when loading properties fails', () => {
    // Arrange
    propertyServiceMock.getProperties.and.returnValue(throwError(() => new Error('Error')));

    // Act
    component.loadProperties();

    // Assert
    expect(component.errorMessage).toBe('Erro ao carregar imoveis.');
  });

  it('should filter properties by search query', () => {
    // Arrange
    const event = { target: { value: 'Flores' } } as unknown as Event;

    // Act
    component.onSearch(event);

    // Assert
    expect(component.searchQuery).toBe('Flores');
    expect(component.filteredProperties.length).toBe(1);
    expect(component.filteredProperties[0].address).toContain('Rua das Flores');
  });

  it('should sort properties by price asc', () => {
    // Arrange
    const event = { target: { value: 'price-asc' } } as unknown as Event;

    // Act
    component.onSortChange(event);

    // Assert
    expect(component.sortBy).toBe('price-asc');
    expect(component.filteredProperties[0].id).toBe('prop-1'); // 500k vs 800k
    expect(component.filteredProperties[1].id).toBe('prop-2');
  });

  it('should sort properties by price desc', () => {
    // Arrange
    const event = { target: { value: 'price-desc' } } as unknown as Event;

    // Act
    component.onSortChange(event);

    // Assert
    expect(component.sortBy).toBe('price-desc');
    expect(component.filteredProperties[0].id).toBe('prop-2'); // 800k vs 500k
    expect(component.filteredProperties[1].id).toBe('prop-1');
  });

  it('should navigate to details on navigateToDetails call', () => {
    // Arrange
    const propertyId = 'prop-123';

    // Act
    component.navigateToDetails(propertyId);

    // Assert
    expect(router.navigate).toHaveBeenCalledWith(['/properties', propertyId]);
  });

  it('should navigate to create page on navigateToCreate call', () => {
    // Arrange & Act
    component.navigateToCreate();

    // Assert
    expect(router.navigate).toHaveBeenCalledWith(['/properties/create']);
  });

  it('should filter properties by evaluated status', () => {
    // Arrange
    // Simula que o imóvel prop-1 tem 1 avaliação, e o prop-2 tem 0 avaliações
    component.propertyEvaluationsCount = { 'prop-1': 1, 'prop-2': 0 };
    const event = { target: { value: 'evaluated' } } as unknown as Event;

    // Act
    component.onStatusFilterChange(event);

    // Assert
    expect(component.statusFilter).toBe('evaluated');
    expect(component.filteredProperties.length).toBe(1);
    expect(component.filteredProperties[0].id).toBe('prop-1');
  });

  it('should filter properties by pending (non-evaluated) status', () => {
    // Arrange
    // Simula que o imóvel prop-1 tem 1 avaliação, e o prop-2 tem 0 avaliações
    component.propertyEvaluationsCount = { 'prop-1': 1, 'prop-2': 0 };
    const event = { target: { value: 'pending' } } as unknown as Event;

    // Act
    component.onStatusFilterChange(event);

    // Assert
    expect(component.statusFilter).toBe('pending');
    expect(component.filteredProperties.length).toBe(1);
    expect(component.filteredProperties[0].id).toBe('prop-2');
  });

  it('should combine evaluated status filter and price descending sort', () => {
    // Arrange
    // Configura prop-1 (preço: 500k) e prop-2 (preço: 800k) como avaliados
    component.propertyEvaluationsCount = { 'prop-1': 1, 'prop-2': 2 };
    
    // Act
    component.statusFilter = 'evaluated';
    component.sortBy = 'price-desc';
    component.applyFilterAndSort();

    // Assert
    expect(component.filteredProperties.length).toBe(2);
    expect(component.filteredProperties[0].id).toBe('prop-2'); // 800k deve vir primeiro
    expect(component.filteredProperties[1].id).toBe('prop-1'); // 500k deve vir depois
  });
});
