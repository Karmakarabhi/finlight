import { eq } from 'drizzle-orm';
import { db } from './index';
import { holdings } from './schema';

/**
 * Locks a holding row for update to prevent concurrent modification issues
 * during ledger recalculation. Must be used inside a transaction.
 * 
 * @param tx The transaction object
 * @param holdingId The ID of the holding to lock
 * @returns The locked holding record
 */
export async function lockHoldingForUpdate(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], holdingId: string) {
  const result = await tx.select()
    .from(holdings)
    .where(eq(holdings.id, holdingId))
    .for('update');
  
  if (result.length === 0) {
    throw new Error(`Holding with id ${holdingId} not found`);
  }
  
  return result[0];
}
