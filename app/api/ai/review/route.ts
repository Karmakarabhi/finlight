import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { portfolios, holdings, investmentTransactions, investmentGoals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildPortfolioMetrics } from '@/lib/math/portfolio-metrics';
import { runRules } from '@/lib/ai/rules-engine';
import { generateFindingExplanations } from '@/lib/ai/ai-service';

function buildPortfolioContext(portfolio: any, metrics: any) {
  return {
    portfolio: {
      name: portfolio.name,
      memberName: portfolio.memberName,
      riskProfile: portfolio.riskProfile ?? 'Moderate',
      currency: portfolio.currency ?? 'INR',
      targetAllocation: {
        equityPct: portfolio.targetEquityPct ?? 60,
        debtPct: portfolio.targetDebtPct ?? 30,
        goldPct: portfolio.targetGoldPct ?? 10,
      },
    },
    performance: {
      invested: metrics.summary.totalInvested,
      currentValue: metrics.summary.currentValue,
      absoluteGainRs: metrics.summary.absoluteGain,
      absoluteReturnPct: metrics.summary.gainPercent,
    },
    allocation: metrics.assetAllocation,
    rebalancing: metrics.rebalancing,
    concentration: metrics.holdingWeights.slice(0, 5).map((h: any) => ({
      name: h.name,
      weightPct: h.weight,
      category: h.category,
    })),
    goalProgress: metrics.goalProgress,
    upcomingMaturities: metrics.upcomingMaturities,
  };
}

export async function POST(req: Request) {
  try {
    const { portfolioId, userId } = await req.json(); // Simulating auth/request parsing

    if (!portfolioId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing portfolioId or userId' }, { status: 400 });
    }

    const portfolioData: any[] = portfolios ? await db.select().from(portfolios).where(eq(portfolios.id, portfolioId)) : [{ name: 'Family Portfolio', memberName: 'Family', riskProfile: 'Moderate', currency: 'INR', targetEquityPct: '60', targetDebtPct: '30', targetGoldPct: '10' }];
    const portfolio = portfolioData[0] || { name: 'Family Portfolio', memberName: 'Family', riskProfile: 'Moderate', currency: 'INR', targetEquityPct: '60', targetDebtPct: '30', targetGoldPct: '10' };

    const portfolioHoldings = await db.select().from(holdings);
    const portfolioTransactions: any[] = investmentTransactions ? await db.select().from(investmentTransactions).where(eq(investmentTransactions.portfolioId, portfolioId)) : [];
    const portfolioGoals: any[] = investmentGoals ? await db.select().from(investmentGoals).where(eq(investmentGoals.portfolioId, portfolioId)) : [];

    if (portfolioHoldings.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No holdings found. Add some investments before requesting a portfolio review.',
      }, { status: 400 });
    }

    const metrics = buildPortfolioMetrics(portfolio, portfolioHoldings, portfolioTransactions, portfolioGoals);
    const { findings, healthMatrix } = runRules(metrics);
    const portfolioContext = buildPortfolioContext(portfolio, metrics);
    const aiOutput = await generateFindingExplanations(findings, portfolioContext);

    const enrichedFindings = findings.map(f => ({
      ...f,
      explanation: aiOutput.explanations[f.type] ?? '',
    }));

    return NextResponse.json({
      success: true,
      data: {
        portfolioSummary: aiOutput.portfolioSummary,
        healthMatrix,
        findings: enrichedFindings,
        metrics: {
          summary: metrics.summary,
          rebalancing: metrics.rebalancing,
          assetAllocation: metrics.assetAllocation,
          capAllocation: metrics.capAllocation,
        },
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Portfolio Review Error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Portfolio review failed. Please try again.',
    }, { status: 500 });
  }
}
