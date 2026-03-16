-- ============================================================
-- Nigerian National Policy Management System – Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor
-- ============================================================
-- NOTE: profile IDs must match real auth.users rows.
--       For demo purposes we use deterministic UUIDs.
--       Replace these with real user IDs after sign-up, or
--       create auth users first via the Dashboard / API.
-- ============================================================

-- ── 1. MDAs ──────────────────────────────────────────────────
INSERT INTO mdas (id, name, code, sector, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Federal Ministry of Finance',                      'FMF',   'Finance',        '2024-01-01T00:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Federal Ministry of Health',                       'FMH',   'Health',         '2024-01-01T00:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'Federal Ministry of Education',                    'FME',   'Education',      '2024-01-01T00:00:00Z'),
  ('a0000000-0000-0000-0000-000000000004', 'National Information Technology Development Agency','NITDA', 'Technology',     '2024-01-01T00:00:00Z'),
  ('a0000000-0000-0000-0000-000000000005', 'Federal Ministry of Works',                        'FMW',   'Infrastructure', '2024-01-01T00:00:00Z'),
  ('a0000000-0000-0000-0000-000000000006', 'Federal Ministry of Agriculture',                  'FMA',   'Agriculture',    '2024-01-01T00:00:00Z');

-- ── 2. Demo auth users ───────────────────────────────────────
-- Create demo users in auth.users so profiles can reference them.
-- In production these would be real sign-ups; for seed purposes
-- we insert stub rows via the service-role / SQL Editor.

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'adamu.bello@gov.ng',      crypt('Demo1234!', gen_salt('bf')), now(), '2024-01-01T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Adamu Bello"}',        'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000002', 'ngozi.okafor@gov.ng',     crypt('Demo1234!', gen_salt('bf')), now(), '2024-01-15T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ngozi Okafor"}',       'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000003', 'emeka.nwosu@gov.ng',      crypt('Demo1234!', gen_salt('bf')), now(), '2024-02-01T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Emeka Nwosu"}',        'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000004', 'fatima.yusuf@gov.ng',     crypt('Demo1234!', gen_salt('bf')), now(), '2024-02-01T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fatima Yusuf"}',       'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000005', 'oluwaseun.adeyemi@gov.ng',crypt('Demo1234!', gen_salt('bf')), now(), '2024-03-01T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Oluwaseun Adeyemi"}',  'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000006', 'chioma.eze@gov.ng',       crypt('Demo1234!', gen_salt('bf')), now(), '2024-01-10T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chioma Eze"}',         'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000007', 'ibrahim.musa@gov.ng',     crypt('Demo1234!', gen_salt('bf')), now(), '2024-04-01T00:00:00Z', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ibrahim Musa"}',       'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Profiles ──────────────────────────────────────────────
INSERT INTO profiles (id, full_name, role, mda_id, avatar_url, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Adamu Bello',        'super_admin',    'a0000000-0000-0000-0000-000000000004', NULL, '2024-01-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', 'Ngozi Okafor',       'policy_officer', 'a0000000-0000-0000-0000-000000000002', NULL, '2024-01-15T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Emeka Nwosu',        'reviewer',       'a0000000-0000-0000-0000-000000000001', NULL, '2024-02-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000004', 'Fatima Yusuf',       'final_approver', 'a0000000-0000-0000-0000-000000000002', NULL, '2024-02-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000005', 'Oluwaseun Adeyemi',  'me_officer',     'a0000000-0000-0000-0000-000000000003', NULL, '2024-03-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000006', 'Chioma Eze',         'mda_admin',      'a0000000-0000-0000-0000-000000000001', NULL, '2024-01-10T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000007', 'Ibrahim Musa',       'policy_officer', 'a0000000-0000-0000-0000-000000000006', NULL, '2024-04-01T00:00:00Z');

-- ── 4. Policies ──────────────────────────────────────────────
INSERT INTO policies (id, title, body, status, version, mda_id, owner_id, attachment_url, created_at, updated_at, published_at) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'National Health Insurance Scheme Expansion Policy',
    '<h2>Executive Summary</h2><p>This policy establishes the framework for expanding the National Health Insurance coverage to all Nigerian citizens, with a particular focus on informal sector workers and rural populations. The expansion aims to achieve Universal Health Coverage (UHC) by 2030 in alignment with the Sustainable Development Goals.</p><h2>Objectives</h2><ul><li>Extend health insurance coverage to 80% of the Nigerian population by 2028</li><li>Establish community-based health insurance schemes in all 36 states</li><li>Create a digital health records infrastructure across all primary health centers</li><li>Reduce out-of-pocket health expenditure from 70% to below 30%</li></ul><h2>Legal Basis</h2><p>This policy derives its authority from the National Health Insurance Authority Act 2022, the National Health Act 2014, and aligns with the National Health Policy 2016.</p><h2>Implementation Strategy</h2><p>The implementation will proceed in three phases across all geopolitical zones. Phase 1 (Year 1) focuses on South-West and North-Central zones. Phase 2 (Year 2) covers South-East and North-West. Phase 3 (Year 3) completes the rollout in South-South and North-East zones.</p>',
    'published', 3,
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    '2024-03-15T09:00:00Z', '2024-06-20T14:30:00Z', '2024-06-20T14:30:00Z'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Digital Economy Tax Modernization Framework',
    '<h2>Overview</h2><p>A comprehensive framework for modernizing Nigeria''s tax system to effectively capture revenue from digital economic activities. This policy addresses the challenges of taxing cross-border digital services, e-commerce transactions, and digital platforms operating within Nigeria.</p><h2>Scope</h2><p>Covers VAT on digital services, Significant Economic Presence rules, and digital platform taxation including ride-hailing, e-commerce marketplaces, and streaming services.</p><h2>Key Provisions</h2><ul><li>Digital services tax of 6% on gross turnover for non-resident digital companies</li><li>Mandatory registration for digital platforms with annual turnover exceeding ₦25 million</li><li>Automated tax collection through payment gateways</li><li>Real-time transaction reporting requirements</li></ul>',
    'in_review', 2,
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    '2024-05-01T10:00:00Z', '2024-07-10T16:00:00Z', NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'National Education Technology Integration Policy',
    '<h2>Purpose</h2><p>Establish guidelines for integrating modern technology into Nigerian educational institutions from primary to tertiary levels.</p><h2>Focus Areas</h2><ul><li>Smart classroom deployment in 5,000 schools within 3 years</li><li>Teacher digital literacy training programs</li><li>Open educational resource platforms</li><li>Nationwide student digital ID system</li></ul>',
    'draft', 1,
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000005',
    NULL,
    '2024-07-05T08:00:00Z', '2024-07-15T11:00:00Z', NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'National Cybersecurity Strategy 2025-2030',
    '<h2>Vision</h2><p>A secure and resilient cyberspace that supports Nigeria''s digital transformation and protects citizens, businesses, and critical national infrastructure.</p><h2>Strategic Pillars</h2><ul><li>Governance and Institutional Framework</li><li>Cybersecurity Awareness and Capacity Building</li><li>Critical Infrastructure Protection</li><li>Cybercrime Prevention and International Cooperation</li></ul>',
    'approved', 4,
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    '2024-02-01T09:00:00Z', '2024-08-01T10:00:00Z', NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'Federal Highway Rehabilitation Program Policy',
    '<h2>Background</h2><p>Nigeria''s federal road network spanning over 35,000 km requires urgent rehabilitation and maintenance to support economic growth and regional integration.</p>',
    'published', 2,
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    '2024-01-20T09:00:00Z', '2024-04-15T12:00:00Z', '2024-04-15T12:00:00Z'
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'Agricultural Value Chain Development Policy',
    '<h2>Mission</h2><p>Transform Nigeria''s agricultural sector through value chain development, mechanization, and market access improvement to achieve food security and increased export earnings.</p>',
    'rejected', 1,
    'a0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000007',
    NULL,
    '2024-06-01T09:00:00Z', '2024-07-20T09:00:00Z', NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'Primary Healthcare Under One Roof Initiative',
    '<h2>Goal</h2><p>Revitalize primary healthcare delivery in Nigeria by strengthening the management and coordination of primary healthcare centers across the 774 LGAs.</p>',
    'in_review', 2,
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    '2024-04-10T09:00:00Z', '2024-07-25T14:00:00Z', NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    'National Data Protection and Privacy Framework',
    '<h2>Objective</h2><p>Establish comprehensive data protection standards to safeguard personal data of Nigerian citizens in alignment with global best practices and the NDPR.</p>',
    'draft', 1,
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    '2024-08-01T09:00:00Z', '2024-08-10T09:00:00Z', NULL
  );

-- ── 5. Workflow steps ────────────────────────────────────────
INSERT INTO workflow_steps (id, policy_id, approver_id, step_order, status, comment, actioned_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 1, 'approved',  'Excellent policy document. Well-researched.',                     '2024-05-10T10:00:00Z'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2, 'approved',  'Approved for publication.',                                       '2024-06-20T14:00:00Z'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000006', 1, 'approved',  'Financial implications well documented.',                         '2024-06-15T09:00:00Z'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 2, 'pending',   NULL,                                                              NULL),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 1, 'rejected',  'Budget allocation needs revision. Implementation timeline unrealistic.', '2024-07-20T09:00:00Z'),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000004', 1, 'pending',   NULL,                                                              NULL),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 1, 'approved',  'Comprehensive strategy.',                                         '2024-07-05T10:00:00Z'),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 2, 'approved',  'Ready for ministerial sign-off.',                                 '2024-08-01T10:00:00Z');

-- ── 6. Indicators ────────────────────────────────────────────
INSERT INTO indicators (id, policy_id, name, baseline, target, unit, frequency) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Insurance Enrolment Rate (%)',            5,    80,    '%',          'quarterly'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Accredited Health Facilities',            2000, 12000, 'facilities', 'quarterly'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Out-of-pocket Health Expenditure (%)',     70,   30,    '%',          'annually'),
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'Roads Rehabilitated (km)',                 0,    5000,  'km',         'quarterly'),
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'Travel Time Reduction (%)',                0,    40,    '%',          'annually'),
  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 'Cyber Incident Response Time (hrs)',       72,   12,    'hours',      'monthly'),
  ('e0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', 'Critical Infrastructure Protected (%)',    20,   95,    '%',          'quarterly'),
  ('e0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'Digital Tax Revenue (₦ Billion)',          15,   120,   '₦B',        'quarterly');

-- ── 7. Indicator readings ────────────────────────────────────
INSERT INTO indicator_readings (id, indicator_id, value, period, submitted_by, notes, created_at) VALUES
  -- Insurance Enrolment Rate
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',   5,  '2024-Q1', 'b0000000-0000-0000-0000-000000000002', 'Baseline measurement',                     '2024-04-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001',  12,  '2024-Q2', 'b0000000-0000-0000-0000-000000000002', 'SW zone rollout started',                  '2024-07-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001',  22,  '2024-Q3', 'b0000000-0000-0000-0000-000000000005', 'NC zone added',                            '2024-10-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001',  31,  '2024-Q4', 'b0000000-0000-0000-0000-000000000005', 'Community schemes contributing significantly','2025-01-01T09:00:00Z'),
  -- Accredited Health Facilities
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 2000, '2024-Q1', 'b0000000-0000-0000-0000-000000000002', NULL, '2024-04-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 3200, '2024-Q2', 'b0000000-0000-0000-0000-000000000002', NULL, '2024-07-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', 4800, '2024-Q3', 'b0000000-0000-0000-0000-000000000005', NULL, '2024-10-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000002', 6100, '2024-Q4', 'b0000000-0000-0000-0000-000000000005', NULL, '2025-01-01T09:00:00Z'),
  -- Roads Rehabilitated
  ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000004',    0, '2024-Q1', 'b0000000-0000-0000-0000-000000000003', 'Project commenced',  '2024-04-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000004',  350, '2024-Q2', 'b0000000-0000-0000-0000-000000000003', NULL,                 '2024-07-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000004',  900, '2024-Q3', 'b0000000-0000-0000-0000-000000000003', NULL,                 '2024-10-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000004', 1400, '2024-Q4', 'b0000000-0000-0000-0000-000000000003', 'Rainy season delays','2025-01-01T09:00:00Z'),
  -- Cyber Incident Response Time
  ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000006',  72, '2024-03', 'b0000000-0000-0000-0000-000000000001', 'Baseline',          '2024-04-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000006',  60, '2024-04', 'b0000000-0000-0000-0000-000000000001', NULL,                '2024-05-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000006',  45, '2024-05', 'b0000000-0000-0000-0000-000000000001', NULL,                '2024-06-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000006',  30, '2024-06', 'b0000000-0000-0000-0000-000000000001', 'CERT team expanded','2024-07-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000006',  22, '2024-07', 'b0000000-0000-0000-0000-000000000001', NULL,                '2024-08-01T09:00:00Z'),
  -- Digital Tax Revenue
  ('f0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000008',  15, '2024-Q1', 'b0000000-0000-0000-0000-000000000006', 'Pre-policy baseline',              '2024-04-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000008',  28, '2024-Q2', 'b0000000-0000-0000-0000-000000000006', NULL,                               '2024-07-01T09:00:00Z'),
  ('f0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000008',  45, '2024-Q3', 'b0000000-0000-0000-0000-000000000006', 'Platform registrations increasing', '2024-10-01T09:00:00Z');

-- ── 8. Audit logs ────────────────────────────────────────────
INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, diff, created_at) VALUES
  ('00000000-a000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'policy',        'c0000000-0000-0000-0000-000000000001', 'created',               '{"title":"National Health Insurance Scheme Expansion Policy"}'::jsonb,    '2024-03-15T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'policy',        'c0000000-0000-0000-0000-000000000001', 'updated',               '{"body":"Added implementation strategy section"}'::jsonb,                 '2024-04-20T14:00:00Z'),
  ('00000000-a000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'policy',        'c0000000-0000-0000-0000-000000000001', 'submitted_for_review',  '{}'::jsonb,                                                               '2024-05-01T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'workflow_step', 'd0000000-0000-0000-0000-000000000001', 'approved',              '{"comment":"Excellent policy document"}'::jsonb,                          '2024-05-10T10:00:00Z'),
  ('00000000-a000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'workflow_step', 'd0000000-0000-0000-0000-000000000002', 'approved',              '{"comment":"Approved for publication"}'::jsonb,                           '2024-06-20T14:00:00Z'),
  ('00000000-a000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'policy',        'c0000000-0000-0000-0000-000000000001', 'published',             '{"status":"published"}'::jsonb,                                           '2024-06-20T14:30:00Z'),
  ('00000000-a000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'policy',        'c0000000-0000-0000-0000-000000000002', 'created',               '{"title":"Digital Economy Tax Modernization Framework"}'::jsonb,          '2024-05-01T10:00:00Z'),
  ('00000000-a000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000006', 'workflow_step', 'd0000000-0000-0000-0000-000000000003', 'approved',              '{}'::jsonb,                                                               '2024-06-15T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 'policy',        'c0000000-0000-0000-0000-000000000003', 'created',               '{"title":"National Education Technology Integration Policy"}'::jsonb,     '2024-07-05T08:00:00Z'),
  ('00000000-a000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'workflow_step', 'd0000000-0000-0000-0000-000000000005', 'rejected',              '{"comment":"Budget allocation needs revision"}'::jsonb,                   '2024-07-20T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', 'policy',        'c0000000-0000-0000-0000-000000000004', 'created',               '{}'::jsonb,                                                               '2024-02-01T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000002', 'indicator',     'e0000000-0000-0000-0000-000000000001', 'reading_submitted',     '{"value":31,"period":"2024-Q4"}'::jsonb,                                  '2025-01-01T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', 'user',          'b0000000-0000-0000-0000-000000000007', 'created_user',          '{"full_name":"Ibrahim Musa","role":"policy_officer"}'::jsonb,             '2024-04-01T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000006', 'policy',        'c0000000-0000-0000-0000-000000000002', 'submitted_for_review',  '{}'::jsonb,                                                               '2024-06-01T09:00:00Z'),
  ('00000000-a000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000007', 'policy',        'c0000000-0000-0000-0000-000000000006', 'created',               '{"title":"Agricultural Value Chain Development Policy"}'::jsonb,          '2024-06-01T09:00:00Z');

-- ── Done ─────────────────────────────────────────────────────
-- Demo credentials:
--   Any demo user email (e.g. adamu.bello@gov.ng)
--   Password: Demo1234!
