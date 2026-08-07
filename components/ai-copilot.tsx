"use client";

import { useState } from "react";
import { postAigw } from "@/lib/aigw/client";
import type { OverviewMetrics, ProviderModel } from "@/lib/aigw/types";
import { Icon } from "./icons";
import { useAigw } from "./use-aigw";

type Message = { role: "user" | "assistant"; content: string };
type ChatCompletion = { choices?: Array<{ message?: { content?: string } }> };

const suggestions = [
  { title: "Reduce AI spend", detail: "Find lower-cost model opportunities", prompt: "Review my connected models and suggest how to reduce cost without significantly reducing response quality." },
  { title: "Compare my models", detail: "Choose the right model for each workload", prompt: "Compare the AI models connected to this gateway. Recommend which one to use for support, summarization, coding, and complex reasoning." },
  { title: "Reliability review", detail: "Improve latency and fallback coverage", prompt: "Give me a reliability review. What routing, retry, and fallback improvements should I prioritize?" },
  { title: "Weekly AI report", detail: "Summarize performance for stakeholders", prompt: "Create a concise weekly AI operations report with usage, cost, reliability, risks, and next actions." },
];

const fallbackOverview: OverviewMetrics = { total_requests: 0, total_tokens: 0, total_cost_usd: 0, total_cost_sar: 0, avg_latency_ms: 0, error_count: 0, cache_hits: 0, cache_hit_rate: 0 };

export function AiCopilot({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const models = useAigw<ProviderModel[]>("/api/admin/models", [], 60_000);
  const overview = useAigw<OverviewMetrics>("/api/dashboard/overview?period=7d", fallbackOverview, 60_000);

  async function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || sending) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: cleanQuestion }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    const inventory = models.data.length
      ? models.data.map(model => `${model.model_id} (${model.provider_name}, input $${model.input_cost_per_m}/1M, output $${model.output_cost_per_m}/1M, context ${model.context_window}, tools ${model.supports_tools ? "yes" : "no"})`).join("; ")
      : "The model inventory endpoint is unavailable. Clearly say that model-specific recommendations cannot be verified.";
    const context = `Current page: ${page}. Last 7 days: ${overview.data.total_requests} requests, $${overview.data.total_cost_usd} cost, ${overview.data.error_count} errors, ${overview.data.avg_latency_ms}ms average latency, ${overview.data.cache_hit_rate}% cache hit rate. Connected model inventory: ${inventory}`;
    const system = `You are Prospector Copilot, an AI gateway operations advisor. Answer about the customer's connected AI models, routing, cost, latency, reliability, usage, and reports. Use only the supplied gateway context for claims about their system. If live data is unavailable, say so plainly. Give concise, practical answers with prioritized actions. Gateway context: ${context}`;
    const servingModel = models.data.find(model => model.is_enabled)?.model_id ?? "gpt-4o-mini";

    try {
      const result = await postAigw<ChatCompletion>("/v1/chat/completions", {
        model: servingModel,
        messages: [{ role: "system", content: system }, ...nextMessages.slice(-8)],
        temperature: 0.25,
        stream: false,
      });
      const answer = result.choices?.[0]?.message?.content ?? "The gateway returned an empty response.";
      setMessages(current => [...current, { role: "assistant", content: answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The copilot request failed.");
    } finally {
      setSending(false);
    }
  }

  return <>
    <button className={`copilot-trigger ${open ? "active" : ""}`} onClick={() => setOpen(value => !value)} aria-label="Open AI suggestions">
      <Icon name={open ? "close" : "chat"}/><span className="copilot-badge">4</span>
    </button>
    <aside className={`copilot-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="copilot-head"><div className="copilot-symbol"><Icon name="sparkles"/></div><div><h2>Prospector Copilot</h2><p><i/> Connected to your AI gateway</p></div><button onClick={() => setOpen(false)} aria-label="Close copilot"><Icon name="close"/></button></div>
      <div className="copilot-body scrollbar">
        {messages.length === 0 ? <>
          <div className="copilot-intro"><span><Icon name="sparkles"/></span><h3>What should we improve next?</h3><p>I can analyze your connected models, cost, reliability, and usage to suggest the highest-impact actions.</p></div>
          <div className="suggestion-title"><span>Top suggestions</span><small>Based on your gateway</small></div>
          <div className="suggestion-list">{suggestions.map((suggestion,index) => <button key={suggestion.title} onClick={() => void ask(suggestion.prompt)}><span>{index + 1}</span><div><b>{suggestion.title}</b><small>{suggestion.detail}</small></div><Icon name="chevron"/></button>)}</div>
        </> : <div className="chat-thread">{messages.map((message,index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? <Icon name="sparkles"/> : "You"}</span><p>{message.content}</p></div>)}{sending && <div className="chat-message assistant"><span><Icon name="sparkles"/></span><p className="typing"><i/><i/><i/></p></div>}</div>}
        {error && <div className="copilot-error"><b>Couldn’t reach the AI gateway</b><p>{error}</p></div>}
      </div>
      <div className="copilot-compose"><div className="quick-actions"><button onClick={() => void ask("Suggest three improvements for my AI gateway.")}><Icon name="sparkles"/> New suggestions</button><button onClick={() => void ask("Create an executive AI usage report.")}>Create report</button></div><div className="compose-box"><textarea rows={1} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(input); } }} placeholder="Ask about your models, cost, or reliability..."/><button disabled={!input.trim() || sending} onClick={() => void ask(input)} aria-label="Send message"><Icon name="send"/></button></div><small>Answers use your connected gateway data.</small></div>
    </aside>
  </>;
}
