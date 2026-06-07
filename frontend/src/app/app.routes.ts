import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { TemplateBuilderComponent } from './pages/template-builder/template-builder.component';
import { EvaluationFormComponent } from './pages/evaluation/evaluation-form.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'properties', component: PropertiesComponent },
  { path: 'template-builder', component: TemplateBuilderComponent },
  { path: 'evaluate/:propertyId', component: EvaluationFormComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

