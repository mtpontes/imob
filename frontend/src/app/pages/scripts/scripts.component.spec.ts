import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ScriptsComponent } from './scripts.component';
import { ScriptService } from '../../services/script.service';
import { ScriptResponse } from '../../types';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule, Plus, ClipboardList, Edit3 } from 'lucide-angular';
import { By } from '@angular/platform-browser';

describe('ScriptsComponent', () => {
  let component: ScriptsComponent;
  let fixture: ComponentFixture<ScriptsComponent>;
  let scriptServiceMock: any;
  let router: Router;

  const mockScripts: ScriptResponse[] = [
    {
      id: 'script-1',
      version: 1,
      isActive: true,
      createdAt: '2026-06-07T10:00:00Z',
      name: 'Roteiro A',
      criteria: []
    },
    {
      id: 'script-2',
      version: 2,
      isActive: true,
      createdAt: '2026-06-07T11:00:00Z',
      name: 'Roteiro B',
      criteria: []
    }
  ];

  beforeEach(async () => {
    scriptServiceMock = {
      getActiveScripts: jasmine.createSpy('getActiveScripts').and.returnValue(of(mockScripts))
    };

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ScriptsComponent
      ],
      providers: [
        { provide: ScriptService, useValue: scriptServiceMock },
        importProvidersFrom(
          LucideAngularModule.pick({
            Plus,
            ClipboardList,
            Edit3
          })
        )
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScriptsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create component and load scripts', () => {
    // Arrange & Act
    // O component carrega automaticamente no ngOnInit

    // Assert
    expect(component).toBeTruthy();
    expect(scriptServiceMock.getActiveScripts).toHaveBeenCalled();
    expect(component.scripts.length).toBe(2);
    // Ordenacao por data decrescente: script-2 (11:00) deve vir antes de script-1 (10:00)
    expect(component.scripts[0].id).toBe('script-2');
  });

  it('should navigate to script builder on card click', () => {
    // Arrange
    spyOn(router, 'navigate');
    const cards = fixture.debugElement.queryAll(By.css('.template-row'));
    expect(cards.length).toBe(2);

    // Act
    // Clica no card do Roteiro B (o primeiro da lista)
    cards[0].nativeElement.click();

    // Assert
    expect(router.navigate).toHaveBeenCalledWith(['/roteiros/builder', 'script-2', 2]);
  });

  it('should navigate to script builder on button click and stop propagation', () => {
    // Arrange
    spyOn(router, 'navigate');
    const editButton = fixture.debugElement.query(By.css('#btn-edit-template-script-2'));
    const clickEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

    // Act
    editButton.triggerEventHandler('click', clickEvent);

    // Assert
    expect(clickEvent.stopPropagation).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/roteiros/builder', 'script-2', 2]);
  });
});
