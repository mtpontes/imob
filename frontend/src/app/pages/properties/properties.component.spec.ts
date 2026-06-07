import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PropertiesComponent } from './properties.component';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse } from '../../types';

describe('PropertiesComponent', () => {
  let component: PropertiesComponent;
  let fixture: ComponentFixture<PropertiesComponent>;
  let propertyServiceMock: any;
  let evaluationServiceMock: any;
  let routerMock: any;

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
      getProperties: jasmine.createSpy('getProperties').and.returnValue(of(mockProperties)),
      createProperty: jasmine.createSpy('createProperty').and.returnValue(of(mockProperties[0]))
    };

    evaluationServiceMock = {
      getEvaluationsByProperty: jasmine.createSpy('getEvaluationsByProperty').and.returnValue(of([]))
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, PropertiesComponent],
      providers: [
        { provide: PropertyService, useValue: propertyServiceMock },
        { provide: EvaluationService, useValue: evaluationServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load properties on init', () => {
    // Arrange & Act (ocorre no beforeEach/detectChanges)

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
    expect(component.errorMessage).toBe('Erro ao carregar imóveis.');
  });

  it('should mark form as invalid and set error message on invalid submit', () => {
    // Arrange
    component.propertyForm.patchValue({
      address: '',
      price: '-100', // Invalido: negativo
      sqm: 0       // Invalido: min(1)
    });

    // Act
    component.onSubmit();

    // Assert
    expect(component.propertyForm.invalid).toBeTrue();
    expect(component.errorMessage).toBe('Preencha todos os campos obrigatorios corretamente.');
    expect(propertyServiceMock.createProperty).not.toHaveBeenCalled();
  });

  it('should call createProperty and reload properties on valid submit', () => {
    // Arrange
    component.propertyForm.patchValue({
      address: 'Nova Casa, 789',
      price: '600.000',
      sqm: 120,
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      url: 'https://exemplo.com'
    });

    // Act
    const formValidBeforeSubmit = component.propertyForm.valid;
    component.onSubmit();

    // Assert
    expect(formValidBeforeSubmit).toBeTrue();
    expect(propertyServiceMock.createProperty).toHaveBeenCalledWith({
      address: 'Nova Casa, 789',
      price: 600000,
      sqm: 120,
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      url: 'https://exemplo.com'
    });
    expect(component.successMessage).toBe('Imovel cadastrado com sucesso!');
    expect(propertyServiceMock.getProperties).toHaveBeenCalledTimes(2); // no init e apos salvar
  });

  it('should handle error on failed property creation', () => {
    // Arrange
    component.propertyForm.patchValue({
      address: 'Nova Casa, 789',
      price: '600.000',
      sqm: 120,
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      url: ''
    });
    propertyServiceMock.createProperty.and.returnValue(throwError(() => new Error('Error')));

    // Act
    component.onSubmit();

    // Assert
    expect(component.errorMessage).toBe('Erro ao cadastrar imovel.');
    expect(component.loading).toBeFalse();
  });

  it('should navigate to evaluation page on evaluateProperty call', () => {
    // Arrange
    const propertyId = 'prop-123';

    // Act
    component.evaluateProperty(propertyId);

    // Assert
    expect(routerMock.navigate).toHaveBeenCalledWith(['/evaluate', propertyId]);
  });
});
