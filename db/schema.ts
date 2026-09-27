import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * 1. families
 * Primary tenant boundary representing a multi-member household.
 */
export const families = pgTable('families', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('INR').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 2. users
 * Authentication identity and CFO/Member role mapping within a family.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 50 }).default('CFO').notNull(), // 'CFO' | 'MEMBER'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 3. family_members
 * Individual household members whose finances and legal assets are managed by the Family CFO.
 */
export const familyMembers = pgTable('family_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  relation: varchar('relation', { length: 50 }).notNull(), // 'Self'|'Spouse'|'Father'|'Mother'|'Child'|'Other'
  age: integer('age').notNull(),
  employmentStatus: varchar('employment_status', { length: 50 }).notNull(),
  monthlyIncome: numeric('monthly_income', { precision: 20, scale: 2 }).default('0').notNull(),
  incomeType: varchar('income_type', { length: 50 }).default('stable').notNull(), // 'stable'|'variable'
  riskTolerance: varchar('risk_tolerance', { length: 50 }).default('Moderate').notNull(), // 'Conservative'|'Moderate'|'Aggressive'
  investmentExperience: varchar('investment_experience', { length: 50 }).default('Intermediate').notNull(), // 'Beginner'|'Intermediate'|'Advanced'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 4. financial_profiles
 * Household-level operational configuration, expense thresholds, and target asset mix.
 * STRICT CONSTRAINT: ZERO derived metrics stored in tables (no gross_wealth, net_worth, runway, etc.).
 */
export const financialProfiles = pgTable('financial_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().unique().references(() => families.id, { onDelete: 'cascade' }),
  monthlyEssentialExpenses: numeric('monthly_essential_expenses', { precision: 20, scale: 2 }).default('0').notNull(),
  monthlyDiscretionaryExpenses: numeric('monthly_discretionary_expenses', { precision: 20, scale: 2 }).default('0').notNull(),
  baseEmergencyMonths: numeric('base_emergency_months', { precision: 5, scale: 2 }).default('6.0').notNull(),
  targetEquityPct: numeric('target_equity_pct', { precision: 5, scale: 2 }).default('60').notNull(),
  targetDebtPct: numeric('target_debt_pct', { precision: 5, scale: 2 }).default('30').notNull(),
  targetGoldPct: numeric('target_gold_pct', { precision: 5, scale: 2 }).default('10').notNull(),
  targetCashPct: numeric('target_cash_pct', { precision: 5, scale: 2 }).default('0').notNull(),
  emergencyAdjustmentFactors: jsonb('emergency_adjustment_factors'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 5. cash_accounts
 * First-class liquid cash instruments (T+0 / T+1 settlement, 0% exit friction).
 */
export const cashAccounts = pgTable('cash_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerMemberId: uuid('owner_member_id').notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  institution: varchar('institution', { length: 255 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // 'savings'|'auto_sweep'|'liquid_fund'
  currentBalance: numeric('current_balance', { precision: 20, scale: 2 }).default('0').notNull(),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
});

/**
 * 6. liabilities
 * Household debts and loans requiring recurring servicing (EMIs).
 */
export const liabilities = pgTable('liabilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerMemberId: uuid('owner_member_id').notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'home'|'auto'|'personal'|'credit'
  outstandingBalance: numeric('outstanding_balance', { precision: 20, scale: 2 }).default('0').notNull(),
  interestRatePct: numeric('interest_rate_pct', { precision: 5, scale: 2 }).notNull(),
  monthlyEmi: numeric('monthly_emi', { precision: 20, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 7. holdings
 * Market-linked investments and contractual fixed deposits.
 * STRICT CONSTRAINT: ZERO derived metrics stored (gain, return, etc. calculated on the fly).
 */
export const holdings = pgTable('holdings', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerMemberId: uuid('owner_member_id').notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  assetType: varchar('asset_type', { length: 50 }).notNull(), // 'MF'|'Stock'|'ETF'|'FD'|'Gold'
  name: varchar('name', { length: 255 }).notNull(),
  identifier: varchar('identifier', { length: 100 }).notNull(),
  totalUnits: numeric('total_units', { precision: 20, scale: 4 }).default('0').notNull(),
  currentPrice: numeric('current_price', { precision: 20, scale: 4 }).default('0').notNull(),
  currentValue: numeric('current_value', { precision: 20, scale: 2 }).default('0').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'equity'|'debt'|'gold'|'cash'|'hybrid'
  capType: varchar('cap_type', { length: 50 }).default('None').notNull(), // 'Large'|'Mid'|'Small'|'Multi'|'None'
  maturityDate: timestamp('maturity_date'),
  interestRatePct: numeric('interest_rate_pct', { precision: 5, scale: 2 }),
  exitLoadWindowDays: integer('exit_load_window_days'),
  exitLoadPct: numeric('exit_load_pct', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 8. tax_lots
 * Individual purchase tranches for FIFO redemption, tax matching, and friction calculation.
 */
export const taxLots = pgTable('tax_lots', {
  id: uuid('id').defaultRandom().primaryKey(),
  holdingId: uuid('holding_id').notNull().references(() => holdings.id, { onDelete: 'cascade' }),
  purchaseDate: timestamp('purchase_date').notNull(),
  units: numeric('units', { precision: 20, scale: 4 }).notNull(),
  buyPrice: numeric('buy_price', { precision: 20, scale: 4 }).notNull(),
  remainingUnits: numeric('remaining_units', { precision: 20, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 9. goals
 * Life milestones the family is saving/investing toward.
 */
export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  priority: varchar('priority', { length: 10 }).notNull(), // 'P1'|'P2'|'P3'
  targetAmount: numeric('target_amount', { precision: 20, scale: 2 }).notNull(),
  targetYear: integer('target_year').notNull(),
  linkedHoldingIds: jsonb('linked_holding_ids').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 10. decision_scenarios
 * Audited simulation records for Withdraw Money & Invest Money workflows.
 */
export const decisionScenarios = pgTable('decision_scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'WITHDRAW'|'INVEST'
  status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // 'DRAFT'|'SELECTED'|'EXECUTED'
  requestParams: jsonb('request_params').notNull(),
  scenarioData: jsonb('scenario_data').notNull(),
  actualTransactionReceipt: jsonb('actual_transaction_receipt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 11. price_cache
 * Cache table for public NAVs and asset pricing.
 */
export const priceCache = pgTable('price_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 100 }).notNull().unique(),
  nav: numeric('nav', { precision: 20, scale: 4 }).notNull(),
  source: varchar('source', { length: 50 }).default('AMFI').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Snake_case aliases for compatibility
export const family_members = familyMembers;
export const financial_profiles = financialProfiles;
export const cash_accounts = cashAccounts;
export const tax_lots = taxLots;
export const decision_scenarios = decisionScenarios;
export const price_cache = priceCache;

// ============================================================================
// RELATIONS
// ============================================================================

export const familiesRelations = relations(families, ({ one, many }) => ({
  users: many(users),
  members: many(familyMembers),
  profile: one(financialProfiles, {
    fields: [families.id],
    references: [financialProfiles.familyId],
  }),
  goals: many(goals),
  decisionScenarios: many(decisionScenarios),
}));

export const usersRelations = relations(users, ({ one }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
}));

export const familyMembersRelations = relations(familyMembers, ({ one, many }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  cashAccounts: many(cashAccounts),
  liabilities: many(liabilities),
  holdings: many(holdings),
}));

export const financialProfilesRelations = relations(financialProfiles, ({ one }) => ({
  family: one(families, {
    fields: [financialProfiles.familyId],
    references: [families.id],
  }),
}));

export const cashAccountsRelations = relations(cashAccounts, ({ one }) => ({
  ownerMember: one(familyMembers, {
    fields: [cashAccounts.ownerMemberId],
    references: [familyMembers.id],
  }),
}));

export const liabilitiesRelations = relations(liabilities, ({ one }) => ({
  ownerMember: one(familyMembers, {
    fields: [liabilities.ownerMemberId],
    references: [familyMembers.id],
  }),
}));

export const holdingsRelations = relations(holdings, ({ one, many }) => ({
  ownerMember: one(familyMembers, {
    fields: [holdings.ownerMemberId],
    references: [familyMembers.id],
  }),
  taxLots: many(taxLots),
}));

export const taxLotsRelations = relations(taxLots, ({ one }) => ({
  holding: one(holdings, {
    fields: [taxLots.holdingId],
    references: [holdings.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  family: one(families, {
    fields: [goals.familyId],
    references: [families.id],
  }),
}));

export const decisionScenariosRelations = relations(decisionScenarios, ({ one }) => ({
  family: one(families, {
    fields: [decisionScenarios.familyId],
    references: [families.id],
  }),
}));

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type FamilyMemberRow = typeof familyMembers.$inferSelect;
export type NewFamilyMemberRow = typeof familyMembers.$inferInsert;

export type FinancialProfileRow = typeof financialProfiles.$inferSelect;
export type NewFinancialProfileRow = typeof financialProfiles.$inferInsert;

export type CashAccountRow = typeof cashAccounts.$inferSelect;
export type NewCashAccountRow = typeof cashAccounts.$inferInsert;

export type LiabilityRow = typeof liabilities.$inferSelect;
export type NewLiabilityRow = typeof liabilities.$inferInsert;

export type HoldingRow = typeof holdings.$inferSelect;
export type NewHoldingRow = typeof holdings.$inferInsert;

export type TaxLotRow = typeof taxLots.$inferSelect;
export type NewTaxLotRow = typeof taxLots.$inferInsert;

export type GoalRow = typeof goals.$inferSelect;
export type NewGoalRow = typeof goals.$inferInsert;

export type DecisionScenarioRow = typeof decisionScenarios.$inferSelect;
export type NewDecisionScenarioRow = typeof decisionScenarios.$inferInsert;

export type PriceCacheRow = typeof priceCache.$inferSelect;
export type NewPriceCacheRow = typeof priceCache.$inferInsert;

// ============================================================================
// BACKWARD-COMPATIBILITY TYPES FOR PROTOTYPE SERVICES
// ============================================================================
export type Holding = HoldingRow;
export type PriceCache = PriceCacheRow;
export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  memberName: string;
  relation: string;
  currency: string;
  color: string;
  isDefault: boolean;
  riskProfile: string;
  targetEquityPct: string;
  targetDebtPct: string;
  targetGoldPct: string;
  cachedXirr?: string | null;
  xirrUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface InvestmentTransaction {
  id: string;
  holdingId: string;
  portfolioId: string;
  type: string;
  units: string;
  nav: string;
  amount: string;
  date: Date;
  notes?: string | null;
  createdAt: Date;
}
export interface InvestmentGoal {
  id: string;
  portfolioId: string;
  name: string;
  targetAmount: string;
  targetDate: Date;
  createdAt: Date;
}

// Runtime stubs for legacy prototype routes (non-table instances ignored by Drizzle Kit)
export const portfolios: any = null;
export const investmentTransactions: any = null;
export const investmentGoals: any = null;

