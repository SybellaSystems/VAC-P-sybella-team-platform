/*
# Seed comprehensive mock data (re-run after constraint fix)

## Overview
Creates team members, customers, projects, tasks, financial records, channels, messages, accountability reports, budget proposals, milestones, phases, risks, dependencies, documents, activity logs, and notifications. All cross-linked.
*/

DO $$
DECLARE
  v_admin_id uuid;
  v_pm_id uuid;
  v_dev1_id uuid;
  v_dev2_id uuid;
  v_designer_id uuid;
  v_qa_id uuid;
  v_cust1 uuid;
  v_cust2 uuid;
  v_cust3 uuid;
  v_cust4 uuid;
  v_proj1 uuid;
  v_proj2 uuid;
  v_proj3 uuid;
  v_chan1 uuid;
  v_chan2 uuid;
  v_chan3 uuid;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'bessora579@gmail.com';

  -- Create auth users for team members
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, role, aud, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'alice.mukamana@sybella.rw', crypt('mockpassword123', gen_salt('bf')), now(), '{"full_name": "Alice Mukamana", "role": "manager"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, now(), now(), 'authenticated', 'authenticated', '', '', '', ''),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'jp.habimana@sybella.rw', crypt('mockpassword123', gen_salt('bf')), now(), '{"full_name": "Jean Paul Habimana", "role": "developer"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, now(), now(), 'authenticated', 'authenticated', '', '', '', ''),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'claudine.uwase@sybella.rw', crypt('mockpassword123', gen_salt('bf')), now(), '{"full_name": "Claudine Uwase", "role": "developer"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, now(), now(), 'authenticated', 'authenticated', '', '', '', ''),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'david.kalisa@sybella.rw', crypt('mockpassword123', gen_salt('bf')), now(), '{"full_name": "David Kalisa", "role": "designer"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, now(), now(), 'authenticated', 'authenticated', '', '', '', ''),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'grace.iribagiza@sybella.rw', crypt('mockpassword123', gen_salt('bf')), now(), '{"full_name": "Grace Iribagiza", "role": "qa"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, now(), now(), 'authenticated', 'authenticated', '', '', '', '')
  ON CONFLICT DO NOTHING;

  PERFORM pg_sleep(0.2);

  SELECT id INTO v_pm_id FROM profiles WHERE email = 'alice.mukamana@sybella.rw';
  SELECT id INTO v_dev1_id FROM profiles WHERE email = 'jp.habimana@sybella.rw';
  SELECT id INTO v_dev2_id FROM profiles WHERE email = 'claudine.uwase@sybella.rw';
  SELECT id INTO v_designer_id FROM profiles WHERE email = 'david.kalisa@sybella.rw';
  SELECT id INTO v_qa_id FROM profiles WHERE email = 'grace.iribagiza@sybella.rw';

  UPDATE profiles SET department='Engineering', phone='+250788111222', bio='Senior Project Manager with 8 years experience leading software delivery.' WHERE id = v_pm_id;
  UPDATE profiles SET department='Engineering', phone='+250788222333', bio='Full-stack developer specializing in React, Node.js, and PostgreSQL.' WHERE id = v_dev1_id;
  UPDATE profiles SET department='Engineering', phone='+250788333444', bio='Backend engineer focused on APIs, microservices, and cloud infrastructure.' WHERE id = v_dev2_id;
  UPDATE profiles SET department='Design', phone='+250788444555', bio='UI/UX designer with a passion for clean, accessible interfaces.' WHERE id = v_designer_id;
  UPDATE profiles SET department='Engineering', phone='+250788555666', bio='QA engineer specializing in automated testing and quality assurance.' WHERE id = v_qa_id;

  -- Customers
  INSERT INTO customers (id, name, email, phone, company, country, status, industry, city, tin, registration_number, website, physical_address, postal_address, contact_person_name, contact_position, contact_email, contact_phone, billing_contact, finance_contact, created_by)
  VALUES
    (gen_random_uuid(), 'ABC Hotel Ltd', 'info@abchotel.rw', '+250788100200', 'ABC Hotel Ltd', 'Rwanda', 'active', 'Hospitality', 'Kigali', '123456789', 'REG-ABC-2021', 'https://abchotel.rw', 'KN 5 Ave, Kigali', 'P.O. Box 1234 Kigali', 'John Mutoni', 'General Manager', 'john@abchotel.rw', '+250788100201', 'accounts@abchotel.rw', 'finance@abchotel.rw', v_admin_id),
    (gen_random_uuid(), 'Rubavu Resort', 'contact@rubavuresort.rw', '+250788300400', 'Rubavu Resort Ltd', 'Rwanda', 'active', 'Hospitality', 'Rubavu', '987654321', 'REG-RBV-2020', 'https://rubavuresort.rw', 'Rubavu, Western Province', 'P.O. Box 5678 Rubavu', 'Sarah Karangwa', 'Operations Director', 'sarah@rubavuresort.rw', '+250788300401', 'billing@rubavuresort.rw', 'finance@rubavuresort.rw', v_admin_id),
    (gen_random_uuid(), 'Ministry of ICT', 'ict@minict.gov.rw', '+250788500600', 'Ministry of ICT', 'Rwanda', 'active', 'Government', 'Kigali', '456789123', 'GOV-MINICT-2019', 'https://minict.gov.rw', 'KG 9 Ave, Kigali', 'P.O. Box 9012 Kigali', 'Eng. Patrick Nshuti', 'CTO', 'pnshuti@minict.gov.rw', '+250788500601', 'procurement@minict.gov.rw', 'finance@minict.gov.rw', v_admin_id),
    (gen_random_uuid(), 'Rwanda Development Board', 'info@rdb.rw', '+250788700800', 'RDB', 'Rwanda', 'prospect', 'Government', 'Kigali', '321654987', 'GOV-RDB-2018', 'https://rdb.rw', 'KG 2 Roundabout, Kigali', 'P.O. Box 3456 Kigali', 'Diane Umutoni', 'Head of Digital', 'diane@rdb.rw', '+250788700801', 'finance@rdb.rw', 'accounts@rdb.rw', v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_cust1 FROM customers WHERE email = 'info@abchotel.rw';
  SELECT id INTO v_cust2 FROM customers WHERE email = 'contact@rubavuresort.rw';
  SELECT id INTO v_cust3 FROM customers WHERE email = 'ict@minict.gov.rw';
  SELECT id INTO v_cust4 FROM customers WHERE email = 'info@rdb.rw';

  -- Projects
  INSERT INTO projects (id, name, description, status, priority, customer_id, budget, spent, start_date, end_date, progress, created_by, project_code, project_type, department, category, objectives, deliverables, success_criteria, tags, customer_price, discount, taxes, expected_revenue, estimated_costs, warranty_end, support_end, deployment_date, maintenance_end, health_score, readiness_score, communication_channels, meeting_frequency, escalation_contacts, approval_needed, approval_person, git_repo_url)
  VALUES
    (gen_random_uuid(), 'ABC Hotel Booking Platform', 'A comprehensive online booking and reservation platform for ABC Hotel with real-time availability, payment integration, and an admin dashboard for managing rooms, rates, and guest communications.', 'active', 'high', v_cust1, 45000, 18500, '2026-01-15', '2026-06-30', 42, v_admin_id, 'PRJ-2026-1001', 'customer', 'Engineering', 'Web Application', ARRAY['Launch booking platform by June 2026', 'Achieve 30% online booking rate within 3 months of launch', 'Integrate with existing hotel management system'], ARRAY['Booking website', 'Admin dashboard', 'Payment gateway integration', 'Mobile-responsive design', 'Email notification system'], ARRAY['Platform live by June 30 2026', 'Zero critical bugs at launch', 'Client sign-off on all deliverables'], ARRAY['Hospitality', 'React', 'Next.js', 'PostgreSQL', 'Stripe'], 45000, 2000, 3600, 46600, '{"development": 18000, "design": 6000, "hosting": 1200, "licenses": 800, "marketing": 2000, "travel": 500, "support": 1500, "equipment": 0, "miscellaneous": 1000}'::jsonb, '2027-06-30', '2027-12-31', '2026-06-15', '2027-06-30', 78.5, 86, ARRAY['Email', 'WhatsApp', 'VAC-P', 'Meetings'], 'weekly', ARRAY['John Mutoni (GM)', 'Bessora Neema (Sybella)'], true, 'John Mutoni', 'https://github.com/sybella/abc-hotel-booking'),
    (gen_random_uuid(), 'Rubavu Resort Website Redesign', 'Complete redesign of the Rubavu Resort website with modern UI, booking engine integration, multi-language support, and SEO optimization.', 'planning', 'medium', v_cust2, 22000, 0, '2026-03-01', '2026-08-15', 10, v_admin_id, 'PRJ-2026-1002', 'customer', 'Design', 'Web Design', ARRAY['Modernize resort web presence', 'Increase direct bookings by 25%', 'Improve Google search rankings'], ARRAY['New website design', 'Booking engine integration', 'Content management system', 'Multi-language support'], ARRAY['Client approval on design', 'Page speed score above 90', 'Launch by August 2026'], ARRAY['Hospitality', 'Design', 'SEO', 'CMS'], 22000, 1000, 1760, 22760, '{"development": 10000, "design": 5000, "hosting": 600, "licenses": 400, "marketing": 1500, "travel": 300, "support": 800, "equipment": 0, "miscellaneous": 400}'::jsonb, '2027-08-15', '2028-02-15', '2026-08-01', '2027-08-15', 65.0, 72, ARRAY['Email', 'WhatsApp', 'Meetings'], 'biweekly', ARRAY['Sarah Karangwa (Ops Director)'], true, 'Sarah Karangwa', ''),
    (gen_random_uuid(), 'Internal HR Management System', 'Internal tool for managing employee records, leave requests, performance reviews, and payroll integration.', 'active', 'medium', NULL, 0, 0, '2026-02-01', '2026-09-30', 25, v_admin_id, 'PRJ-2026-1003', 'internal', 'Engineering', 'Internal Tool', ARRAY['Streamline HR processes', 'Reduce manual paperwork by 80%', 'Integrate with accounting'], ARRAY['Employee database', 'Leave management module', 'Performance review system', 'Payroll export'], ARRAY['Adoption by all HR staff', '99% uptime', 'Positive user feedback'], ARRAY['Internal', 'HR', 'React', 'Node.js'], 0, 0, 0, 0, '{"development": 12000, "design": 2000, "hosting": 0, "licenses": 0, "marketing": 0, "travel": 0, "support": 0, "equipment": 0, "miscellaneous": 500}'::jsonb, NULL, NULL, '2026-09-15', '2027-09-30', 70.0, 80, ARRAY['VAC-P', 'Email', 'Meetings'], 'weekly', ARRAY['Bessora Neema'], false, '', 'https://github.com/sybella/hr-system')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_proj1 FROM projects WHERE project_code = 'PRJ-2026-1001';
  SELECT id INTO v_proj2 FROM projects WHERE project_code = 'PRJ-2026-1002';
  SELECT id INTO v_proj3 FROM projects WHERE project_code = 'PRJ-2026-1003';

  -- Project assignments
  INSERT INTO project_assignments (project_id, member_id, role_in_project, can_edit_tasks, can_edit_project, can_manage_members, can_view_analytics, can_import_export) VALUES
    (v_proj1, v_pm_id, 'project_manager', true, true, true, true, false),
    (v_proj1, v_dev1_id, 'frontend', true, false, false, true, false),
    (v_proj1, v_dev2_id, 'backend', true, false, false, true, false),
    (v_proj1, v_designer_id, 'ui_designer', true, false, false, false, false),
    (v_proj1, v_qa_id, 'qa', true, false, false, true, false),
    (v_proj2, v_pm_id, 'project_manager', true, true, true, true, false),
    (v_proj2, v_designer_id, 'ui_designer', true, false, false, false, false),
    (v_proj2, v_dev1_id, 'frontend', true, false, false, false, false),
    (v_proj3, v_pm_id, 'project_manager', true, true, true, true, false),
    (v_proj3, v_dev1_id, 'frontend', true, false, false, true, false),
    (v_proj3, v_dev2_id, 'backend', true, false, false, true, false)
  ON CONFLICT (project_id, member_id) DO NOTHING;

  -- Tasks
  INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, created_by, estimated_hours) VALUES
    (v_proj1, 'Design booking flow wireframes', 'Create low-fidelity wireframes for the entire booking journey', 'done', 'high', v_designer_id, '2026-02-01', v_admin_id, 16),
    (v_proj1, 'Implement booking API', 'Build REST API endpoints for room availability and booking', 'in_progress', 'high', v_dev2_id, '2026-03-15', v_admin_id, 40),
    (v_proj1, 'Build booking UI components', 'React components for date picker, room selection, and checkout', 'in_progress', 'high', v_dev1_id, '2026-03-20', v_admin_id, 32),
    (v_proj1, 'Integrate Stripe payment', 'Connect Stripe payment gateway for online bookings', 'todo', 'critical', v_dev2_id, '2026-04-01', v_admin_id, 24),
    (v_proj1, 'Write test suite for booking flow', 'End-to-end tests covering the full booking journey', 'todo', 'medium', v_qa_id, '2026-04-15', v_admin_id, 20),
    (v_proj1, 'Admin dashboard analytics', 'Charts and KPIs for hotel admin dashboard', 'todo', 'medium', v_dev1_id, '2026-05-01', v_admin_id, 16),
    (v_proj2, 'Competitor website analysis', 'Research and document competitor resort websites', 'done', 'low', v_designer_id, '2026-03-10', v_admin_id, 8),
    (v_proj2, 'Create mood board', 'Visual mood board for the new resort website', 'in_progress', 'medium', v_designer_id, '2026-03-20', v_admin_id, 12),
    (v_proj2, 'Design homepage mockups', 'High-fidelity homepage design in Figma', 'todo', 'high', v_designer_id, '2026-04-01', v_admin_id, 24),
    (v_proj3, 'Employee database schema', 'Design and implement the employee database tables', 'done', 'high', v_dev2_id, '2026-02-15', v_admin_id, 12),
    (v_proj3, 'Build leave request form', 'UI for submitting and tracking leave requests', 'in_progress', 'medium', v_dev1_id, '2026-03-10', v_admin_id, 20),
    (v_proj3, 'Payroll export module', 'Generate payroll reports for accounting', 'todo', 'medium', v_dev2_id, '2026-04-01', v_admin_id, 16)
  ON CONFLICT (id) DO NOTHING;

  -- Financial records
  INSERT INTO financial_records (title, type, amount, currency, category, project_id, description, date, status, created_by) VALUES
    ('Project Revenue - ABC Hotel Booking', 'income', 46600, 'USD', 'project_revenue', v_proj1, 'Expected revenue from ABC Hotel booking platform', '2026-01-15', 'pending', v_admin_id),
    ('Development Costs - ABC Hotel', 'expense', 18000, 'USD', 'project_cost', v_proj1, 'Development labor costs for ABC Hotel project', '2026-01-15', 'pending', v_admin_id),
    ('Design Costs - ABC Hotel', 'expense', 6000, 'USD', 'project_cost', v_proj1, 'UI/UX design costs', '2026-01-20', 'approved', v_admin_id),
    ('Hosting - ABC Hotel (Annual)', 'expense', 1200, 'USD', 'infrastructure', v_proj1, 'AWS hosting for first year', '2026-02-01', 'paid', v_admin_id),
    ('Project Revenue - Rubavu Resort', 'income', 22760, 'USD', 'project_revenue', v_proj2, 'Expected revenue from Rubavu Resort redesign', '2026-03-01', 'pending', v_admin_id),
    ('Internal HR System Costs', 'expense', 14500, 'USD', 'project_cost', v_proj3, 'Internal development costs for HR system', '2026-02-01', 'pending', v_admin_id),
    ('Office Rent - March 2026', 'expense', 3000, 'USD', 'operations', NULL, 'Monthly office rent', '2026-03-01', 'paid', v_admin_id),
    ('Software Licenses Q1', 'expense', 2400, 'USD', 'operations', NULL, 'Annual software licenses (Figma, GitHub, etc.)', '2026-01-05', 'paid', v_admin_id),
    ('Client Payment - ABC Hotel Deposit', 'income', 15000, 'USD', 'client_payment', v_proj1, 'Initial deposit from ABC Hotel', '2026-01-20', 'paid', v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  -- Budget proposals
  INSERT INTO budget_proposals (title, description, amount, currency, category, project_id, proposed_by, current_step, total_steps, status, priority) VALUES
    ('ABC Hotel Booking - Q1 Budget', 'Budget for the first quarter of ABC Hotel platform development', 25000, 'USD', 'Engineering', v_proj1, v_admin_id, 2, 3, 'pending', 'high'),
    ('Rubavu Resort Redesign - Full Budget', 'Complete budget for the Rubavu Resort website redesign', 22000, 'USD', 'Design', v_proj2, v_admin_id, 1, 2, 'pending', 'medium')
  ON CONFLICT (id) DO NOTHING;

  -- Channels
  INSERT INTO channels (id, name, description, type, created_by) VALUES
    (gen_random_uuid(), 'abc-hotel-booking', 'Discussion space for ABC Hotel Booking Platform', 'private', v_admin_id),
    (gen_random_uuid(), 'rubavu-resort', 'Discussion space for Rubavu Resort redesign', 'private', v_admin_id),
    (gen_random_uuid(), 'general', 'General company announcements', 'public', v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_chan1 FROM channels WHERE name = 'abc-hotel-booking';
  SELECT id INTO v_chan2 FROM channels WHERE name = 'general';
  SELECT id INTO v_chan3 FROM channels WHERE name = 'rubavu-resort';

  INSERT INTO channel_members (channel_id, member_id) VALUES
    (v_chan1, v_admin_id), (v_chan1, v_pm_id), (v_chan1, v_dev1_id), (v_chan1, v_dev2_id), (v_chan1, v_designer_id), (v_chan1, v_qa_id),
    (v_chan2, v_admin_id), (v_chan2, v_pm_id), (v_chan2, v_dev1_id), (v_chan2, v_dev2_id), (v_chan2, v_designer_id), (v_chan2, v_qa_id),
    (v_chan3, v_admin_id), (v_chan3, v_pm_id), (v_chan3, v_designer_id), (v_chan3, v_dev1_id)
  ON CONFLICT (channel_id, member_id) DO NOTHING;

  INSERT INTO messages (channel_id, sender_id, content, message_type) VALUES
    (v_chan1, v_admin_id, 'Welcome to the ABC Hotel project channel! Let''s use this for all project discussions.', 'system'),
    (v_chan1, v_pm_id, 'Team, the wireframes are approved by the client. We can start development on the booking flow.', 'text'),
    (v_chan1, v_dev2_id, 'I''ve started on the booking API. Should have the room availability endpoint ready by Friday.', 'text'),
    (v_chan1, v_qa_id, 'I''ll prepare the test plan while development is in progress. Any specific areas to focus on?', 'text'),
    (v_chan2, v_admin_id, 'Welcome to VAC-P! This is the general channel for company-wide announcements.', 'system'),
    (v_chan3, v_pm_id, 'Rubavu Resort project is now in planning phase. Waiting on brand guidelines from the client.', 'text')
  ON CONFLICT (id) DO NOTHING;

  -- Accountability reports
  INSERT INTO accountability_reports (member_id, report_date, report_type, completed_tasks, planned_tasks, blockers, notes, status) VALUES
    (v_pm_id, CURRENT_DATE - 1, 'daily', 'Reviewed ABC Hotel wireframes; Met with client for approval; Updated project timeline', 'Begin development phase; Team standup; Review Rubavu requirements', 'None', 'Client very happy with wireframes', 'submitted'),
    (v_dev1_id, CURRENT_DATE - 1, 'daily', 'Set up project repository; Configured CI/CD pipeline', 'Start building booking UI components', 'Waiting for API documentation from backend team', '', 'submitted'),
    (v_dev2_id, CURRENT_DATE - 1, 'daily', 'Designed database schema for bookings; Set up development environment', 'Implement room availability API endpoint', 'None', '', 'submitted'),
    (v_designer_id, CURRENT_DATE - 1, 'daily', 'Finalized ABC Hotel wireframes; Started Rubavu mood board', 'Continue Rubavu mood board; Begin homepage mockups', 'Need brand guidelines from Rubavu client', '', 'flagged'),
    (v_qa_id, CURRENT_DATE - 2, 'weekly', 'Reviewed wireframes for testability; Documented test scenarios', 'Create automated test suite; Set up test environment', 'Test environment not ready yet', 'Weekly report - good progress overall', 'submitted')
  ON CONFLICT (id) DO NOTHING;

  -- Milestones
  INSERT INTO project_milestones (project_id, name, target_date, status, sort_order) VALUES
    (v_proj1, 'Planning', '2026-01-31', 'completed', 0), (v_proj1, 'UI', '2026-02-28', 'completed', 1), (v_proj1, 'Development', '2026-04-30', 'in_progress', 2), (v_proj1, 'Testing', '2026-05-31', 'planned', 3), (v_proj1, 'Deployment', '2026-06-15', 'planned', 4), (v_proj1, 'Training', '2026-06-25', 'planned', 5), (v_proj1, 'Launch', '2026-06-30', 'planned', 6), (v_proj1, 'Support', '2027-06-30', 'planned', 7),
    (v_proj2, 'Planning', '2026-03-15', 'completed', 0), (v_proj2, 'UI', '2026-04-30', 'in_progress', 1), (v_proj2, 'Development', '2026-06-30', 'planned', 2), (v_proj2, 'Testing', '2026-07-31', 'planned', 3), (v_proj2, 'Deployment', '2026-08-01', 'planned', 4), (v_proj2, 'Launch', '2026-08-15', 'planned', 5),
    (v_proj3, 'Planning', '2026-02-15', 'completed', 0), (v_proj3, 'Development', '2026-06-30', 'in_progress', 1), (v_proj3, 'Testing', '2026-08-31', 'planned', 2), (v_proj3, 'Deployment', '2026-09-15', 'planned', 3)
  ON CONFLICT (id) DO NOTHING;

  -- Phases
  INSERT INTO project_phases (project_id, name, description, sort_order, status, start_date, end_date, progress) VALUES
    (v_proj1, 'Planning', 'Requirements gathering, scope definition, and project setup', 0, 'completed', '2026-01-15', '2026-01-31', 100),
    (v_proj1, 'Design', 'UI/UX design, wireframes, and design system', 1, 'completed', '2026-02-01', '2026-02-28', 100),
    (v_proj1, 'Development', 'Implementation of features and functionality', 2, 'active', '2026-03-01', '2026-04-30', 45),
    (v_proj1, 'Testing', 'QA, bug fixing, and validation', 3, 'planned', '2026-05-01', '2026-05-31', 0),
    (v_proj1, 'Deployment', 'Release to production and go-live', 4, 'planned', '2026-06-01', '2026-06-15', 0),
    (v_proj2, 'Planning', 'Research and requirements', 0, 'completed', '2026-03-01', '2026-03-15', 100),
    (v_proj2, 'Design', 'Website redesign and mockups', 1, 'active', '2026-03-16', '2026-04-30', 30),
    (v_proj2, 'Development', 'Build the new website', 2, 'planned', '2026-05-01', '2026-06-30', 0),
    (v_proj3, 'Planning', 'System design and architecture', 0, 'completed', '2026-02-01', '2026-02-15', 100),
    (v_proj3, 'Development', 'Build HR modules', 1, 'active', '2026-02-16', '2026-06-30', 25)
  ON CONFLICT (id) DO NOTHING;

  -- Risks
  INSERT INTO project_risks (project_id, risk, probability, impact, owner, mitigation, status) VALUES
    (v_proj1, 'Client may delay content delivery for website', 'medium', 'high', v_pm_id, 'Set up content checklist and weekly reminders; provide templates to speed up content creation', 'open'),
    (v_proj1, 'Payment gateway integration complexity', 'medium', 'medium', v_dev2_id, 'Use Stripe''s official SDK and allocate extra testing time', 'open'),
    (v_proj1, 'Team member availability during holidays', 'low', 'medium', v_pm_id, 'Plan critical tasks outside of holiday periods; cross-train team members', 'mitigated'),
    (v_proj2, 'Client brand guidelines not yet provided', 'high', 'high', v_designer_id, 'Requested guidelines from client; following up weekly; using industry standards as fallback', 'open'),
    (v_proj3, 'Integration with existing payroll system may require custom adapter', 'medium', 'high', v_dev2_id, 'Early proof-of-concept integration to validate feasibility', 'open')
  ON CONFLICT (id) DO NOTHING;

  -- Dependencies
  INSERT INTO project_dependencies (project_id, description, dependency_type, status, due_date) VALUES
    (v_proj1, 'Client to provide hotel room inventory data', 'customer', 'pending', '2026-03-01'),
    (v_proj1, 'Stripe account setup and API keys', 'payment', 'pending', '2026-03-15'),
    (v_proj1, 'Domain DNS configuration for booking subdomain', 'domain', 'pending', '2026-06-01'),
    (v_proj2, 'Brand guidelines and logo files from client', 'customer', 'pending', '2026-03-20'),
    (v_proj2, 'Hosting environment for new website', 'hosting', 'pending', '2026-07-01'),
    (v_proj3, 'HR department to define leave policy rules', 'internal', 'resolved', '2026-02-10')
  ON CONFLICT (id) DO NOTHING;

  -- Documents
  INSERT INTO project_documents (project_id, name, document_type, folder, url, description, uploaded_by) VALUES
    (v_proj1, 'ABC Hotel - Project Proposal', 'proposal', 'other', 'https://docs.google.com/document/d/abc-proposal', 'Initial project proposal sent to client', v_admin_id),
    (v_proj1, 'ABC Hotel - Signed Contract', 'contract', 'contracts', 'https://docs.google.com/document/d/abc-contract', 'Signed service agreement', v_admin_id),
    (v_proj1, 'ABC Hotel - Wireframes', 'wireframes', 'design', 'https://figma.com/file/abc-wireframes', 'Low-fidelity wireframes for booking flow', v_designer_id),
    (v_proj1, 'ABC Hotel - API Documentation', 'api_docs', 'requirements', 'https://github.com/sybella/abc-hotel-booking/wiki/API', 'Internal API documentation', v_dev2_id),
    (v_proj1, 'Client Meeting Notes - Feb 2026', 'meeting_minutes', 'meetings', 'https://docs.google.com/document/d/abc-meeting', 'Notes from February client meeting', v_pm_id),
    (v_proj2, 'Rubavu Resort - Project Quotation', 'quotation', 'finance', 'https://docs.google.com/document/d/rubavu-quote', 'Quotation sent to Rubavu Resort', v_admin_id),
    (v_proj2, 'Rubavu Resort - Competitor Analysis', 'research', 'other', 'https://docs.google.com/document/d/rubavu-research', 'Analysis of competitor resort websites', v_designer_id),
    (v_proj3, 'HR System - Requirements Document', 'requirements', 'requirements', 'https://docs.google.com/document/d/hr-requirements', 'Detailed requirements for HR system', v_admin_id),
    (v_proj3, 'HR System - Database Design', 'design', 'design', 'https://docs.google.com/document/d/hr-dbdesign', 'Database schema and design document', v_dev2_id)
  ON CONFLICT (id) DO NOTHING;

  -- Requirements checklist
  INSERT INTO project_requirements_checklist (project_id, item, is_done, sort_order) VALUES
    (v_proj1, 'Logo', true, 0), (v_proj1, 'Hosting', true, 1), (v_proj1, 'Domain', false, 2), (v_proj1, 'Content', false, 3), (v_proj1, 'Images', false, 4), (v_proj1, 'Videos', false, 5), (v_proj1, 'Pricing', true, 6), (v_proj1, 'Menu', false, 7), (v_proj1, 'Contacts', true, 8), (v_proj1, 'Legal Docs', false, 9),
    (v_proj2, 'Logo', false, 0), (v_proj2, 'Hosting', false, 1), (v_proj2, 'Domain', false, 2), (v_proj2, 'Content', false, 3), (v_proj2, 'Images', false, 4), (v_proj2, 'Contacts', true, 5), (v_proj2, 'Legal Docs', false, 6),
    (v_proj3, 'Content', true, 0), (v_proj3, 'Contacts', true, 1), (v_proj3, 'Legal Docs', true, 2)
  ON CONFLICT (id) DO NOTHING;

  -- Activity log
  INSERT INTO project_activity_log (project_id, action, description, actor_id, metadata) VALUES
    (v_proj1, 'project_created', 'Project "ABC Hotel Booking Platform" created', v_admin_id, '{"project_type": "customer", "project_code": "PRJ-2026-1001"}'::jsonb),
    (v_proj1, 'milestone_completed', 'Milestone "Planning" completed', v_pm_id, '{"milestone": "Planning"}'::jsonb),
    (v_proj1, 'milestone_completed', 'Milestone "UI" completed', v_pm_id, '{"milestone": "UI"}'::jsonb),
    (v_proj1, 'phase_started', 'Development phase started', v_pm_id, '{"phase": "Development"}'::jsonb),
    (v_proj1, 'task_completed', 'Task "Design booking flow wireframes" completed', v_designer_id, '{"task": "wireframes"}'::jsonb),
    (v_proj1, 'document_uploaded', 'Document "ABC Hotel - Wireframes" uploaded', v_designer_id, '{"document_type": "wireframes"}'::jsonb),
    (v_proj1, 'payment_received', 'Client deposit of $15,000 received', v_admin_id, '{"amount": 15000, "currency": "USD"}'::jsonb),
    (v_proj2, 'project_created', 'Project "Rubavu Resort Website Redesign" created', v_admin_id, '{"project_type": "customer", "project_code": "PRJ-2026-1002"}'::jsonb),
    (v_proj2, 'milestone_completed', 'Milestone "Planning" completed', v_pm_id, '{"milestone": "Planning"}'::jsonb),
    (v_proj2, 'phase_started', 'Design phase started', v_pm_id, '{"phase": "Design"}'::jsonb),
    (v_proj3, 'project_created', 'Project "Internal HR Management System" created', v_admin_id, '{"project_type": "internal", "project_code": "PRJ-2026-1003"}'::jsonb),
    (v_proj3, 'milestone_completed', 'Milestone "Planning" completed', v_pm_id, '{"milestone": "Planning"}'::jsonb),
    (v_proj3, 'phase_started', 'Development phase started', v_pm_id, '{"phase": "Development"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Notifications
  INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
    (v_admin_id, 'New project assigned', 'You have been assigned as creator of "ABC Hotel Booking Platform"', 'task', false, '/projects/' || v_proj1::text),
    (v_admin_id, 'Client deposit received', '$15,000 deposit received from ABC Hotel', 'success', false, '/finance'),
    (v_admin_id, 'Milestone completed', 'Planning milestone completed for ABC Hotel project', 'info', false, '/projects/' || v_proj1::text),
    (v_admin_id, 'Risk flagged', 'Brand guidelines not provided by Rubavu Resort client', 'warning', false, '/projects/' || v_proj2::text),
    (v_admin_id, 'Budget approval needed', 'ABC Hotel Q1 budget proposal needs your approval', 'task', false, '/approvals'),
    (v_admin_id, 'New accountability report', 'Grace Iribagiza submitted a weekly accountability report', 'info', true, '/accountability'),
    (v_admin_id, 'Task completed', 'Wireframes task completed by David Kalisa', 'success', true, '/projects/' || v_proj1::text),
    (v_admin_id, 'New message', 'New message in ABC Hotel project channel', 'message', false, '/messages')
  ON CONFLICT (id) DO NOTHING;

  -- Project links
  INSERT INTO project_links (project_id, linked_entity_type, linked_entity_id, linked_entity_name, created_by) VALUES
    (v_proj1, 'channel', v_chan1, 'abc-hotel-booking', v_admin_id),
    (v_proj2, 'channel', v_chan3, 'rubavu-resort', v_admin_id),
    (v_proj1, 'customer', v_cust1, 'ABC Hotel Ltd', v_admin_id),
    (v_proj2, 'customer', v_cust2, 'Rubavu Resort', v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Mock data seeded successfully';
END $$;
