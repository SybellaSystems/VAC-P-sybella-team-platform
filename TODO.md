# TODO - VAC-P database/features wiring

## Plan (high level)
- [x] 1) Update `supabase_schema.sql` with required tables: shares, wiki_pages, repo_links, leave_requests, budget_proposals, approval_workflows, audit_logs, task_subtasks (+ any minimal supporting tables/columns needed: users/roles/projects/tasks/messages if missing)
- [ ] 2) Add/adjust Supabase helpers in `src/lib/supabase.ts` for CRUD operations for all above tables.
- [ ] 3) Add new pages + routes (keeping existing layout/styles):
  - [ ] Shares & Ownership page (`/shares`)
  - [ ] Wiki / Knowledge Base (`/wiki`)
  - [ ] Repo / Document Links (`/repo-links` or `/repos`)
  - [ ] Leave Management (`/leave`)
  - [ ] Budget Proposals & Approval Workflows (`/budget`)
  - [ ] Audit Logs (`/audit`)
- [ ] 4) Enhance existing pages to connect to DB (no design/layout changes):
  - [ ] Projects page: subtasks + cross-feature linking + Gantt timeline data from DB
  - [ ] Chat page: task creation via @mentions/arrows + arrows link tasks
- [ ] 5) Update `src/components/layout/Navbar.tsx` to add nav links to new pages.
- [ ] 6) Add robots.txt + security headers (in Vite/Express entrypoints) without changing UI.
- [ ] 7) Run TypeScript check and (if possible) build.

## Notes
- Must satisfy: “return the SQL when you are done adding the features”.


