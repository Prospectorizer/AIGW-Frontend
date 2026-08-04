"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "./icons";

type AppProps = { organizationSlug: string; projectSlug: string; section: string; detailId?: string };
type NavItem = { label: string; slug: string; icon: string; badge?: string };

const nav: { label: string; items: NavItem[] }[] = [
  { label: "Workspace", items: [{ label: "Overview", slug: "overview", icon: "overview" }] },
  { label: "Observability", items: [
    { label: "Requests", slug: "requests", icon: "requests", badge: "Live" }, { label: "Traces", slug: "traces", icon: "traces" },
    { label: "Sessions", slug: "sessions", icon: "sessions" }, { label: "Users", slug: "users", icon: "users" }, { label: "Errors", slug: "errors", icon: "errors" },
  ]},
  { label: "Gateway", items: [
    { label: "Providers", slug: "providers", icon: "providers" }, { label: "Models", slug: "models", icon: "models" },
    { label: "Routing", slug: "routing", icon: "routing" }, { label: "Fallbacks", slug: "fallbacks", icon: "fallbacks" }, { label: "Caching", slug: "caching", icon: "caching" },
  ]},
  { label: "Management", items: [
    { label: "API keys", slug: "api-keys", icon: "keys" }, { label: "Budgets", slug: "budgets", icon: "budgets" },
    { label: "Rate limits", slug: "rate-limits", icon: "limits" }, { label: "Alerts", slug: "alerts", icon: "alerts" }, { label: "Webhooks", slug: "webhooks", icon: "webhooks" },
  ]},
  { label: "Developer", items: [
    { label: "Playground", slug: "playground", icon: "playground" }, { label: "API documentation", slug: "docs", icon: "docs" },
  ]},
];

const requestRows = [
  { id: "req_8k2m1p", time: "12:41:08", status: "200", model: "gpt-4.1-mini", provider: "OpenAI", tokens: "1,284", cost: "$0.0032", latency: "642 ms", user: "usr_42a" },
  { id: "req_7xn92d", time: "12:40:51", status: "200", model: "claude-3.7-sonnet", provider: "Anthropic", tokens: "2,441", cost: "$0.0184", latency: "1.12 s", user: "usr_19c" },
  { id: "req_4pf33z", time: "12:40:22", status: "429", model: "gemini-2.5-flash", provider: "Google", tokens: "0", cost: "$0.0000", latency: "89 ms", user: "usr_88b" },
  { id: "req_2wd81s", time: "12:39:48", status: "200", model: "gpt-4.1", provider: "OpenAI", tokens: "4,890", cost: "$0.0412", latency: "1.84 s", user: "usr_42a" },
  { id: "req_9la02q", time: "12:39:07", status: "200", model: "support-fast", provider: "OpenRouter", tokens: "892", cost: "$0.0018", latency: "431 ms", user: "usr_71e" },
  { id: "req_3rr91b", time: "12:38:44", status: "500", model: "claude-3.5-haiku", provider: "Anthropic", tokens: "166", cost: "$0.0004", latency: "2.41 s", user: "usr_19c" },
];

function Logo() {
  return <div className="logo"><span className="logo-mark"><i /><i /><i /></span><span>relay</span></div>;
}

function Sidebar({ base, open, close }: { base: string; open: boolean; close: () => void }) {
  const pathname = usePathname();
  return <>
    {open && <button className="backdrop" onClick={close} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="side-top"><Logo /><button className="icon-btn side-close" onClick={close}><Icon name="close" /></button></div>
      <button className="project-switch"><span className="project-avatar">CS</span><span><b>Customer Support</b><small>Acme Inc. · Production</small></span><span className="switch-arrows">⌃<br/>⌄</span></button>
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
        <button className="account"><span className="user-avatar">VK</span><span><b>Vichu K</b><small>vichu@acme.ai</small></span><span>•••</span></button>
      </div>
    </aside>
  </>;
}

function Header({ title, onMenu }: { title: string; onMenu: () => void }) {
  return <header className="header"><div className="header-title"><button className="icon-btn menu-btn" onClick={onMenu}><Icon name="menu"/></button><span>{title}</span></div><div className="header-actions"><button className="search"><Icon name="search"/><span>Search anything...</span><kbd>⌘ K</kbd></button><span className="live"><i/>Gateway operational</span><button className="help">?</button><button className="bell"><Icon name="alerts"/><i/></button></div></header>;
}

function Button({ children, secondary = false, onClick }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void }) {
  return <button className={`button ${secondary ? "secondary" : ""}`} onClick={onClick}>{children}</button>;
}

function Select({ children }: { children: React.ReactNode }) { return <button className="selectish">{children}<span>⌄</span></button>; }

function Filters() {
  return <div className="filters"><Select>Last 24 hours</Select><Select>All environments</Select><Select>All providers</Select><Select>All models</Select><button className="filter-more">+ Add filter</button><button className="refresh">↻</button></div>;
}

function Spark({ color, points }: { color: string; points: string }) {
  return <svg className="spark" viewBox="0 0 120 36" preserveAspectRatio="none"><path d={`${points} L120 36 L0 36Z`} fill={color} opacity=".10"/><path d={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>;
}

const metrics = [
  ["Total requests", "48,291", "+12.4%", "M0 29 C14 27 18 15 31 20 S48 27 60 16 S78 21 87 11 S106 17 120 4", "#6d5dfc"],
  ["Total cost", "$286.42", "+8.2%", "M0 27 C16 30 23 18 38 21 S57 10 69 17 S85 11 94 14 S107 5 120 9", "#2188d8"],
  ["Success rate", "99.84%", "+0.06%", "M0 22 C18 21 20 23 36 18 S54 20 69 17 S87 19 101 12 S112 14 120 8", "#16a36a"],
  ["P95 latency", "1.24s", "−9.1%", "M0 8 C14 13 25 9 38 17 S54 12 66 20 S84 14 96 23 S110 18 120 27", "#e29438"],
];

function Overview() {
  return <div className="page-enter"><PageTitle title="Overview" subtitle="Gateway performance and usage across your project." actions={<Button secondary>Export report</Button>}/><Filters/>
    <div className="metrics">{metrics.map(([label,value,trend,points,color]) => <div className="metric" key={label}><div><span className="metric-label">{label}</span><strong>{value}</strong><small className={trend.startsWith("−") ? "good" : "good"}>{trend} <i>vs prev. period</i></small></div><Spark color={color} points={points}/></div>)}</div>
    <div className="chart-grid"><Panel title="Requests over time" subtitle="Requests by status" aside={<div className="legend"><i className="dot purple"/>Success <i className="dot red"/>Error</div>}><AreaChart/></Panel><Panel title="Cost over time" subtitle="Total provider spend" aside={<b className="panel-total">$286.42</b>}><BarChart/></Panel></div>
    <div className="bottom-grid"><Panel title="Model breakdown" subtitle="Requests and cost by model"><ModelBreakdown/></Panel><Panel title="Provider health" subtitle="Live health and performance"><ProviderHealth/></Panel><Panel title="Recent requests" subtitle="Latest gateway activity" aside={<Link href="requests" className="text-link">View all →</Link>}><MiniRequests/></Panel></div>
  </div>;
}

function PageTitle({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) { return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="title-actions">{actions}</div>}</div>; }
function Panel({ title, subtitle, aside, children, className="" }: { title: string; subtitle?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}><div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{aside}</div><div className="panel-body">{children}</div></section>; }

function AreaChart() {
  return <div className="chart"><div className="y-axis"><span>4k</span><span>3k</span><span>2k</span><span>1k</span><span>0</span></div><svg viewBox="0 0 600 210" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6d5dfc" stopOpacity=".28"/><stop offset="1" stopColor="#6d5dfc" stopOpacity=".01"/></linearGradient></defs>{[20,65,110,155,200].map(y=><line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#ececf0"/>)}<path d="M0 162 C30 145 45 155 72 132 S117 125 142 103 S192 130 224 110 S272 73 304 90 S351 83 380 56 S428 78 455 59 S505 42 530 55 S568 33 600 19 L600 210 L0 210Z" fill="url(#area)"/><path d="M0 162 C30 145 45 155 72 132 S117 125 142 103 S192 130 224 110 S272 73 304 90 S351 83 380 56 S428 78 455 59 S505 42 530 55 S568 33 600 19" fill="none" stroke="#6d5dfc" strokeWidth="2.5"/><path d="M0 191 C60 185 90 193 140 180 S235 187 300 174 S400 183 465 170 S545 175 600 166" fill="none" stroke="#e34f5f" strokeWidth="1.5"/></svg><div className="x-axis"><span>12 AM</span><span>4 AM</span><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span></div></div>;
}
function BarChart() { const bars=[30,38,32,48,52,44,65,59,72,55,79,86,70,93,76,98,88,104,91,110,102,118,108,125]; return <div className="bar-chart"><div className="bars">{bars.map((h,i)=><i key={i} style={{height:`${h/1.35}px`}} />)}</div><div className="x-axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span></div></div>; }

function ModelBreakdown() { const items=[["gpt-4.1-mini","OpenAI","42%","#6d5dfc"],["claude-3.7-sonnet","Anthropic","27%","#d67951"],["gemini-2.5-flash","Google","19%","#2188d8"],["Other models","4 providers","12%","#a8abb1"]]; return <div className="breakdown">{items.map(x=><div className="break-row" key={x[0]}><span className="provider-dot" style={{background:x[3]}}/><div><b>{x[0]}</b><small>{x[1]}</small></div><div className="progress"><i style={{width:x[2],background:x[3]}}/></div><strong>{x[2]}</strong></div>)}</div>; }
function ProviderHealth() { return <div className="health-list">{[["OpenAI","99.98%","524 ms","O"],["Anthropic","99.91%","842 ms","A"],["Google AI","99.72%","691 ms","G"],["OpenRouter","98.84%","1.1 s","R"]].map(x=><div className="health-row" key={x[0]}><span className={`provider-logo p-${x[3].toLowerCase()}`}>{x[3]}</span><div><b>{x[0]}</b><small><i/>Operational</small></div><span>{x[1]}<small>uptime</small></span><span>{x[2]}<small>avg latency</small></span></div>)}</div>; }
function MiniRequests() { return <div className="mini-requests">{requestRows.slice(0,4).map(r=><div key={r.id}><Status value={r.status}/><span><b>{r.model}</b><small>{r.provider} · {r.time}</small></span><span><b>{r.latency}</b><small>{r.cost}</small></span></div>)}</div>; }
function Status({ value }: { value: string }) { const ok=value.startsWith("2"); return <span className={`status ${ok ? "success" : value === "429" ? "warning" : "error"}`}><i/>{value}</span>; }

function Requests({ base, detailId }: { base: string; detailId?: string }) {
  const [query,setQuery]=useState(""); const filtered=requestRows.filter(r=>Object.values(r).some(v=>v.toLowerCase().includes(query.toLowerCase())));
  if(detailId) return <RequestDetail base={base} id={detailId}/>;
  return <div className="page-enter"><PageTitle title="Requests" subtitle="Inspect every request flowing through your gateway." actions={<><Button secondary>Export CSV</Button><Button><Icon name="plus"/> Create request</Button></>}/>
    <div className="request-toolbar"><div className="table-search"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search request ID, model, user..."/></div><Select>Last 24 hours</Select><Select>Status</Select><Select>Provider</Select><Select>Model</Select><button className="filter-more">+ More</button></div>
    <div className="data-panel"><div className="table-summary"><span><i className="pulse"/> Live requests</span><span>48,291 results · Updated just now</span></div><div className="table-wrap scrollbar"><table><thead><tr><th>Timestamp</th><th>Status</th><th>Model</th><th>Provider</th><th>Tokens</th><th>Cost</th><th>Latency</th><th>User</th><th/></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><Link href={`${base}/requests/${r.id}`}><b>{r.time}</b><small>Aug 5, 2026</small></Link></td><td><Status value={r.status}/></td><td><code>{r.model}</code></td><td><span className="provider-cell"><i>{r.provider[0]}</i>{r.provider}</span></td><td>{r.tokens}</td><td>{r.cost}</td><td>{r.latency}</td><td><code>{r.user}</code></td><td><Link className="row-arrow" href={`${base}/requests/${r.id}`}><Icon name="chevron"/></Link></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing 1–{filtered.length} of 48,291</span><div><button disabled>← Previous</button><button>Next →</button></div></div></div>
  </div>;
}

function RequestDetail({ base, id }: { base:string; id:string }) { const r=requestRows.find(x=>x.id===id)??requestRows[0]; const [tab,setTab]=useState("Overview"); return <div className="page-enter"><Link className="back-link" href={`${base}/requests`}>← Back to requests</Link><div className="detail-title"><div><div><Status value={r.status}/><h1>{r.model}</h1></div><p><code>{r.id}</code> · Today at {r.time}</p></div><Button secondary><Icon name="copy"/> Copy request ID</Button></div><div className="detail-metrics">{[["Provider",r.provider],["Total tokens",r.tokens],["Total cost",r.cost],["Total latency",r.latency],["Time to first token","412 ms"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="tabs">{["Overview","Request","Response","Metadata","Timing","Raw JSON"].map(x=><button onClick={()=>setTab(x)} className={tab===x?"active":""} key={x}>{x}</button>)}</div>{tab==="Overview"?<div className="detail-grid"><Panel title="Request timeline"><Timeline/></Panel><Panel title="Request context"><KeyValues/></Panel></div>:<Panel title={tab} subtitle={tab==="Request"?"Payload sent to the provider":tab==="Response"?"Response returned by the provider":"Request inspection data"}><JsonViewer tab={tab}/></Panel>}</div>; }
function Timeline(){return <div className="timeline">{[["Gateway authentication","4 ms",3],["Rate limit lookup","2 ms",2],["Model routing","1 ms",1],["Provider connection","38 ms",9],["Time to first token","412 ms",32],["Streaming response","1,842 ms",88]].map(x=><div key={x[0]}><span>{x[0]}</span><i><b style={{width:`${x[2]}%`}}/></i><strong>{x[1]}</strong></div>)}</div>}
function KeyValues(){return <div className="key-values">{[["Environment","Production"],["API key","Production web · agw_live_a3f2"],["User ID","usr_42a"],["Trace ID","tr_91pp4c"],["Session ID","ses_77aa2"],["Cache","Miss"]].map(x=><div key={x[0]}><span>{x[0]}</span><code>{x[1]}</code></div>)}</div>}
function JsonViewer({tab}:{tab:string}){const text=tab==="Response"?`{\n  "id": "chatcmpl-B91ka",\n  "model": "gpt-4.1-mini",\n  "choices": [{\n    "message": { "role": "assistant", "content": "I'd be happy to help." },\n    "finish_reason": "stop"\n  }],\n  "usage": { "prompt_tokens": 842, "completion_tokens": 442 }\n}`:`{\n  "model": "support-fast",\n  "messages": [\n    { "role": "system", "content": "You are a helpful support assistant." },\n    { "role": "user", "content": "Can you help me update my subscription?" }\n  ],\n  "temperature": 0.4,\n  "stream": true\n}`; return <div className="json"><button><Icon name="copy"/> Copy</button><pre>{text}</pre></div>}

const providers=[
  ["OpenAI","Production OpenAI","12 models","Operational","524 ms","0.02%","O"], ["Anthropic","Claude Production","6 models","Operational","842 ms","0.09%","A"],
  ["Google AI","Gemini Primary","8 models","Operational","691 ms","0.28%","G"], ["OpenRouter","Model fallback","186 models","Degraded","1.1 s","1.16%","R"],
];
function Providers(){ const [modal,setModal]=useState(false); return <div className="page-enter"><PageTitle title="Providers" subtitle="Connect and manage the model providers used by your gateway." actions={<Button onClick={()=>setModal(true)}><Icon name="plus"/> Add provider</Button>}/><div className="notice"><span>✓</span><div><b>Your credentials are encrypted at rest.</b><p>Provider API keys never leave the secure gateway environment.</p></div><Link href="docs">Learn about security →</Link></div><div className="provider-grid">{providers.map(p=><div className="provider-card" key={p[0]}><div className="provider-card-top"><span className={`big-provider p-${p[6].toLowerCase()}`}>{p[6]}</span><button>•••</button></div><h3>{p[0]}</h3><p>{p[1]} · sk-••••••••3f9a</p><span className={`health-badge ${p[3]==="Degraded"?"degraded":""}`}><i/>{p[3]}</span><div className="provider-stats"><span><small>Models</small><b>{p[2]}</b></span><span><small>Avg latency</small><b>{p[4]}</b></span><span><small>Failure rate</small><b>{p[5]}</b></span></div><div className="provider-actions"><Button secondary>Test connection</Button><button className="toggle on"><i/></button></div></div>)}</div>{modal&&<Modal title="Connect a provider" close={()=>setModal(false)}><p className="modal-copy">Add a provider credential to start routing requests.</p><label>Provider<Select>OpenAI</Select></label><label>Credential name<input placeholder="Production OpenAI"/></label><label>API key<input type="password" placeholder="sk-••••••••••••••••"/></label><label>Base URL <small>Optional</small><input placeholder="https://api.openai.com/v1"/></label><div className="modal-actions"><Button secondary onClick={()=>setModal(false)}>Cancel</Button><Button onClick={()=>setModal(false)}>Connect provider</Button></div></Modal>}</div> }

function ApiKeys(){const [modal,setModal]=useState(false); return <div className="page-enter"><PageTitle title="API keys" subtitle="Issue and control virtual keys for applications and teams." actions={<Button onClick={()=>setModal(true)}><Icon name="plus"/> Create API key</Button>}/><div className="stats-row">{[["Active keys","8"],["Requests this month","1.28M"],["Spend this month","$1,842.16"],["Keys near limit","1"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="data-panel"><div className="table-summary"><b>Project API keys</b><div className="table-search small"><Icon name="search"/><input placeholder="Search keys..."/></div></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Key prefix</th><th>Environment</th><th>Last used</th><th>Requests</th><th>Spend</th><th>Status</th><th/></tr></thead><tbody>{[["Production web","agw_live_a3f2","Production","2 min ago","826k","$1,224.18"],["Support agents","agw_live_91cc","Production","Just now","401k","$522.08"],["Staging","agw_test_63bd","Staging","4 hrs ago","42k","$84.22"],["Local development","agw_test_1fe4","Development","2 days ago","11k","$11.68"]].map(x=><tr key={x[0]}><td><span className="key-name"><Icon name="keys"/><b>{x[0]}</b></span></td><td><code>{x[1]}••••••••</code></td><td><span className="env">{x[2]}</span></td><td>{x[3]}</td><td>{x[4]}</td><td>{x[5]}</td><td><span className="health-badge"><i/>Active</span></td><td>•••</td></tr>)}</tbody></table></div></div>{modal&&<Modal title="Create an API key" close={()=>setModal(false)}><p className="modal-copy">The secret key will only be displayed once after creation.</p><label>Key name<input placeholder="e.g. Production web"/></label><div className="form-row"><label>Environment<Select>Production</Select></label><label>Expiration<Select>Never</Select></label></div><label>Monthly budget<input placeholder="$ 500.00"/></label><div className="form-row"><label>Requests / minute<input placeholder="1,000"/></label><label>Tokens / minute<input placeholder="500,000"/></label></div><div className="modal-actions"><Button secondary onClick={()=>setModal(false)}>Cancel</Button><Button onClick={()=>setModal(false)}>Create key</Button></div></Modal>}</div>}

function Routing(){return <div className="page-enter"><PageTitle title="Routing" subtitle="Send each request to the best model for cost, speed, and reliability." actions={<Button><Icon name="plus"/> Create route</Button>}/><div className="routing-summary"><div><span className="route-icon"><Icon name="routing"/></span><span><b>3 active routes</b><small>Handling 100% of gateway traffic</small></span></div><div><span>Fallback success</span><b>98.7%</b></div><div><span>Avg. routing time</span><b>1.2 ms</b></div></div><Panel title="Model routes" subtitle="Logical aliases and their destinations"><div className="routes">{[["support-fast","Weighted","OpenAI / gpt-4.1-mini","70%","Anthropic / claude-3.5-haiku","30%"],["support-best","Priority","OpenAI / gpt-4.1","Primary","Anthropic / claude-3.7-sonnet","Fallback"],["summarize","Lowest cost","Google / gemini-2.5-flash","$0.15 / M","OpenAI / gpt-4.1-nano","$0.20 / M"]].map((x,i)=><div className="route-card" key={x[0]}><div className="route-head"><div><span className="route-status"><i/></span><span><code>{x[0]}</code><small>{x[1]} routing</small></span></div><span className="route-volume">{["24.8k","15.1k","8.4k"][i]} requests</span><button>•••</button></div><div className="destinations"><div><span className="order">1</span><span className="provider-logo p-o">O</span><b>{x[2]}</b><em>{x[3]}</em></div><span className="connector"/><div><span className="order">2</span><span className="provider-logo p-a">A</span><b>{x[4]}</b><em>{x[5]}</em></div></div><div className="route-foot"><span>Retries: <b>2 attempts</b></span><span>Timeout: <b>30s</b></span><span>On failure: <b>Next provider</b></span><button className="toggle on"><i/></button></div></div>)}</div></Panel></div>}

function GenericPage({ section }: { section:string }) { const config:Record<string,[string,string,string]>={
  traces:["Traces","Follow every step across complex AI workflows.","traces"],sessions:["Sessions","Understand complete multi-request customer interactions.","sessions"],users:["Users","See usage, cost, and activity by end user.","users"],errors:["Errors","Find provider failures and recurring application issues.","errors"],models:["Models","Manage model availability, aliases, and pricing.","models"],fallbacks:["Fallbacks","Keep requests flowing when a provider fails.","fallbacks"],caching:["Semantic caching","Reduce latency and cost with intelligent response caching.","caching"],budgets:["Budgets","Control spend across projects, keys, users, and models.","budgets"],"rate-limits":["Rate limits","Protect your gateway with flexible usage limits.","limits"],alerts:["Alerts","Get notified before issues impact your users.","alerts"],webhooks:["Webhooks","Send real-time gateway events to your systems.","webhooks"],members:["Members","Manage access and roles for your organization.","users"],"audit-logs":["Audit logs","Review configuration and security activity.","audit"],settings:["Project settings","Configure privacy, retention, and project defaults.","settings"],}; const c=config[section]??["Page","Manage your AI gateway.","overview"]; if(section==="playground") return <Playground/>; if(section==="docs") return <Docs/>; return <div className="page-enter"><PageTitle title={c[0]} subtitle={c[1]} actions={<Button><Icon name="plus"/> Create new</Button>}/><GenericContent section={section} icon={c[2]}/></div> }
function GenericContent({section,icon}:{section:string;icon:string}) { const rows=section==="traces"?[["Customer support resolution","tr_91pp4c","6 spans","$0.048","2.8 s"],["Plan comparison agent","tr_81az2m","9 spans","$0.091","4.1 s"],["Document assistant","tr_12kt9z","4 spans","$0.022","1.4 s"]]:section==="budgets"?[["Project monthly budget","Project","$1,842 / $3,000","61.4%","Notify at 80%"],["Production web","API key","$1,224 / $1,500","81.6%","Reject at 100%"],["Support team","Team","$522 / $1,000","52.2%","Switch model"]]:section==="alerts"?[["Production error spike","Error rate > 2%","Slack + Email","Enabled","Never triggered"],["Monthly spend warning","Cost > $2,400","Email","Enabled","Aug 1"],["OpenRouter latency","P95 > 2s","Slack","Enabled","2 hours ago"]]:[["Production policy","Project default","Active","Updated 2 hours ago","Vichu K"],["Customer support","Production","Active","Updated yesterday","Sam Lee"],["Development default","Development","Paused","Updated 4 days ago","Maya Chen"]]; return <><div className="stats-row">{[["Active","12"],["Events (24h)","48,291"],["Success rate","99.84%"],["Last updated","Just now"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="data-panel"><div className="table-summary"><b>All {section.replaceAll("-"," ")}</b><div className="table-search small"><Icon name="search"/><input placeholder="Search..."/></div></div><div className="generic-list">{rows.map(r=><div key={r[0]}><span className="generic-icon"><Icon name={icon}/></span><span><b>{r[0]}</b><small>{r[1]}</small></span><span><b>{r[2]}</b><small>{r[3]}</small></span><span>{r[4]}</span><button>•••</button></div>)}</div></div></> }

function Playground(){const [answer,setAnswer]=useState(""); return <div className="page-enter"><PageTitle title="Playground" subtitle="Test gateway routes and compare model responses." actions={<Button secondary>View code</Button>}/><div className="playground"><section><div className="play-head"><b>Prompt</b><Select>support-fast</Select></div><div className="message system"><span>System</span><textarea defaultValue="You are a helpful customer support assistant. Be concise and friendly."/></div><div className="message"><span>User</span><textarea defaultValue="I need help changing my subscription from monthly to annual billing."/></div><div className="play-settings"><label>Temperature <b>0.4</b><input type="range" min="0" max="10" defaultValue="4"/></label><label>Max tokens<input defaultValue="1024"/></label></div><Button onClick={()=>setAnswer("Of course! You can switch to annual billing from Settings → Billing → Plan. Your unused monthly balance will be prorated automatically. Would you like me to walk you through it?")}>▶ Run prompt</Button></section><section className="response-pane"><div className="play-head"><b>Response</b><span>{answer?"642 ms · 41 tokens":"Ready"}</span></div>{answer?<div className="answer"><span className="provider-logo p-o">O</span><p>{answer}</p></div>:<div className="empty-state"><span><Icon name="playground"/></span><h3>Run your first prompt</h3><p>The response, usage, latency, and route taken will appear here.</p></div>}</section></div></div>}
function Docs(){return <div className="page-enter"><PageTitle title="API documentation" subtitle="Integrate Relay through our OpenAI-compatible API."/><div className="docs-layout"><aside><b>Get started</b><a className="active">Quickstart</a><a>Authentication</a><a>Chat completions</a><a>Streaming</a><b>Guides</b><a>Model routing</a><a>Retries & fallbacks</a><a>Metadata</a></aside><article><span className="eyebrow">GET STARTED</span><h1>Make your first request</h1><p>Relay exposes an OpenAI-compatible API, so you can switch your existing application by changing just the base URL and API key.</p><h2>Send a chat completion</h2><p>Use a model alias to route requests across your configured providers.</p><div className="code-block"><div><span>cURL</span><button><Icon name="copy"/> Copy</button></div><pre>{`curl https://gateway.relay.dev/v1/chat/completions \\\n  -H "Authorization: Bearer agw_live_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "support-fast",\n    "messages": [{\n      "role": "user",\n      "content": "Hello!"\n    }]\n  }'`}</pre></div><div className="doc-callout"><b>✓ OpenAI SDK compatible</b><p>Keep using the SDK you already know. Update <code>baseURL</code> and your API key to get routing, observability, and controls automatically.</p></div></article></div></div>}

function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) { return <div className="modal-wrap"><button className="modal-backdrop" onClick={close}/><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}><Icon name="close"/></button></div>{children}</div></div> }

export function DashboardApp({ organizationSlug, projectSlug, section, detailId }: AppProps) {
  const [menuOpen,setMenuOpen]=useState(false); const base=`/dashboard/${organizationSlug}/${projectSlug}`;
  const title=useMemo(()=>nav.flatMap(x=>x.items).find(x=>x.slug===section)?.label ?? section.replaceAll("-"," ").replace(/^./,c=>c.toUpperCase()),[section]);
  let content:React.ReactNode;
  if(section==="overview") content=<Overview/>; else if(section==="requests") content=<Requests base={base} detailId={detailId}/>; else if(section==="providers") content=<Providers/>; else if(section==="api-keys") content=<ApiKeys/>; else if(section==="routing") content=<Routing/>; else content=<GenericPage section={section}/>;
  return <div className="app-shell"><Sidebar base={base} open={menuOpen} close={()=>setMenuOpen(false)}/><div className="app-main"><Header title={title} onMenu={()=>setMenuOpen(true)}/><main className="content">{content}</main></div></div>;
}
