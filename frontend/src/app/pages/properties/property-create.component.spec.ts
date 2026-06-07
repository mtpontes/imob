import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PropertyCreateComponent } from './property-create.component';
import { PropertyService } from '../../services/property.service';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule, 
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard
} from 'lucide-angular';

describe('PropertyCreateComponent', () => {
  let component: PropertyCreateComponent;
  let fixture: ComponentFixture<PropertyCreateComponent>;
  let propertyServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    propertyServiceMock = {
      createProperty: jasmine.createSpy('createProperty').and.returnValue(of({ id: 'prop-123' }))
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, PropertyCreateComponent],
      providers: [
        { provide: PropertyService, useValue: propertyServiceMock },
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

    fixture = TestBed.createComponent(PropertyCreateComponent);
    component = fixture.componentInstance;
    
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    fixture.detectChanges();
  });

  it('should create and initialize the form', () => {
    // Arrange & Act (feito no setup)

    // Assert
    expect(component).toBeTruthy();
    expect(component.propertyForm).toBeDefined();
    expect(component.propertyForm.get('address')).toBeDefined();
  });

  it('should mark form as invalid on empty input', () => {
    // Arrange
    component.propertyForm.patchValue({
      address: '',
      price: '',
      sqm: ''
    });

    // Act
    component.onSubmit();

    // Assert
    expect(component.propertyForm.invalid).toBeTrue();
    expect(component.errorMessage).toBe('Preencha todos os campos obrigatorios corretamente.');
    expect(propertyServiceMock.createProperty).not.toHaveBeenCalled();
  });

  it('should call createProperty and navigate to details on success', () => {
    // Arrange
    component.propertyForm.patchValue({
      address: 'Rua de Teste, 100',
      price: '500.000',
      sqm: 100,
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      url: ''
    });

    // Act
    component.onSubmit();

    // Assert
    expect(component.propertyForm.valid).toBeTrue();
    expect(propertyServiceMock.createProperty).toHaveBeenCalledWith({
      address: 'Rua de Teste, 100',
      price: 500000,
      sqm: 100,
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      url: ''
    });
    expect(component.successMessage).toBe('Imovel cadastrado com sucesso!');
    expect(router.navigate).toHaveBeenCalledWith(['/properties', 'prop-123']);
  });

  it('should display error message when creation fails', () => {
    // Arrange
    component.propertyForm.patchValue({
      address: 'Rua de Teste, 100',
      price: '500.000',
      sqm: 100,
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      url: ''
    });
    propertyServiceMock.createProperty.and.returnValue(throwError(() => new Error('API Error')));

    // Act
    component.onSubmit();

    // Assert
    expect(component.errorMessage).toBe('Erro ao cadastrar imovel.');
    expect(component.loading).toBeFalse();
  });
});
