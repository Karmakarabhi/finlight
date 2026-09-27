'use server';

import { db } from '@/db/index';
import { investmentTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { recalcHolding } from '@/lib/math/ledger-service';
import { revalidatePath } from 'next/cache';

export async function listTransactions(portfolioId: string) {
  try {
    if (!investmentTransactions) return [];
    return await db.select()
      .from(investmentTransactions)
      .where(eq(investmentTransactions.portfolioId, portfolioId))
      .orderBy(desc(investmentTransactions.date), desc(investmentTransactions.createdAt));
  } catch (error: any) {
    console.error('Error listing transactions:', error);
    return [];
  }
}

export async function recordTransaction(data: {
  holdingId: string;
  portfolioId: string;
  type: string;
  units: string;
  nav: string;
  amount: string;
  date?: Date;
  notes?: string;
}) {
  try {
    if (!investmentTransactions) return { success: true, data: { id: 'txn-demo', ...data } };
    const txnDate = data.date ? new Date(data.date) : new Date();

    const [newTxn] = await db.insert(investmentTransactions).values({
      holdingId: data.holdingId,
      portfolioId: data.portfolioId,
      type: data.type,
      units: data.units,
      nav: data.nav,
      amount: data.amount,
      date: txnDate,
      notes: data.notes || '',
    }).returning();

    // Recalculate holding's weighted avgCost and total units
    await recalcHolding(data.holdingId);

    revalidatePath('/transactions');
    revalidatePath('/holdings');
    revalidatePath('/');
    return { success: true, data: newTxn };
  } catch (error: any) {
    console.error('Error recording transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteTransaction(id: string) {
  try {
    if (!investmentTransactions) return { success: true };
    const txns = await db.select().from(investmentTransactions).where(eq(investmentTransactions.id, id)).limit(1);
    if (!txns.length) {
      return { success: false, error: 'Transaction not found' };
    }

    const holdingId = txns[0].holdingId;
    await db.delete(investmentTransactions).where(eq(investmentTransactions.id, id));

    // Recalculate holding after transaction removal
    await recalcHolding(holdingId);

    revalidatePath('/transactions');
    revalidatePath('/holdings');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: error.message };
  }
}
