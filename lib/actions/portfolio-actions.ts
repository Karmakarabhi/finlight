'use server';

import { db } from '@/db/index';
import { users, portfolios, holdings, investmentGoals, investmentTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function listPortfolios(userId?: string) {
  try {
    if (!portfolios) return [];
    if (userId) {
      return await db.select().from(portfolios).where(eq(portfolios.userId, userId)).orderBy(desc(portfolios.isDefault), desc(portfolios.createdAt));
    }
    return await db.select().from(portfolios).orderBy(desc(portfolios.isDefault), desc(portfolios.createdAt));
  } catch (error: any) {
    console.error('Error listing portfolios:', error);
    return [];
  }
}

export async function getPortfolioDetails(portfolioId: string) {
  try {
    if (!portfolios) return null;
    const portfolioList = await db.select().from(portfolios).where(eq(portfolios.id, portfolioId)).limit(1);
    if (!portfolioList.length) return null;
    const portfolio = portfolioList[0];

    const portfolioHoldings = await db.select().from(holdings);
    const portfolioGoals = investmentGoals ? await db.select().from(investmentGoals).where(eq(investmentGoals.portfolioId, portfolioId)) : [];

    return {
      portfolio,
      holdings: portfolioHoldings,
      goals: portfolioGoals,
    };
  } catch (error: any) {
    console.error('Error fetching portfolio details:', error);
    return null;
  }
}

export async function createPortfolio(data: {
  userId?: string;
  name: string;
  memberName: string;
  relation?: string;
  currency?: string;
  color?: string;
  isDefault?: boolean;
  riskProfile?: string;
  targetEquityPct?: string;
  targetDebtPct?: string;
  targetGoldPct?: string;
}) {
  try {
    if (!portfolios) {
      return {
        success: true,
        data: {
          id: 'default-portfolio',
          ...data,
          relation: data.relation || 'Self',
          currency: data.currency || 'INR',
          color: data.color || '#6366f1',
          isDefault: data.isDefault || false,
          riskProfile: data.riskProfile || 'Moderate',
          targetEquityPct: data.targetEquityPct || '60',
          targetDebtPct: data.targetDebtPct || '30',
          targetGoldPct: data.targetGoldPct || '10',
        },
      };
    }

    let uid = data.userId;
    if (!uid) {
      const existingUser = await db.select().from(users).limit(1);
      if (existingUser.length > 0) {
        uid = existingUser[0].id;
      }
    }

    const [newPortfolio] = await db.insert(portfolios).values({
      userId: uid,
      name: data.name,
      memberName: data.memberName,
      relation: data.relation || 'Self',
      currency: data.currency || 'INR',
      color: data.color || '#6366f1',
      isDefault: data.isDefault || false,
      riskProfile: data.riskProfile || 'Moderate',
      targetEquityPct: data.targetEquityPct || '60',
      targetDebtPct: data.targetDebtPct || '30',
      targetGoldPct: data.targetGoldPct || '10',
    }).returning();

    revalidatePath('/');
    return { success: true, data: newPortfolio };
  } catch (error: any) {
    console.error('Error creating portfolio:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePortfolio(id: string, data: Partial<{
  name: string;
  memberName: string;
  relation: string;
  riskProfile: string;
  targetEquityPct: string;
  targetDebtPct: string;
  targetGoldPct: string;
  color: string;
}>) {
  try {
    if (!portfolios) return { success: true, data: { id, ...data } };
    const [updated] = await db.update(portfolios)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(portfolios.id, id))
      .returning();

    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating portfolio:', error);
    return { success: false, error: error.message };
  }
}

export async function deletePortfolio(id: string) {
  try {
    if (!portfolios) return { success: true };
    await db.delete(portfolios).where(eq(portfolios.id, id));
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting portfolio:', error);
    return { success: false, error: error.message };
  }
}
