import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ScriptBuilderComponent } from './script-builder.component';
import { ScriptService } from '../../services/script.service';
import { ScriptResponse, Criteria } from '../../types';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule, 
  ChevronLeft, 
  Tag, 
  PlusCircle, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  GripVertical 
} from 'lucide-angular';

describe('ScriptBuilderComponent', () => {
  let component: ScriptBuilderComponent;
  let fixture: ComponentFixture<ScriptBuilderComponent>;
  let scriptServiceMock: any;
  let router: Router;
  let routeParams: any;

  const mockActiveScripts: ScriptResponse[] = [
    {
      id: 'script-123',
      version: 1,
      isActive: true,
      createdAt: '2026-06-07T10:00:00Z',
      name: 'Roteiro Existente',
      criteria: [
        { id: 'c1', label: 'Criterio 1', type: 'bool', isScorable: true, weight: 1 },
        { id: 'c2', label: 'Criterio 2', type: 'range', isScorable: true, weight: 3 },
        { id: 'c3', label: 'Criterio 3', type: 'text', isScorable: false, weight: 0 }
      ]
    }
  ];

  beforeEach(async () => {
    routeParams = of({}); // Por padrao, modo criacao (sem params)

    scriptServiceMock = {
      getActiveScripts: jasmine.createSpy('getActiveScripts').and.returnValue(of(mockActiveScripts)),
      createScript: jasmine.createSpy('createScript').and.returnValue(of({})),
      updateScript: jasmine.createSpy('updateScript').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        ScriptBuilderComponent
      ],
      providers: [
        provideNoopAnimations(),
        { provide: ScriptService, useValue: scriptServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            params: routeParams
          }
        },
        importProvidersFrom(
          LucideAngularModule.pick({
            ChevronLeft,
            Tag,
            PlusCircle,
            Trash2,
            ChevronUp,
            ChevronDown,
            GripVertical
          })
        )
      ]
    }).compileComponents();
  });

  function createComponent() {
    fixture = TestBed.createComponent(ScriptBuilderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  it('should create and initialize empty form in creation mode', () => {
    // Arrange & Act
    createComponent();

    // Assert
    expect(component).toBeTruthy();
    expect(component.isEditMode).toBeFalse();
    expect(component.criteria.length).toBe(0);
  });

  it('should load script and populate form in edit mode', () => {
    // Arrange
    routeParams = of({ id: 'script-123', version: '1' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { params: routeParams } });
    
    // Act
    createComponent();

    // Assert
    expect(component.isEditMode).toBeTrue();
    expect(scriptServiceMock.getActiveScripts).toHaveBeenCalled();
    expect(component.criteria.length).toBe(3);
    expect(component.criteria.at(0).get('label')?.value).toBe('Criterio 1');
    expect(component.criteria.at(1).get('label')?.value).toBe('Criterio 2');
    expect(component.criteria.at(2).get('label')?.value).toBe('Criterio 3');
  });

  it('should move criteria up when moveCriteria is called with valid indices', () => {
    // Arrange
    routeParams = of({ id: 'script-123', version: '1' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { params: routeParams } });
    createComponent();
    expect(component.criteria.at(0).get('label')?.value).toBe('Criterio 1');
    expect(component.criteria.at(1).get('label')?.value).toBe('Criterio 2');

    // Act
    component.moveCriteria(1, 0);

    // Assert
    expect(component.criteria.at(0).get('label')?.value).toBe('Criterio 2');
    expect(component.criteria.at(1).get('label')?.value).toBe('Criterio 1');
  });

  it('should move criteria down when moveCriteria is called with valid indices', () => {
    // Arrange
    routeParams = of({ id: 'script-123', version: '1' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { params: routeParams } });
    createComponent();
    expect(component.criteria.at(1).get('label')?.value).toBe('Criterio 2');
    expect(component.criteria.at(2).get('label')?.value).toBe('Criterio 3');

    // Act
    component.moveCriteria(1, 2);

    // Assert
    expect(component.criteria.at(1).get('label')?.value).toBe('Criterio 3');
    expect(component.criteria.at(2).get('label')?.value).toBe('Criterio 2');
  });

  it('should not move criteria if fromIndex or toIndex are out of bounds', () => {
    // Arrange
    routeParams = of({ id: 'script-123', version: '1' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { params: routeParams } });
    createComponent();

    // Act
    component.moveCriteria(0, -1);
    component.moveCriteria(2, 3);

    // Assert
    expect(component.criteria.at(0).get('label')?.value).toBe('Criterio 1');
    expect(component.criteria.at(2).get('label')?.value).toBe('Criterio 3');
  });

  it('should call moveCriteria when onCdkDrop is triggered with different indices', () => {
    // Arrange
    routeParams = of({ id: 'script-123', version: '1' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { params: routeParams } });
    createComponent();
    spyOn(component, 'moveCriteria');

    const event = {
      previousIndex: 0,
      currentIndex: 2
    } as CdkDragDrop<string[]>;

    // Act
    component.onCdkDrop(event);

    // Assert
    expect(component.moveCriteria).toHaveBeenCalledWith(0, 2);
  });

  it('should not call moveCriteria when onCdkDrop is triggered with identical indices', () => {
    // Arrange
    routeParams = of({ id: 'script-123', version: '1' });
    TestBed.overrideProvider(ActivatedRoute, { useValue: { params: routeParams } });
    createComponent();
    spyOn(component, 'moveCriteria');

    const event = {
      previousIndex: 1,
      currentIndex: 1
    } as CdkDragDrop<string[]>;

    // Act
    component.onCdkDrop(event);

    // Assert
    expect(component.moveCriteria).not.toHaveBeenCalled();
  });
});
