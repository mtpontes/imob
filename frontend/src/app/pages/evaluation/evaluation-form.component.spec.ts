import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { EvaluationFormComponent } from './evaluation-form.component';
import { PropertyService } from '../../services/property.service';
import { TemplateService } from '../../services/template.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse, TemplateResponse, EvaluationResponse } from '../../types';

describe('EvaluationFormComponent', () => {
  let component: EvaluationFormComponent;
  let fixture: ComponentFixture<EvaluationFormComponent>;
  
  let propertyServiceMock: any;
  let templateServiceMock: any;
  let evaluationServiceMock: any;
  let router: Router;

  const mockProperty: PropertyResponse = {
    id: 'prop-123',
    address: 'Av. Paulista, 1000',
    price: 600000,
    sqm: 100,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    url: '',
    createdAt: '2026-06-04T12:00:00Z'
  };

  const mockTemplates: TemplateResponse[] = [
    {
      id: 'temp-1',
      version: 1,
      isActive: true,
      createdAt: '2026-06-04T10:00:00Z',
      criteria: [
        { id: 'crit-1', label: 'Localizacao', type: 'range', isScorable: true, weight: 3, min: 1, max: 5 },
        { id: 'crit-2', label: 'Vaga Coberta', type: 'bool', isScorable: true, weight: 1 },
        { id: 'crit-3', label: 'Comentarios', type: 'text', isScorable: false, weight: 0 }
      ]
    }
  ];

  const mockEvaluations: EvaluationResponse[] = [
    {
      propertyId: 'prop-123',
      createdAt: '2026-06-04T14:00:00Z',
      templateId: 'temp-1',
      templateVersion: 1,
      finalScore: 75.0,
      notes: 'Visita boa',
      answers: { 'crit-1': 4, 'crit-2': true, 'crit-3': 'OK' },
      mediaUrls: ['https://s3.com/foto.jpg']
    }
  ];

  beforeEach(async () => {
    propertyServiceMock = {
      getProperties: jasmine.createSpy('getProperties').and.returnValue(of([mockProperty]))
    };

    templateServiceMock = {
      getActiveTemplates: jasmine.createSpy('getActiveTemplates').and.returnValue(of(mockTemplates))
    };

    evaluationServiceMock = {
      createEvaluation: jasmine.createSpy('createEvaluation').and.returnValue(of(mockEvaluations[0])),
      getEvaluationsByProperty: jasmine.createSpy('getEvaluationsByProperty').and.returnValue(of(mockEvaluations)),
      generateUploadUrl: jasmine.createSpy('generateUploadUrl').and.returnValue(of({ uploadUrl: 'http://s3-upload', s3Key: 'key/1.jpg' })),
      uploadFileToS3: jasmine.createSpy('uploadFileToS3').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, EvaluationFormComponent],
      providers: [
        { provide: PropertyService, useValue: propertyServiceMock },
        { provide: TemplateService, useValue: templateServiceMock },
        { provide: EvaluationService, useValue: evaluationServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ propertyId: 'prop-123' })
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(EvaluationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load property, templates and history on init', () => {
    // Arrange & Act (feito no setup)

    // Assert
    expect(component).toBeTruthy();
    expect(propertyServiceMock.getProperties).toHaveBeenCalled();
    expect(component.property).toEqual(mockProperty);
    expect(templateServiceMock.getActiveTemplates).toHaveBeenCalled();
    expect(component.templates.length).toBe(1);
    expect(evaluationServiceMock.getEvaluationsByProperty).toHaveBeenCalledWith('prop-123');
    expect(component.pastEvaluations.length).toBe(1);
  });

  it('should build form dynamic controls on template selection', () => {
    // Arrange
    const event = { target: { value: 'temp-1' } } as unknown as Event;

    // Act
    component.onTemplateChange(event);

    // Assert
    expect(component.selectedTemplate).toEqual(mockTemplates[0]);
    expect(component.evaluationForm).toBeDefined();
    const answersGroup = component.evaluationForm?.get('answers');
    expect(answersGroup).toBeDefined();
    expect(answersGroup?.get('crit-1')).toBeDefined();
    expect(answersGroup?.get('crit-2')).toBeDefined();
    expect(answersGroup?.get('crit-3')).toBeDefined();
  });

  it('should calculate weighted score in real time', () => {
    // Arrange
    const event = { target: { value: 'temp-1' } } as unknown as Event;
    component.onTemplateChange(event);

    // Act & Assert 1: Valores default (crit-1 = 1, crit-2 = false)
    // crit-1 (range 1-5, val=1): proportion = (1-1)/(5-1) = 0. Pontos = 0 * 3 = 0.
    // crit-2 (bool, val=false): Pontos = 0.
    // Soma pesos = 3 + 1 = 4. Score esperado = (0/4)*100 = 0.0
    expect(component.currentScore).toBe(0.0);

    // Act 2: Alterando valores (crit-1 = 4, crit-2 = true)
    // crit-1 (val=4): proportion = (4-1)/(5-1) = 3/4 = 0.75. Pontos = 0.75 * 3 = 2.25.
    // crit-2 (val=true): Pontos = 1 * 1 = 1.0.
    // Total pontos = 2.25 + 1 = 3.25. Soma pesos = 4.
    // Score esperado = (3.25 / 4) * 100 = 81.25.
    component.evaluationForm?.get('answers.crit-1')?.setValue(4);
    component.evaluationForm?.get('answers.crit-2')?.setValue(true);

    // Assert 2
    expect(component.currentScore).toBe(81.25);
  });

  it('should trigger upload to S3 and save media key on file selection', () => {
    // Arrange
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as unknown as Event;

    // Act
    component.onFileSelected(event);

    // Assert
    expect(evaluationServiceMock.generateUploadUrl).toHaveBeenCalledWith('test.png');
    expect(evaluationServiceMock.uploadFileToS3).toHaveBeenCalledWith('http://s3-upload', file);
    expect(component.uploadedMediaKeys.length).toBe(1);
    expect(component.uploadedMediaKeys[0]).toBe('key/1.jpg');
    expect(component.uploads[0].success).toBeTrue();
  });

  it('should call createEvaluation on submit and reload history', () => {
    // Arrange
    const event = { target: { value: 'temp-1' } } as unknown as Event;
    component.onTemplateChange(event);
    component.evaluationForm?.get('answers.crit-1')?.setValue(5);
    component.evaluationForm?.get('answers.crit-2')?.setValue(true);
    component.evaluationForm?.get('answers.crit-3')?.setValue('Texto obs');
    component.uploadedMediaKeys = ['key/1.jpg'];
    component.evaluationForm?.get('notes')?.setValue('Minhas anotacoes');

    // Act
    component.onSubmit();

    // Assert
    expect(evaluationServiceMock.createEvaluation).toHaveBeenCalledWith({
      propertyId: 'prop-123',
      templateId: 'temp-1',
      templateVersion: 1,
      answers: {
        'crit-1': 5,
        'crit-2': true,
        'crit-3': 'Texto obs'
      },
      notes: 'Minhas anotacoes',
      mediaKeys: ['key/1.jpg']
    });
    expect(component.successMessage).toBe('Avaliacao salva com sucesso!');
    expect(evaluationServiceMock.getEvaluationsByProperty).toHaveBeenCalledTimes(2); // init e pos-save
  });

  it('should set error message when createEvaluation fails', () => {
    // Arrange
    const event = { target: { value: 'temp-1' } } as unknown as Event;
    component.onTemplateChange(event);
    evaluationServiceMock.createEvaluation.and.returnValue(throwError(() => new Error('Error')));

    // Act
    component.onSubmit();

    // Assert
    expect(component.errorMessage).toBe('Erro ao salvar avaliacao.');
    expect(component.loading).toBeFalse();
  });
});
