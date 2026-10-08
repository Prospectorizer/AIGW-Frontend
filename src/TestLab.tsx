import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, go, short, useResource, type Application, type Provider } from './data'
import { Empty, ErrorView, Heading, Loading, Panel } from './ui'

function requestBody(provider:string,model:string,prompt:string,maxTokens:number,stream:boolean,application:string){
  const body:Record<string,unknown>={provider,model,messages:[{role:'user',content:prompt}],max_tokens:maxTokens,stream}
  if(application)body.application_id=Number(application)
  return body
}

function shellQuote(value:string){return "'"+value.replaceAll("'","'\"'\"'")+"'"}

function curlExample(gatewayURL:string,body:Record<string,unknown>,needsToken:boolean){
  const base=gatewayURL.trim().replace(/\/+$/,'')||'http://127.0.0.1:8000'
  const lines=[`AIGW_BASE_URL=${shellQuote(base)}`]
  if(needsToken)lines.push("AIGW_API_TOKEN='<workspace-api-token>'")
  lines.push(`curl -sS${body.stream?' -N':''} -X POST "$AIGW_BASE_URL/v1/chat/completions" \\`)
  lines.push('  -H "Content-Type: application/json" \\')
  if(needsToken)lines.push('  -H "Authorization: Bearer $AIGW_API_TOKEN" \\')
  lines.push("  --data-binary @- <<'AIGW_REQUEST_JSON'")
  lines.push(JSON.stringify(body,null,2))
  lines.push('AIGW_REQUEST_JSON')
  return lines.join('\n')
}

export default function TestLab(){
  const providers=useResource<{providers:Provider[]}>('/api/providers')
  const applications=useResource<{applications:Application[]}>('/api/applications')
  const tenantMode=useResource<{enabled:boolean}>('/api/tenant-mode')
  const [provider,setProvider]=useState('')
  const [model,setModel]=useState('')
  const [models,setModels]=useState<{id:string;name?:string;source?:string}[]>([])
  const [modelLoading,setModelLoading]=useState(false)
  const [modelMessage,setModelMessage]=useState('')
  const [savedNotice,setSavedNotice]=useState('')
  const [modelSource,setModelSource]=useState('')
  const [modelRefresh,setModelRefresh]=useState(0)
  const [manualModel,setManualModel]=useState(false)
  const [savingModel,setSavingModel]=useState(false)
  const [application,setApplication]=useState('')
  const [prompt,setPrompt]=useState('')
  const [maxTokens,setMaxTokens]=useState(128)
  const [stream,setStream]=useState(false)
  const [busy,setBusy]=useState(false)
  const [result,setResult]=useState('')
  const [requestID,setRequestID]=useState('')
  const [status,setStatus]=useState('')
  const [ready,setReady]=useState(false)
  const [gatewayURL,setGatewayURL]=useState('http://127.0.0.1:8000')
  const [copyMessage,setCopyMessage]=useState('')
  const sampleBody=requestBody(provider||'<provider-id>',model||'<model-id>',prompt||'Your prompt here',maxTokens,stream,application)
  const sampleCurl=curlExample(gatewayURL,sampleBody,tenantMode.data?.enabled??true)

  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get('provider')
    if(requested)setProvider(requested)
  },[])
  useEffect(()=>{
    if(provider&&providers.data)setMaxTokens(providers.data.providers.find(item=>item.id===provider)?.mode==='self_hosted'?512:128)
  },[provider,providers.data])
  function chooseProvider(id:string){setProvider(id);setModel('');setModels([]);setModelMessage('');setSavedNotice('');setManualModel(false)}
  useEffect(()=>{
    if(!provider)return
    const controller=new AbortController()
    setModelLoading(true);setModelMessage('');setModels([])
    apiFetch('/api/providers/'+encodeURIComponent(provider)+'/models',{signal:controller.signal})
      .then(async response=>{
        const data=await response.json()
        if(!response.ok)throw new Error(data.error||'Model discovery failed')
        return data as {models:{id:string;name?:string;source?:string}[];source:string;discovery_available:boolean;warning?:string}
      })
      .then(data=>{
        const discovered=data.models||[]
        setModels(discovered);setModelSource(data.source)
        if(discovered.length===1)setModel(discovered[0].id)
        if(data.warning)setModelMessage(data.warning)
        else if(!discovered.length)setModelMessage(data.discovery_available?'This provider returned no models. You can enter a model ID manually.':'This provider does not expose a model list. Enter a model ID manually.')
      })
      .catch(error=>{if(!controller.signal.aborted)setModelMessage(`${error instanceof Error?error.message:String(error)}. You can enter a model ID manually.`)})
      .finally(()=>{if(!controller.signal.aborted)setModelLoading(false)})
    return ()=>controller.abort()
  },[provider,modelRefresh])
  async function saveModel(){
    if(!provider||!model.trim())return
    setSavingModel(true);setModelMessage('');setSavedNotice('')
    try{
      const response=await apiFetch('/api/providers/'+encodeURIComponent(provider)+'/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:model.trim()})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Could not save model')
      setSavedNotice('Model saved under this provider.')
      setModelRefresh(n=>n+1)
    }catch(error){setModelMessage(error instanceof Error?error.message:String(error))}finally{setSavingModel(false)}
  }
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setResult('');setStatus('Sending request…');setRequestID('');setReady(false)
    try{
      const body=requestBody(provider,model,prompt,maxTokens,stream,application)
      const response=await apiFetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const id=response.headers.get('X-AIGW-Request-ID')||'';setRequestID(id)
      setStatus(`${response.status} ${response.statusText}`)
      if(stream&&response.ok&&response.headers.get('Content-Type')?.includes('text/event-stream')&&response.body){
        const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let output=''
        while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]')continue;try{const event=JSON.parse(data);const content=event.choices?.[0]?.delta?.content;if(typeof content==='string'){output+=content;setResult(output)}}catch{/* malformed events are visible in the persisted request error */}}}
        if(!output)setResult('The stream returned no final answer text. If the model uses reasoning tokens, increase Max output tokens and retry. Inspect the request for its status and timing.')
      }else{const text=await response.text();try{const parsed=JSON.parse(text);const choice=parsed.choices?.[0];const content=choice?.message?.content;setResult(typeof content==='string'&&content.trim()?content:choice?choice.finish_reason==='length'?'The model used its output token limit without a final answer. Increase Max output tokens and retry.':'The model returned no final answer text. Inspect the request status and try increasing Max output tokens.':JSON.stringify(parsed,null,2))}catch{setResult(text||'The provider returned an empty response.')}}
      if(id){for(let attempt=0;attempt<30;attempt++){const persisted=await apiFetch('/api/requests/'+encodeURIComponent(id));if(persisted.ok){setReady(true);if(response.ok)setModelRefresh(n=>n+1);break}await new Promise(resolve=>setTimeout(resolve,200))}}
    }catch(err){setStatus('Request failed');setResult(String(err))}finally{setBusy(false)}
  }
  async function copyCurl(){
    try{await navigator.clipboard.writeText(sampleCurl);setCopyMessage('Copied cURL example.')}
    catch{setCopyMessage('Copy failed. Select and copy the example below.')}
  }
  return <div className="page"><Heading eyebrow="TEST / INFERENCE" title="Test the full request path" description="Send a real request, then inspect the stored timings, infrastructure samples, baseline, and diagnosis."/>
    <div className="grid-two"><Panel title="Send request" subtitle="Choose a provider and one of its available models">{providers.loading||applications.loading?<Loading/>:providers.error||applications.error?<ErrorView message={providers.error||applications.error}/>:<form className="form test-form" onSubmit={submit}>
      <label>Provider<select required value={provider} onChange={e=>chooseProvider(e.target.value)}><option value="">Select a provider</option>{providers.data?.providers.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name} · {p.mode==='self_hosted'?'self-hosted':'external'}</option>)}</select></label>
      <button type="button" className="ghost" onClick={()=>go('/providers')}>Add provider →</button>
      <label>Model{models.length>0&&!manualModel?<select required value={model} onChange={e=>setModel(e.target.value)}><option value="">Select a model</option>{models.map(item=><option key={item.id} value={item.id}>{item.name&&item.name!==item.id?`${item.name} · ${item.id}`:item.id}{item.source&&item.source!=='provider'?` · saved`:''}</option>)}</select>:<input required disabled={!provider||modelLoading} value={model} onChange={e=>setModel(e.target.value)} placeholder={modelLoading?'Loading models…':'Model ID'}/>}</label>
      {provider&&<div><button type="button" className="ghost" onClick={()=>{setModel('');setModelRefresh(n=>n+1)}} disabled={modelLoading}>{modelLoading?'Loading models…':'Refresh models'}</button>{models.length>0&&<button type="button" className="ghost" onClick={()=>{setModel('');setManualModel(!manualModel)}}>{manualModel?'Choose from list':'Enter model ID'}</button>}{(!models.length||manualModel)&&<button type="button" className="ghost" onClick={saveModel} disabled={!model.trim()||savingModel}>{savingModel?'Saving…':'Save model'}</button>}{modelSource==='configured'&&models.length>0&&<p className="footnote">Showing model IDs configured for this provider.</p>}{modelMessage&&<p className="footnote">{modelMessage}</p>}{savedNotice&&<p className="footnote">{savedNotice}</p>}</div>}
      <label>Application<select value={application} onChange={e=>setApplication(e.target.value)}><option value="">Unassigned</option>{applications.data?.applications.map(a=><option value={a.id} key={a.id}>{a.name} (ID {a.id})</option>)}</select></label>
      <label>Prompt<textarea required rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Enter a prompt for the selected model"/></label>
      <label>Max output tokens<input type="number" min={1} max={8192} value={maxTokens} onChange={e=>setMaxTokens(Number(e.target.value))}/></label>
      <label className="test-check"><input type="checkbox" checked={stream} onChange={e=>setStream(e.target.checked)}/> Stream response and measure TTFT</label>
      <button className="primary" type="submit" disabled={busy||!provider||!model||!prompt||!Number.isInteger(maxTokens)||maxTokens<1||maxTokens>8192}>{busy?'Running…':'Send inference request'}</button>
      <p className="footnote">The gateway stores request metadata and metrics. Prompt and answer text are not stored.</p>
    </form>}</Panel><Panel title="Result" subtitle={status||'Waiting for a request'}>{requestID&&<div className="test-result-link"><strong>Request {short(requestID)}</strong>{ready?<button className="primary" onClick={()=>go('/requests/'+requestID)}>Inspect request →</button>:<span>Telemetry finalizing…</span>}</div>}{result?<pre className="test-output">{result}</pre>:<Empty title="No response yet" description="Send a request to see the generated answer and open its telemetry record."/>}</Panel></div>
    <Panel title="Use this request in your application" subtitle="Copy the same provider, model, and request options used above" action={<button type="button" className="ghost" onClick={copyCurl}>Copy cURL</button>}><div className="snippet-controls"><label>Gateway base URL<input type="url" value={gatewayURL} onChange={e=>{setGatewayURL(e.target.value);setCopyMessage('')}}/></label><p>Use the gateway URL reachable by your application. Set the workspace API token in the example; provider credentials stay in AIGW.</p></div><pre className="curl-sample"><code>{sampleCurl}</code></pre>{copyMessage&&<p className="footnote" role="status">{copyMessage}</p>}</Panel>
  </div>
}
