import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getServiceClient } from '@/lib/supabase';
import Supermemory from 'supermemory';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const memoryClient = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

const SYSTEM_PROMPT = `You are the "Collaborative Brain" of the North Sea Platform Alpha (NPA) interface. You are an expert consultant with deep platform history, not just a passive text box.

## CORE DIRECTIVES

1. INDUSTRIAL MEMORY (Stateful)
- Treat the provided maintenance history context as your long-term memory.
- Historical Context: If diagnosing an issue (e.g., P-101B vibration), cross-reference it immediately with past failures. (e.g., "This vibration is similar to the DE bearing failure recorded in Jan 2021...").
- Routine Awareness: Remind the user of routine requirements (e.g., 14-day lubrication cycles per MAN-MECH-001) linked to the equipment.

2. PROACTIVE, NOT JUST REACTIVE
- Act autonomously regarding provided metrics. If provided with current anomalies (e.g., V-101 pressure near 72 barg), proactively offer to pull troubleshooting steps from procedures like SOP-MAINT-010 before being asked.

3. TANGIBLE WORK ARTIFACTS
- ONLY draft a Work Order if the user EXPLICITLY asks for a draft or paperwork. Otherwise, keep your responses concise and conversational.
- When explicitly requested, auto-fill the draft using this exact format:
- Format the Draft precisely as:
---
[WORK ORDER DRAFT]
Asset_ID: [e.g., AREA-HP-SEP:P-101A]
Location: Deck A, HP Separation Train
Priority: [CRITICAL/HIGH/MEDIUM/LOW]
Current State: [Insert relevant live sensor value if available]
Description: [Precise task]
Safety / Isolation: [LOTO requirements]
Procedure Ref: [Document Citation]
---

4. STRICT TRANSPARENCY & SAFETY (Guardrails)
- Verification: Always verify logic path (e.g. if SDV-101 is fail-safe closed per pid_hp_separation_train.html).
- Guardrail: YOU MUST NEVER suggest or allow any operation that exceeds the 75 barg MAWP on V-101.
- Mandatory Citations: Every technical claim MUST cite its source.
- Citation Format for Highlighting: If citing a specific line or keyword in a document, append a hash fragment with the text, e.g., \`[MAN-MECH-001#search=14-day lubrication]\`.
- PUMP SPECIFICS: P-101A and P-101B are redundant drain pumps. If one is down or alarming, suggest switching to the other.

## VISUAL ANALYTICS (Charts)
- If the user asks for a chart, graph, or trend analysis, you can generate a Recharts JSON configuration by placing it inside a markdown block with the language \`recharts\`.
- **CRITICAL:** The JSON must be STRICTLY valid. NO trailing commas. All values must be numbers, not strings.
- Format:
\`\`\`recharts
{
  "type": "LineChart",
  "data": [ {"name": "08:00", "value": 55.2}, {"name": "09:00", "value": 61.0} ],
  "xKey": "name",
  "lines": [ { "key": "value", "color": "#78b4ff", "name": "Pressure (barg)" } ]
}
\`\`\`

## KEY DOCUMENTS LIBRARY
- [SOP-MAINT-001]: Standard Maintenance Operating Procedures
- [MAN-MECH-001]: Mechanical manual for P-101 pump (14-day Shell Gadus S2 V220 2 grease requirement)
- [RPT-INSPECT-001]: V-101 inspection report (containment limits, MAWP 75 barg)
- [PID-NPA-001] (or NPA-PID-001 Rev 7): Master P&ID (LCV-101 sizing update in March 2015)
- [SOP-ENV-001]: Environmental limits

Always be concise and direct. Respond like a normal chatbot in plain text by default. Avoid markdown styling, bold text, decorative headings, and overly structured templates unless the user explicitly asks for a formal artifact, report, brief, note, or chart. Match the tone of a seasoned, practical offshore Chief Engineer.

**IMPORTANT:** DO NOT end your responses with a generic question like "How can I assist you?" or "What should I do next?". Only ask a question if you genuinely need missing information to proceed with a specific technical task.

When the user explicitly asks for a SAFETY BRIEF, ANOMALY REPORT, or MAINTENANCE NOTE, use clear headings like:
- **EQUIPMENT:** [Tag]
- **SYSTEM:** [Process Area]
- **FINDINGS:** [Observations]
- **ACTION PLAN:** [Steps]
- **SAFETY NOTES:** [LOTO/PPE]`;

async function getMaintenanceContext(assetId: string): Promise<string> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('maintenance_history')
      .select('work_order_id, asset_id, tag, findings, actions_taken, status, raised_date, priority')
      .eq('asset_id', assetId)
      .order('raised_date', { ascending: false })
      .limit(8);

    if (!data || data.length === 0) return '';
    const context = data.map(wo =>
      `[Past WO ${wo.work_order_id} | ${wo.raised_date?.substring(0, 10)}] Priority: ${wo.priority}, Finding: ${wo.findings?.substring(0, 150)}, Action: ${wo.actions_taken?.substring(0, 150)}`
    ).join('\n');
    return `\n\n[INDUSTRIAL MEMORY: MAINTENANCE HISTORY FOR ${assetId}]\n${context}`;
  } catch {
    return '';
  }
}

async function getAnomalyContext(): Promise<string> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('latest_sensor_readings')
      .select('sensor_id, asset_id, value, unit, status, quality_flag, timestamp')
      .in('status', ['ALARM', 'TRIP'])
      .limit(10);

    if (!data || data.length === 0) return '';
    const context = data.map((r: any) =>
      `- ${r.sensor_id} (${r.asset_id}): ${r.value} ${r.unit} (STATUS: ${r.status})`
    ).join('\n');
    return `\n\n[LIVE PLATFORM STATE: CURRENT ANOMALIES DETECTED]\n${context}`;
  } catch {
    return '';
  }
}

async function getLiveAssetContext(assetId: string): Promise<string> {
  try {
    const supabase = getServiceClient();
    // Some assets are identified differently. Try to match the asset_id or sensor_id.
    const { data } = await supabase
      .from('latest_sensor_readings')
      .select('sensor_id, value, unit, status')
      .or(`asset_id.eq.${assetId},sensor_id.ilike.%${assetId.replace('AREA-HP-SEP:', '')}%`);

    if (!data || data.length === 0) return `\n\n[LIVE DATA FOR ${assetId}]: None found. Model it based on PID-NPA-001.`;
    const context = data.map((r: any) =>
      `- ${r.sensor_id}: ${r.value} ${r.unit} (${r.status})`
    ).join('\n');
    return `\n\n[LIVE DATA FOR ${assetId}]\n${context}`;
  } catch {
    return '';
  }
}

async function getChatMemoryContext(query: string): Promise<string> {
  try {
    const rawResults: any = await memoryClient.search.documents({ q: query, limit: 5 });
    const results = Array.isArray(rawResults) ? rawResults : (rawResults.results || rawResults.data || rawResults.documents || []);

    if (!results || results.length === 0) return '';
    const mems = results.map((r: any) => `- ${r.content || r.text || JSON.stringify(r)}`).join('\n');
    return `\n\n[LONG TERM CONVERSATION MEMORY (Relevant past discussions)]\n${mems}`;
  } catch (err: any) {
    console.error('Supermemory search error:', err.message);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, assetContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || '';

    // Build Industrial Memory / Stateful Context
    let contextAddendum = '';
    
    // Attempt fetching related supermemory text based on latest prompt
    contextAddendum += await getChatMemoryContext(lastUserMsg);

    if (assetContext) {
      contextAddendum += await getMaintenanceContext(assetContext);
      contextAddendum += await getLiveAssetContext(assetContext);
    }
    contextAddendum += await getAnomalyContext();

    const systemContent = SYSTEM_PROMPT + contextAddendum;

    // Hardcoded Guardrail Block
    const safetyKeywords = ['exceed 75', 'above 75', 'over 75', 'bypass mawp', 'higher than 75'];
    const isUnsafe = safetyKeywords.some(kw => lastUserMsg.toLowerCase().includes(kw));

    if (isUnsafe) {
      return NextResponse.json({
        content: '⛔ **GUARDRAIL ENGAGED**\n\nV-101 pressure limits strictly enforced to a maximum of **75 barg MAWP** per [RPT-INSPECT-001]. No operations exceeding this threshold can be authorized. If pressure is creeping, suggest immediate automated relief protocols.',
        citations: ['RPT-INSPECT-001'],
      });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.3,
      max_tokens: 1800,
    });

    const responseContent = completion.choices[0]?.message?.content || 'No response generated.';

    // Extract document citations supporting the highlight feature
    const citationPattern = /\[([A-Z]+-[A-Z]+-\d+[^\]]*)\]/g;
    const citations: string[] = [];
    let match;
    while ((match = citationPattern.exec(responseContent)) !== null) {
      citations.push(match[1].trim());
    }

    // Save strictly the core messages to Supermemory asynchronously for future stateful tracking
    try {
      // Background promise so it doesn't block the HTTP response
      Promise.all([
        memoryClient.add({ content: `User asked: ${lastUserMsg}`, metadata: { role: 'user', timestamp: Date.now() } }),
        memoryClient.add({ content: `NPA AI responded: ${responseContent}`, metadata: { role: 'assistant', timestamp: Date.now() } })
      ]).catch(e => console.error('Supermemory logging error:', e.message));
    } catch {}

    // ALSO Log to Supabase chat_history just in case it exists, silently ignore failures
    try {
      const sb = getServiceClient();
      Promise.all([
        sb.from('chat_history').insert({ role: 'user', content: lastUserMsg }),
        sb.from('chat_history').insert({ role: 'assistant', content: responseContent })
      ]).catch(() => {}); // silent fail if table missing
    } catch {}

    return NextResponse.json({ content: responseContent, citations: [...new Set(citations)] });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
