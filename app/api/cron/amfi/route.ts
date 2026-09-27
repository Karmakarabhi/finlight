import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { holdings, priceCache } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { fetchNav } from '@/lib/amfi/mf-api-fetcher';

async function refreshCache() {
  const allHoldings = await db.select({ identifier: holdings.identifier }).from(holdings).where(isNotNull(holdings.identifier));
  
  const uniqueIdentifiers = [...new Set(allHoldings.map(h => h.identifier).filter(Boolean))] as string[];
  
  console.log(`Refreshing cache for ${uniqueIdentifiers.length} identifiers...`);
  
  for (const code of uniqueIdentifiers) {
    const nav = await fetchNav(code);
    if (nav !== null) {
      const now = new Date();
      
      // Update or insert price cache
      await db.insert(priceCache)
        .values({
          identifier: code,
          nav: nav.toString(),
          source: 'AMFI',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: priceCache.identifier,
          set: {
            nav: nav.toString(),
            source: 'AMFI',
            updatedAt: now,
          }
        });
      
      // Update all holdings globally that match this identifier
      await db.update(holdings)
        .set({
          currentPrice: nav.toString(),
          updatedAt: now,
        })
        .where(eq(holdings.identifier, code));
    }
  }
  
  console.log('Price refresh completed.');
}

export async function GET(req: Request) {
  try {
    // Basic cron secret validation can be added here
    await refreshCache();
    return NextResponse.json({ success: true, message: 'Price refresh completed' }, { status: 200 });
  } catch (error: any) {
    console.error('AMFI Cron Error:', error.message);
    return NextResponse.json({ success: false, error: 'Price refresh failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await refreshCache();
    return NextResponse.json({ success: true, message: 'Price refresh completed' }, { status: 200 });
  } catch (error: any) {
    console.error('AMFI Cron Error:', error.message);
    return NextResponse.json({ success: false, error: 'Price refresh failed' }, { status: 500 });
  }
}
