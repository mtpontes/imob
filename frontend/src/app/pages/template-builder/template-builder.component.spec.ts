import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { TemplateBuilderComponent } from './template-builder.component';
import { TemplateService } from '../../services/template.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule, 
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard
} from 'lucide-angular';

describe('TemplateBuilderComponent', () => {
  let component: TemplateBuilderComponent;
  let fixture: ComponentFixture<TemplateBuilderComponent>;
  let templateServiceSpy: jasmine.SpyObj<TemplateService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('TemplateService', ['getActiveTemplates', 'createTemplate', 'updateTemplate']);

    await TestBed.configureTestingModule({
      imports: [TemplateBuilderComponent, ReactiveFormsModule, FormsModule, RouterTestingModule],
      providers: [
        { provide: TemplateService, useValue: spy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '', version: '' })
          }
        },
        provideHttpClient(),
        provideHttpClientTesting(),
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

    fixture = TestBed.createComponent(TemplateBuilderComponent);
    component = fixture.componentInstance;
    templateServiceSpy = TestBed.inject(TemplateService) as jasmine.SpyObj<TemplateService>;

    templateServiceSpy.getActiveTemplates.and.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create', () => {
    // Arrange & Act & Assert
    expect(component).toBeTruthy();
  });

  it('should add and remove criteria from the array', () => {
    // Arrange & Act
    expect(component.criteria.length).toBe(0);

    component.addCriteria();
    expect(component.criteria.length).toBe(1);

    component.removeCriteria(0);

    // Assert
    expect(component.criteria.length).toBe(0);
  });

  it('should make form invalid with negative weight', () => {
    // Arrange
    component.addCriteria();
    const criteriaFormGroup = component.criteria.at(0) as any;
    
    // Act
    criteriaFormGroup.patchValue({
      id: 'crit-1',
      label: 'Criterio 1',
      type: 'bool',
      isScorable: true,
      weight: -2.0 // Negativo! Invalido!
    });

    // Assert
    expect(component.templateForm.invalid).toBeTrue();
  });

  it('should call createTemplate on submit when not in edit mode', () => {
    // Arrange
    templateServiceSpy.createTemplate.and.returnValue(of({ id: 'new', version: 1, isActive: true, createdAt: '2026', criteria: [], name: 'Novo Template' }));
    
    component.templateForm.patchValue({ name: 'Novo Template' });
    component.addCriteria();
    const criteriaFormGroup = component.criteria.at(0) as any;
    criteriaFormGroup.patchValue({
      id: 'crit-1',
      label: 'Criterio 1',
      type: 'bool',
      isScorable: true,
      weight: 1.5
    });

    // Act
    component.onSubmit();

    // Assert
    expect(templateServiceSpy.createTemplate).toHaveBeenCalled();
  });
});
