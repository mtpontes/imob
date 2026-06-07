import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { PropertyCreateComponent } from './pages/properties/property-create.component';
import { PropertyDetailsComponent } from './pages/properties/property-details.component';
import { TemplatesComponent } from './pages/templates/templates.component';
import { TemplateBuilderComponent } from './pages/template-builder/template-builder.component';
import { EvaluationFormComponent } from './pages/evaluation/evaluation-form.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'properties', component: PropertiesComponent },
  { path: 'properties/create', component: PropertyCreateComponent },
  { path: 'properties/:propertyId', component: PropertyDetailsComponent },
  { path: 'templates', component: TemplatesComponent },
  { path: 'templates/builder', component: TemplateBuilderComponent },
  { path: 'templates/builder/:id/:version', component: TemplateBuilderComponent },
  { path: 'evaluate/:propertyId', component: EvaluationFormComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

