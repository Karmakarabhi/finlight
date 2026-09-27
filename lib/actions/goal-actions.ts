'use server';

import { db } from '@/db/index';
import { investmentGoals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function listGoals(portfolioId: string) {
  try {
    if (!investmentGoals) return [];
    return await db.select().from(investmentGoals).where(eq(investmentGoals.portfolioId, portfolioId));
  } catch (error: any) {
    console.error('Error listing goals:', error);
    return [];
  }
}

export async function createGoal(data: {
  portfolioId: string;
  name: string;
  targetAmount: string;
  targetDate: Date;
}) {
  try {
    if (!investmentGoals) return { success: true, data: { id: 'goal-demo', ...data } };
    const [newGoal] = await db.insert(investmentGoals).values({
      portfolioId: data.portfolioId,
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: new Date(data.targetDate),
    }).returning();

    revalidatePath('/');
    return { success: true, data: newGoal };
  } catch (error: any) {
    console.error('Error creating goal:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteGoal(id: string) {
  try {
    if (!investmentGoals) return { success: true };
    await db.delete(investmentGoals).where(eq(investmentGoals.id, id));
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    return { success: false, error: error.message };
  }
}
