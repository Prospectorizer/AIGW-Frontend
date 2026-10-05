import { useState, type FormEvent } from 'react'
import { go, short, useResource, type Application, type Provider } from './data'
import { Empty, ErrorView, Heading, Loading, Panel } from './ui'

export default function TestLab(){
  const providers=useResource<{providers:Provider[]}>('/api/providers')
  const applications=useResource<{applications:Application[]}>('/api/applications')
  const [provider,setProvider]=useState('')
  const [model,setModel]=useState('')
  const [application,setApplication]=useState('')
  const [prompt,setPrompt]=useState('')
  const [stream,setStream]=useState(false)
  const [busy,setBusy]=useState(false)
  const [result,setResult]=useState('')
  const [requestID,setRequestID]=useState('')
  const [status,setStatus]=useState('')
  const [ready,setReady]=useState(false)

  function chooseProvider(id:string){setProvider(id);setModel('')}
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setResult('');setStatus('Sending request…');setRequestID('');setReady(false)
    try{
      const body:Record<string,unknown>={provider,model,messages:[{role:'user',content:prompt}],max_tokens:128,stream}
      if(application)body.application_id=Number(application)
      const response=await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const id=response.headers.get('X-AIGW-Request-ID')||'';setRequestID(id)
      setStatus(`${response.status} ${response.statusText}`)
      if(stream&&response.body){
        const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let output=''
        while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]')continue;try{const event=JSON.parse(data);const content=event.choices?.[0]?.delta?.content;if(typeof content==='string'){output+=content;setResult(output)}}catch{/* malformed events are visible in the persisted request error */}}}
        if(!output)setResult('Stream completed without text content. Inspect request telemetry.')
      }else{const text=await response.text();try{const parsed=JSON.parse(text);setResult(parsed.choices?.[0]?.message?.content??JSON.stringify(parsed,null,2))}catch{setResult(text)}}
      if(id){for(let attempt=0;attempt<30;attempt++){const persisted=await fetch('/api/requests/'+encodeURIComponent(id));if(persisted.ok){setReady(true);break}await new Promise(resolve=>setTimeout(resolve,200))}}
    }catch(err){setStatus('Request failed');setResult(String(err))}finally{setBusy(false)}
  }
  return <div className="page"><Heading eyebrow="TEST / INFERENCE" title="Test the full request path" description="Send a real request, then inspect the stored timings, infrastructure samples, baseline, and diagnosis."/>
    <div className="grid-two"><Panel title="Send request" subtitle="Select a configured real provider and its exact model ID">{providers.loading||applications.loading?<Loading/>:providers.error||applications.error?<ErrorView message={providers.error||applications.error}/>:<form className="form test-form" onSubmit={submit}>
      <label>Provider<select required value={provider} onChange={e=>chooseProvider(e.target.value)}><option value="">Select a provider</option>{providers.data?.providers.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name} · {p.mode==='self_hosted'?'self-hosted':'external'}</option>)}</select></label>
      <label>Model ID<input required value={model} onChange={e=>setModel(e.target.value)} placeholder="Exact model ID configured for this provider"/></label>
      <label>Application<select value={application} onChange={e=>setApplication(e.target.value)}><option value="">Unassigned</option>{applications.data?.applications.map(a=><option value={a.id} key={a.id}>{a.name} (ID {a.id})</option>)}</select></label>
      <label>Prompt<textarea required rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Enter a prompt for the selected model"/></label>
      <label className="test-check"><input type="checkbox" checked={stream} onChange={e=>setStream(e.target.checked)}/> Stream response and measure TTFT</label>
      <button className="primary" type="submit" disabled={busy||!provider||!model||!prompt}>{busy?'Running…':'Send inference request'}</button>
      <p className="footnote">The gateway stores request metadata and metrics. Prompt and answer text are not stored.</p>
    </form>}</Panel><Panel title="Result" subtitle={status||'Waiting for a request'}>{requestID&&<div className="test-result-link"><strong>Request {short(requestID)}</strong>{ready?<button className="primary" onClick={()=>go('/requests/'+requestID)}>Inspect request →</button>:<span>Telemetry finalizing…</span>}</div>}{result?<pre className="test-output">{result}</pre>:<Empty title="No response yet" description="Send a request to see the generated answer and open its telemetry record."/>}</Panel></div>
  </div>
}
