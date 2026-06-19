import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { EvaluationFormComponent } from './evaluation-form.component';
import { PropertyService } from '../../services/property.service';
import { ScriptService } from '../../services/script.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse, ScriptResponse, EvaluationResponse } from '../../types';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule, 
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard,
  ChevronDown
} from 'lucide-angular';

describe('EvaluationFormComponent', () => {
  let component: EvaluationFormComponent;
  let fixture: ComponentFixture<EvaluationFormComponent>;
  
  let propertyServiceMock: any;
  let scriptServiceMock: any;
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
    createdAt: '2026-06-07T12:00:00Z'
  };

  const mockScripts: ScriptResponse[] = [
    {
      id: 'script-1',
      version: 1,
      isActive: true,
      createdAt: '2026-06-07T10:00:00Z',
      name: 'Roteiro de Vistoria Padrão',
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
      createdAt: '2026-06-07T14:00:00Z',
      scriptId: 'script-1',
      scriptVersion: 1,
      notes: 'Visita boa',
      answers: { 'crit-1': 4, 'crit-2': true, 'crit-3': 'OK' },
      mediaUrls: ['https://s3.com/foto.jpg']
    }
  ];

  beforeEach(async () => {
    propertyServiceMock = {
      getProperties: jasmine.createSpy('getProperties').and.returnValue(of([mockProperty]))
    };

    scriptServiceMock = {
      getActiveScripts: jasmine.createSpy('getActiveScripts').and.returnValue(of(mockScripts))
    };

    const realEvaluationService = new EvaluationService(null as any);
    evaluationServiceMock = {
      createEvaluation: jasmine.createSpy('createEvaluation').and.returnValue(of(mockEvaluations[0])),
      generateUploadUrl: jasmine.createSpy('generateUploadUrl').and.returnValue(of({ uploadUrl: 'http://s3-upload', s3Key: 'key/1.jpg' })),
      uploadFileToS3: jasmine.createSpy('uploadFileToS3').and.returnValue(of({})),
      calculateScore: (script: any, answers: any) => realEvaluationService.calculateScore(script, answers)
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, EvaluationFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PropertyService, useValue: propertyServiceMock },
        { provide: ScriptService, useValue: scriptServiceMock },
        { provide: EvaluationService, useValue: evaluationServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ propertyId: 'prop-123' })
          }
        },
        importProvidersFrom(
          LucideAngularModule.pick({
            Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
            Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
            Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
            EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard,
            ChevronDown
          })
        )
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(EvaluationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load property and scripts on init', () => {
    // Arrange & Act (feito no setup)

    // Assert
    expect(component).toBeTruthy();
    expect(propertyServiceMock.getProperties).toHaveBeenCalled();
    expect(component.property).toEqual(mockProperty);
    expect(scriptServiceMock.getActiveScripts).toHaveBeenCalled();
    expect(component.scripts.length).toBe(1);
  });

  it('should build form dynamic controls on script selection', () => {
    // Arrange
    const event = { target: { value: 'script-1' } } as unknown as Event;

    // Act
    component.onScriptChange(event);

    // Assert
    expect(component.selectedScript).toEqual(mockScripts[0]);
    expect(component.evaluationForm).toBeDefined();
    const answersGroup = component.evaluationForm?.get('answers');
    expect(answersGroup).toBeDefined();
    expect(answersGroup?.get('crit-1')).toBeDefined();
    expect(answersGroup?.get('crit-2')).toBeDefined();
    expect(answersGroup?.get('crit-3')).toBeDefined();
  });

  it('should calculate weighted score in real time', () => {
    // Arrange
    const event = { target: { value: 'script-1' } } as unknown as Event;
    component.onScriptChange(event);

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
    expect(evaluationServiceMock.generateUploadUrl).toHaveBeenCalledWith('test.png', 'image/png');
    expect(evaluationServiceMock.uploadFileToS3).toHaveBeenCalledWith('http://s3-upload', file);
    expect(component.uploadedMediaKeys.length).toBe(1);
    expect(component.uploadedMediaKeys[0]).toBe('key/1.jpg');
    expect(component.uploads[0].success).toBeTrue();
  });

  it('should call createEvaluation on submit and navigate to property page', () => {
    // Arrange
    const event = { target: { value: 'script-1' } } as unknown as Event;
    component.onScriptChange(event);
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
      scriptId: 'script-1',
      scriptVersion: 1,
      answers: {
        'crit-1': 5,
        'crit-2': true,
        'crit-3': 'Texto obs'
      },
      notes: 'Minhas anotacoes',
      mediaKeys: ['key/1.jpg']
    });
    expect(component.successMessage).toBe('Avaliação salva com sucesso!');
    expect(router.navigate).toHaveBeenCalledWith(['/properties', 'prop-123']);
  });

  it('should set error message when createEvaluation fails', () => {
    // Arrange
    const event = { target: { value: 'script-1' } } as unknown as Event;
    component.onScriptChange(event);
    evaluationServiceMock.createEvaluation.and.returnValue(throwError(() => new Error('Error')));

    // Act
    component.onSubmit();

    // Assert
    expect(component.errorMessage).toBe('Erro ao salvar avaliação.');
    expect(component.loading).toBeFalse();
  });
});
