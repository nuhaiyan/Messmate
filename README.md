# MessMate – Private Multi-Member Mess Management & Accounting System

MessMate is a production-ready, private web application engineered for bachelor and student messes in Bangladesh (10–20 members). It replaces manual paper-based mess accounting with an automated, transparent, and accurate digital accounting engine.

Built with **Next.js (App Router)**, **TypeScript**, **PostgreSQL / Prisma ORM**, **Tailwind CSS**, **Recharts**, and decimal-safe financial calculations.

---

## 🌟 Key Features

### 1. Robust Role-Based Access Control (RBAC)
- **Manager**: Full access to all modules, member management, bulk meal entries, bazar purchases, deposits, additional expenses, monthly closing, and settings.
- **Member**: Secure personal login to view daily meal counts, personal deposits, monthly balance, live dues/advances, transaction history, shared mess expenses, and downloadable personal account statements. Read-only protection against unauthorized modifications.

### 2. Centralized Automated Accounting Engine
- **Traditional Meal Rate Formula**:
  $$\text{Meal Rate} = \frac{\text{Total Bazar Expenses}}{\text{Total Meals}}$$
- **Division-by-Zero Guard**: If total meals are 0, displays cleanly without arithmetic failure.
- **Critical Bazar Payment Source Accounting**:
  - **Personal Payment (Paid by Member)**: Contributes to total bazar expense (affecting meal rate) **AND** credits the member's account.
  - **Mess Fund (Common Fund)**: Contributes to total bazar expense without double-crediting the member.
- **Member Deposits**: Counted strictly as fund contributions, **never** added to the meal rate.
- **Additional Expenses (House Rent, Maid, Electricity, Internet)**: Distributed separately (Equal, Proportional, or Custom) and **strictly excluded from the traditional meal rate**.
- **Individual Final Balance Formula**:
  $$\text{Final Balance} = \text{Opening Balance} + \text{Deposits} + \text{Personal Bazar Payments} - \text{Individual Final Cost}$$
  - Positive balance = **Advance** (surplus funds).
  - Negative balance = **Due** (owed to mess).
- **Monthly Closing & Carry Forward**: Closing balances automatically carry forward to the next month as opening balances. Locked accounting periods prevent unauthorized edits. Manager reopening requires a **mandatory audit reason**.

### 3. Comprehensive Dashboard
- **9 Core Financial KPI Cards**:
  1. Active Members
  2. Today's Total Meals
  3. Month Total Meals
  4. Month Bazar Expenses
  5. Current Meal Rate
  6. Member Deposits Collected
  7. Other Mess Expenses (Fixed/Utilities)
  8. Total Outstanding Dues
  9. Total Member Advances
- **Interactive Recharts Visuals**:
  - Daily meal consumption area chart
  - Daily bazar expense bar chart
  - Member-wise meal comparison chart
  - Deposit vs. Expense overview breakdown
- **Real-Time Tables**:
  - Member due and advance summary table
  - Recent bazar transactions
  - Recent member deposits
  - Recent activity logs

### 4. Daily Meal Management
- Fast-entry table for all members on a single screen (Desktop & Mobile optimized).
- Support for breakfast, lunch, and dinner.
- Support for fractional meals (e.g. `0.5`, `1`, `1.5`, `2`).
- One-click **Copy Yesterday** feature.
- Instant preset buttons (`All Full`, `Lunch & Dinner`, `Clear All`).
- Duplicate entry prevention with unique database constraints.

### 5. Financial Reports & Exports
- 10 full-featured reports:
  1. Daily Meal Report
  2. Monthly Meal Audit
  3. Daily Bazar Report
  4. Monthly Expense Report
  5. Member Deposit Report
  6. Member Due Report
  7. Member Advance Report
  8. Member-wise Ledger
  9. Category-wise Expense Report
  10. Official Monthly Closing Statement
- Formats supported: **Excel (.xlsx)** via `xlsx`, **CSV**, and **Print / PDF format**.

### 6. Bilingual Support
- Switch between **English (default)** and **Bangla (বাংলা)** across all navigation items, form inputs, status badges, and closing steps.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (Navy & Emerald SaaS Palette) |
| **Database** | PostgreSQL (Production) / SQLite (Zero-Config Dev) |
| **ORM** | Prisma ORM 6.4 |
| **Arithmetic** | Decimal.js (20-decimal precision, Half-Up rounding) |
| **Charts** | Recharts |
| **Authentication** | JWT Cookies (`jose`) & Password Hashing (`bcryptjs`) |
| **Spreadsheets** | XLSX library |
| **Icons** | Lucide React |

---

## 🗄️ Database Architecture

The system utilizes 14 normalized relational models:
1. `users`: Credentials, name, phone, email, system role (`MANAGER` / `MEMBER`), active state.
2. `messes`: Mess metadata, timezone (`Asia/Dhaka`), currency (`BDT ৳`), settings.
3. `mess_members`: Room allocations, joining/leaving dates, opening balances, status.
4. `monthly_periods`: Year, month, locked/closed state, closure & reopening audit details.
5. `meal_entries`: Unique `[memberId, date]`, breakfast, lunch, dinner, total meals.
6. `expenses`: Bazar and additional expenses, payment source (`PERSONAL` vs `MESS_FUND`), payer member link.
7. `shared_expense_allocations`: Member-wise split for shared additional expenses.
8. `deposits`: Financial contributions, payment methods (`BKASH`, `NAGAD`, `CASH`, `BANK_TRANSFER`), transaction IDs.
9. `expense_categories`: Default and custom bazar and utility categories.
10. `member_ledger_entries`: Chronological running ledger for every member.
11. `monthly_closings`: Historical snapshot of closing calculations and meal rates.
12. `monthly_closing_details`: Historical snapshot of individual member closing balances.
13. `audit_logs`: Immutable security and financial audit trail.
14. `mess_settings`: Fractional meals toggle, low balance threshold, defaults.

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- Node.js `v20.x` or higher
- npm or pnpm

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/messmate.git
cd messmate
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="messmate-super-secret-jwt-key-2026-bachelor-accounting-system-dhaka"
DEFAULT_CURRENCY="BDT"
DEFAULT_CURRENCY_SYMBOL="৳"
DEFAULT_TIMEZONE="Asia/Dhaka"
NODE_ENV="development"
```

### 4. Database Setup & Seed
```bash
# Push schema to database
npm run db:push

# Seed with realistic Dhaka bachelor mess (12 members, meals, bazar, deposits, closing)
npm run db:seed
```

### 5. Run the Accounting Test Suite
Verify that all 15 accounting engine scenarios pass:
```bash
npm run test:accounting
```

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Seed Credentials

| Role | Name | Phone (Login ID) | Password |
|---|---|---|---|
| **Primary Manager** | Shakil Ahmed | `01711000001` | `password123` |
| **Mess Member** | Tanvir Hossain | `01711000002` | `password123` |
| **Mess Member** | Rafiqul Islam | `01711000003` | `password123` |
| **Mess Member** | Mehedi Hasan | `01711000004` | `password123` |
| **Mess Member** | Zubair Al Mahmud | `01711000005` | `password123` |

*(Quick demo buttons are also provided directly on the `/login` screen for one-click credential filling).*

---

## 🔄 Switching Between SQLite and PostgreSQL

MessMate includes zero-friction tooling to switch between local SQLite development and PostgreSQL production:

```bash
# Switch to PostgreSQL
npm run db:switch:postgres

# Switch back to SQLite
npm run db:switch:sqlite
```

When connecting to PostgreSQL (e.g. Supabase, Neon, Railway, Docker, or Local Postgres), set:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/messmate?schema=public"
```

---

## 🧪 Automated Testing

The automated test suite (`npm run test:accounting`) verifies all 15 scenarios specified in Section 18:
1. Multiple members with different meal counts.
2. Zero meal entries (division-by-zero protection).
3. Different bazar expenses categories.
4. Member deposits are contributions, excluded from meal rate.
5. Personal bazar payments correctly credited to member.
6. Mess fund payments do not double-credit member.
7. Shared expenses excluded from meal rate and distributed equally.
8. Individual expenses assigned only to target member.
9. Previous month balances carry forward correctly.
10. Mid-month member joining prorated allocation.
11. Mid-month member leaving prorated allocation.
12. Dynamic expense editing recalculation.
13. Monthly closing snapshot validation.
14. Month reopening workflow.
15. Decimal-safe precision without floating point artifacts.

---

## 🔒 Security & Auditability

- Passwords hashed with `bcryptjs` (salt rounds: 10).
- HTTP-only signed JWT session cookies with 30-day persistence.
- Server-side permission guards on all server actions and route handlers (`requireAuth()`, `requireManager()`).
- Immutable `audit_logs` track member additions, meal edits, expense creations, deposit recordings, and monthly closing/reopening events with mandatory reasons.

---

## 📄 License
MIT License. Built for Bangladeshi student and bachelor mess communities.
