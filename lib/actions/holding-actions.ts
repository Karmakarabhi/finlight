'use server';

import { db } from '@/db/index';
import { holdings, investmentTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function listHoldings(portfolioId?: string) {
  try {
    return await db.select().from(holdings);
  } catch (error: any) {
    console.error('Error listing holdings:', error);
    return [];
  }
}

export async function addHolding(data: {
  portfolioId: string;
  type: string;
  name: string;
  amfiCode?: string;
  symbol?: string;
  units?: string;
  avgCost?: string;
  currentNav?: string;
  category?: string;
  capType?: string;
  maturityDate?: Date;
  tags?: string[];
}) {
  try {
    const units = data.units || '0';
    const avgCost = data.avgCost || '0';
    const currentNav = data.currentNav || avgCost;

    const [newHolding] = await db.insert(holdings).values({
      ownerMemberId: data.portfolioId,
      assetType: data.type || 'MF',
      name: data.name,
      identifier: data.amfiCode || data.symbol || 'ID',
      totalUnits: units,
      currentPrice: currentNav,
      currentValue: (Number(units) * Number(currentNav)).toFixed(2),
      category: data.category || 'equity',
      capType: data.capType || 'None',
      maturityDate: data.maturityDate,
    }).returning();

    // If initial units were provided, create initial transaction if supported
    if (investmentTransactions && Number(units) > 0) {
      const amount = (Number(units) * Number(avgCost)).toFixed(2);
      await db.insert(investmentTransactions).values({
        holdingId: newHolding.id,
        portfolioId: data.portfolioId,
        type: 'BUY',
        units,
        nav: avgCost,
        amount,
        date: new Date(),
        notes: 'Initial holding purchase',
      });
    }

    revalidatePath('/holdings');
    revalidatePath('/');
    return { success: true, data: newHolding };
  } catch (error: any) {
    console.error('Error adding holding:', error);
    return { success: false, error: error.message };
  }
}

export async function updateHolding(id: string, data: Partial<{
  name: string;
  currentNav: string;
  category: string;
  capType: string;
  maturityDate: Date;
}>) {
  try {
    const [updated] = await db.update(holdings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(holdings.id, id))
      .returning();

    revalidatePath('/holdings');
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating holding:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteHolding(id: string) {
  try {
    await db.delete(holdings).where(eq(holdings.id, id));
    revalidatePath('/holdings');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting holding:', error);
    return { success: false, error: error.message };
  }
}
