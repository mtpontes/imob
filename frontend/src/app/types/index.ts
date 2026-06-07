export interface Criteria {
  id: string;
  label: string;
  type: 'text' | 'bool' | 'range';
  isScorable: boolean;
  weight: number;
  min?: number;
  max?: number;
}

export interface CreateTemplateRequest {
  name: string;
  criteria: Criteria[];
}

export interface UpdateTemplateRequest {
  name: string;
  newVersion: boolean;
  criteria: Criteria[];
}

export interface TemplateResponse {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  criteria: Criteria[];
  name: string;
}

export interface CreatePropertyRequest {
  address: string;
  price: number;
  sqm: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  url: string;
}

export interface PropertyResponse {
  id: string;
  address: string;
  price: number;
  sqm: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  url: string;
  createdAt: string;
}

export interface CreateEvaluationRequest {
  propertyId: string;
  templateId: string;
  templateVersion: number;
  answers: { [key: string]: any };
  notes: string;
  mediaKeys: string[];
}

export interface EvaluationResponse {
  propertyId: string;
  createdAt: string;
  templateId: string;
  templateVersion: number;
  finalScore: number;
  notes: string;
  answers: { [key: string]: any };
  mediaUrls: string[];
}

export interface GenerateUploadUrlRequest {
  fileName: string;
}

export interface GenerateUploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}
