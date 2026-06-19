import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { PropertyDetailsComponent } from './property-details.component';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { ScriptService } from '../../services/script.service';
import { PropertyResponse, EvaluationResponse } from '../../types';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule, 
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard,
  Calendar, PlayCircle, ChevronRight, Check, ArrowUp, ArrowDown, TrendingUp, TrendingDown
} from 'lucide-angular';

describe('PropertyDetailsComponent', () => {
  let component: PropertyDetailsComponent;
  let fixture: ComponentFixture<PropertyDetailsComponent>;
  let propertyServiceMock: any;
  let evaluationServiceMock: any;
  let scriptServiceMock: any;
  let activatedRouteMock: any;
  let router: Router;

  const mockProperty: PropertyResponse = {
    id: 'prop-1',
    address: 'Rua das Flores, 123',
    price: 500000,
    sqm: 100,
    bedrooms: 3,
    bathrooms: 2,
    parking: 1,
    url: 'https://anuncio.com/1',
    createdAt: '2026-06-04T10:00:00Z'
  };

  const mockEvaluations: EvaluationResponse[] = [
    {
      propertyId: 'prop-1',
      createdAt: '2026-06-05T10:00:00Z',
      scriptId: 'script-1',
      scriptVersion: 1,
      notes: 'Avaliação excelente',
      answers: { score: 85.0 },
      mediaUrls: []
    },
    {
      propertyId: 'prop-1',
      createdAt: '2026-06-06T10:00:00Z',
      scriptId: 'script-1',
      scriptVersion: 1,
      notes: 'Avaliação com avarias',
      answers: { score: -12.5 },
      mediaUrls: []
    }
  ];

  beforeEach(async () => {
    propertyServiceMock = {
      getProperties: jasmine.createSpy('getProperties').and.returnValue(of([mockProperty]))
    };

    evaluationServiceMock = {
      getEvaluationsByProperty: jasmine.createSpy('getEvaluationsByProperty').and.returnValue(of(mockEvaluations)),
      deleteEvaluation: jasmine.createSpy('deleteEvaluation').and.returnValue(of(undefined)),
      calculateScore: jasmine.createSpy('calculateScore').and.callFake((script: any, answers: any) => {
        return answers ? (answers['score'] !== undefined ? answers['score'] : 0) : 0;
      })
    };

    scriptServiceMock = {
      getActiveScripts: jasmine.createSpy('getActiveScripts').and.returnValue(of([])),
      getScript: jasmine.createSpy('getScript').and.returnValue(of({ id: 'script-1', version: 1, criteria: [] }))
    };

    activatedRouteMock = {
      params: of({ propertyId: 'prop-1' })
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, PropertyDetailsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PropertyService, useValue: propertyServiceMock },
        { provide: EvaluationService, useValue: evaluationServiceMock },
        { provide: ScriptService, useValue: scriptServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        importProvidersFrom(
          LucideAngularModule.pick({
            Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
            Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
            Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
            EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard,
            Calendar, PlayCircle, ChevronRight, Check, ArrowUp, ArrowDown, TrendingUp, TrendingDown
          })
        )
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertyDetailsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should load property details and evaluations and calculate scores on init', () => {
    // Arrange & Act
    fixture.detectChanges();

    // Assert
    expect(component).toBeTruthy();
    expect(propertyServiceMock.getProperties).toHaveBeenCalled();
    expect(evaluationServiceMock.getEvaluationsByProperty).toHaveBeenCalledWith('prop-1');
    
    // Assegura que houve chamadas ao ScriptService.getScript(...)
    expect(scriptServiceMock.getScript).toHaveBeenCalledTimes(2);
    expect(scriptServiceMock.getScript).toHaveBeenCalledWith('script-1', 1);
    
    // Verifica se os scores foram calculados e mapeados
    expect(component.evaluationScores['prop-1_2026-06-05T10:00:00Z']).toBe(85.0);
    expect(component.evaluationScores['prop-1_2026-06-06T10:00:00Z']).toBe(-12.5);
  });

  it('should apply appropriate css class low for negative scores in html badge', () => {
    // Arrange
    fixture.detectChanges();
    const compiled = fixture.nativeElement;

    // Act
    const scoreBadgeLow = compiled.querySelector('#eval-score-0');
    const scoreBadgeHigh = compiled.querySelector('#eval-score-1');

    // Assert
    expect(scoreBadgeLow).toBeTruthy();
    expect(scoreBadgeLow.classList.contains('low')).toBeTrue();

    expect(scoreBadgeHigh).toBeTruthy();
    expect(scoreBadgeHigh.classList.contains('high')).toBeTrue();
  });
});
