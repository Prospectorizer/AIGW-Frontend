'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Frame, ThemeToggle } from './ui'
import Overview from './Overview'
import Requests from './Requests'
import RequestDetail from './RequestDetail'
import { Providers, Infrastructure, Diagnoses, Settings } from './OtherPages'
import TestLab from './TestLab'

const requireSaas = process.env.NEXT_PUBLIC_AIGW_REQUIRE_SAAS === '1'

function Entry({children}:{children:ReactNode}){return <div className="tenant-entry"><div className="entry-theme"><ThemeToggle/></div>{children}</div>}

function TenantGate({children}:{children:ReactNode}){
  const [ready,setReady]=useState(false)
  const [required,setRequired]=useState(false)
  const [saas,setSaas]=useState(false)
  const [devTokenLogin,setDevTokenLogin]=useState(false)
  const [tenant,setTenant]=useState('')
  const [email,setEmail]=useState('')
  const [workspace,setWorkspace]=useState('')
  const [token,setToken]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [configurationError,setConfigurationError]=useState('')
  useEffect(()=>{
    let active=true
    async function initialize(){
      try{
        const mode=await fetch('/api/tenant-mode').then(r=>r.ok?r.json():{enabled:false})
        if(!active)return
        if(requireSaas&&!mode.enabled){setConfigurationError('This gateway is running without SaaS mode. Start the SaaS backend, then refresh this page.');setReady(true);return}
        setRequired(!!mode.enabled)
        const isDevToken=mode.onboarding==='dev_token'
        const isSaas=mode.onboarding==='admin'||isDevToken
        setSaas(isSaas)
        setDevTokenLogin(isDevToken)
        if(isSaas&&!isDevToken)sessionStorage.removeItem('aigw_tenant_token')
        if(mode.enabled){
          const saved=isSaas&&!isDevToken?'':sessionStorage.getItem('aigw_tenant_token')
          const response=await fetch('/api/session',{headers:saved?{Authorization:'Bearer '+saved}:{}})
          if(active&&response.ok){const data=await response.json();setTenant(data.tenant_id);setEmail(data.email||'');if(data.csrf)sessionStorage.setItem('aigw_csrf',data.csrf)}
          else if(active){sessionStorage.removeItem('aigw_tenant_token');sessionStorage.removeItem('aigw_csrf')}
        }
      }catch{if(requireSaas)setConfigurationError('The gateway is unavailable. Start the SaaS backend, then refresh this page.')}
      if(active)setReady(true)
    }
    initialize();return()=>{active=false}
  },[])
  async function connect(e:FormEvent){
    e.preventDefault();setBusy(true);setError('')
    try{
      const response=await fetch('/api/session',{headers:{Authorization:'Bearer '+token.trim()}})
      if(!response.ok)throw new Error('Invalid tenant API token')
      const data=await response.json()
      if(devTokenLogin&&data.tenant_id!==workspace.trim())throw new Error('This token belongs to another workspace')
      sessionStorage.setItem('aigw_tenant_token',token.trim());setToken('');setTenant(data.tenant_id)
    }catch(err){setError(err instanceof Error?err.message:String(err))}finally{setBusy(false)}
  }
  async function signOut(){
    if(saas&&!devTokenLogin){await fetch('/api/auth/logout',{method:'POST',headers:{'X-AIGW-CSRF':sessionStorage.getItem('aigw_csrf')||''}})}
    sessionStorage.removeItem('aigw_tenant_token');sessionStorage.removeItem('aigw_csrf');setTenant('');setEmail('')
  }
  if(!ready)return <Entry>Checking workspace…</Entry>
  if(configurationError)return <Entry><div role="alert"><div className="eyebrow">AI PROSPECTOR / SETUP</div><h1>Workspace sign-in unavailable</h1><p>{configurationError}</p></div></Entry>
  if(required&&!tenant&&devTokenLogin)return <Entry><form onSubmit={connect}><div className="eyebrow">AI PROSPECTOR / DEVELOPMENT</div><h1>Open a workspace</h1><p>Use the workspace ID and the one-time API token returned when the workspace was created. This local development sign-in does not use SSO.</p><label>Workspace ID<input required autoComplete="organization" value={workspace} onChange={e=>setWorkspace(e.target.value)} placeholder="acme"/></label><label>Workspace API token<input type="password" required autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Checking…':'Open workspace'}</button></form></Entry>
  if(required&&!tenant&&saas)return <Entry><form onSubmit={e=>{e.preventDefault();if(workspace.trim())location.assign('/api/auth/login?tenant='+encodeURIComponent(workspace.trim()))}}><div className="eyebrow">AI PROSPECTOR / WORKSPACE</div><h1>Sign in to your workspace</h1><p>Enter the client workspace ID assigned by your administrator. Your company sign-in must use the email assigned to this workspace.</p><label>Workspace ID<input required autoComplete="organization" value={workspace} onChange={e=>setWorkspace(e.target.value)} placeholder="acme"/></label><button className="primary">Continue with SSO</button></form></Entry>
  if(required&&!tenant)return <Entry><form onSubmit={connect}><div className="eyebrow">AI PROSPECTOR / WORKSPACE</div><h1>Connect to your tenant</h1><p>Enter your tenant API token to open its providers, requests, and test lab.</p><label>Tenant API token<input type="password" required autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Connecting…':'Open workspace'}</button></form></Entry>
  return <>{required&&<div className="tenant-banner"><span>Workspace: <strong>{tenant}</strong> · {email?`Signed in: ${email}`:'Shared workspace token'}</span><button type="button" onClick={signOut}>{saas&&!devTokenLogin?'Sign out':'Switch workspace'}</button></div>}{children}</>
}

export default function App(){const route=usePathname()||'/overview';useEffect(()=>{if(location.hash.startsWith('#/'))location.replace(location.hash.slice(1))},[]);let page;if(route.startsWith('/requests/'))page=<RequestDetail id={decodeURIComponent(route.split('/')[2])}/>;else if(route.startsWith('/requests'))page=<Requests/>;else if(route.startsWith('/test'))page=<TestLab/>;else if(route.startsWith('/providers'))page=<Providers/>;else if(route.startsWith('/infrastructure'))page=<Infrastructure/>;else if(route.startsWith('/diagnoses'))page=<Diagnoses/>;else if(route.startsWith('/settings'))page=<Settings/>;else page=<Overview/>;return <TenantGate><Frame route={route}>{page}</Frame></TenantGate>}
