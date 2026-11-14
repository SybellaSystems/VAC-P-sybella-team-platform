# VAC-P — Sybella Online HQ

**Version:** 3.0.0

---

## Overview

VAC-P (Virtual Accountability & Collaboration Platform) is Sybella Systems' internal operational platform. It centralizes project management, team collaboration, communication, document management, and administrative workflows into a single workspace.

The platform is designed to improve productivity, accountability, and collaboration while providing a scalable foundation for future organizational growth.

---

## Features

Current modules include:

- Authentication & user management
- Role-based access control
- Team management
- MD-managed individual daily KPIs and targets
- Daily number-and-proof entry with draft, submission, review, and approval states
- Personal daily progress and recent entry history
- Department-scoped approval inbox
- Project management
- Dashboards & analytics
- Document repository
- Notifications
- Administrative tools

Additional features and integrations will continue to be introduced as the platform evolves.

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Supabase
- PostgreSQL

---

## Development Status

**Current Version:** 3.0.0

VAC-P V3 introduces the daily KPI workflow. Administrators and directors assign KPIs from **Set KPIs**; team members report numbers and proof from **My Daily Progress**; authorized supervisors review entries from **Daily Approvals**. Approved entries are locked, and rejected entries can be corrected and resubmitted.

The migration `supabase/migrations/20261112000000_vacp_v3_daily_kpi_workflow.sql` adds the workflow tables, review functions, profile supervisor fields, and row-level access policies. Apply the migration to the Supabase project before using the V3 pages.

The department-scoped platform launcher, Google Drive mirror, and automated email/WhatsApp notifications described in the broader V3 flow are not part of this release yet.

VAC-P is under active development. Existing modules are continuously improved while new capabilities are added to support Sybella Systems' operational needs.

---

## Project Structure

```
app/                 Next.js app routes and API handlers
components/          Shared UI and layout components
contexts/            Authentication and notification context
hooks/               Shared React hooks
lib/                 Supabase client, types, and application helpers
supabase/migrations/ Database schema and row-level security changes
```

The structure may evolve as the platform grows.

---

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Roadmap

Planned improvements include:

- Enhanced project management
- Finance integration
- HR management
- Repository improvements
- Workflow automation
- Reporting & analytics


---

## License

Private internal software.

© Sybella Systems. All rights reserved.