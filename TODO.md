- [ ] Understand current integration implementation (done)
- [ ] Add webhook endpoint to accept pushed data from external platforms
- [ ] Add Supabase migration to store `last_pushed_payload` (jsonb) + `last_pushed_at` (timestamptz)
- [ ] Wire webhook to persist to those columns
- [ ] Update Projects UI to show per-integration: connected/disconnected, endpoint info, last push time, and pushed preview
- [ ] Add UI toggle in Projects page to “Link external data sources” (enable integrations section)
- [ ] Ensure RLS/policies allow viewing integration + stored pushed data by authenticated users
- [ ] Add minimal security for webhook (shared secret header) and validate
- [ ] Test flow locally (curl webhook → verify pushed data appears in Projects page)

