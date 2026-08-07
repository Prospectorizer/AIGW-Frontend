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
