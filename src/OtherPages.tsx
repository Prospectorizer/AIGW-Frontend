import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiFetch, bytes, date, go, modeName, number, short, titleCase, useResource, type AcceleratorSample, type Application, type DiagnosisRow, type HostWindow, type Provider, type RuntimeWindow } from './data'
import { Empty, ErrorView, Heading, KV, Loading, Panel } from './ui'

type ModelCheck = { state:'checking'|'available'|'unavailable'|'unsupported'; detail:string }
type EditableProvider = Provider & { type?:string; base_url?:string; api_key_env?:string }

export function Providers(){
  const {data,loading,error,reload}=useResource<{providers:EditableProvider[]}>('/api/providers')
  const tenantMode=useResource<{enabled:boolean}>('/api/tenant-mode')
  const [view,setView]=useState<'grid'|'list'>('grid')
  const [editing,setEditing]=useState<'new'|EditableProvider|null>(null)
  const [connecting,setConnecting]=useState<EditableProvider|null>(null)
  const [connectionKey,setConnectionKey]=useState('')
  const [chatURL,setChatURL]=useState('')
  const [region,setRegion]=useState('')
  const [connectMessage,setConnectMessage]=useState('')
  const [connectingBusy,setConnectingBusy]=useState(false)
  const [id,setID]=useState('')
  const [name,setName]=useState('')
  const [mode,setMode]=useState<'external'|'self_hosted'>('external')
  const [baseURL,setBaseURL]=useState('')
  const [apiKeyEnv,setAPIKeyEnv]=useState('')
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)
  const [checks,setChecks]=useState<Record<string,ModelCheck>>({})
  const dialog=useRef<HTMLDialogElement>(null)
  const connectDialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(editing)dialog.current?.showModal();return()=>{if(dialog.current?.open)dialog.current.close()}},[editing])
  useEffect(()=>{if(connecting)connectDialog.current?.showModal();return()=>{if(connectDialog.current?.open)connectDialog.current.close()}},[connecting])
  function openNew(){setID('');setName('');setMode('external');setBaseURL('');setAPIKeyEnv('');setMessage('');setEditing('new')}
  function openEdit(p:EditableProvider){setID(p.id);setName(p.name);setMode(p.mode as 'external'|'self_hosted');setBaseURL(p.base_url||'');setAPIKeyEnv(p.api_key_env||'');setMessage('');setEditing(p)}
  function close(){if(!saving){dialog.current?.close();setEditing(null)}}
  function openConnect(p:EditableProvider){setConnectionKey('');setChatURL('');setRegion('');setConnectMessage('');setConnecting(p)}
  function closeConnect(){if(!connectingBusy){connectDialog.current?.close();setConnecting(null);setConnectionKey('')}}
  async function submitConnect(e:FormEvent){
    e.preventDefault();if(!connecting)return
    setConnectingBusy(true);setConnectMessage('')
    try{
      const response=await apiFetch('/api/providers/'+encodeURIComponent(connecting.id)+'/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:connectionKey,chat_url:chatURL.trim(),region:region.trim()})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Could not connect provider')
      const providerID=connecting.id
      setConnectionKey('');setConnecting(null);reload();go('/test?provider='+encodeURIComponent(providerID))
    }catch(error){setConnectMessage(error instanceof Error?error.message:String(error))}finally{setConnectingBusy(false)}
  }
  async function check(id:string){
    setChecks(previous=>({...previous,[id]:{state:'checking',detail:'Checking model discovery…'}}))
    try{
      const response=await apiFetch('/api/providers/'+encodeURIComponent(id)+'/models')
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Model discovery failed')
      const count=Array.isArray(result.models)?result.models.filter((model:{source?:string})=>model.source==='provider').length:0
      const state:ModelCheck['state']=result.discovery_available?'available':result.warning?'unavailable':'unsupported'
      const detail=state==='available'?`Model endpoint responded · ${count} live model${count===1?'':'s'}`:result.warning||'Live model discovery is unsupported; saved IDs may still work.'
      setChecks(previous=>({...previous,[id]:{state,detail}}))
    }catch(error){setChecks(previous=>({...previous,[id]:{state:'unavailable',detail:error instanceof Error?error.message:String(error)}}))}
  }
  async function save(e:FormEvent){
    e.preventDefault();if(!editing)return
    setSaving(true);setMessage('')
    const isEdit=editing!=='new'
    try{
      const response=await apiFetch(isEdit?'/api/providers/'+encodeURIComponent(id):'/api/providers',{method:isEdit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id.trim(),name:name.trim(),mode,base_url:baseURL.trim(),api_key_env:apiKeyEnv.trim()})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Could not save provider')
      setChecks(previous=>{const next={...previous};delete next[id];return next})
      reload();close();setEditing(null)
    }catch(error){setMessage(error instanceof Error?error.message:String(error))}finally{setSaving(false)}
  }
  return <div className="page"><Heading eyebrow="CONFIGURATION / PROVIDERS" title="Provider catalog" description="Configured inference routes and the telemetry each can expose." action={<button type="button" className="primary" onClick={openNew}>+ Add provider</button>}/>
    <div className="provider-toolbar"><span>{data?.providers.filter(p=>p.enabled).length??0} configured providers</span><div className="view-toggle" role="group" aria-label="Provider display"><button type="button" className={view==='grid'?'active':''} onClick={()=>setView('grid')} aria-pressed={view==='grid'}>▦ Grid</button><button type="button" className={view==='list'?'active':''} onClick={()=>setView('list')} aria-pressed={view==='list'}>☷ List</button></div></div>
    {!tenantMode.loading&&!tenantMode.data?.enabled&&<div className="notice" role="status">Provider key connections need tenant mode. Configure AIGW_TENANTS and AIGW_MASTER_KEY in the backend, restart it, then refresh this page.</div>}
    {loading?<Loading/>:error?<ErrorView message={error}/>:<div className={view==='grid'?'provider-grid':'provider-list'}>{data?.providers.map(p=><div className="provider-card" key={p.id}><div className="provider-identity"><span className="provider-avatar">{p.name.slice(0,1)}</span><div><h2>{p.name}</h2><p>{modeName(p.mode)} · {p.id}</p></div></div><span className={'pill '+(p.enabled?'good':'neutral')}>{p.enabled?'Configured':'Not configured'}</span><div className="capabilities">{Object.entries(p.capabilities).map(([key,value])=><span className={value?'supported':'unsupported'} key={key}>{value?'✓':'·'} {titleCase(key)}</span>)}</div><div className="provider-actions">{p.type==='openai_compatible_custom'?<button type="button" className="ghost" onClick={()=>openEdit(p)}>Edit</button>:p.mode==='self_hosted'?<small className="managed-note">Backend managed</small>:null}{(p.mode==='external'||p.type==='openai_compatible_custom')&&<button type="button" className="ghost" onClick={()=>openConnect(p)}>{p.enabled?'Connect / replace key':'Connect'}</button>}{p.enabled&&<><button type="button" className="ghost" onClick={()=>check(p.id)} disabled={checks[p.id]?.state==='checking'}>{checks[p.id]?.state==='checking'?'Checking…':'Check models'}</button><button type="button" className="ghost" onClick={()=>go('/test')}>Open Test Lab →</button></>}{checks[p.id]&&<small role="status">{checks[p.id].detail}</small>}</div></div>)}</div>}
    {connecting&&<dialog ref={connectDialog} className="provider-dialog" onClose={()=>{setConnecting(null);setConnectionKey('')}} onCancel={e=>{if(connectingBusy)e.preventDefault()}} aria-labelledby="connect-dialog-title"><div className="provider-dialog-head"><div><h2 id="connect-dialog-title">Connect {connecting.name}</h2><p>{tenantMode.data?.enabled?'Enter a key and start testing without restarting the backend.':'Tenant mode setup is required before saving a key.'}</p></div><button type="button" className="dialog-close" onClick={closeConnect} aria-label="Close connection form">×</button></div>{tenantMode.data?.enabled?<form className="provider-form" onSubmit={submitConnect}><label>API key<input required type="password" autoComplete="off" value={connectionKey} onChange={e=>setConnectionKey(e.target.value)} placeholder="Paste your API key"/></label>{connecting.id==='azure_openai'&&<label>Azure chat completion URL<input required type="url" value={chatURL} onChange={e=>setChatURL(e.target.value)} placeholder="https://RESOURCE.openai.azure.com/openai/deployments/DEPLOYMENT/chat/completions?api-version=..."/></label>}{connecting.id==='bedrock'&&<label>AWS region<input required value={region} onChange={e=>setRegion(e.target.value)} placeholder="us-east-1"/></label>}<p className="form-help">The key is encrypted in this tenant’s database. It is never shown again, and stays available after a backend restart.</p>{connectMessage&&<p className="form-error" role="alert">{connectMessage}</p>}<div className="provider-form-actions"><button type="button" className="ghost" onClick={closeConnect}>Cancel</button><button type="submit" className="primary" disabled={connectingBusy}>{connectingBusy?'Connecting…':'Connect and open Test Lab'}</button></div></form>:<div className="provider-form"><p className="form-help">The gateway is running in single-workspace mode. Set both <code>AIGW_TENANTS</code> and <code>AIGW_MASTER_KEY</code> in the backend process, restart it, then refresh this page and enter your tenant token. The tenant token alone does not enable tenant mode.</p><div className="provider-form-actions"><button type="button" className="primary" onClick={closeConnect}>Got it</button></div></div>}</dialog>}
    {editing&&<dialog ref={dialog} className="provider-dialog" onClose={()=>setEditing(null)} onCancel={e=>{if(saving)e.preventDefault()}} aria-labelledby="provider-dialog-title"><div className="provider-dialog-head"><div><h2 id="provider-dialog-title">{editing==='new'?'Add provider':'Edit provider'}</h2><p>OpenAI-compatible API or self-hosted runtime</p></div><button type="button" className="dialog-close" onClick={close} aria-label="Close provider form">×</button></div><form className="provider-form" onSubmit={save}><label>Provider ID<input required disabled={editing!=='new'} maxLength={40} pattern="[a-z][a-z0-9_]+" placeholder="my_provider" value={id} onChange={e=>setID(e.target.value)}/></label><label>Name<input required maxLength={100} placeholder="My provider" value={name} onChange={e=>setName(e.target.value)}/></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value as 'external'|'self_hosted')}><option value="external">External</option><option value="self_hosted">Self-hosted</option></select></label><label>API base URL<input required type="url" placeholder="https://api.example.com/v1" value={baseURL} onChange={e=>setBaseURL(e.target.value)}/></label>{!tenantMode.data?.enabled&&<><label>API key environment variable<input placeholder="MY_PROVIDER_API_KEY (optional)" value={apiKeyEnv} onChange={e=>setAPIKeyEnv(e.target.value)}/></label><p className="form-help">Export the named key variable in the backend process before saving. The key value stays there; only its variable name is saved.</p></>}{tenantMode.data?.enabled&&<p className="form-help">Save this provider, then use Connect on its card to encrypt a key in this tenant’s database.</p>}{mode==='self_hosted'&&<p className="form-help">Custom self-hosted routes use OpenAI-compatible chat. Runtime and host metrics require a built-in runtime configured in the backend environment.</p>}{message&&<p className="form-error" role="alert">{message}</p>}<div className="provider-form-actions"><button type="button" className="ghost" onClick={close}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving?'Saving…':editing==='new'?'Add provider':'Save changes'}</button></div></form></dialog>}
  </div>
}

type InfrastructureData = {request_id?:string;provider?:string;host:HostWindow|null;runtime:RuntimeWindow|null;accelerators:AcceleratorSample[];accelerator_error?:string}
export function Infrastructure(){
  const providers=useResource<{providers:Provider[]}>('/api/providers')
  const [selected,setSelected]=useState('')
  const {data,loading,error,reload}=useResource<InfrastructureData>('/api/infrastructure'+(selected?'?provider='+encodeURIComponent(selected):''))
  const last=data?.host?.samples.at(-1)
  return <div className="page"><Heading eyebrow="OBSERVABILITY / INFRASTRUCTURE" title="Infrastructure signals" description="Latest request-correlated host and runtime observations. Server-wide counters are labeled as such." action={<button type="button" className="primary" onClick={reload}>Refresh</button>}/>
    <div className="infrastructure-controls"><label>Self-hosted provider <select value={selected} onChange={e=>setSelected(e.target.value)} disabled={providers.loading||!!providers.error}><option value="">Latest across all</option>{providers.data?.providers.filter(p=>p.mode==='self_hosted'&&p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{data?.request_id&&<button type="button" className="ghost" onClick={()=>go('/requests/'+data.request_id)}>Inspect request {short(data.request_id)} →</button>}</div>
    {providers.error?<ErrorView message={providers.error}/>:loading?<Loading/>:error?<ErrorView message={error}/>:<><div className="grid-two"><Panel title="Host" subtitle={data?.request_id?`From request ${short(data.request_id)}`:'No self-hosted request yet'}><p className="signal-explainer">CPU, RAM, and process measurements from the machine serving this request. Process values describe the runtime process when it can be identified.</p>{last?<div className="latency-list"><KV label="Host CPU" value={last.cpu_utilization_pct==null?'—':`${number(last.cpu_utilization_pct)}%`}/><KV label="Process CPU" value={last.process_cpu_pct==null?'—':`${number(last.process_cpu_pct)}%`}/><KV label="Available RAM" value={bytes(last.host_available_bytes)}/><KV label="Process RSS" value={bytes(last.process_rss_bytes)}/><KV label="Threads" value={last.threads?.toString()??'—'}/><KV label="Load average" value={number(last.load_1)}/>{data?.host?.error&&<div className="notice">Collector: {data.host.error}</div>}</div>:<Empty title="No host samples" description={data?.request_id?'This request has no host samples. Inspect the request for collector details.':'Host measurements appear after a self-hosted inference request.'}/>}</Panel><Panel title="Runtime" subtitle={data?.provider||'Waiting for a connected runtime'}><p className="signal-explainer">Queue, active requests, and KV cache values reported by the model server. These are server-wide observations during this request.</p>{data?.runtime?<div className="latency-list"><KV label="Queue depth peak" value={data.runtime.peak_queue_depth?.toString()??'—'}/><KV label="Running requests" value={data.runtime.end?.running_requests?.toString()??'—'}/><KV label="KV cache use" value={data.runtime.end?.kv_cache_usage_fraction==null?'—':`${(data.runtime.end.kv_cache_usage_fraction*100).toFixed(1)}%`}/>{data.runtime.error&&<div className="notice">Collector: {data.runtime.error}</div>}</div>:<Empty title="No runtime samples" description="Configure a runtime metrics URL to inspect queue and cache behavior."/>}</Panel></div><Panel title="Accelerators" subtitle="NVIDIA device-wide samples correlated with the latest request"><p className="signal-explainer">GPU activity, VRAM, temperature, and power from NVIDIA devices. These samples cover the whole device and can include other requests.</p>{data?.accelerators?.length?<div className="latency-list">{data.accelerators.map((gpu,i)=><div key={`${gpu.device_id}-${i}`}><h3>{gpu.device_name||gpu.device_id} · {date(gpu.at)}</h3><KV label="GPU utilization" value={gpu.gpu_utilization==null?'—':`${number(gpu.gpu_utilization)}%`}/><KV label="Memory utilization" value={gpu.memory_utilization==null?'—':`${number(gpu.memory_utilization)}%`}/><KV label="VRAM used / total" value={`${bytes(gpu.vram_used_bytes)} / ${bytes(gpu.vram_total_bytes)}`}/><KV label="Temperature" value={gpu.temperature_c==null?'—':`${number(gpu.temperature_c)} °C`}/><KV label="Power" value={gpu.power_watts==null?'—':`${number(gpu.power_watts)} W`}/></div>)}</div>:<Empty title="No accelerator samples" description="NVIDIA samples appear when nvidia-smi detects a GPU and a self-hosted request runs."/>}{data?.accelerator_error&&<div className="notice">{data.accelerator_error}</div>}</Panel></>}
  </div>
}

export function Diagnoses(){
  const {data,loading,error,reload}=useResource<{diagnoses:DiagnosisRow[]}>('/api/diagnoses')
  const [provider,setProvider]=useState('')
  const [expanded,setExpanded]=useState<number|null>(null)
  const rows=data?.diagnoses.filter(d=>!provider||d.provider===provider)||[]
  const providers=Array.from(new Set(data?.diagnoses.map(d=>d.provider)||[])).sort()
  return <div className="page"><Heading eyebrow="INTELLIGENCE / DIAGNOSES" title="Evidence-led findings" description="Findings can come from request failures, latency and throughput, or self-hosted infrastructure signals. Each finding shows the evidence used." action={<button type="button" className="primary" onClick={reload}>Refresh</button>}/>
    {loading?<Loading/>:error?<ErrorView message={error}/>:data?.diagnoses.length?<><div className="infrastructure-controls"><label>Provider <select value={provider} onChange={e=>setProvider(e.target.value)}><option value="">All providers</option>{providers.map(id=><option value={id} key={id}>{id}</option>)}</select></label></div>{rows.length?<div className="diagnosis-list">{rows.map(d=><div key={d.id} className="diagnosis-card"><span className="mini-icon warning">!</span><div className="diagnosis-content"><strong>{d.summary}</strong><small>{d.provider} · {d.model} · {date(d.created_at)} · {d.severity}</small><p>{d.root_cause}</p><div className="diagnosis-actions"><button type="button" className="ghost" onClick={()=>setExpanded(expanded===d.id?null:d.id)} aria-expanded={expanded===d.id}>{expanded===d.id?'Hide evidence':'View evidence'}</button><button type="button" className="ghost" onClick={()=>go('/requests/'+d.request_id)}>Inspect request →</button></div>{expanded===d.id&&<div className="diagnosis-evidence"><strong>Evidence</strong><ul>{d.evidence?.map((item,i)=><li key={i}>{item}</li>)}</ul><strong>Recommendation</strong><p>{d.recommendation}</p></div>}</div><span className="confidence">{Math.round(d.confidence*100)}%<small>rule score</small></span></div>)}</div>:<Empty title="No findings for this provider" description="Choose another provider or clear the filter."/>}</>:<Empty title="No diagnoses yet" description="A finding appears only when a request supplies enough evidence for a rule."/>}</div>
}
type WorkspaceDefaults = {provider:string;model:string}
export function Settings(){
  const {data,reload,loading,error}=useResource<{applications:Application[]}>('/api/applications')
  const defaults=useResource<WorkspaceDefaults>('/api/settings/defaults')
  const providers=useResource<{providers:Provider[]}>('/api/providers')
  const session=useResource<{tenant_id:string;email?:string}>('/api/session')
  const tenantMode=useResource<{enabled:boolean;onboarding?:string}>('/api/tenant-mode')
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [message,setMessage]=useState('')
  const [defaultProvider,setDefaultProvider]=useState('')
  const [defaultModel,setDefaultModel]=useState('')
  const [defaultMessage,setDefaultMessage]=useState('')
  const [savingDefaults,setSavingDefaults]=useState(false)
  useEffect(()=>{if(defaults.data){setDefaultProvider(defaults.data.provider);setDefaultModel(defaults.data.model)}},[defaults.data])
  async function create(e:FormEvent){e.preventDefault();setMessage('');const res=await apiFetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,description})});if(!res.ok){setMessage('Could not create application. Check the name and try again.');return}setName('');setDescription('');reload();setMessage('Application created.')}
  async function saveDefaults(e:FormEvent){e.preventDefault();setSavingDefaults(true);setDefaultMessage('');try{const res=await apiFetch('/api/settings/defaults',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:defaultProvider,model:defaultModel.trim()})});const body=await res.json();if(!res.ok)throw new Error(body.error||'Could not save defaults');setDefaultMessage('Workspace defaults saved.');defaults.reload()}catch(error){setDefaultMessage(error instanceof Error?error.message:String(error))}finally{setSavingDefaults(false)}}
  return <div className="page"><Heading eyebrow="WORKSPACE / SETTINGS" title="Workspace settings" description="Choose this client's default inference route and organize its applications."/>
    <Panel title="Account and access" subtitle="Current workspace session">{session.loading||tenantMode.loading?<Loading/>:session.error?<ErrorView message={session.error}/>:<><div className="connection"><KV label="Workspace" value={session.data?.tenant_id||'—'}/><KV label="Sign-in method" value={session.data?.email?'Company SSO':tenantMode.data?.onboarding==='dev_token'?'Shared development token':'Workspace token'}/><KV label="Current person" value={session.data?.email||'Not identifiable with a shared token'}/></div><p className="footnote">A shared token confirms workspace access but cannot tell which person sent a request. The owner email saved when creating a tenant does not identify the current operator. Individual user access and attribution require per-person sign-in.</p></>}</Panel>
    <div className="grid-two">
      <Panel title="Default inference" subtitle="Applies when API requests omit provider or model">{defaults.loading||providers.loading?<Loading/>:defaults.error||providers.error?<ErrorView message={defaults.error||providers.error}/>:<form className="form" onSubmit={saveDefaults}><label>Default provider<select value={defaultProvider} onChange={e=>{setDefaultProvider(e.target.value);setDefaultModel('')}}><option value="">No default provider</option>{providers.data?.providers.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label><label>Default model<input value={defaultModel} onChange={e=>setDefaultModel(e.target.value)} placeholder="Model ID (optional)" disabled={!defaultProvider}/></label><p className="form-help">Explicit provider and model values in a request always take priority. Connect an external provider before choosing it here.</p><button className="primary" type="submit" disabled={savingDefaults}>{savingDefaults?'Saving…':'Save defaults'}</button>{defaultMessage&&<small role="status">{defaultMessage}</small>}</form>}</Panel>
      <Panel title="Applications" subtitle="Use application_id in your inference request">{loading?<Loading/>:error?<ErrorView message={error}/>:data?.applications.length?<div className="compact-list">{data.applications.map(a=><div className="application-row" key={a.id}><span className="mini-icon">A</span><span><strong>{a.name}</strong><small>{a.description||'No description'}</small></span><span className="list-right mono">ID {a.id}</span></div>)}</div>:<Empty title="No applications yet" description="Create one to group requests from a client or agent."/>}<form className="form" onSubmit={create}><h3>Add application</h3><input required maxLength={100} placeholder="Application name" value={name} onChange={e=>setName(e.target.value)}/><input maxLength={300} placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)}/><button className="primary" type="submit">Create application</button>{message&&<small>{message}</small>}</form></Panel>
    </div>
    <Panel title="Gateway connection" subtitle="OpenAI-compatible chat endpoint"><div className="connection"><KV label="API base" value="http://127.0.0.1:8000"/><KV label="Endpoint" value="POST /v1/chat/completions"/><KV label="Database" value={tenantMode.data?.onboarding?'MySQL + ClickHouse · workspace scoped':'SQLite · workspace scoped'}/></div><p className="footnote">Use this workspace's API token as a Bearer token for scripts. Prompts and generated text are not stored; request metadata and collector samples are persisted.</p></Panel>
  </div>
}
