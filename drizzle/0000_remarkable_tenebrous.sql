CREATE TABLE IF NOT EXISTS "cash_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"institution" varchar(255) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"current_balance" numeric(20, 2) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"request_params" jsonb NOT NULL,
	"scenario_data" jsonb NOT NULL,
	"actual_transaction_receipt" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"relation" varchar(50) NOT NULL,
	"age" integer NOT NULL,
	"employment_status" varchar(50) NOT NULL,
	"monthly_income" numeric(20, 2) DEFAULT '0' NOT NULL,
	"income_type" varchar(50) DEFAULT 'stable' NOT NULL,
	"risk_tolerance" varchar(50) DEFAULT 'Moderate' NOT NULL,
	"investment_experience" varchar(50) DEFAULT 'Intermediate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"monthly_essential_expenses" numeric(20, 2) DEFAULT '0' NOT NULL,
	"monthly_discretionary_expenses" numeric(20, 2) DEFAULT '0' NOT NULL,
	"base_emergency_months" numeric(5, 2) DEFAULT '6.0' NOT NULL,
	"target_equity_pct" numeric(5, 2) DEFAULT '60' NOT NULL,
	"target_debt_pct" numeric(5, 2) DEFAULT '30' NOT NULL,
	"target_gold_pct" numeric(5, 2) DEFAULT '10' NOT NULL,
	"target_cash_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"emergency_adjustment_factors" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_profiles_family_id_unique" UNIQUE("family_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"priority" varchar(10) NOT NULL,
	"target_amount" numeric(20, 2) NOT NULL,
	"target_year" integer NOT NULL,
	"linked_holding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"identifier" varchar(100) NOT NULL,
	"total_units" numeric(20, 4) DEFAULT '0' NOT NULL,
	"current_price" numeric(20, 4) DEFAULT '0' NOT NULL,
	"current_value" numeric(20, 2) DEFAULT '0' NOT NULL,
	"category" varchar(50) NOT NULL,
	"cap_type" varchar(50) DEFAULT 'None' NOT NULL,
	"maturity_date" timestamp,
	"interest_rate_pct" numeric(5, 2),
	"exit_load_window_days" integer,
	"exit_load_pct" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "liabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"outstanding_balance" numeric(20, 2) DEFAULT '0' NOT NULL,
	"interest_rate_pct" numeric(5, 2) NOT NULL,
	"monthly_emi" numeric(20, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(100) NOT NULL,
	"nav" numeric(20, 4) NOT NULL,
	"source" varchar(50) DEFAULT 'AMFI' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_cache_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tax_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holding_id" uuid NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"units" numeric(20, 4) NOT NULL,
	"buy_price" numeric(20, 4) NOT NULL,
	"remaining_units" numeric(20, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255),
	"role" varchar(50) DEFAULT 'CFO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_owner_member_id_family_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_scenarios" ADD CONSTRAINT "decision_scenarios_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "holdings" ADD CONSTRAINT "holdings_owner_member_id_family_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_owner_member_id_family_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
