export interface Criteria {
  id: string;
  label: string;
  type: 'text' | 'bool' | 'range';
  isScorable: boolean;
  weight: number;
  min?: number;
  max?: number;
}

export interface CreateScriptRequest {
  name: string;
  criteria: Criteria[];
}

export interface UpdateScriptRequest {
  name: string;
  criteria: Criteria[];
}

export interface ScriptResponse {
  id: string;
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
  scriptId: string;
  answers: { [key: string]: any };
  notes: string;
  mediaKeys: string[];
}

export interface UpdateEvaluationRequest {
  notes: string;
  answers: { [key: string]: any };
  mediaKeys: string[];
}

export interface EvaluationResponse {
  propertyId: string;
  createdAt: string;
  scriptId: string;
  notes: string;
  answers: { [key: string]: any };
  mediaUrls: string[];
  mediaKeys?: string[];
}

export interface GenerateUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface GenerateUploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}
