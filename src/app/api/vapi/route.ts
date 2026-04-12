import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asset_id, value, limit } = body;

    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'VAPI_API_KEY not configured' }, { status: 500 });
    }

    const payload: any = {
      customer: {
        number: '+14806900972',
      },
      assistant: {
        firstMessage: `Alert: Critical Pressure on ${asset_id}. Current value is ${value} barg. This exceeds the ${limit} barg trip limit defined in NPA-PID-001. The last service for this unit was October 2025. Are you available to acknowledge?`,
        model: {
          provider: 'groq',
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: `You are the NPA Proactive Background Agent (Track 2: Collaborative AI). 
Your job is to alert the human Field Manager about a critical pressure spike.
Context:
- Asset: ${asset_id}
- Issue: Pressure reached ${value} barg, which exceeds the trip limit of ${limit} barg according to NPA-PID-001 (Source citation matching Track 1 Transparency).
- Statefulness (Track 3): You MUST remember and state that 'the last service for this unit was October 2025'.
Be concise, urgent, and professional. Once the manager acknowledges, say you will log the call in the system and generate an artifact work order.`,
            },
          ],
        },
        voice: {
          provider: '11labs',
          voiceId: 'bIHbv24MWmeRgasZH58o', // default ElevenLabs voice
        },
      },
    };

    const phoneId = process.env.VAPI_PHONE_NUMBER_ID;
    if (phoneId) {
      payload.phoneNumberId = phoneId;
    }

    console.log('Initiating Vapi Outbound Call:', payload);

    const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const vapiData = await vapiRes.json();

    if (!vapiRes.ok) {
      console.error('Vapi Call Failed:', vapiData);
      return NextResponse.json({ error: 'Vapi Call Error', details: vapiData }, { status: vapiRes.status });
    }

    return NextResponse.json({ success: true, call: vapiData });
  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
