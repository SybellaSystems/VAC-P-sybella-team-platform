# VAC-P V3 Operations Guide

## Purpose
VAC-P V3 is the Sybella Systems internal operations layer for team accountability, KPI reporting, department-scoped access, platform links, and document proof tracking. The design is built to keep each user inside the information and systems relevant to their department while preserving administrative visibility for the Managing Director and directors.

## Role and department model
- MD / Admin: full visibility across departments, platform integrations, team review, and governance controls.
- Director: administrator-level access for strategic oversight and approval controls.
- Department managers and leads: manage people, assign KPI targets, and review daily submissions inside their own department.
- Team members: access only the modules relevant to their assigned department and approved platform accounts.
- Interns: treated as normal department members with daily reporting and access scoped to their department.
- Partners: read-only access to related reports and documents inside granted department contexts.

## Access and visibility rules
Access is enforced by department membership and role rather than UI-only hiding.

1. Users get a department assignment when invited or added by the MD/admin.
2. Department-specific platform accounts are only visible when the account is active, approved, and within the user’s department or the global access scope.
3. Team cards and KPI history are restricted to the same department unless the viewer is an administrator or a department-approved partner.
4. Sensitive settings, MD-only controls, and administration pages remain hidden from non-admin roles at the server and application levels.

## KPI workflow
The platform follows the national-level V3 workflow used by Sybella Systems:
- MD/admin creates the user and assigns department and supervisor.
- MD/admin assigns individual KPIs to the employee.
- The employee reports daily numbers and proof links.
- The assigned department lead or supervisor receives an approval request.
- Verification is done against source systems such as GitHub, Drive, Zoho, or Slack.
- Approved entries contribute to consistency, analytics, and department reporting.

Each daily report includes:
- number value
- proof URL
- note
- submission state
- approval status

Rejected reports remain visible to the reporter and can be corrected and resubmitted before the day ends.

## Folder structure and document proof flow
VAC-P organizes files in the flow below:
- Department
- Folder
- Subfolder
- File title
- By
- Link
- Preview
- Comment

This approach gives each department a clear document tree while preserving proof links that can be attached to daily KPI entries. When a file is marked as proof, the system stores the source URL and makes it available in the daily report entry for quick verification.

## Analytics and people pages
Each person has a dedicated summary page that contains:
- reporting history
- approved KPI consistency
- contribution trends over time
- department comparison metrics
- activity over the last 30 days
- proof-linked evidence from reports

The team directory includes interns and partners and organizes access by role and department. It is designed to support transparent performance analysis without exposing unrelated information.

## Profile editing and data erasure
Users can update profile information such as:
- name
- title
- phone
- location
- bio
- avatar URL

Users can also initiate a deletion request. In this design, the system anonymizes the personal profile and disables access while preserving historical KPI, approval, and audit records without exposing personal data in those records.

## UI and UX principles
- Clean, classic, professional organization dashboard
- Clear left-hand navigation grouped by section
- Department-first context with role-based access boundaries
- Consistent use of the reusable Sybella UI loader and data table components
- Mobile-friendly layout and low-data-friendly pages
- Accessible forms and clear states for approvals and reports

## Deployment checklist
Before using the V3 release in a live environment:
1. Apply the Supabase migration files under `supabase/migrations/`.
2. Confirm the `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and service role environment variables are present.
3. Register the department lead assignment model and platform account approval flow.
4. Configure the admin user and assign the first department structure.
5. Invite the first users and assign them to a department.
6. Validate daily reporting, approval, and analytics flows with at least one department lead and one team user.

## Related files
- `README.md`
- `supabase/migrations/20261112000000_vacp_v3_daily_kpi_workflow.sql`
- `supabase/migrations/20261113000000_vacp_v3_departments_documents_activity.sql`
- `app/(app)/daily-progress/page.tsx`
- `app/(app)/daily-approvals/page.tsx`
- `app/(app)/team/page.tsx`
- `app/(app)/drive/page.tsx`
- `app/(app)/profile/page.tsx`
