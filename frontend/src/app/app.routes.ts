import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { PropertyCreateComponent } from './pages/properties/property-create.component';
import { PropertyDetailsComponent } from './pages/properties/property-details.component';
import { ScriptsComponent } from './pages/scripts/scripts.component';
import { ScriptBuilderComponent } from './pages/script-builder/script-builder.component';
import { EvaluationFormComponent } from './pages/evaluation/evaluation-form.component';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'properties', component: PropertiesComponent, canActivate: [authGuard] },
  { path: 'properties/create', component: PropertyCreateComponent, canActivate: [authGuard] },
  { path: 'properties/:propertyId', component: PropertyDetailsComponent, canActivate: [authGuard] },
  { path: 'roteiros', component: ScriptsComponent, canActivate: [authGuard] },
  { path: 'roteiros/builder', component: ScriptBuilderComponent, canActivate: [authGuard] },
  { path: 'roteiros/builder/:id/:version', component: ScriptBuilderComponent, canActivate: [authGuard] },
  { path: 'evaluate/:propertyId', component: EvaluationFormComponent, canActivate: [authGuard] },
  { path: 'evaluate/:propertyId/edit/:createdAt', component: EvaluationFormComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];


