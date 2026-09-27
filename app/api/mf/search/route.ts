import { NextResponse } from 'next/server';
import { searchMutualFund } from '@/lib/amfi/mf-api-fetcher';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const data = await searchMutualFund(query);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('MF Search Error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Search failed. Please try again.',
    }, { status: 500 });
  }
}
