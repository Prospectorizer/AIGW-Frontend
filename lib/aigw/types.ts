export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type GatewayHealth = {
  status: string;
  uptime_seconds: number;
  total_requests: number;
  total_errors: number;
  total_tokens: number;
  total_cost_usd: number;
  cache_hits: number;
};

export type OverviewMetrics = {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_sar: number;
  avg_latency_ms: number;
  error_count: number;
  cache_hits: number;
  cache_hit_rate: number;
};

export type SpendPoint = {
  time_bucket: string;
  cost_usd: number;
  cost_sar: number;
  requests: number;
  tokens: number;
};

export type ModelSpend = {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  cost_usd: number;
  avg_latency: number;
};

export type GatewayRequest = {
  request_id: string;
  tenant_id: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  cache_hit: number | boolean;
  status_code: number;
  error_message: string;
  created_at: string;
};

export type Provider = {
  id: number;
  slug: string;
  display_name: string;
  adapter_type: string;
  base_url: string;
  auth_header: string;
  auth_prefix: string;
  chat_endpoint: string;
  is_enabled: boolean;
  priority: number;
  model_count: number;
};

export type ProviderModel = {
  id: number;
  provider_id: number;
  provider_slug: string;
  provider_name: string;
  model_id: string;
  display_name: string;
  input_cost_per_m: number;
  output_cost_per_m: number;
  context_window: number;
  max_output_tokens: number;
  supports_streaming: boolean;
  supports_tools: boolean;
  is_enabled: boolean;
  complexity_tier: string;
};

export type TeamMember = { id: number; display_name: string; email: string; role_id: number; role_key: string; role_name: string; status: string; joined_at: string };
export type TeamRole = { id: number; role_key: string; display_name: string; description: string; is_system: boolean; permission_count: number };
export type TeamInvitation = { id: number; email: string; role_name: string; expires_at: string; created_at: string };

export type ComputeTarget = { id: number; target_key: string; display_name: string; target_type: "model_api"|"local_cpu"|"local_gpu"|"npu"|"quantum_experimental"; runtime_name: string; model_id: string; endpoint_url: string|null; cost_per_m_tokens: number|null; max_concurrency: number|null; status: string };
export type WorkloadProfile = { id: number; profile_key: string; display_name: string; task_type: string; minimum_quality: number; max_latency_ms: number|null; data_policy: string; optimize_for: string; allow_batch: boolean; is_enabled: boolean };
export type BenchmarkResult = { id: number; target_name: string; target_type: string; task_type: string; input_size_bucket: string; p50_latency_ms: number; p95_latency_ms: number; throughput_per_second: number; quality_score: number; estimated_cost_usd: number; energy_joules: number|null; sample_count: number; measured_at: string };
export type ComputeDecision = { decision_id: number; route: string; target_name: string; target_type: string; model: string; runtime: string; predicted_latency_ms: number; predicted_quality: number; estimated_cost_usd: number; reason: { profile:string; task_type:string; optimize_for:string; eligible_targets:number; quantum_excluded_from_mvp:boolean } };
export type ComputeDecisionRecord = { id:number; request_id:string; profile_name:string; route:string; target_name:string; target_type:string; model:string; runtime:string; predicted_latency_ms:number; predicted_quality:number; estimated_cost_usd:number; created_at:string };
