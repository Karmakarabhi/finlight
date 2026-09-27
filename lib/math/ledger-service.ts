import { eq, asc } from 'drizzle-orm';
import { db } from '@/db/index';
import { lockHoldingForUpdate } from '@/db/helpers';
import { holdings, investmentTransactions } from '@/db/schema';

export async function recalcHolding(holdingId: string, txClient?: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const executeRecalc = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    // Lock the holding
    const holding = await lockHoldingForUpdate(tx, holdingId);
    
    // Fetch all transactions for this holding
    const transactions = investmentTransactions ? await tx.select()
      .from(investmentTransactions)
      .where(eq(investmentTransactions.holdingId, holdingId))
      .orderBy(asc(investmentTransactions.date), asc(investmentTransactions.createdAt)) : [];
      
    let totalUnits = 0;
    let totalCost = 0;
    
    for (const txn of transactions) {
      const units = Number(txn.units);
      const amount = Number(txn.amount);
      const type = txn.type as string;
      
      if (['BUY', 'SIP', 'SWITCH_IN'].includes(type)) {
        totalUnits += units;
        totalCost += amount;
      } else if (['SELL', 'SWITCH_OUT'].includes(type)) {
        if (totalUnits > 0) {
          const avgPrice = totalCost / totalUnits;
          totalCost -= avgPrice * units;
        }
        totalUnits -= units;
      } else if (type === 'DIVIDEND') {
        if (units > 0) {
          totalUnits += units;
          totalCost += amount;
        }
      }
    }
    
    // Handle precision and avoid negative rounding issues close to 0
    if (totalUnits < 1e-6) {
      totalUnits = 0;
      totalCost = 0;
    }
    
    const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;
    
    await tx.update(holdings)
      .set({
        totalUnits: totalUnits.toString(),
        updatedAt: new Date(),
      })
      .where(eq(holdings.id, holdingId));
      
    return {
      units: totalUnits,
      avgCost,
    };
  };

  if (txClient) {
    return executeRecalc(txClient);
  } else {
    return db.transaction(executeRecalc);
  }
}
