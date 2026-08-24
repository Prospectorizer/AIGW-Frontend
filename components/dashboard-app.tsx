"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteAigw, postAigw } from "@/lib/aigw/client";
import type { GatewayHealth, GatewayRequest, ModelSpend, OverviewMetrics, Provider, ProviderModel, SpendPoint, TeamInvitation, TeamMember, TeamRole } from "@/lib/aigw/types";
import { AiCopilot } from "./ai-copilot";
import { BenchmarksPage, ComputeOptimizer, ComputeTargetsPage, WorkloadsPage } from "./compute-control-plane";
import { Icon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { useAigw, type ApiState } from "./use-aigw";

type AppProps = { organizationSlug: string; projectSlug: string; section: string; detailId?: string; currentUser: { user_id: number; email: string; display_name: string }; organizationName: string; projectName: string };
type NavItem = { label: string; slug: string; icon: string; badge?: string };

const nav: { label: string; items: NavItem[] }[] = [
  { label: "Workspace", items: [{ label: "Overview", slug: "overview", icon: "overview" }] },
  { label: "Observability", items: [
    { label: "Requests", slug: "requests", icon: "requests", badge: "Live" }, { label: "Traces", slug: "traces", icon: "traces" },
    { label: "Sessions", slug: "sessions", icon: "sessions" }, { label: "Users", slug: "users", icon: "users" }, { label: "Errors", slug: "errors", icon: "errors" },
  ]},
  { label: "Gateway", items: [
    { label: "Compute optimizer", slug: "routing", icon: "routing" }, { label: "Workloads", slug: "workloads", icon: "sessions" },
    { label: "Compute targets", slug: "compute-targets", icon: "providers" }, { label: "Benchmarks", slug: "benchmarks", icon: "traces" },
    { label: "Providers", slug: "providers", icon: "providers" }, { label: "Models", slug: "models", icon: "models" },
    { label: "Model routes", slug: "model-routes", icon: "routing" }, { label: "Fallbacks", slug: "fallbacks", icon: "fallbacks" }, { label: "Caching", slug: "caching", icon: "caching" },
  ]},
  { label: "Management", items: [
    { label: "API keys", slug: "api-keys", icon: "keys" }, { label: "Budgets", slug: "budgets", icon: "budgets" },
    { label: "Rate limits", slug: "rate-limits", icon: "limits" }, { label: "Alerts", slug: "alerts", icon: "alerts" }, { label: "Webhooks", slug: "webhooks", icon: "webhooks" },
  ]},
  { label: "Developer", items: [
    { label: "Playground", slug: "playground", icon: "playground" }, { label: "API documentation", slug: "docs", icon: "docs" },
  ]},
];

type RequestRow = { id: string; time: string; date: string; status: string; model: string; provider: string; tokens: string; cost: string; latency: string; user: string };

function requestToRow(request: GatewayRequest): RequestRow {
  const createdAt = new Date(request.created_at);
  return {
    id: request.request_id,
    time: Number.isNaN(createdAt.getTime()) ? request.created_at : createdAt.toLocaleTimeString([], { hour12: false }),
    date: Number.isNaN(createdAt.getTime()) ? "" : createdAt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
    status: String(request.status_code),
    model: request.model,
    provider: request.provider,
    tokens: Number(request.total_tokens).toLocaleString(),
    cost: `$${Number(request.cost_usd).toFixed(6)}`,
    latency: formatLatency(Number(request.latency_ms)),
    user: request.tenant_id,
  };
}

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

function Logo() {
  return <div className="logo"><span className="logo-mark"><i /><i /><i /></span><span>Compute Gateway</span></div>;
}

function Sidebar({ base, open, close, collapsed, toggleCollapsed, currentUser, organizationName, projectName, onLogout, loggingOut }: { base: string; open: boolean; close: () => void; collapsed: boolean; toggleCollapsed: () => void; currentUser: AppProps["currentUser"]; organizationName: string; projectName: string; onLogout: () => void; loggingOut: boolean }) {
  const pathname = usePathname();
  return <>
    {open && <button className="backdrop" onClick={close} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="side-top"><Logo /><button className="icon-btn collapse-btn" onClick={toggleCollapsed} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}><Icon name={collapsed ? "expand" : "collapse"}/></button><button className="icon-btn side-close" onClick={close}><Icon name="close" /></button></div>
      <button className="project-switch"><span className="project-avatar">{projectName.slice(0,2).toUpperCase()}</span><span><b>{projectName}</b><small>{organizationName}</small></span><span className="switch-arrows">⌃<br/>⌄</span></button>
      <nav className="side-nav scrollbar">
        {nav.map(group => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item => {
          const active = pathname === base || pathname.startsWith(`${base}/${item.slug}`) ? item.slug === "overview" ? pathname === base || pathname === `${base}/overview` : pathname.startsWith(`${base}/${item.slug}`) : false;
          return <Link key={item.slug} href={item.slug === "overview" ? base : `${base}/${item.slug}`} onClick={close} className={`nav-link ${active ? "active" : ""}`}>
            <Icon name={item.icon}/><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}
          </Link>;
        })}</div>)}
      </nav>
      <div className="side-bottom">
        <Link href={`${base}/members`} className="nav-link"><Icon name="users"/><span>Members</span></Link>
        <Link href={`${base}/audit-logs`} className="nav-link"><Icon name="audit"/><span>Audit logs</span></Link>
        <Link href={`${base}/settings`} className="nav-link"><Icon name="settings"/><span>Settings</span></Link>
        <button className="account" onClick={onLogout} disabled={loggingOut} title="Sign out"><span className="user-avatar">{initials(currentUser.display_name)}</span><span><b>{loggingOut ? "Signing out…" : currentUser.display_name}</b><small>{currentUser.email}</small></span><span>↪</span></button>
      </div>
    </aside>
  </>;
}

function Header({ title, onMenu, gatewayState, projectName, currentUser }: { title: string; onMenu: () => void; gatewayState: ApiState; projectName: string; currentUser: AppProps["currentUser"] }) {
  const statusText = gatewayState === "connected" ? "Gateway operational" : gatewayState === "loading" ? "Checking gateway" : "Gateway offline";
  return <header className="header"><div className="header-title"><button className="icon-btn menu-btn" onClick={onMenu}><Icon name="menu"/></button><span>{projectName}</span><i>/</i><strong>{title}</strong></div><div className="header-actions"><button className="search"><Icon name="search"/><span>Search workspace</span><kbd>⌘ K</kbd></button><span className={`live ${gatewayState}`}><i/>{statusText}</span><ThemeToggle/><button className="bell"><Icon name="alerts"/><i/></button><button className="header-avatar" aria-label="Open account menu">{initials(currentUser.display_name)}</button></div></header>;
}

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"U"}

function Button({ children, secondary = false, onClick, disabled = false }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void; disabled?: boolean }) {
  return <button className={`button ${secondary ? "secondary" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Select({ children }: { children: React.ReactNode }) { return <button className="selectish">{children}<span>⌄</span></button>; }

function Filters() {
  return <div className="filters"><Select>Last 24 hours</Select><Select>All environments</Select><Select>All providers</Select><Select>All models</Select><button className="filter-more">+ Add filter</button><button className="refresh">↻</button></div>;
}

function BackendNotice({ state, error, refresh }: { state: ApiState; error: string | null; refresh: () => void }) {
  if (state !== "error") return null;
  return <div className="backend-notice"><span>!</span><div><b>Live gateway data is unavailable</b><p>{error ?? "Start the Go API and try again."}</p></div><button onClick={refresh}>Retry</button></div>;
}

function Spark({ color, points }: { color: string; points: string }) {
  return <svg className="spark" viewBox="0 0 120 36" preserveAspectRatio="none"><path d={`${points} L120 36 L0 36Z`} fill={color} opacity=".10"/><path d={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>;
}

const metricSparks = [
  "M0 29 C14 27 18 15 31 20 S48 27 60 16 S78 21 87 11 S106 17 120 4",
  "M0 27 C16 30 23 18 38 21 S57 10 69 17 S85 11 94 14 S107 5 120 9",
  "M0 22 C18 21 20 23 36 18 S54 20 69 17 S87 19 101 12 S112 14 120 8",
  "M0 8 C14 13 25 9 38 17 S54 12 66 20 S84 14 96 23 S110 18 120 27",
];

function Overview() {
  const overview = useAigw<OverviewMetrics>("/api/dashboard/overview?period=24h", { total_requests: 0, total_tokens: 0, total_cost_usd: 0, total_cost_sar: 0, avg_latency_ms: 0, error_count: 0, cache_hits: 0, cache_hit_rate: 0 });
  const spend = useAigw<SpendPoint[]>("/api/dashboard/spend-over-time?period=24h&granularity=hour", []);
  const models = useAigw<ModelSpend[]>("/api/dashboard/spend-by-model?period=24h", []);
  const requests = useAigw<GatewayRequest[]>("/api/dashboard/requests?limit=5", []);
  const successRate = overview.data.total_requests > 0 ? ((overview.data.total_requests - overview.data.error_count) * 100 / overview.data.total_requests) : 0;
  const liveMetrics = [
    ["Total requests", Number(overview.data.total_requests).toLocaleString(), "Live", metricSparks[0], "#0f8f87"],
    ["Total cost", `$${Number(overview.data.total_cost_usd).toFixed(2)}`, "Live", metricSparks[1], "#0891b2"],
    ["Success rate", `${successRate.toFixed(2)}%`, "Live", metricSparks[2], "#16a36a"],
    ["Avg latency", formatLatency(Number(overview.data.avg_latency_ms)), "Live", metricSparks[3], "#e29438"],
  ];
  const modelItems = models.data.length > 0 ? models.data : undefined;
  const recentRows = requests.data.map(requestToRow);
  return <div className="page-enter"><PageTitle title="Overview" subtitle="Gateway performance and usage across your project." actions={<Button secondary>Export report</Button>}/><BackendNotice state={overview.state} error={overview.error} refresh={overview.refresh}/><Filters/>
    <div className="metrics">{liveMetrics.map(([label,value,trend,points,color],index) => <div className={`metric metric-${index}`} key={label}><div><div className="metric-top"><span className="metric-icon"><Icon name={["requests","budgets","overview","limits"][index]}/></span><span className="metric-label">{label}</span><small className="metric-live"><i/>Live</small></div><strong>{value}</strong><small className="good">{trend} <i>from Go gateway</i></small></div><Spark color={color} points={points}/></div>)}</div>
    <div className="chart-grid"><Panel className="chart-panel" title="Requests over time" subtitle="Requests recorded by the gateway"><AreaChart points={spend.data}/></Panel><Panel className="chart-panel" title="Cost over time" subtitle="Total provider spend" aside={<b className="panel-total">${Number(overview.data.total_cost_usd).toFixed(2)}</b>}><BarChart points={spend.data}/></Panel></div>
    <div className="bottom-grid"><Panel title="Model breakdown" subtitle="Requests and cost by model"><ModelBreakdown items={modelItems}/></Panel><Panel title="Provider health" subtitle="Live health and performance"><ProviderHealth/></Panel><Panel title="Recent requests" subtitle="Latest gateway activity" aside={<Link href="requests" className="text-link">View all →</Link>}><MiniRequests rows={recentRows}/></Panel></div>
  </div>;
}

function PageTitle({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) { return <div className="page-title"><div><span className="page-eyebrow">Project workspace</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="title-actions">{actions}</div>}</div>; }
function Panel({ title, subtitle, aside, children, className="" }: { title: string; subtitle?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}><div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{aside}</div><div className="panel-body">{children}</div></section>; }

function AreaChart({ points }: { points: SpendPoint[] }) {
  if (points.length === 0) return <div className="empty-inline">No request activity in this period.</div>;
  const max=Math.max(...points.map(point=>Number(point.requests)),1); const width=600; const height=190; const coords=points.map((point,index)=>`${points.length===1?width/2:index*width/(points.length-1)},${height-Number(point.requests)/max*170}`).join(" ");
  return <div className="chart"><svg viewBox="0 0 600 210" preserveAspectRatio="none"><polyline points={coords} fill="none" stroke="#0f8f87" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg></div>;
}
function BarChart({ points }: { points: SpendPoint[] }) { if(points.length===0)return <div className="empty-inline">No spend in this period.</div>; const max=Math.max(...points.map(point=>Number(point.cost_usd)),1); const bars=points.map(point=>Math.max(2,Number(point.cost_usd)/max*125)); return <div className="bar-chart"><div className="bars">{bars.map((h,i)=><i key={points[i].time_bucket} title={`$${Number(points[i].cost_usd).toFixed(4)}`} style={{height:`${h/1.35}px`}} />)}</div></div>; }

function ModelBreakdown({ items = [] }: { items?: ModelSpend[] }) { const colors=["#2563eb","#0ea5e9","#14b8a6","#94a3b8"]; const total=items.reduce((sum,item)=>sum+Number(item.requests),0); if(!items.length)return <div className="empty-inline">No model usage in this period.</div>; return <div className="breakdown">{items.slice(0,4).map((item,index)=>{const percent=`${total?Math.round(Number(item.requests)*100/total):0}%`;return <div className="break-row" key={`${item.provider}:${item.model}`}><span className="provider-dot" style={{background:colors[index]}}/><div><b>{item.model}</b><small>{item.provider}</small></div><div className="progress"><i style={{width:percent,background:colors[index]}}/></div><strong>{percent}</strong></div>})}</div>; }
function ProviderHealth() { const providers=useAigw<Provider[]>("/api/admin/providers",[]); if(providers.data.length===0)return <div className="empty-inline">No providers configured.</div>; return <div className="health-list">{providers.data.map(item=><div className="health-row" key={item.id}><span className="provider-logo p-o">{(item.display_name||item.slug)[0]}</span><div><b>{item.display_name||item.slug}</b><small><i/>{item.is_enabled?"Enabled":"Disabled"}</small></div><span>{item.model_count}<small>models</small></span></div>)}</div>; }
function MiniRequests({ rows }: { rows: RequestRow[] }) { return <div className="mini-requests">{rows.slice(0,4).map(r=><div key={r.id}><Status value={r.status}/><span><b>{r.model}</b><small>{r.provider} · {r.time}</small></span><span><b>{r.latency}</b><small>{r.cost}</small></span></div>)}</div>; }
function Status({ value }: { value: string }) { const ok=value.startsWith("2"); return <span className={`status ${ok ? "success" : value === "429" ? "warning" : "error"}`}><i/>{value}</span>; }

function Requests({ base, detailId }: { base: string; detailId?: string }) {
  const liveRequests = useAigw<GatewayRequest[]>("/api/dashboard/requests?limit=50", []);
  const rows = liveRequests.data.map(requestToRow);
  const [query,setQuery]=useState(""); const filtered=rows.filter(r=>Object.values(r).some(v=>v.toLowerCase().includes(query.toLowerCase())));
  if(detailId) return <RequestDetail base={base} id={detailId} rows={rows} state={liveRequests.state} error={liveRequests.error}/>;
  return <div className="page-enter"><PageTitle title="Requests" subtitle="Inspect every request flowing through your gateway." actions={<><Button secondary>Export CSV</Button><Button><Icon name="plus"/> Create request</Button></>}/><BackendNotice state={liveRequests.state} error={liveRequests.error} refresh={liveRequests.refresh}/>
    <div className="request-toolbar"><div className="table-search"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search request ID, model, user..."/></div><Select>Last 24 hours</Select><Select>Status</Select><Select>Provider</Select><Select>Model</Select><button className="filter-more">+ More</button></div>
    <div className="data-panel"><div className="table-summary"><span><i className="pulse"/> {liveRequests.state === "connected" ? "Live requests" : "Sample requests"}</span><span>{filtered.length} results · Updated just now</span></div><div className="table-wrap scrollbar"><table><thead><tr><th>Timestamp</th><th>Status</th><th>Model</th><th>Provider</th><th>Tokens</th><th>Cost</th><th>Latency</th><th>User</th><th/></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><Link href={`${base}/requests/${r.id}`}><b>{r.time}</b><small>{r.date}</small></Link></td><td><Status value={r.status}/></td><td><code>{r.model}</code></td><td><span className="provider-cell"><i>{r.provider[0]}</i>{r.provider}</span></td><td>{r.tokens}</td><td>{r.cost}</td><td>{r.latency}</td><td><code>{r.user}</code></td><td><Link className="row-arrow" href={`${base}/requests/${r.id}`}><Icon name="chevron"/></Link></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing 1–{filtered.length}</span><div><button disabled>← Previous</button><button disabled>Next →</button></div></div></div>
  </div>;
}

function RequestDetail({ base, id, rows, state, error }: { base:string; id:string; rows:RequestRow[]; state:ApiState; error:string|null }) { const r=rows.find(x=>x.id===id); return <div className="page-enter"><Link className="back-link" href={`${base}/requests`}>← Back to requests</Link><BackendNotice state={state} error={error} refresh={()=>window.location.reload()}/>{r?<><div className="detail-title"><div><div><Status value={r.status}/><h1>{r.model}</h1></div><p><code>{r.id}</code> · {r.date} at {r.time}</p></div></div><div className="detail-metrics">{[["Provider",r.provider],["Total tokens",r.tokens],["Total cost",r.cost],["Total latency",r.latency],["Tenant",r.user]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><Panel title="Recorded request metadata" subtitle="Request and response bodies are not stored by the current gateway logger."><div className="empty-inline">Payload and detailed timing data are unavailable for this request.</div></Panel></>:state==="connected"?<div className="empty-state"><h3>Request not found</h3><p>It may be outside the current log window.</p></div>:null}</div>; }

function Providers(){
  const api = useAigw<Provider[]>("/api/admin/providers", []);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Provider|null>(null);
  const [form,setForm]=useState({ displayName:"", apiKey:"", baseUrl:"https://api.openai.com", slug:"openai" });
  const [mutationError,setMutationError]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const cards = api.data.map(provider => ({ name:provider.display_name || provider.slug, slug:provider.slug, models:`${provider.model_count} models`, health:provider.is_enabled ? "Operational" : "Disabled", latency:"—", failures:"—", initial:provider.display_name?.[0] || provider.slug[0], backend:provider }));
  function openCreate(){setEditing(null);setForm({displayName:"",apiKey:"",baseUrl:"https://api.openai.com",slug:"openai"});setMutationError(null);setModal(true)}
  function openEdit(provider:Provider){setEditing(provider);setForm({displayName:provider.display_name,apiKey:"",baseUrl:provider.base_url,slug:provider.slug});setMutationError(null);setModal(true)}
  async function saveProvider(){
    setSaving(true); setMutationError(null);
    try {
      if(editing){await postAigw("/api/admin/providers/update",{id:editing.id,display_name:form.displayName,base_url:form.baseUrl,...(form.apiKey.trim()?{api_key:form.apiKey.trim()}:{})})}
      else{await postAigw("/api/admin/providers/create", { slug:form.slug, display_name:form.displayName, adapter_type:"openai_compatible", base_url:form.baseUrl, api_key:form.apiKey, auth_header:"Authorization", auth_prefix:"Bearer", chat_endpoint:"/v1/chat/completions", priority:100 })}
      setModal(false); await api.refresh();
    }
    catch(caught){ setMutationError(caught instanceof Error?caught.message:`Provider ${editing?"update":"creation"} failed`); }
    finally { setSaving(false); }
  }
  async function testProvider(slug:string){ try { const result=await postAigw<{reachable:boolean;error?:string}>("/api/admin/providers/test",{slug}); window.alert(result.reachable?`${slug} is reachable`:result.error??`${slug} is unavailable`); } catch(caught){ window.alert(caught instanceof Error?caught.message:"Test failed"); } }
  async function toggleProvider(provider:Provider){ await postAigw("/api/admin/providers/update",{id:provider.id,is_enabled:!provider.is_enabled}); await api.refresh(); }
  return <div className="page-enter"><PageTitle title="Providers" subtitle="Connect and manage the model providers used by your gateway." actions={<Button onClick={openCreate}><Icon name="plus"/> Add provider</Button>}/><BackendNotice state={api.state} error={api.error} refresh={api.refresh}/><div className="notice"><span>!</span><div><b>Provider secrets are handled by the Go backend.</b><p>The current Go schema stores API keys directly; add encryption at rest before production.</p></div><Link href="docs">Security requirements →</Link></div><div className="provider-grid">{cards.map(provider=><div className="provider-card" key={provider.slug}><div className="provider-card-top"><span className="big-provider p-o">{provider.initial}</span><button aria-label={`Edit ${provider.name}`} onClick={()=>provider.backend&&openEdit(provider.backend)}>•••</button></div><h3>{provider.name}</h3><p>{provider.slug} · {provider.backend?.base_url??"Configured endpoint"}</p><span className={`health-badge ${provider.health!=="Operational"?"degraded":""}`}><i/>{provider.health}</span><div className="provider-stats"><span><small>Models</small><b>{provider.models}</b></span><span><small>Avg latency</small><b>{provider.latency}</b></span><span><small>Failure rate</small><b>{provider.failures}</b></span></div><div className="provider-actions"><Button secondary onClick={()=>void testProvider(provider.slug)}>Test connection</Button><Button secondary onClick={()=>provider.backend&&openEdit(provider.backend)}>Edit</Button><button aria-label={`Toggle ${provider.name}`} onClick={()=>provider.backend&&void toggleProvider(provider.backend)} className={`toggle ${provider.backend?.is_enabled!==false?"on":""}`}><i/></button></div></div>)}</div>{modal&&<Modal title={editing?`Edit ${editing.display_name||editing.slug}`:"Connect a provider"} close={()=>setModal(false)}><p className="modal-copy">{editing?"Leave the API key blank to keep the current credential. Restart the gateway after changing connection details.":"This credential is sent directly to the Go admin API."}</p>{mutationError&&<p className="form-error">{mutationError}</p>}<label>Provider slug<input value={form.slug} onChange={event=>setForm({...form,slug:event.target.value})} placeholder="openai" disabled={editing!==null}/></label><label>Credential name<input value={form.displayName} onChange={event=>setForm({...form,displayName:event.target.value})} placeholder="Production OpenAI"/></label><label>API key {editing&&<small>(optional)</small>}<input value={form.apiKey} onChange={event=>setForm({...form,apiKey:event.target.value})} type="password" placeholder={editing?"Leave blank to keep current key":"sk-••••••••••••••••"}/></label><label>Base URL<input value={form.baseUrl} onChange={event=>setForm({...form,baseUrl:event.target.value})} placeholder="https://api.openai.com"/></label><div className="modal-actions"><Button secondary onClick={()=>setModal(false)}>Cancel</Button><Button onClick={()=>void saveProvider()}>{saving?(editing?"Saving...":"Connecting..."):(editing?"Save changes":"Connect provider")}</Button></div></Modal>}</div>
}

type GatewayKey={id:number;label:string;is_active:boolean;created_at:string};
function ApiKeys(){
  const api=useAigw<GatewayKey[]>("/api/control/api-keys",[]);
  const [label,setLabel]=useState("development");
  const [created,setCreated]=useState<string|null>(null);
  const [copied,setCopied]=useState(false);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function create(){
    if(creating)return;
    setCreating(true);setError(null);setCreated(null);setCopied(false);
    try{const result=await postAigw<{api_key:string}>("/api/control/api-keys",{label});setCreated(result.api_key);await api.refresh()}
    catch(caught){setError(caught instanceof Error?caught.message:"Could not create key")}
    finally{setCreating(false)}
  }
  async function copyCreated(){if(!created)return;await navigator.clipboard.writeText(created);setCopied(true)}
  async function revoke(id:number){if(!window.confirm("Revoke this gateway key? Applications using it will stop working."))return;setError(null);try{await deleteAigw("/api/control/api-keys",{id});await api.refresh()}catch(caught){setError(caught instanceof Error?caught.message:"Could not revoke key")}}
  return <div className="page-enter">
    <PageTitle title="API keys" subtitle="Create project credentials for the Playground or OpenAI-compatible clients."/>
    <BackendNotice state={api.state} error={api.error} refresh={api.refresh}/>
    {error&&<div className="backend-notice"><span>!</span><div><b>Key operation failed</b><p>{error}</p></div></div>}
    {created&&<section className="new-key-card"><div><span className="new-key-icon">✓</span><div><h3>Copy your new key now</h3><p>This is the only time the complete key will be displayed.</p></div></div><div className="new-key-value"><code>{created}</code><Button secondary onClick={()=>void copyCreated()}><Icon name="copy"/> {copied?"Copied":"Copy"}</Button></div></section>}
    <section className="api-key-panel">
      <div className="api-key-head"><div><h3>Project API keys</h3><p>Existing secrets cannot be displayed because only their secure hashes are stored.</p></div><div className="api-key-create"><label><span>Key label</span><input value={label} onChange={event=>setLabel(event.target.value)} placeholder="development"/></label><Button onClick={()=>void create()} disabled={creating}><Icon name="plus"/> {creating?"Creating…":"Create key"}</Button></div></div>
      {api.data.length===0?<div className="empty-inline">No keys yet. Create one, copy it, then paste it into the Playground.</div>:<div className="api-key-list">{api.data.map(key=><div className="api-key-row" key={key.id}><span className="key-symbol"><Icon name="keys"/></span><div className="api-key-identity"><b>{key.label||"Unnamed key"}</b><code>aigw_sk_••••••••••••••••</code></div><div className="api-key-meta"><span className={`health-badge ${key.is_active?"":"degraded"}`}><i/>{key.is_active?"Active":"Revoked"}</span><small>Created {new Date(key.created_at).toLocaleDateString()}</small></div><div className="api-key-actions">{key.is_active?<Button secondary onClick={()=>void revoke(key.id)}>Revoke</Button>:<span>Cannot be used</span>}</div></div>)}</div>}
    </section>
  </div>
}

function Routing(){return <div className="page-enter"><PageTitle title="Model routes" subtitle="Routing rules persisted by the gateway."/><Panel title="Model routes"><div className="empty-inline">The current backend has no project-scoped routing-rules endpoint. Static route examples have been removed.</div></Panel></div>}

function MembersPage(){const members=useAigw<TeamMember[]>("/api/control/members",[]);const roles=useAigw<TeamRole[]>("/api/control/roles",[]);const invitations=useAigw<TeamInvitation[]>("/api/control/invitations",[]);const [modal,setModal]=useState(false);const [email,setEmail]=useState("");const [roleId,setRoleId]=useState("");const [createdToken,setCreatedToken]=useState("");const [error,setError]=useState<string|null>(null);async function invite(){setError(null);try{const result=await postAigw<{token:string}>("/api/control/invitations",{email,roleId:Number(roleId)});setCreatedToken(result.token);await invitations.refresh()}catch(caught){setError(caught instanceof Error?caught.message:"Invitation failed")}}return <div className="page-enter"><PageTitle title="Members" subtitle="Organization access, invitations, and owner-controlled roles." actions={<Button onClick={()=>setModal(true)}><Icon name="plus"/> Invite member</Button>}/><BackendNotice state={members.state} error={members.error} refresh={members.refresh}/><div className="stats-row">{[["Members",members.data.length.toString()],["Pending invitations",invitations.data.length.toString()],["Roles",roles.data.length.toString()],["Owners",members.data.filter(item=>item.role_key==="owner").length.toString()]].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div><div className="data-panel"><div className="table-summary"><b>Organization members</b><span>Role changes require members.manage</span></div><div className="table-wrap"><table><thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>{members.data.map(member=><tr key={member.id}><td><span className="key-name"><span className="user-avatar">{initials(member.display_name)}</span><b>{member.display_name}</b></span></td><td>{member.email}</td><td><span className="env">{member.role_name}</span></td><td><span className="health-badge"><i/>{member.status}</span></td><td>{new Date(member.joined_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>{invitations.data.length>0&&<Panel title="Pending invitations"><div className="generic-list">{invitations.data.map(item=><div key={item.id}><span className="generic-icon"><Icon name="users"/></span><span><b>{item.email}</b><small>{item.role_name}</small></span><span><b>Pending</b><small>Expires {new Date(item.expires_at).toLocaleDateString()}</small></span></div>)}</div></Panel>}{modal&&<Modal title="Invite a member" close={()=>setModal(false)}><p className="modal-copy">The invitee must sign up with this exact email address.</p><label>Email<input type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Role<select value={roleId} onChange={event=>setRoleId(event.target.value)}><option value="">Choose a role</option>{roles.data.filter(role=>role.role_key!=="owner").map(role=><option key={role.id} value={role.id}>{role.display_name}</option>)}</select></label>{error&&<div className="form-error">{error}</div>}{createdToken&&<div className="notice"><span>✓</span><div><b>Invitation created</b><p>One-time token: <code>{createdToken}</code></p></div></div>}<div className="modal-actions"><Button secondary onClick={()=>setModal(false)}>Close</Button><Button onClick={()=>void invite()}>Create invitation</Button></div></Modal>}</div>}

function GenericPage({ section }: { section:string }) { const config:Record<string,[string,string,string]>={
  traces:["Traces","Follow every step across complex AI workflows.","traces"],sessions:["Sessions","Understand complete multi-request customer interactions.","sessions"],users:["Users","See usage, cost, and activity by end user.","users"],errors:["Errors","Find provider failures and recurring application issues.","errors"],models:["Models","Manage model availability, aliases, and pricing.","models"],fallbacks:["Fallbacks","Keep requests flowing when a provider fails.","fallbacks"],caching:["Semantic caching","Reduce latency and cost with intelligent response caching.","caching"],budgets:["Budgets","Control spend across projects, keys, users, and models.","budgets"],"rate-limits":["Rate limits","Protect your gateway with flexible usage limits.","limits"],alerts:["Alerts","Get notified before issues impact your users.","alerts"],webhooks:["Webhooks","Send real-time gateway events to your systems.","webhooks"],members:["Members","Manage access and roles for your organization.","users"],"audit-logs":["Audit logs","Review configuration and security activity.","audit"],settings:["Project settings","Configure privacy, retention, and project defaults.","settings"],}; const c=config[section]??["Page","Manage your AI gateway.","overview"]; if(section==="members") return <MembersPage/>; if(section==="playground") return <Playground/>; if(section==="docs") return <Docs/>; if(section==="models") return <ModelsPage/>; if(section==="caching") return <CachingPage/>; return <div className="page-enter"><PageTitle title={c[0]} subtitle={c[1]} actions={<Button><Icon name="plus"/> Create new</Button>}/><GenericContent section={section} icon={c[2]}/></div> }
function GenericContent({section,icon}:{section:string;icon:string}) { return <div className="data-panel"><div className="empty-state"><span><Icon name={icon}/></span><h3>No {section.replaceAll("-"," ")} data</h3><p>This view has no database-backed endpoint yet, so placeholder records are not displayed.</p></div></div> }

function ModelsPage(){ const api=useAigw<ProviderModel[]>("/api/admin/models",[]); return <div className="page-enter"><PageTitle title="Models" subtitle="Models configured in the Go gateway database." actions={<Button><Icon name="plus"/> Add model</Button>}/><BackendNotice state={api.state} error={api.error} refresh={api.refresh}/><div className="data-panel"><div className="table-summary"><b>Provider models</b><span>{api.data.length} configured</span></div><div className="table-wrap"><table><thead><tr><th>Model</th><th>Provider</th><th>Input / 1M</th><th>Output / 1M</th><th>Context</th><th>Capabilities</th><th>Status</th></tr></thead><tbody>{api.data.map(model=><tr key={model.id}><td><code>{model.model_id}</code></td><td>{model.provider_name}</td><td>${Number(model.input_cost_per_m).toFixed(2)}</td><td>${Number(model.output_cost_per_m).toFixed(2)}</td><td>{Number(model.context_window).toLocaleString()}</td><td>{[model.supports_streaming&&"Streaming",model.supports_tools&&"Tools"].filter(Boolean).join(", ")||"Text"}</td><td><span className={`health-badge ${model.is_enabled?"":"degraded"}`}><i/>{model.is_enabled?"Active":"Disabled"}</span></td></tr>)}</tbody></table></div>{api.state==="connected"&&api.data.length===0&&<div className="empty-inline">No models are configured in the Go backend.</div>}</div></div> }

type CacheStats={active_entries:number;total_hits:number;total_saved_usd:number;avg_hits_per_entry:number};
function CachingPage(){ const api=useAigw<CacheStats>("/api/admin/cache/stats",{active_entries:0,total_hits:0,total_saved_usd:0,avg_hits_per_entry:0}); async function clearCache(){if(!window.confirm("Clear every active semantic cache entry?"))return;await postAigw("/api/admin/cache/clear",{});await api.refresh();} return <div className="page-enter"><PageTitle title="Semantic caching" subtitle="Reduce latency and cost with intelligent response caching." actions={<Button secondary onClick={()=>void clearCache()}>Clear cache</Button>}/><BackendNotice state={api.state} error={api.error} refresh={api.refresh}/><div className="stats-row">{[["Active entries",api.data.active_entries.toLocaleString()],["Cache hits",api.data.total_hits.toLocaleString()],["Cost saved",`$${Number(api.data.total_saved_usd).toFixed(2)}`],["Avg hits / entry",Number(api.data.avg_hits_per_entry).toFixed(1)]].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div><Panel title="Cache configuration" subtitle="Configuration is loaded from /api/admin/cache/config"><div className="empty-inline">Use the Go admin API to configure tenant thresholds and TTL values.</div></Panel></div> }

type ChatCompletion={id?:string;model?:string;choices?:Array<{message?:{content?:string}}> ;usage?:{prompt_tokens?:number;completion_tokens?:number;total_tokens?:number}};
type TestMetrics={runs:number;average:number;p50:number;p95:number;min:number;max:number;tokens:number};
function percentile(values:number[],fraction:number){return values[Math.min(values.length-1,Math.ceil(values.length*fraction)-1)]??0}
function Playground(){
  const models=useAigw<ProviderModel[]>("/api/admin/models",[]);
  const [answer,setAnswer]=useState(""); const [raw,setRaw]=useState<ChatCompletion|null>(null); const [error,setError]=useState<string|null>(null); const [running,setRunning]=useState(false);
  const [apiKey,setApiKey]=useState(""); const [model,setModel]=useState(""); const [system,setSystem]=useState(""); const [prompt,setPrompt]=useState(""); const [temperature,setTemperature]=useState(.4); const [maxTokens,setMaxTokens]=useState(1024); const [runs,setRuns]=useState(1); const [metrics,setMetrics]=useState<TestMetrics|null>(null);
  const enabledModels=models.data.filter(item=>item.is_enabled); const selectedModel=model||enabledModels[0]?.model_id||"";
  const body={model:selectedModel,messages:[...(system.trim()?[{role:"system",content:system}]:[]),{role:"user",content:prompt}],temperature,max_tokens:maxTokens,stream:false};
  const curl=`curl http://localhost:5000/v1/chat/completions \\\n  -H "Authorization: Bearer ${apiKey||"YOUR_GATEWAY_API_KEY"}" \\\n  -H "Content-Type: application/json" \\\n  --data '${JSON.stringify(body,null,2)}'`;
  async function run(){if(!apiKey.trim()||!selectedModel||!prompt.trim()){setError("Gateway API key, model, and user prompt are required.");return}setRunning(true);setError(null);setMetrics(null);const durations:number[]=[];let last:ChatCompletion|null=null;try{for(let index=0;index<runs;index++){const started=performance.now();last=await postAigw<ChatCompletion>("/v1/chat/completions",body,apiKey.trim());durations.push(performance.now()-started)}durations.sort((a,b)=>a-b);setRaw(last);setAnswer(last?.choices?.[0]?.message?.content??"The gateway returned an empty completion.");setMetrics({runs:durations.length,average:durations.reduce((sum,value)=>sum+value,0)/durations.length,p50:percentile(durations,.5),p95:percentile(durations,.95),min:durations[0],max:durations[durations.length-1],tokens:last?.usage?.total_tokens??0})}catch(caught){setError(caught instanceof Error?caught.message:"The request failed")}finally{setRunning(false)}}
  return <div className="page-enter"><PageTitle title="Gateway API test" subtitle="Send real requests, measure end-to-end latency, and reproduce them with curl."/><BackendNotice state={models.state} error={models.error} refresh={models.refresh}/>{error&&<div className="backend-notice"><span>!</span><div><b>Request failed</b><p>{error}</p></div></div>}<div className="playground"><section><div className="play-head"><b>Request</b><span>Credentials stay in this browser tab</span></div><div className="message"><span>Gateway API key</span><input className="play-input" type="password" value={apiKey} onChange={event=>setApiKey(event.target.value)} placeholder="Tenant API key" autoComplete="off"/></div><div className="message"><span>Model</span><select className="play-input" value={selectedModel} onChange={event=>setModel(event.target.value)}>{enabledModels.length===0?<option value="">No enabled models</option>:enabledModels.map(item=><option key={item.id} value={item.model_id}>{item.display_name||item.model_id} · {item.provider_name}</option>)}</select></div><div className="message system"><span>System prompt (optional)</span><textarea value={system} onChange={event=>setSystem(event.target.value)}/></div><div className="message"><span>User prompt</span><textarea value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder="Enter the same prompt your application sends"/></div><div className="play-settings"><label>Temperature <b>{temperature.toFixed(1)}</b><input type="range" min="0" max="2" step=".1" value={temperature} onChange={event=>setTemperature(Number(event.target.value))}/></label><label>Max tokens<input type="number" min="1" value={maxTokens} onChange={event=>setMaxTokens(Number(event.target.value))}/></label><label>Benchmark runs<input type="number" min="1" max="10" value={runs} onChange={event=>setRuns(Math.max(1,Math.min(10,Number(event.target.value))))}/></label></div><Button onClick={()=>void run()}>{running?`Running ${runs} request${runs===1?"":"s"}…`:"▶ Run test"}</Button></section><section className="response-pane"><div className="play-head"><b>Response and performance</b><span>{answer?"Gateway response":"Ready"}</span></div>{metrics&&<div className="stats-row playground-stats">{[["Runs",metrics.runs],["Average",formatLatency(metrics.average)],["P50",formatLatency(metrics.p50)],["P95",formatLatency(metrics.p95)],["Min",formatLatency(metrics.min)],["Max",formatLatency(metrics.max)],["Tokens",metrics.tokens]].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div>}{answer?<><div className="answer"><span className="provider-logo p-o">AI</span><p>{answer}</p></div><div className="json"><pre>{JSON.stringify(raw,null,2)}</pre></div></>:<div className="empty-state"><span><Icon name="playground"/></span><h3>Run a real gateway request</h3><p>Timing includes the dashboard proxy, gateway routing, provider inference, and response transfer.</p></div>}<div className="code-block"><div><span>Equivalent terminal command</span><button onClick={()=>void navigator.clipboard.writeText(curl)}><Icon name="copy"/> Copy</button></div><pre>{curl}</pre></div></section></div></div>}
function Docs(){return <div className="page-enter"><PageTitle title="API documentation" subtitle="Integrate Prospector through our OpenAI-compatible API."/><div className="docs-layout"><aside><b>Get started</b><a className="active">Quickstart</a><a>Authentication</a><a>Chat completions</a><a>Streaming</a><b>Guides</b><a>Model routing</a><a>Retries & fallbacks</a><a>Metadata</a></aside><article><span className="eyebrow">GET STARTED</span><h1>Make your first request</h1><p>Prospector exposes an OpenAI-compatible API, so you can switch your existing application by changing just the base URL and API key.</p><h2>Send a chat completion</h2><p>Use a model alias to route requests across your configured providers.</p><div className="code-block"><div><span>cURL</span><button><Icon name="copy"/> Copy</button></div><pre>{`curl https://gateway.prospector.dev/v1/chat/completions \\\n  -H "Authorization: Bearer agw_live_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "support-fast",\n    "messages": [{\n      "role": "user",\n      "content": "Hello!"\n    }]\n  }'`}</pre></div><div className="doc-callout"><b>✓ OpenAI SDK compatible</b><p>Keep using the SDK you already know. Update <code>baseURL</code> and your API key to get routing, observability, and controls automatically.</p></div></article></div></div>}

function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) { return <div className="modal-wrap"><button className="modal-backdrop" onClick={close}/><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}><Icon name="close"/></button></div>{children}</div></div> }

export function DashboardApp({ organizationSlug, projectSlug, section, detailId, currentUser, organizationName, projectName }: AppProps) {
  const [menuOpen,setMenuOpen]=useState(false); const [collapsed,setCollapsed]=useState(false); const [loggingOut,setLoggingOut]=useState(false); const router=useRouter(); const base=`/dashboard/${organizationSlug}/${projectSlug}`;
  async function logout(){if(loggingOut)return;setLoggingOut(true);try{await fetch("/api/auth/logout",{method:"POST"})}finally{router.replace("/login");router.refresh()}}
  const health = useAigw<GatewayHealth>("/health", { status:"unknown", uptime_seconds:0, total_requests:0, total_errors:0, total_tokens:0, total_cost_usd:0, cache_hits:0 });
  const title=useMemo(()=>nav.flatMap(x=>x.items).find(x=>x.slug===section)?.label ?? section.replaceAll("-"," ").replace(/^./,c=>c.toUpperCase()),[section]);
  let content:React.ReactNode;
  if(section==="overview") content=<Overview/>; else if(section==="requests") content=<Requests base={base} detailId={detailId}/>; else if(section==="providers") content=<Providers/>; else if(section==="api-keys") content=<ApiKeys/>; else if(section==="routing") content=<ComputeOptimizer/>; else if(section==="model-routes") content=<Routing/>; else if(section==="workloads") content=<WorkloadsPage/>; else if(section==="compute-targets") content=<ComputeTargetsPage/>; else if(section==="benchmarks") content=<BenchmarksPage/>; else content=<GenericPage section={section}/>;
  return <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}><Sidebar base={base} open={menuOpen} close={()=>setMenuOpen(false)} collapsed={collapsed} toggleCollapsed={()=>setCollapsed(value=>!value)} currentUser={currentUser} organizationName={organizationName} projectName={projectName} onLogout={()=>void logout()} loggingOut={loggingOut}/><div className="app-main"><Header title={title} onMenu={()=>setMenuOpen(true)} gatewayState={health.state} projectName={projectName} currentUser={currentUser}/><main className="content">{content}</main></div><AiCopilot page={section}/></div>;
}
