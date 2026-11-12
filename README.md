# AvomaxCRM — Admission & Visa Tracking Management System

A full-stack, production-ready **Admission & Visa Tracking Management System** built with **React (Vite + Tailwind CSS)**, **Node.js + Express.js**, and **Supabase PostgreSQL + Private Storage**.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the complete database architecture, Mermaid ER diagram, and folder structure.

---

## Key Capabilities

- **6-Stage Student Journey Tracker**: Admission Application → Admission Fee Payment → Visa Documentation → Visa Eligibility → Flight Booking → Accommodation Arrangement. Overall progress is computed strictly from completed stages (in-progress stages never count as complete).
- **Executive Dashboard**: 7 live KPI summary cards, 5 Recharts visualizations (Admission Distribution, Visa Processing, Flight Booking Stats, Accommodation Distribution, Monthly Admission Trends), and a real-time Activity feed.
- **Role-Based Access Control (RBAC)**: Enforced in both Express middleware and Supabase PostgreSQL RLS policies across `super_admin`, `admin`, `counselor` (scoped to assigned students), and `viewer` (read-only).
- **Private Document Vault**: Encrypted upload to a private Supabase Storage bucket (`student-documents`), short-lived signed URLs for inline preview & download, document verification workflow, and full version history.
- **Reports & Exports**: 9 operational reports + filtered student exports in both **CSV** and **Excel (`.xlsx`)**.
- **Audit Trail & Notifications**: Automatic activity logging and stakeholder notifications on counselor assignments, status updates, fee payments, visa readiness/eligibility, flight bookings, and accommodation reservations.

---

## Project Structure

```text
edu_crm/
├── docs/ARCHITECTURE.md          # DB architecture, ER diagram, implementation plan
├── supabase/
│   ├── migrations/
│   │   ├── 001_enums_and_extensions.sql
│   │   ├── 002_core_tables.sql
│   │   ├── 003_triggers_and_functions.sql
│   │   └── 004_rls_and_storage.sql
│   └── seed.sql                  # Initial staff roles, settings, and sample students
├── backend/                      # Express.js REST API + Zod + bcrypt + JWT + Supabase SDK
└── frontend/                     # React + Vite + Tailwind + Recharts + React Hook Form
```

---

## Setup & Installation

### 1. Supabase Database & Storage Setup

1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** and run the migration scripts in order:
   1. `supabase/migrations/001_enums_and_extensions.sql`
   2. `supabase/migrations/002_core_tables.sql`
   3. `supabase/migrations/003_triggers_and_functions.sql`
   4. `supabase/migrations/004_rls_and_storage.sql`
3. Optionally load initial staff accounts and sample records by running `supabase/seed.sql`.

**Seeded Demo Staff Accounts** (Password for all: `Admin@123456`):
- **Super Admin**: `superadmin@educrm.io`
- **Admin**: `admin@educrm.io`
- **Counselor 1**: `counselor1@educrm.io`
- **Counselor 2**: `counselor2@educrm.io`
- **Viewer**: `viewer@educrm.io`

> **Important:** Change seeded passwords immediately in production!

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and JWT_SECRET in .env
npm install
npm run dev
```

Run backend automated tests:
```bash
cd backend
npm test
```

---

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Ensure VITE_API_BASE_URL points to your Express API (default: http://localhost:5000/api)
npm install
npm run dev
```

Build frontend for production:
```bash
cd frontend
npm run build
```

---

## Security & Deployment Notes

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in `frontend/`. Only the backend server accesses Supabase Storage and PostgreSQL with the service role key.
- Private documents are stored in the `student-documents` bucket (`public = false`) and accessed exclusively via backend-authorized 5-minute signed URLs.
- Backend API enforces Helmet security headers, strict CORS origin configuration, express-rate-limit (global + stricter auth limiter), Zod schema validation, bcrypt password hashing (cost factor 12), and JWT verification against active database profiles.

