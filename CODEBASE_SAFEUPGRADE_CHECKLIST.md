Codebase Safe Upgrade Checklist

Purpose: Guide safe, incremental changes required before large feature work.

1) Detect direct client `supabase` usage in server routes
   - Run: `npm run scan:supabase`
   - Review listed files and decide whether they run on server (API routes) or client.

2) Replace server-side `supabase` client with `createServerSupabase()` where elevated privileges or service role required.
   - Example replacement in API route:
     const supabaseServer = createServerSupabase();
     const { data, error } = await supabaseServer.from('...').select('*');

3) Audit `process.env` usage
   - Ensure secrets (SERVICE_ROLE_KEY, webhook secrets, Stripe secret keys) are not referenced in client code.
   - Prefix public envs with `NEXT_PUBLIC_` only for safe values.

4) Add CI gating and tests
   - The repository now includes `.github/workflows/ci.yml`.
   - Add unit tests for `lib/audit`, `lib/integrations`, and API route smoke tests.

5) Migrations policy
   - Add migration SQL files in `supabase/migrations` with down-scripts.
   - Test on staging and verify RLS policies after migration.

6) Offline sync plan
   - Implement per-feature offline sync; start with `projects` and `tasks` using IndexedDB and background sync.

Mark each item done in small PRs with testing and rollback scripts.
