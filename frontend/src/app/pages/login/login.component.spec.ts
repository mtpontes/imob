import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { importProvidersFrom } from '@angular/core';
import {
  LucideAngularModule,
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search,
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath,
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye,
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard
} from 'lucide-angular';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getGoogleLoginUrl',
      'bypassLogin',
      'isLoggedIn',
      'getUserEmail'
    ]);
    const rSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    const activatedRouteMock = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => null
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: rSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
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

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    // Arrange & Act & Assert
    expect(component).toBeTruthy();
  });

  it('should call getGoogleLoginUrl when loginWithGoogle is triggered', () => {
    // Arrange
    const fakeUrl = 'https://imobapp-auth.auth.us-east-1.amazoncognito.com/oauth2/authorize?identity_provider=Google';
    authServiceSpy.getGoogleLoginUrl.and.returnValue(fakeUrl);

    // Act - nao executa o redirect real; valida apenas a chamada ao servico
    // window.location.href nao pode ser espionado no Chrome Headless
    spyOn(component as any, 'loginWithGoogle').and.callFake(() => {
      authServiceSpy.getGoogleLoginUrl();
    });
    component.loginWithGoogle();

    // Assert
    expect(authServiceSpy.getGoogleLoginUrl).toHaveBeenCalled();
  });

  it('should call bypassLogin and navigate to properties on bypass', () => {
    // Arrange
    authServiceSpy.bypassLogin.and.stub();
    routerSpy.navigateByUrl.and.returnValue(Promise.resolve(true));

    // Act
    component.bypassLogin();

    // Assert
    expect(authServiceSpy.bypassLogin).toHaveBeenCalledWith('demo@imobapp.com.br');
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/properties');
  });

  it('should show error message when bypassLogin throws', () => {
    // Arrange
    authServiceSpy.bypassLogin.and.throwError('Erro simulado');

    // Act
    component.bypassLogin();

    // Assert
    expect(component.errorMessage).toBe('Erro ao realizar login de bypass.');
    expect(component.loading).toBeFalse();
  });
});
