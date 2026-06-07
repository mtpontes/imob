import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { TemplateBuilderComponent } from './template-builder.component';
import { TemplateService } from '../../services/template.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('TemplateBuilderComponent', () => {
  let component: TemplateBuilderComponent;
  let fixture: ComponentFixture<TemplateBuilderComponent>;
  let templateServiceSpy: jasmine.SpyObj<TemplateService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('TemplateService', ['getActiveTemplates', 'createTemplate', 'updateTemplate']);

    await TestBed.configureTestingModule({
      imports: [TemplateBuilderComponent, ReactiveFormsModule],
      providers: [
        { provide: TemplateService, useValue: spy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateBuilderComponent);
    component = fixture.componentInstance;
    templateServiceSpy = TestBed.inject(TemplateService) as jasmine.SpyObj<TemplateService>;

    templateServiceSpy.getActiveTemplates.and.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add and remove criteria from the array', () => {
    expect(component.criteria.length).toBe(0);

    component.addCriteria();
    expect(component.criteria.length).toBe(1);

    component.removeCriteria(0);
    expect(component.criteria.length).toBe(0);
  });

  it('should make form invalid with negative weight', () => {
    component.addCriteria();
    const criteriaFormGroup = component.criteria.at(0) as any;
    
    criteriaFormGroup.patchValue({
      id: 'crit-1',
      label: 'Criterio 1',
      type: 'bool',
      isScorable: true,
      weight: -2.0 // Negativo! Invalido!
    });

    expect(component.templateForm.invalid).toBeTrue();
  });

  it('should call createTemplate on submit when not in edit mode', () => {
    templateServiceSpy.createTemplate.and.returnValue(of({ id: 'new', version: 1, isActive: true, createdAt: '2026', criteria: [] }));
    
    component.addCriteria();
    const criteriaFormGroup = component.criteria.at(0) as any;
    criteriaFormGroup.patchValue({
      id: 'crit-1',
      label: 'Criterio 1',
      type: 'bool',
      isScorable: true,
      weight: 1.5
    });

    component.onSubmit();

    expect(templateServiceSpy.createTemplate).toHaveBeenCalled();
  });
});
