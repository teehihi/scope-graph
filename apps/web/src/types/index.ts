export type LayerType = 'api' | 'service' | 'model' | 'core' | 'test' | 'module';
export type ImpactType = 'direct' | 'indirect' | 'none';

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
}

export interface AnalysisReport {
  requirement_summary: string;
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
  operational_metadata?: {
    provider: string;
    model: string;
    is_demo_mode: boolean;
    execution_time_seconds: number;
    timestamp: string;
  };
}
