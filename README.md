# ⚡ Finlight Wealth — Modern Investment & Portfolio Management

[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js_14%2B-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ORM: Drizzle](https://img.shields.io/badge/ORM-Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![AI: Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_%7C_Radix_UI-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Finlight Wealth** is an enterprise-grade investment and portfolio management platform built with **Next.js App Router, PostgreSQL, and Drizzle ORM**. It enables personal and multi-member family wealth management with live AMFI mutual fund sync, Newton-Raphson XIRR performance metrics, goal tracking, and a **3-tier safeguarded AI portfolio intelligence engine** powered by Google Gemini.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Directory Structure](#-directory-structure)
- [Key Features](#-key-features)
  - [1. Multi-Member Family Portfolios](#1-multi-member-family-portfolios)
  - [2. Multi-Asset Holdings Management](#2-multi-asset-holdings-management)
  - [3. Live AMFI Mutual Fund Sync & Cron](#3-live-amfi-mutual-fund-sync--cron)
  - [4. Transaction Ledger & Weighted Cost Recalculation](#4-transaction-ledger--weighted-cost-recalculation)
  - [5. Performance Analytics & Newton-Raphson XIRR](#5-performance-analytics--newton-raphson-xirr)
  - [6. Safeguarded 3-Tier AI Engine](#6-safeguarded-3-tier-ai-engine)
- [Database Schema (Drizzle ORM)](#-database-schema-drizzle-orm)
- [API Route Matrix](#-api-route-matrix)
- [Getting Started & Local Development](#-getting-started--local-development)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)

---

## 🏛 Architectural Overview

```mermaid
graph TD
    subgraph Client ["Next.js App Router (React)"]
        DASH["app/page.tsx<br/>Portfolio Dashboard & KPIs"]
        HOLD["app/holdings/page.tsx<br/>FundWiseTable & Modals"]
        TXN["app/transactions/page.tsx<br/>Ledger & Transactions"]
        ANL["app/analytics/page.tsx<br/>Rebalancing & Allocations"]
        AI_PANEL["components/portfolio/AIAdvisorPanel.tsx<br/>AI Audit & Health Matrix"]
    end

    subgraph Server ["Server Actions & API Handlers"]
        ACTIONS["lib/actions/*<br/>Drizzle Server Actions (CRUD)"]
        AI_ROUTE["app/api/ai/review/route.ts<br/>Review & Explanation API"]
        AMFI_ROUTE["app/api/mf/search/route.ts<br/>AMFI Typeahead API"]
        CRON_ROUTE["app/api/cron/amfi/route.ts<br/>NAV Updater Endpoint"]
    end

    subgraph Domain ["Pure Domain Services"]
        MATH["lib/math/portfolio-metrics.ts<br/>Allocation, Gains, Weights"]
        LEDGER["lib/math/ledger-service.ts<br/>Weighted Cost Recalculation"]
        XIRR["lib/math/xirr-calculator.ts<br/>Newton-Raphson Numerical Solver"]
        RULES["lib/ai/rules-engine.ts<br/>Deterministic Thresholds & Findings"]
        AI_SVC["lib/ai/ai-service.ts<br/>Gemini 1.5 Flash Explanation"]
    end

    subgraph Data ["Data & External APIs"]
        PG[("PostgreSQL Database<br/>Portfolios, Holdings, Transactions, Goals")]
        AMFI["api.mfapi.in<br/>Live Indian Mutual Fund NAVs"]
        GEMINI["Google Gemini API<br/>Plain-English Explanations"]
    end

    DASH & HOLD & TXN & ANL --> ACTIONS
    AI_PANEL --> AI_ROUTE
    ACTIONS --> LEDGER & MATH & PG
    AI_ROUTE --> MATH --> RULES --> AI_SVC --> GEMINI
    AMFI_ROUTE --> AMFI
    CRON_ROUTE --> AMFI & PG
```

---

## 📁 Directory Structure

```text
investment-tracker/
├── app/                              # Next.js App Router
│   ├── (auth)/login/page.tsx         # Login screen
│   ├── analytics/page.tsx            # Rebalancing & performance charts
│   ├── holdings/page.tsx             # Holdings table & Add Holding modal
│   ├── transactions/page.tsx         # Chronological transaction ledger
│   ├── page.tsx                      # Main wealth dashboard
│   ├── layout.tsx                    # Root application layout
│   └── api/                          # Route handlers
│       ├── ai/                       # AI review, explain, whatif endpoints
│       ├── mf/search/                # AMFI mutual fund typeahead search
│       └── cron/amfi/                # Automated NAV update endpoint
│
├── components/
│   ├── layout/                       # AppSidebar, AppHeader, PageHeader
│   ├── portfolio/                    # AIAdvisorPanel, FundWiseTable, Modals
│   │   └── charts/                   # AssetAllocation, MarketCap, PerformanceTimeline
│   └── ui/                           # Radix UI + Tailwind design tokens
│
├── db/                               # PostgreSQL + Drizzle ORM Layer
│   ├── schema.ts                     # Drizzle schema definitions & relations
│   ├── helpers.ts                    # Row locking (FOR UPDATE) helpers
│   └── index.ts                      # Postgres connection pool client
│
├── lib/
│   ├── actions/                      # Next.js Server Actions (Portfolio, Holding, Txn, Goal)
│   ├── ai/                           # rules-engine.ts, ai-service.ts (Gemini)
│   ├── amfi/                         # mf-api-fetcher.ts (Live NAV API)
│   ├── math/                         # xirr-calculator.ts, ledger-service.ts, portfolio-metrics.ts
│   └── utils/                        # formatters.ts (₹ INR Lakhs/Crores), cn()
│
├── drizzle.config.ts                 # Drizzle Kit migration configuration
├── next.config.mjs                   # Next.js build configuration
├── tailwind.config.ts                # Tailwind design configuration
└── tsconfig.json                     # TypeScript configuration with @/* path aliases
```

---

## 💡 Key Features

### 1. Multi-Member Family Portfolios
- Track distinct portfolios for `Self`, `Spouse`, `Father`, `Mother`, `Child`, `Other`.
- Assign customized risk profiles: `Conservative`, `Moderate`, `Aggressive`.
- Set target asset allocation percentages for **Equity %**, **Debt %**, and **Gold %** to enable automated rebalancing calculations.

### 2. Multi-Asset Holdings Management
- Tracks Mutual Funds (MF), ETFs, Equities/Stocks, Fixed Deposits (FD), PPF, NPS, and Gold.
- Retains asset categorization (`Equity`, `Debt`, `Liquid`, `Gold`, `FD`, `Savings`) and market capitalization (`Large`, `Mid`, `Small`, `Multi`).
- Maturity date tracking with alert windows (90-day warning, 30-day caution).

### 3. Live AMFI Mutual Fund Sync & Cron
- Real-time search across thousands of Indian mutual funds via `api.mfapi.in`.
- Automated background NAV synchronization (`/api/cron/amfi`) updating `price_cache` and live holding valuations.

### 4. Transaction Ledger & Weighted Cost Recalculation
- Supports `BUY`, `SELL`, `SIP`, `DIVIDEND`, `INTEREST`, `SWITCH_IN`, `SWITCH_OUT`.
- Employs database row locking (`SELECT ... FOR UPDATE`) during recalculations to prevent race conditions.
- Sells reduce the invested capital base proportionally, eliminating fractional remainder drift.

### 5. Performance Analytics & Newton-Raphson XIRR
- Solves for exact Extended Internal Rate of Return (XIRR) across irregular investment cash inflows and outflows.
- Computes rupee rebalancing deltas required to restore target allocation equilibrium.

### 6. Safeguarded 3-Tier AI Engine
Finlight guarantees zero hallucinated financial numbers through strict separation of responsibilities:
1. **Layer 1 (Pure Math - `portfolio-metrics.ts`)**: Calculates absolute returns, holding weights, target allocation deltas, goal progress.
2. **Layer 2 (Deterministic Rules Engine - `rules-engine.ts`)**: Evaluates deviations against strict thresholds (±5pp, ±15pp, >15% concentration, <3 holdings) and creates structured finding objects.
3. **Layer 3 (AI Explanation Layer - `ai-service.ts` via Gemini 1.5 Flash)**: Translates structured findings into plain-English, jargon-free explanations for Indian retail investors without offering buy/sell recommendations.

---

## 🗄 Database Schema (Drizzle ORM)

All tables use `numeric` precision (`numeric(20, 4)` for units/NAV, `numeric(20, 2)` for amounts) to prevent JavaScript floating-point errors:
- **`users`**: Account credentials, email, password hash.
- **`portfolios`**: User relation, family member name, risk profile, target allocations, cached XIRR.
- **`holdings`**: Portfolio reference, asset type, AMFI code, symbol, units, average cost, current NAV, category, cap type, maturity date.
- **`investment_transactions`**: Holding & portfolio references, transaction type, units, NAV, amount, date, notes.
- **`investment_goals`**: Portfolio reference, target corpus, target milestone date.
- **`price_cache`**: AMFI code, scheme name, cached NAV, timestamps.

---

## 🔌 API Route Matrix

| Method | Endpoint | Description |
|:---:|---|---|
| `POST` | `/api/ai/review` | Run 3-tier portfolio audit (Math → Rules → Gemini) |
| `POST` | `/api/ai/explain` | Contextual AI explanation for a single holding |
| `POST` | `/api/ai/whatif` | Simulate hypothetical market or SIP scenarios |
| `GET` | `/api/mf/search?q=:query` | Live AMFI mutual fund search |
| `GET/POST`| `/api/cron/amfi` | Scheduled background NAV updater |

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **PostgreSQL**: A local PostgreSQL instance or hosted connection (Neon, Supabase, AWS RDS)
- **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/)

### Environment Configuration
Create a `.env` or `.env.local` file in the project root:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/investment_tracker
GEMINI_API_KEY=your_gemini_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret_key_minimum_32_chars
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=your_cron_secret_token
```

### Running the App

```bash
# Install dependencies
npm install

# Generate Drizzle migration files
npm run db:generate

# Apply migrations to PostgreSQL
npm run db:migrate

# Open Drizzle Studio (Database GUI)
npm run db:studio

# Start Next.js development server (http://localhost:3000)
npm run dev
```
