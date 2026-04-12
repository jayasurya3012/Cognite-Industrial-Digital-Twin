import { NextResponse } from 'next/server';
import Supermemory from 'supermemory';

const memoryClient = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

export async function GET() {
  try {
    // Attempting to pull some recent conversational history from supermemory
    // Supermemory SDK has limited distinct listing endpoints without a query, 
    const rawResults: any = await memoryClient.search.documents({ q: "NPA Operations", limit: 10 });
    const results = Array.isArray(rawResults) ? rawResults : (rawResults.results || rawResults.data || rawResults.documents || []);

    return NextResponse.json({ history: results });
  } catch (error: any) {
    console.error('Supermemory memory fetch err:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
