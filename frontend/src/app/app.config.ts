import { ApplicationConfig, provideZoneChangeDetection, isDevMode, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { 
  LucideAngularModule, 
  Mail, 
  Lock, 
  ArrowRight, 
  Zap, 
  Building2, 
  Info, 
  Briefcase, 
  LogOut, 
  Plus, 
  Search, 
  Home, 
  ClipboardList, 
  ChevronLeft, 
  MapPin, 
  DollarSign, 
  Maximize2, 
  Bed, 
  Bath, 
  Car, 
  Link, 
  Tag, 
  PlusCircle, 
  ShieldCheck, 
  Camera, 
  ExternalLink, 
  Edit3, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Trash2, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Clipboard,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown
} from 'lucide-angular';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    importProvidersFrom(
      LucideAngularModule.pick({
        Mail, 
        Lock, 
        ArrowRight, 
        Zap, 
        Building2, 
        Info, 
        Briefcase, 
        LogOut, 
        Plus, 
        Search, 
        Home, 
        ClipboardList, 
        ChevronLeft, 
        MapPin, 
        DollarSign, 
        Maximize2, 
        Bed, 
        Bath, 
        Car, 
        Link, 
        Tag, 
        PlusCircle, 
        ShieldCheck, 
        Camera, 
        ExternalLink, 
        Edit3, 
        Eye, 
        EyeOff, 
        GripVertical, 
        Trash2, 
        X, 
        CheckCircle, 
        AlertTriangle, 
        AlertCircle,
        Clipboard,
        Calendar,
        ChevronRight,
        ChevronDown,
        ChevronUp,
        Check,
        ArrowUp,
        ArrowDown,
        TrendingUp,
        TrendingDown
      })
    )
  ]
};
