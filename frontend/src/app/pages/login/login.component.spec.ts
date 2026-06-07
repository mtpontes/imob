import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
    const authSpy = jasmine.createSpyObj('AuthService', ['login']);
    const rSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: rSpy },
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

  it('should mark form as invalid when empty', () => {
    // Arrange & Act & Assert
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should validate email format', () => {
    // Arrange
    const email = component.loginForm.controls['email'];

    // Act
    email.setValue('invalid-email');

    // Assert
    expect(email.hasError('email')).toBeTrue();
  });

  it('should login and navigate on success', () => {
    // Arrange
    authServiceSpy.login.and.returnValue(of({ token: 'dummy' }));
    component.loginForm.controls['email'].setValue('test@imob.com');
    component.loginForm.controls['password'].setValue('password123');

    // Act
    component.onSubmit();

    // Assert
    expect(authServiceSpy.login).toHaveBeenCalledWith('test@imob.com', 'password123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/properties']);
  });
});
