import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { portfolios, holdings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { explainHolding } from '@/lib/ai/ai-service';

export async function POST(req: Request) {
  try {
    const { holdingId, userId } = await req.json();

    if (!holdingId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing holdingId or userId' }, { status: 400 });
    }

    const holdingData = await db.select().from(holdings).where(eq(holdings.id, holdingId));
    if (holdingData.length === 0) {
      return NextResponse.json({ success: false, error: 'Holding not found' }, { status: 404 });
    }
    const holding = holdingData[0];

    const portfolioData: any[] = portfolios ? await db.select().from(portfolios).where(eq(portfolios.id, (holding as any).portfolioId)) : [{ name: 'Family Portfolio', currency: 'INR', riskProfile: 'Moderate' }];
    const portfolio = portfolioData[0] || { name: 'Family Portfolio', currency: 'INR', riskProfile: 'Moderate' };

    const allHoldings = await db.select().from(holdings);
    
    const totalValue = allHoldings.reduce((sum, h) => sum + Number(h.currentValue), 0);
    const holdingValue = Number(holding.currentValue);
    const weight = totalValue > 0 ? Number(((holdingValue / totalValue) * 100).toFixed(1)) : 0;

    const holdingDataToExplain = {
      name: holding.name,
      type: holding.assetType,
      category: holding.category,
      capType: holding.capType,
      weightPct: weight,
      investedRs: Math.round(Number(holding.currentValue)),
      currentRs: Math.round(holdingValue),
      gainPct: 0,
    };

    const portfolioSummary = {
      name: portfolio.name,
      totalValueRs: Math.round(totalValue),
      riskProfile: portfolio.riskProfile,
      currency: portfolio.currency,
    };

    const explanation = await explainHolding(holdingDataToExplain, portfolioSummary);

    return NextResponse.json({ success: true, data: { holdingData: holdingDataToExplain, explanation } }, { status: 200 });
  } catch (error: any) {
    console.error('Holding Explainer Error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Explanation failed. Please try again.',
    }, { status: 500 });
  }
}
