# PARUL LEADDESK
### University Admission Lead Management & Daily Reporting System

**Parul LeadDesk** is a production-grade, enterprise admission lead management web application engineered for the Parul University Admission Counselling Cell. It replaces manual, chaotic WhatsApp daily reporting with an automated, auditable, and secure counselling pipeline.

---

## 🏛️ Brand & Visual Aesthetics

- **Design Philosophy**: *"Linear × Apple × University Enterprise Dashboard"*
- **Glassmorphism Design System**: Frosted glass cards, dark mode mesh gradients, subtle borders, high contrast accessibility, and micro-interactions.
- **Brand Identity**:
  - `pu-navy`: `#0B2A5B`
  - `pu-navy-light`: `#173D7A`
  - `pu-red`: `#C8102E`
  - `pu-gold`: `#F5A800`
  - `pu-white`: `#FFFFFF`
  - `pu-slate`: `#0F172A`
- **Typography**: Plus Jakarta Sans & Inter
- **Responsiveness**: Tested from 375px mobile through 1920px widescreen desktop.

---

## ⚡ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, TanStack React Query, React Router v6, Lucide Icons, Framer Motion, Recharts, Canvas Confetti |
| **Backend** | Node.js, Express, TypeScript, Zod, JWT (JSON Web Tokens), Bcryptjs, Helmet, CORS, Morgan |
| **Database** | Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS) policies, with local DB fallback |
| **Deployment** | Vercel (Client), Render / Railway (Server), Supabase (Database) |

---

## 📁 Project Structure

```
parul-leaddesk/
├── client/                     # Vite React Frontend
│   ├── public/                 # Assets (favicon, logo placeholders)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # ParulLogo, ProtectedRoute
│   │   │   ├── layout/         # AppLayout, Sidebar, Topbar, BottomNav, NotificationDropdown
│   │   │   ├── leads/          # LeadDetailDrawer (audit history, WhatsApp, call, logs)
│   │   │   └── ui/             # GlassCard, StatCard, Button, Input, Select, Badge, Modal, etc.
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── lib/                # api.ts (Fetch client), validation.ts
│   │   ├── pages/              # LoginPage, DailyReportPage, MyLeadsPage, FollowUpsPage,
│   │   │                       # ManagerDashboardPage, AllLeadsPage, FollowUpCommandCentrePage, TeamManagementPage
│   │   ├── index.css           # Design tokens, mesh background, glass styles
│   │   └── main.tsx            # Application entrypoint
│   ├── .env.example
│   └── package.json
├── server/                     # Express REST API Server
│   ├── src/
│   │   ├── controllers/        # auth, lead, followup, report, user, notification controllers
│   │   ├── db/                 # store.ts (Supabase compatible store + 30-day realistic seed data)
│   │   ├── lib/                # supabase.ts (admin & client initializers)
│   │   ├── middleware/         # auth (JWT), roles (RBAC), validate (Zod), errorHandler
│   │   ├── routes/             # auth, lead, followup, report, user, notification routes
│   │   ├── schemas/            # Zod validation schemas (Indian mobile, date bounds, bulk leads)
│   │   ├── types/              # Domain models and interfaces
│   │   └── index.ts            # Main Express entrypoint
│   ├── .env.example
│   ├── test-security.js        # Automated Section 56 security isolation verification
│   └── package.json
├── supabase/
│   └── migrations/
│       └── 001_init.sql        # PostgreSQL DDL, indexes, triggers, and Supabase RLS policies
├── test-acceptance-scenarios.js# Complete Section 62 Acceptance test runner
├── package.json                # Root workspace orchestration
└── README.md                   # System documentation
```

---

## 🔐 User Roles & Permissions Matrix

| Capability | Employee | Team Lead | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Submit Daily Report (1–60 leads) | ✅ | ✅ | ✅ | ✅ |
| View / Manage Own Leads | ✅ | ✅ | ✅ | ✅ |
| View Team Leads & Team Analytics | ❌ | ✅ | ✅ | ✅ |
| View All Leads & Global Analytics | ❌ | ❌ | ✅ | ✅ |
| Reassign Leads | ❌ | ✅ (Team) | ✅ | ✅ |
| Onboard / Manage Team Members | ❌ | ❌ | ✅ | ✅ |
| Activate / Deactivate Counsellors | ❌ | ❌ | ✅ | ✅ |
| Export Filtered Leads to CSV | ✅ (Own only) | ✅ (Team only) | ✅ (All) | ✅ (All) |
| Follow-up Command Centre (Kanban) | ❌ | ✅ | ✅ | ✅ |

### Security Isolation Rule
> **Zero Trust Enforced on Backend**: Even if a malicious user manipulates frontend roles, URL query parameters, or hidden form bodies (e.g. `?employee_id=xyz`), the server enforces strict role isolation. Employees can **never** access another employee's leads.

---

## 🛠️ Environment Configuration

### Client (`client/.env`)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:5000/api
```

### Server (`server/.env`)
```bash
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-minimum-32-chars
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## 🚀 Local Development Setup

### 1. Install Dependencies
```bash
# Root
npm install

# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Run the Development Environment
```bash
# Terminal 1: Backend Server (Port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

The application is accessible at **`http://localhost:5173`**.

---

## 🧪 Automated Test Suites

### 1. Critical Security Verification (Section 56)
Tests strict employee data isolation, unauthorized ID retrieval rejection (403/404), parameter tampering protection, and CSV export isolation:
```bash
node server/test-security.js
```

### 2. Acceptance Scenarios Suite (Section 62)
Executes all 10 business acceptance workflows (Dynamic 8-lead submission, additive same-day submission, live KPI calculation, 30-day trends, Not Submitted Today tracking, Kanban pipeline):
```bash
node test-acceptance-scenarios.js
```

---

## 🔐 User Account Creation & Management

In production, public self-registration is completely disabled for security. Accounts are provisioned through privileged administrative workflows.

### 1. Create Initial Manager Account (Terminal CLI)

To provision an authorized Manager account:

```bash
npm run create-manager
```

The script interactively prompts:
- `Manager name:`
- `Manager email:`
- `Manager password:` (masked input)
- `Confirm password:` (masked input)

The account is securely created in Supabase Auth & application database with bcrypt password hashing. Duplicate emails are rejected.

### 2. Reset Manager / Admin Password (Terminal CLI)

To reset credentials for a Manager or Administrator account:

```bash
npm run reset-manager-password
```

The script interactively prompts:
- `Manager/Admin email:`
- `New password:` (masked input)
- `Confirm new password:` (masked input)

### 3. Employee (Counsellor) Onboarding Flow

1. Manager logs in to the dashboard and navigates to **Staff Management (`/team`)**.
2. Manager clicks **Add Staff Member**, enters counsellor details, and provisions a secure temporary password (e.g. `Welcome@ABC123`).
3. The temporary password is provided privately to the counsellor.
4. When the counsellor first logs in, the system detects temporary-password status (`must_change_password: true`) and forces them to choose a permanent password before granting desk access.

---

## 🎯 Key Feature Highlights

1. **Dynamic Daily Report Desk (`/report`)**:
   - Date validation: Cannot be future, maximum 7 days in past.
   - Dynamic lead count (1–60 cards) generated instantaneously.
   - Real-time mobile validation: Formats Indian numbers (strips spaces, hyphens, and `+91`), enforces 10 digits starting with 6, 7, 8, or 9.
   - Batch duplicate check: Detects potential re-inquiries and badges them without blocking submission.
   - Reducing count safety dialog: Warns user before trimming filled lead cards.
   - LocalStorage Autosave: Automatically preserves and restores in-progress drafts.
   - Additive same-day submissions: Submitting again on the same date appends leads and updates daily totals without overwriting.
   - Confetti celebration and breakdown summary modal upon submission.

2. **Counsellor Desk (`/my-leads` & `/follow-ups`)**:
   - Real-time KPIs (Total, Today, Interested, Admission Done, Follow-ups Due).
   - One-tap phone calling and pre-populated WhatsApp messaging links (`wa.me/91XXXXXXXXXX`).
   - Side drawer with audit logs (Created by, timestamps, full counselling history).
   - Follow-up timeline sorted by Overdue, Today, Upcoming, and Converted.

3. **Management Command Centre (`/dashboard`, `/leads`, `/followups`, `/team`)**:
   - Real database calculations: No hard-coded dummy statistics.
   - Conversion Rate formula: `(Admissions ÷ Total Leads) × 100`.
   - Recharts visual analytics: 30-day continuous volume area curve, Top 10 Counsellors bar chart, Status distribution donut, Channel split donut, and Team stacked breakdown.
   - Counsellor Leaderboard with multi-column sorting.
   - "Not Submitted Today" compliance panel identifying counsellors with 0 reports logged today.
   - 5-Column Kanban follow-up pipeline with modal rescheduling.
   - User onboarding, team assignment, and activation control.

---

## 🗄️ Supabase Migration Instructions

To apply the database schema to your Supabase PostgreSQL project:
1. Navigate to the SQL Editor in your Supabase Dashboard.
2. Open [`supabase/migrations/001_init.sql`](file:///c:/Users/kalyan5256/Desktop/parul_leaddesk/supabase/migrations/001_init.sql).
3. Paste and run the query.
4. Tables (`profiles`, `leads`, `daily_reports`, `follow_ups`, `notifications`), indexes, triggers, and Row Level Security policies will be established.
5. In your project settings, copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `server/.env`.
