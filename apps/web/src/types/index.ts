export type LayerType = 'api' | 'service' | 'model' | 'core' | 'test' | 'module';
export type ImpactType = 'direct' | 'indirect' | 'none';
export type LayoutMode = 'hierarchical' | 'stream' | 'compact';

export interface RepositoryStats {
  file_count: number;
  symbol_count: number;
  edge_count: number;
  endpoint_count?: number;
  model_count?: number;
  test_count?: number;
  languages?: Record<string, number>;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'indexing' | 'ready' | 'error';
  error_message?: string;
  stats?: RepositoryStats;
  created_at: string;
  indexed_at?: string;
  clone_url?: string;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export interface GitHubAuthUrlResponse {
  url: string;
  client_id: string;
}

export interface SystemInfo {
  provider: string;
  model: string;
  base_url: string;
  is_live: boolean;
  has_api_key: boolean;
  api_key_source?: 'custom' | 'system' | 'none';
  custom_api_key?: string;
  masked_api_key?: string;
  temperature: number;
  max_tokens: number;
  environment: string;
  provider_profile?: 'meta_only' | 'multi_ai';
}

export interface UpdateSystemSettingsRequest {
  email?: string;
  provider?: string;
  model?: string;
  base_url?: string;
  api_key?: string;
  reset_api_key?: boolean;
  temperature?: number;
  max_tokens?: number;
  provider_profile?: 'meta_only' | 'multi_ai';
}

export interface EndpointInfo {
  name: string;
  method: string;
  route: string;
  line?: number;
}

export interface NodeData {
  file_id: string;
  path: string;
  label: string;
  layer: LayerType;
  language: string;
  symbol_count: number;
  symbols: string[];
  endpoints: EndpointInfo[];
  impact_status: ImpactType;
}

export interface SimpleExplanation {
  functional_area?: string;
  summary?: string;
  why_it_matters?: string;
  possible_risk?: string;
  recommended_check?: string;
  uncertainty?: string;
  user_consequence?: string;
  screen_location?: string;
}

export interface ImpactItem {
  file_path: string;
  symbol?: string | null;
  impact_type: 'direct' | 'indirect';
  category: string;
  reason: string;
  confidence: number;
  is_verified_fact: boolean;
  evidence_snippet?: string;
  line_start?: number;
  line_end?: number;
  symbol_type?: string;
  impact_status?: 'supported' | 'potential';
  impact_supported?: boolean;
  evidence_status?: 'supported' | 'potential';
  simple_explanation?: SimpleExplanation;
  technical_explanation?: any;
}

export interface PlainTestItem {
  title: string;
  action: string;
  expected: string;
}

export interface ImpactStory {
  story: string;
  what_to_do_first: string;
  what_might_break: string;
  action_for_agent: string;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface SuggestedOption {
  label: string;
  value: string;
  kind: 'size' | 'font' | 'spacing' | 'radius' | 'other';
}

export interface VoiceRequirementResponse {
  status: string;
  raw_transcript: string;
  refined_requirement: string;
  ambiguities: string[];
  suggested_colors?: ColorOption[];
  suggested_options?: SuggestedOption[];
  clarifications_made: string[];
  models_used: {
    transcription: string;
    refinement: string;
  };
  durations_seconds: {
    transcription: number;
    refinement: number;
    total: number;
  };
  keywords_used: string[];
  refinement_error?: string;
}

export interface RefineRequirementResponse {
  status: string;
  raw_transcript: string;
  refined_requirement: string;
  ambiguities: string[];
  suggested_colors?: ColorOption[];
  suggested_options?: SuggestedOption[];
  clarifications_made: string[];
  models_used: {
    refinement: string;
  };
  duration_seconds: number;
  keywords_used: string[];
  refinement_error?: string;
}

export interface FollowUpResponse {
  question: string;
  answer: string;
  screen_consequence: string;
  grounded_files: string[];
  callers: string[];
  dependencies: string[];
}

export interface ScreenshotPreviewResponse {
  status: string;
  screen_type: string;
  summary: string;
  visible_elements: string[];
  user_actions: string[];
  uncertainties: string[];
}

export interface AnalysisReport {
  requirement_summary: string;
  impact_story?: ImpactStory;
  plain_test_checklist?: PlainTestItem[];
  interpretation?: {
    business_intent: string;
    actors: string[];
    existing_behavior: string;
    desired_behavior: string;
    preconditions: string[];
    postconditions: string[];
    security_implications: string[];
    validation_requirements: string[];
  };
  affected_items: ImpactItem[];
  potential_impacts?: ImpactItem[];
  risks: string[];
  suggested_tests: string[];
  assumptions: string[];
  coverage_review?: {
    areas_reviewed: string[];
    is_complete: boolean;
    potential_gaps: string[];
    additional_files_to_check: string[];
  };
  validation_metrics?: {
    total_claims: number;
    verified_claims: number;
    rejected_hallucinations: number;
    grounding_ratio: number;
  };
  rejected_hallucinations?: Array<{
    claimed_path: string;
    claimed_symbol?: string;
    reason: string;
  }>;
  visual_context?: {
    image_sha256?: string;
    mime_type?: string;
    width?: number;
    height?: number;
    screen_type?: string;
    visible_elements?: string[];
    user_actions?: string[];
    functional_concepts?: string[];
    uncertainties?: string[];
  };
  operational_metadata?: {
    provider: string;
    model: string;
    is_demo_mode: boolean;
    execution_time_seconds: number;
    timestamp: string;
  };
}
