import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { PropertyCreateComponent } from './pages/properties/property-create.component';
import { PropertyDetailsComponent } from './pages/properties/property-details.component';
import { ScriptsComponent } from './pages/scripts/scripts.component';
import { ScriptBuilderComponent } from './pages/script-builder/script-builder.component';
import { EvaluationFormComponent } from './pages/evaluation/evaluation-form.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'properties', component: PropertiesComponent },
  { path: 'properties/create', component: PropertyCreateComponent },
  { path: 'properties/:propertyId', component: PropertyDetailsComponent },
  { path: 'roteiros', component: ScriptsComponent },
  { path: 'roteiros/builder', component: ScriptBuilderComponent },
  { path: 'roteiros/builder/:id/:version', component: ScriptBuilderComponent },
  { path: 'evaluate/:propertyId', component: EvaluationFormComponent },
  { path: 'evaluate/:propertyId/edit/:createdAt', component: EvaluationFormComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];


