/*
# Extend project_links linked_entity_type to include 'channel'

## Overview
The project_links table has a CHECK constraint limiting linked_entity_type to customer/budget/report/wiki/finance/task. We need to add 'channel' so projects can link to their communication channels.
*/

ALTER TABLE project_links DROP CONSTRAINT IF EXISTS project_links_linked_entity_type_check;
ALTER TABLE project_links ADD CONSTRAINT project_links_linked_entity_type_check
  CHECK (linked_entity_type = ANY (ARRAY['customer'::text, 'budget'::text, 'report'::text, 'wiki'::text, 'finance'::text, 'task'::text, 'channel'::text, 'milestone'::text, 'phase'::text, 'risk'::text, 'document'::text]));
