import { NextResponse } from 'next/server';
import Supermemory from 'supermemory';

const memoryClient = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

export async function GET() {
  try {
    // Attempting to pull some recent conversational history from supermemory
    // Supermemory SDK has limited distinct listing endpoints without a query, 
    // but searching for 'NPA' or 'User' or getting all usually relies on search.
    // Querying an empty string or '*' is a solid hack to get recent documents.
    const rawResults: any = await memoryClient.search.documents({ q: "", limit: 15 });
    const results = Array.isArray(rawResults) ? rawResults : (rawResults.results || rawResults.data || rawResults.documents || []);

    return NextResponse.json({ history: results });
  } catch (error: any) {
    console.error('Supermemory memory fetch err:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
