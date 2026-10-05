import { useEffect, useState } from 'react'

export type Metric = number | null
export type Telemetry = { model:string; prompt_tokens:Metric; completion_tokens:Metric; total_tokens:Metric; ttft_ms:Metric; prompt_ms:Metric; decode_ms:Metric; prompt_tps:Metric; decode_tps:Metric; sources:Record<string,string> }
export type Diagnosis = { diagnosis:string; severity:string; summary:string; root_cause:string; recommendation:string; confidence:number; evidence:string[] }
export type HostSample = { at:string; cpu_utilization_pct:Metric; process_cpu_pct:Metric; process_rss_bytes:Metric; host_available_bytes:Metric; host_total_bytes:Metric; threads:Metric; minor_faults:Metric; major_faults:Metric; voluntary_context_switches:Metric; involuntary_context_switches:Metric; load_1:Metric }
export type HostWindow = { pid?:number; samples:HostSample[]; peak_cpu_utilization_pct:Metric; peak_process_cpu_pct:Metric; peak_process_rss_bytes:Metric; major_fault_delta:Metric; error?:string }
export type RuntimeSample = { at:string; queue_depth:Metric; running_requests:Metric; kv_cache_usage_fraction:Metric }
export type RuntimeWindow = { start:RuntimeSample|null; end:RuntimeSample|null; peak_queue_depth:Metric; error?:string }
export type AcceleratorSample = { at:string; source:string; vendor:string; device_id:string; device_name:string; gpu_utilization:Metric; memory_utilization:Metric; vram_used_bytes:Metric; vram_total_bytes:Metric; temperature_c:Metric; power_watts:Metric }
export type RequestRecord = { request_id:string; application_id:number|null; provider:string; mode:string; requested_model:string; streaming:boolean; request_bytes:Metric; response_bytes:Metric; baseline_decode_tps:Metric; telemetry:Telemetry; upstream_ms:number; gateway_ms:number; total_ms:number; created_at:string; completed_at:string; status_code:number; error?:string; host?:HostWindow; runtime?:RuntimeWindow; accelerators?:AcceleratorSample[]; accelerator_error?:string; diagnosis?:Diagnosis }
export type RequestPage = { items:RequestRecord[]; total:number; page:number; page_size:number }
export type Hour = { hour:string; requests:number; errors:number; tokens:number; average_latency_ms:Metric; average_ttft_ms:Metric }
export type DiagnosisRow = { id:number; request_id:string; category:string; severity:string; confidence:number; summary:string; root_cause:string; recommendation:string; evidence:string[]; created_at:string; provider:string; model:string }
export type Summary = { requests:number; errors:number; error_rate:number; p50_latency_ms:Metric; p95_latency_ms:Metric; p99_latency_ms:Metric; p50_ttft_ms:Metric; p95_ttft_ms:Metric; average_prompt_tps:Metric; average_decode_tps:Metric; by_provider:Record<string,number>; by_model:Record<string,number>; by_mode:Record<string,number>; hourly:Hour[]; recent_diagnoses:DiagnosisRow[] }
export type Provider = { id:string; name:string; mode:string; enabled:boolean; available:boolean|null; capabilities:Record<string,boolean> }
export type Application = { id:number; name:string; description:string }

export async function getJSON<T>(url:string):Promise<T> { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status} ${response.statusText}`); return response.json() }
export function useResource<T>(url:string) { const [data,setData]=useState<T|null>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true); const [version,setVersion]=useState(0); useEffect(()=>{let active=true;setLoading(true);setError('');getJSON<T>(url).then(value=>{if(active)setData(value)}).catch(err=>{if(active)setError(String(err))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[url,version]);return {data,error,loading,reload:()=>setVersion(v=>v+1)} }
export const ms=(v:Metric|undefined)=>v==null?'—':v>=1000?`${(v/1000).toFixed(2)} s`:`${v.toFixed(1)} ms`
export const number=(v:Metric|undefined,digits=1)=>v==null?'—':v.toFixed(digits)
export const compact=(v:number)=>Intl.NumberFormat('en',{notation:'compact'}).format(v)
export const bytes=(v:Metric|undefined)=>v==null?'—':v>=1e9?`${(v/1e9).toFixed(2)} GB`:v>=1e6?`${(v/1e6).toFixed(1)} MB`:v>=1e3?`${(v/1e3).toFixed(1)} KB`:`${Math.round(v)} B`
export const date=(v:string|undefined)=>v?new Date(v).toLocaleString():'—'
export const short=(v:string)=>v.slice(0,8)
export const modeName=(v:string)=>v==='self_hosted'?'Self-hosted':'External'
export const titleCase=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
export const go=(path:string)=>{window.location.assign(path)}
