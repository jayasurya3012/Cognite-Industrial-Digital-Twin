import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asset_id, value, limit, message, planOfAction } = body;

    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'VAPI_API_KEY not configured' }, { status: 500 });
    }

    const defaultFirstMsg = `Alert: Critical Pressure on ${asset_id}. Current value is ${value} barg. This exceeds the ${limit} barg trip limit. Are you available to acknowledge?`;
    const defaultPlan = `1. Verify SDV-101 closure.\n2. Monitor PSV-101 discharge flow.\n3. Manual switch to P-101B.`;

    const payload: any = {
      customer: {
        number: body.phoneNumber || process.env.MANAGER_PHONE_NUMBER || '+14806900972',
      },
      assistant: {
        name: 'NPA Proactive Agent',
        firstMessage: message || defaultFirstMsg,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the NPA Proactive Background Agent. Stay extremely concise. 
Emergency Alert: V-101 Pressure Breach.
Details: ${asset_id} at ${value} barg.
Plan: ${planOfAction || defaultPlan}.`,
            },
          ],
        },
        voice: {
          provider: 'openai',
          voiceId: 'alloy',
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
      },
    };

    const phoneId = process.env.VAPI_PHONE_NUMBER_ID;
    if (phoneId) {
      payload.phoneNumberId = phoneId;
    }

    console.log('Initiating Vapi Outbound Call:', payload);

    const vapiRes = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const vapiData = await vapiRes.json();
    console.log('Vapi Response Data:', JSON.stringify(vapiData, null, 2));

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
