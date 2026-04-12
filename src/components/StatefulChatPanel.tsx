'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/lib/types';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { generatePdfReport } from '@/lib/pdfGenerator';

// Maps citation IDs to public PDF paths
const DOC_LINKS: Record<string, string> = {
  'SOP-MAINT-001':  '/docs/SOP-MAINT-001.pdf',
  'SOP-MAINT-010':  '/docs/SOP-MAINT-010.pdf',
  'SOP-OPS-001':    '/docs/SOP-OPS-001.pdf',
  'SOP-OPS-002':    '/docs/SOP-OPS-002.pdf',
  'SOP-OPS-010':    '/docs/SOP-OPS-010.pdf',
  'SOP-ENV-001':    '/docs/SOP-ENV-001.pdf',
  'SOP-SAFE-001':   '/docs/SOP-SAFE-001.pdf',
  'MAN-MECH-001':   '/docs/MAN-MECH-001.pdf',
  'MAN-INST-001':   '/docs/MAN-INST-001.pdf',
  'RPT-INSPECT-001':'/docs/RPT-INSPECT-001.pdf',
  'PID-NPA-001':    '/docs/PID-NPA-001.pdf',
};

const ASSET_TAGS = [
  { tag: 'V-101', desc: 'HP Separation Vessel' },
  { tag: 'P-101A', desc: 'Drain Pump A' },
  { tag: 'P-101B', desc: 'Drain Pump B' },
  { tag: 'E-101', desc: 'Wellstream Heater' },
  { tag: 'PCV-101', desc: 'Pressure Control Valve' },
  { tag: 'LCV-101', desc: 'Level Control Valve' },
];

const QUICK_ACTIONS = [
  { label: 'P-101 Status',     prompt: 'Current maintenance status of P-101A pump — bearing history and lubrication check?' },
  { label: 'Draft Work Order', prompt: 'Draft a work order for preventive lubrication on P-101A/B per MAN-MECH-001.' },
  { label: 'V-101 Pressure',   prompt: 'Analyse V-101 pressure and advise on MAWP compliance (75 barg limit).' },
  { label: 'Anomaly Report',   prompt: 'Proactive anomaly report: cross-reference current sensor readings with failure history.' },
  { label: 'Safety Brief',     prompt: 'Safety brief for today\'s operations — flag any open corrective WOs or active alarms.' },
];

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function CitationChip({ citation }: { citation: string }) {
  // Support appending #search=X to PDF bounds
  const parts = citation.split('#');
  const baseCit = parts[0];
  const hash = parts.length > 1 ? `#${parts[1]}` : '';
  const href = DOC_LINKS[baseCit];

  if (href) {
    return (
      <a href={`${href}${hash}`} target="_blank" rel="noopener noreferrer" className="citation-link" title={parts[1] ? `Highlight text: ${parts[1].replace('search=', '')}` : ''}>
        📎 {baseCit} ↗
      </a>
    );
  }
  return (
    <span className="citation-link" style={{ cursor: 'default' }}>📎 {baseCit}</span>
  );
}

// Recharts Renderer for AI Output
function ChartRenderer({ jsonString }: { jsonString: string }) {
  try {
    let cleanJson = jsonString.trim();
    // basic sanitize: remove trailing commas
    cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
    const config = JSON.parse(cleanJson);
    const { type, data, xKey, lines } = config;
    if (!data || !Array.isArray(data)) return <div style={{color:'var(--alarm)', fontSize: '0.7rem', padding: '10px 0'}}>Invalid Recharts data array.</div>;

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div style={{ background: 'rgba(0,0,0,0.85)', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, backdropFilter: 'blur(10px)' }}>
            <p style={{ color: 'var(--t3)', margin: '0 0 5px 0', fontSize: '0.75rem' }}>{label}</p>
            {payload.map((p: any, i: number) => (
              <div key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.85rem' }}>{p.name}: {p.value}</div>
            ))}
          </div>
        );
      }
      return null;
    };

    if (type === 'LineChart') {
      return (
        <div style={{ height: 260, width: '100%', marginTop: 15, marginBottom: 10, background: 'rgba(255,255,255,0.02)', padding: '16px 16px 4px 0', borderRadius: 10, border: '1px solid var(--border)' }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey={xKey} stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
              {(lines || []).map((line: any, i: number) => (
                <Line key={i} type="monotone" dataKey={line.key} name={line.name} stroke={line.color || 'var(--blue)'} strokeWidth={3} dot={{ r: 3, fill: '#000', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (type === 'BarChart') {
      return (
        <div style={{ height: 260, width: '100%', marginTop: 15, marginBottom: 10, background: 'rgba(255,255,255,0.02)', padding: '16px 16px 4px 0', borderRadius: 10, border: '1px solid var(--border)' }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey={xKey} stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
              {(lines || []).map((line: any, i: number) => (
                <Bar key={i} dataKey={line.key} name={line.name} fill={line.color || 'var(--blue)'} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return <div style={{color:'var(--t3)', fontSize: '0.7rem', padding: '10px 0'}}>Unsupported chart type requested by AI: {type}</div>;
  } catch (e: any) {
    return <div style={{color:'var(--alarm)', fontSize: '0.7rem', padding: '10px 0', border: '1px dashed var(--alarm)', borderRadius: 6, margin: '10px 0'}}>
      <span style={{fontWeight: 700}}>Chart render error:</span> {e.message}
    </div>; // Return nothing if parsing fails, let markdown handle it
  }
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  
  // Extract Recharts definitions
  const chartRegex = /\`\`\`recharts\n([\s\S]*?)\n\`\`\`/g;
  let hasChart = false;
  let chartJson = '';
  
  let formattedContent = msg.content;
  const match = chartRegex.exec(formattedContent);
  if (match) {
    hasChart = true;
    chartJson = match[1];
    // Remove the chart block from the layout text so we can render it natively
    formattedContent = formattedContent.replace(match[0], '');
  }

  const renderContent = (content: string) => {
    if (isUser) return content;
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(120,180,255,0.1);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:0.82em;color:var(--blue)">$1</code>')
      .replace(/\[WORK ORDER DRAFT\]/g, '<span style="color:var(--alarm);font-weight:800">[WORK ORDER DRAFT]</span>')
      .replace(/---\n?([\s\S]*?)\n?---/g, '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-left:3px solid var(--blue);border-radius:6px;padding:12px 16px;margin:12px 0;font-family:monospace;font-size:0.8em;white-space:pre-wrap;color:var(--t2)">$1</div>')
      .replace(/\[([A-Z]+-[a-zA-Z]+-\d+)(?:#[^\]\s]*)?\]/g, (match, p1) => {
        const parts = match.slice(1, -1).split('#');
        const docId = parts[0];
        const hash = parts[1] ? '#' + parts[1] : '';
        const href = DOC_LINKS[docId] ? `${DOC_LINKS[docId]}${hash}` : '#';
        return `<a href="${href}" target="_blank" style="color:var(--blue);text-decoration:none;font-weight:700;background:rgba(120,180,255,0.1);padding:2px 6px;border-radius:4px" title="Open source document">📎 ${docId}</a>`;
      })
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', width: isUser ? 'auto' : '92%', maxWidth: '92%' }}>
      {!isUser && (
        <div style={{ fontSize: '0.62rem', color: 'var(--t3)', marginBottom: 5, paddingLeft: 2 }}>
          NPA AI · {formatTime(msg.timestamp)}
        </div>
      )}
      <div
        className={`chat-bubble ${msg.role}`}
        style={{ width: '100%' }}
      >
        <div dangerouslySetInnerHTML={{ __html: renderContent(formattedContent) }} />
        {hasChart && <ChartRenderer jsonString={chartJson} />}
      </div>
      {msg.citations && msg.citations.length > 0 && (
        <div className="chat-citation">
          <span style={{ color: 'var(--t3)', marginRight: 4 }}>Sources:</span>
          {msg.citations.map(c => <CitationChip key={c} citation={c} />)}
        </div>
      )}
      {/* PDF Export logic for specific AI messages */}
      {!isUser && (formattedContent.includes('[WORK ORDER DRAFT]') || formattedContent.toLowerCase().includes('report') || formattedContent.toLowerCase().includes('brief')) && (
        <button 
          onClick={() => generatePdfReport(formattedContent, formattedContent.includes('[WORK ORDER DRAFT]') ? 'Work_Order' : 'Report')}
          style={{ marginTop: 8, background: 'rgba(52,211,153,0.1)', color: 'var(--good)', border: '1px solid rgba(52,211,153,0.3)', padding: '4px 8px', borderRadius: 4, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
          📄 Export Industrial PDF
        </button>
      )}

      {isUser && (
        <div style={{ fontSize: '0.6rem', color: 'var(--t3)', textAlign: 'right', marginTop: 3, paddingRight: 2 }}>
          {formatTime(msg.timestamp)}
        </div>
      )}
    </div>
  );
}

export default function StatefulChatPanel({ fullPage }: { fullPage?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: `**Welcome to NPA Field Operations AI**\n\nThe Collaborative Context Engine is online. I automatically cross-reference:\n• 3.07M sensor readings\n• Historical Maintenance Logs\n• Safety Guards (e.g. 75 barg V-101 limit)\n\nType **@** to tag a specific asset. How can I assist?`,
    timestamp: new Date(),
    citations: [],
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<{ active: boolean; text: string }>({ active: false, text: '' });
  
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { proactiveAlerts } = useLiveTelemetry();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Vapi Real-time Transparency Sync (Track 1)
  useEffect(() => {
    const handleVapiCall = (e: any) => {
      const { value, limit, asset } = e.detail;
      setMessages(p => [...p, {
        role: 'system',
        content: `⚠️ SYSTEM PROTOCOL INITIATED ⚠️\n\nCRITICAL: **${asset} Pressure at ${value} barg.**\nThis exceeds the ${limit} barg limit. Initiating autonomous emergency Voice AI call to Field Manager (+14806900972) to relay maintenance history payload...`,
        timestamp: new Date()
      }]);
    };
    window.addEventListener('init-vapi-call', handleVapiCall);
    return () => window.removeEventListener('init-vapi-call', handleVapiCall);
  }, []);

  const triggerFieldManagerCall = () => {
    const mockVal = 73.1;
    // Visually push the prompt into chat window
    window.dispatchEvent(new CustomEvent('init-vapi-call', { detail: { value: mockVal, limit: 72, asset: 'V-101' } }));
    
    // Hit the Vapi logic router
    fetch('/api/vapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: 'AREA-HP-SEP:V-101', value: mockVal, limit: 72 })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        // Output visual fallback into chat explicitly instructing on missing Phone ID
        setMessages(p => [...p, {
          role: 'system',
          content: `❌ **VAPI OUTBOUND ERR:** The call failed to originate. \n\nVapi requires a valid, purchased source Caller ID to hit the PSTN. You must log into [Vapi.ai](https://dashboard.vapi.ai/), purchase a quick $1 phone number, grab the resulting **Phone Number ID**, and add it to your \`.env.local\` as \`VAPI_PHONE_NUMBER_ID=...\`!`,
          timestamp: new Date()
        }]);
      }
    })
    .catch(console.error);
  };

  const loadMemoryHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        const mems = data.history.map((h: any) => h.content || h.text || JSON.stringify(h)).slice(0,10).join('\n\n---\n');
        setMessages(p => [...p, {
          role: 'system',
          content: `**[Supermemory Archives Retreived]**\n\n${mems}`,
          timestamp: new Date()
        }]);
      } else {
        setMessages(p => [...p, { role: 'system', content: 'No prior Supermemory history found yet.', timestamp: new Date() }]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setMentionQuery({ active: false, text: '' });
    setLoading(true);
    
    // Auto-detect asset tags in user message to pass as context (without needing a dropdown)
    const detectedAsset = ASSET_TAGS.find(a => text.toUpperCase().includes(a.tag))?.tag || '';
    // Optional: Format for Supabase context block searching
    const contextTag = detectedAsset === 'V-101' ? 'AREA-HP-SEP:V-101' : (detectedAsset === 'P-101A' ? 'AREA-HP-SEP:P-101' : detectedAsset);

    try {
      const history = messages.filter(m => m.role !== 'system').slice(-10)
        .map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: text.trim() }], assetContext: contextTag }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setMessages(p => [...p, {
        role: 'assistant', content: data.content || 'No response generated.',
        timestamp: new Date(), citations: data.citations || [],
      }]);
    } catch (e: any) {
      setMessages(p => [...p, {
        role: 'assistant',
        content: `**Connection error:** ${e.message}`,
        timestamp: new Date(), citations: [],
      }]);
    } finally { setLoading(false); }
  }, [messages, loading]);

  // -- Mention Logic --
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    
    // Check if user is typing a mention
    const match = val.match(/@([a-zA-Z0-9-]*)$/);
    if (match) {
      setMentionQuery({ active: true, text: match[1] });
    } else {
      setMentionQuery({ active: false, text: '' });
    }
  };

  const insertMention = (tag: string) => {
    const replaceVal = input.replace(/@([a-zA-Z0-9-]*)$/, `@${tag} `);
    setInput(replaceVal);
    setMentionQuery({ active: false, text: '' });
    textareaRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery.active) {
      if (e.key === 'Enter') {
        const filtered = ASSET_TAGS.filter(a => a.tag.toLowerCase().includes(mentionQuery.text.toLowerCase()));
        if (filtered.length > 0) {
          e.preventDefault();
          insertMention(filtered[0].tag);
        }
      } else if (e.key === 'Escape') {
        setMentionQuery({ active: false, text: '' });
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    }
  };

  const filteredAssets = ASSET_TAGS.filter(a => a.tag.toLowerCase().includes(mentionQuery.text.toLowerCase()));

  return (
    <div className="panel" style={fullPage ? { flex: 1 } : {}}>
      <div className="panel-header">
        <div>
          <h1 style={{ fontSize: '0.9rem' }}>AI Operations Agent</h1>
          <div style={{ fontSize: '0.6rem', color: 'var(--t3)', marginTop: 2 }}>
            Groq · llama-3.3-70b-versatile · Stateful memory
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Track 2 Agent Test Hook */}
          <button 
            onClick={triggerFieldManagerCall}
            style={{ fontSize: '0.6rem', background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Inform Field Manager
          </button>
          
          {proactiveAlerts.length > 0 && (
            <span style={{ fontSize: '0.58rem', background: 'var(--alarm-dim)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 20, padding: '2px 8px', color: 'var(--alarm)', fontWeight: 600 }}>
              {proactiveAlerts.length} alert{proactiveAlerts.length > 1 ? 's' : ''}
            </span>
          )}
          <button 
             onClick={loadMemoryHistory}
             title="Load Chat History from Supermemory"
             style={{ fontSize: '0.6rem', color: 'var(--blue)', background: 'rgba(120,180,255,0.1)', border: '1px solid var(--border-blue)', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            Memory History
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ position: 'relative' }}>
        {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--t3)', marginBottom: 4 }}>Collaborative Brain · analyzing logs…</div>
            <div className="chat-bubble assistant">
              <div className="typing-indicator">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick actions (No emojis) */}
      <div className="chat-quick-actions">
        {QUICK_ACTIONS.map(qa => (
          <button key={qa.label} className="quick-btn" onClick={() => send(qa.prompt)} disabled={loading}>
            {qa.label}
          </button>
        ))}
      </div>

      {/* Glass input */}
      <div className="chat-input-container" style={{ position: 'relative' }}>
        
        {/* Mention Dropdown */}
        {mentionQuery.active && filteredAssets.length > 0 && (
          <div style={{ position: 'absolute', bottom: '100%', left: 24, marginBottom: 12, background: 'rgba(20,20,30,0.95)', border: '1px solid var(--border-blue)', borderRadius: 10, padding: 6, width: 220, zIndex: 50, backdropFilter: 'blur(20px)', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase', padding: '6px 10px 4px', letterSpacing: '0.1em' }}>Tag Equipment</div>
            {filteredAssets.map((a, i) => (
              <button 
                key={a.tag} 
                onClick={() => insertMention(a.tag)}
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: i === 0 ? 'rgba(120,180,255,0.1)' : 'transparent', border: 'none', borderRadius: 6, textAlign: 'left', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(120,180,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'rgba(120,180,255,0.1)' : 'transparent'}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--t1)', fontFamily: 'JetBrains Mono, monospace' }}>{a.tag}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--t3)' }}>{a.desc}</span>
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-glass">
          <div className="chat-input-inner">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={handleInput}
              onKeyDown={onKey}
              placeholder="Tag @asset, troubleshoot history, or draft paperwork…"
              disabled={loading}
              rows={2}
            />
            <div className="chat-input-toolbar">
              <div className="chat-tool-btns">
                <button className="chat-tool-btn" title="View P&ID" onClick={() => send('Trace process flow upstream from V-101')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </button>
                <button className="chat-tool-btn" title="Anomaly scan" onClick={() => send('Can you plot the V-101 pressure trend showing the anomaly?')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                </button>
                <button className="chat-tool-btn" title="Draft work order" onClick={() => send('Draft a work order for the most critical maintenance action needed.')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <button className="chat-send-btn" onClick={() => send(input)} disabled={loading || !input.trim()}>
                <i>
                  <svg viewBox="0 0 512 512" width="14" height="14">
                    <path fill="currentColor" d="M473 39.05a24 24 0 0 0-25.5-5.46L47.47 185h-.08a24 24 0 0 0 1 45.16l.41.13l137.3 58.63a16 16 0 0 0 15.54-3.59L422 80a7.07 7.07 0 0 1 10 10L226.66 310.26a16 16 0 0 0-3.59 15.54l58.65 137.38c.06.2.12.38.19.57c3.2 9.27 11.3 15.81 21.09 16.25h1a24.63 24.63 0 0 0 23-15.46L478.39 64.62A24 24 0 0 0 473 39.05"/>
                  </svg>
                </i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety guardrail footer */}
      <div style={{ padding: '5px 20px 8px', fontSize: '0.56rem', color: 'var(--t3)', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid var(--border)' }}>
        🛡 Safety guardrail active · V-101 MAWP 75 barg enforced · Citations open source PDFs with direct highlights
      </div>
    </div>
  );
}
