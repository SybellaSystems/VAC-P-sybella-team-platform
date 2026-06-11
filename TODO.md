# TODO - Projects feature fixes

- [ ] Wire enhanced Projects actions into `app/(app)/projects/page.tsx`:
  - [ ] Add Import Data trigger (ProjectImportWizard) inside selected project drawer
  - [ ] Add Templates trigger (ProjectTemplatesDialog) inside selected project drawer
  - [ ] Add Analytics panel (ProjectAnalyticsDashboard) inside selected project drawer
  - [ ] Add Task creation trigger (TaskAssignmentForm) instead of only inline subtasks

- [ ] Fix auth usage in components so they never use `current-user-id`:
  - [ ] Replace hardcoded user id in ProjectImportWizard with `profile?.id`
  - [ ] Replace hardcoded user id in ProjectTemplatesDialog with `profile?.id`

- [ ] Make sure XLSX import does not crash:
  - [ ] Either install/enable `xlsx` parsing in `lib/project-import-export.ts`, or gate UI to CSV only.

- [ ] Ensure “add data to projects linked through reports” works:
  - [ ] In Projects drawer, read `accountability_reports.related_project_ids` for the current user (or reviewer role) and allow import/data additions for those projects.
  - [ ] Implement server-side validation checks in UI before enabling import for non-linked projects.

- [ ] Verify end-to-end with a real user session:
  - [ ] Import CSV into a project that is in `related_project_ids`
  - [ ] Confirm `project_custom_fields` and `project_rows` are created
  - [ ] Confirm analytics dashboard reflects updated tasks


