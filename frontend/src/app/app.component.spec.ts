import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { WorkspaceService } from './services/workspace.service';
import { RouterTestingModule } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { 
  LucideAngularModule, 
  Mail, Lock, ArrowRight, Zap, Building2, Info, Briefcase, LogOut, Plus, Search, 
  Home, ClipboardList, ChevronLeft, MapPin, DollarSign, Maximize2, Bed, Bath, 
  Car, Link, Tag, PlusCircle, ShieldCheck, Camera, ExternalLink, Edit3, Eye, 
  EyeOff, GripVertical, Trash2, X, CheckCircle, AlertTriangle, AlertCircle, Clipboard
} from 'lucide-angular';

describe('AppComponent', () => {
  let authServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
      getUserEmail: jasmine.createSpy('getUserEmail').and.returnValue(null),
      logout: jasmine.createSpy('logout'),
      handleCognitoCallback: jasmine.createSpy('handleCognitoCallback')
    };

    const workspaceServiceMock = {
      getWorkspaces: jasmine.createSpy('getWorkspaces').and.returnValue({ subscribe: () => {} })
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: WorkspaceService, useValue: workspaceServiceMock },
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
  });

  it('should create the app', () => {
    // Arrange & Act
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // Assert
    expect(app).toBeTruthy();
  });
});
