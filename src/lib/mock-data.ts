import type {
  Profile,
  MDA,
  Policy,
  WorkflowStep,
  Indicator,
  IndicatorReading,
  AuditLog,
} from '@/lib/types/database.types';

// ─── MDAs ───
export const mdas: MDA[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'Federal Ministry of Finance', code: 'FMF', sector: 'Finance', created_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Federal Ministry of Health', code: 'FMH', sector: 'Health', created_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Federal Ministry of Education', code: 'FME', sector: 'Education', created_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000004', name: 'National Information Technology Development Agency', code: 'NITDA', sector: 'Technology', created_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000005', name: 'Federal Ministry of Works', code: 'FMW', sector: 'Infrastructure', created_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000006', name: 'Federal Ministry of Agriculture', code: 'FMA', sector: 'Agriculture', created_at: '2024-01-01T00:00:00Z' },
];

// ─── Profiles ───
export const profiles: Profile[] = [
  { id: 'b0000000-0000-0000-0000-000000000001', full_name: 'Adamu Bello', role: 'super_admin', mda_id: 'a0000000-0000-0000-0000-000000000004', avatar_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 'b0000000-0000-0000-0000-000000000002', full_name: 'Ngozi Okafor', role: 'policy_officer', mda_id: 'a0000000-0000-0000-0000-000000000002', avatar_url: null, created_at: '2024-01-15T00:00:00Z' },
  { id: 'b0000000-0000-0000-0000-000000000003', full_name: 'Emeka Nwosu', role: 'reviewer', mda_id: 'a0000000-0000-0000-0000-000000000001', avatar_url: null, created_at: '2024-02-01T00:00:00Z' },
  { id: 'b0000000-0000-0000-0000-000000000004', full_name: 'Fatima Yusuf', role: 'final_approver', mda_id: 'a0000000-0000-0000-0000-000000000002', avatar_url: null, created_at: '2024-02-01T00:00:00Z' },
  { id: 'b0000000-0000-0000-0000-000000000005', full_name: 'Oluwaseun Adeyemi', role: 'me_officer', mda_id: 'a0000000-0000-0000-0000-000000000003', avatar_url: null, created_at: '2024-03-01T00:00:00Z' },
  { id: 'b0000000-0000-0000-0000-000000000006', full_name: 'Chioma Eze', role: 'mda_admin', mda_id: 'a0000000-0000-0000-0000-000000000001', avatar_url: null, created_at: '2024-01-10T00:00:00Z' },
  { id: 'b0000000-0000-0000-0000-000000000007', full_name: 'Ibrahim Musa', role: 'policy_officer', mda_id: 'a0000000-0000-0000-0000-000000000006', avatar_url: null, created_at: '2024-04-01T00:00:00Z' },
];

// ─── Policies ───
export const policies: Policy[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    title: 'National Health Insurance Scheme Expansion Policy',
    body: `<h2>Executive Summary</h2><p>This policy establishes the framework for expanding the National Health Insurance coverage to all Nigerian citizens, with a particular focus on informal sector workers and rural populations. The expansion aims to achieve Universal Health Coverage (UHC) by 2030 in alignment with the Sustainable Development Goals.</p><h2>Objectives</h2><ul><li>Extend health insurance coverage to 80% of the Nigerian population by 2028</li><li>Establish community-based health insurance schemes in all 36 states</li><li>Create a digital health records infrastructure across all primary health centers</li><li>Reduce out-of-pocket health expenditure from 70% to below 30%</li></ul><h2>Legal Basis</h2><p>This policy derives its authority from the National Health Insurance Authority Act 2022, the National Health Act 2014, and aligns with the National Health Policy 2016.</p><h2>Implementation Strategy</h2><p>The implementation will proceed in three phases across all geopolitical zones. Phase 1 (Year 1) focuses on South-West and North-Central zones. Phase 2 (Year 2) covers South-East and North-West. Phase 3 (Year 3) completes the rollout in South-South and North-East zones.</p>`,
    status: 'published',
    version: 3,
    mda_id: 'a0000000-0000-0000-0000-000000000002',
    owner_id: 'b0000000-0000-0000-0000-000000000002',
    attachment_url: null,
    created_at: '2024-03-15T09:00:00Z',
    updated_at: '2024-06-20T14:30:00Z',
    published_at: '2024-06-20T14:30:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    title: 'Digital Economy Tax Modernization Framework',
    body: `<h2>Overview</h2><p>A comprehensive framework for modernizing Nigeria's tax system to effectively capture revenue from digital economic activities. This policy addresses the challenges of taxing cross-border digital services, e-commerce transactions, and digital platforms operating within Nigeria.</p><h2>Scope</h2><p>Covers VAT on digital services, Significant Economic Presence rules, and digital platform taxation including ride-hailing, e-commerce marketplaces, and streaming services.</p><h2>Key Provisions</h2><ul><li>Digital services tax of 6% on gross turnover for non-resident digital companies</li><li>Mandatory registration for digital platforms with annual turnover exceeding ₦25 million</li><li>Automated tax collection through payment gateways</li><li>Real-time transaction reporting requirements</li></ul>`,
    status: 'in_review',
    version: 2,
    mda_id: 'a0000000-0000-0000-0000-000000000001',
    owner_id: 'b0000000-0000-0000-0000-000000000003',
    attachment_url: null,
    created_at: '2024-05-01T10:00:00Z',
    updated_at: '2024-07-10T16:00:00Z',
    published_at: null,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    title: 'National Education Technology Integration Policy',
    body: `<h2>Purpose</h2><p>Establish guidelines for integrating modern technology into Nigerian educational institutions from primary to tertiary levels.</p><h2>Focus Areas</h2><ul><li>Smart classroom deployment in 5,000 schools within 3 years</li><li>Teacher digital literacy training programs</li><li>Open educational resource platforms</li><li>Nationwide student digital ID system</li></ul>`,
    status: 'draft',
    version: 1,
    mda_id: 'a0000000-0000-0000-0000-000000000003',
    owner_id: 'b0000000-0000-0000-0000-000000000005',
    attachment_url: null,
    created_at: '2024-07-05T08:00:00Z',
    updated_at: '2024-07-15T11:00:00Z',
    published_at: null,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    title: 'National Cybersecurity Strategy 2025-2030',
    body: `<h2>Vision</h2><p>A secure and resilient cyberspace that supports Nigeria's digital transformation and protects citizens, businesses, and critical national infrastructure.</p><h2>Strategic Pillars</h2><ul><li>Governance and Institutional Framework</li><li>Cybersecurity Awareness and Capacity Building</li><li>Critical Infrastructure Protection</li><li>Cybercrime Prevention and International Cooperation</li></ul>`,
    status: 'approved',
    version: 4,
    mda_id: 'a0000000-0000-0000-0000-000000000004',
    owner_id: 'b0000000-0000-0000-0000-000000000001',
    attachment_url: null,
    created_at: '2024-02-01T09:00:00Z',
    updated_at: '2024-08-01T10:00:00Z',
    published_at: null,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    title: 'Federal Highway Rehabilitation Program Policy',
    body: `<h2>Background</h2><p>Nigeria's federal road network spanning over 35,000 km requires urgent rehabilitation and maintenance to support economic growth and regional integration.</p>`,
    status: 'published',
    version: 2,
    mda_id: 'a0000000-0000-0000-0000-000000000005',
    owner_id: 'b0000000-0000-0000-0000-000000000003',
    attachment_url: null,
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-04-15T12:00:00Z',
    published_at: '2024-04-15T12:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    title: 'Agricultural Value Chain Development Policy',
    body: `<h2>Mission</h2><p>Transform Nigeria's agricultural sector through value chain development, mechanization, and market access improvement to achieve food security and increased export earnings.</p>`,
    status: 'rejected',
    version: 1,
    mda_id: 'a0000000-0000-0000-0000-000000000006',
    owner_id: 'b0000000-0000-0000-0000-000000000007',
    attachment_url: null,
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2024-07-20T09:00:00Z',
    published_at: null,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000007',
    title: 'Primary Healthcare Under One Roof Initiative',
    body: `<h2>Goal</h2><p>Revitalize primary healthcare delivery in Nigeria by strengthening the management and coordination of primary healthcare centers across the 774 LGAs.</p>`,
    status: 'in_review',
    version: 2,
    mda_id: 'a0000000-0000-0000-0000-000000000002',
    owner_id: 'b0000000-0000-0000-0000-000000000002',
    attachment_url: null,
    created_at: '2024-04-10T09:00:00Z',
    updated_at: '2024-07-25T14:00:00Z',
    published_at: null,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000008',
    title: 'National Data Protection and Privacy Framework',
    body: `<h2>Objective</h2><p>Establish comprehensive data protection standards to safeguard personal data of Nigerian citizens in alignment with global best practices and the NDPR.</p>`,
    status: 'draft',
    version: 1,
    mda_id: 'a0000000-0000-0000-0000-000000000004',
    owner_id: 'b0000000-0000-0000-0000-000000000001',
    attachment_url: null,
    created_at: '2024-08-01T09:00:00Z',
    updated_at: '2024-08-10T09:00:00Z',
    published_at: null,
  },
];

// ─── Workflow Steps ───
export const workflowSteps: WorkflowStep[] = [
  { id: 'd0000000-0000-0000-0000-000000000001', policy_id: 'c0000000-0000-0000-0000-000000000001', approver_id: 'b0000000-0000-0000-0000-000000000004', step_order: 1, status: 'approved', comment: 'Excellent policy document. Well-researched.', actioned_at: '2024-05-10T10:00:00Z' },
  { id: 'd0000000-0000-0000-0000-000000000002', policy_id: 'c0000000-0000-0000-0000-000000000001', approver_id: 'b0000000-0000-0000-0000-000000000001', step_order: 2, status: 'approved', comment: 'Approved for publication.', actioned_at: '2024-06-20T14:00:00Z' },
  { id: 'd0000000-0000-0000-0000-000000000003', policy_id: 'c0000000-0000-0000-0000-000000000002', approver_id: 'b0000000-0000-0000-0000-000000000006', step_order: 1, status: 'approved', comment: 'Financial implications well documented.', actioned_at: '2024-06-15T09:00:00Z' },
  { id: 'd0000000-0000-0000-0000-000000000004', policy_id: 'c0000000-0000-0000-0000-000000000002', approver_id: 'b0000000-0000-0000-0000-000000000004', step_order: 2, status: 'pending', comment: null, actioned_at: null },
  { id: 'd0000000-0000-0000-0000-000000000005', policy_id: 'c0000000-0000-0000-0000-000000000006', approver_id: 'b0000000-0000-0000-0000-000000000003', step_order: 1, status: 'rejected', comment: 'Budget allocation needs revision. Implementation timeline unrealistic.', actioned_at: '2024-07-20T09:00:00Z' },
  { id: 'd0000000-0000-0000-0000-000000000006', policy_id: 'c0000000-0000-0000-0000-000000000007', approver_id: 'b0000000-0000-0000-0000-000000000004', step_order: 1, status: 'pending', comment: null, actioned_at: null },
  { id: 'd0000000-0000-0000-0000-000000000007', policy_id: 'c0000000-0000-0000-0000-000000000004', approver_id: 'b0000000-0000-0000-0000-000000000006', step_order: 1, status: 'approved', comment: 'Comprehensive strategy.', actioned_at: '2024-07-05T10:00:00Z' },
  { id: 'd0000000-0000-0000-0000-000000000008', policy_id: 'c0000000-0000-0000-0000-000000000004', approver_id: 'b0000000-0000-0000-0000-000000000004', step_order: 2, status: 'approved', comment: 'Ready for ministerial sign-off.', actioned_at: '2024-08-01T10:00:00Z' },
];

// ─── Indicators ───
export const indicators: Indicator[] = [
  { id: 'e0000000-0000-0000-0000-000000000001', policy_id: 'c0000000-0000-0000-0000-000000000001', name: 'Insurance Enrolment Rate (%)', baseline: 5, target: 80, unit: '%', frequency: 'quarterly' },
  { id: 'e0000000-0000-0000-0000-000000000002', policy_id: 'c0000000-0000-0000-0000-000000000001', name: 'Accredited Health Facilities', baseline: 2000, target: 12000, unit: 'facilities', frequency: 'quarterly' },
  { id: 'e0000000-0000-0000-0000-000000000003', policy_id: 'c0000000-0000-0000-0000-000000000001', name: 'Out-of-pocket Health Expenditure (%)', baseline: 70, target: 30, unit: '%', frequency: 'annually' },
  { id: 'e0000000-0000-0000-0000-000000000004', policy_id: 'c0000000-0000-0000-0000-000000000005', name: 'Roads Rehabilitated (km)', baseline: 0, target: 5000, unit: 'km', frequency: 'quarterly' },
  { id: 'e0000000-0000-0000-0000-000000000005', policy_id: 'c0000000-0000-0000-0000-000000000005', name: 'Travel Time Reduction (%)', baseline: 0, target: 40, unit: '%', frequency: 'annually' },
  { id: 'e0000000-0000-0000-0000-000000000006', policy_id: 'c0000000-0000-0000-0000-000000000004', name: 'Cyber Incident Response Time (hrs)', baseline: 72, target: 12, unit: 'hours', frequency: 'monthly' },
  { id: 'e0000000-0000-0000-0000-000000000007', policy_id: 'c0000000-0000-0000-0000-000000000004', name: 'Critical Infrastructure Protected (%)', baseline: 20, target: 95, unit: '%', frequency: 'quarterly' },
  { id: 'e0000000-0000-0000-0000-000000000008', policy_id: 'c0000000-0000-0000-0000-000000000002', name: 'Digital Tax Revenue (₦ Billion)', baseline: 15, target: 120, unit: '₦B', frequency: 'quarterly' },
];

// ─── Indicator Readings ───
export const indicatorReadings: IndicatorReading[] = [
  { id: 'f0000000-0000-0000-0000-000000000001', indicator_id: 'e0000000-0000-0000-0000-000000000001', value: 5,    period: '2024-Q1', submitted_by: 'b0000000-0000-0000-0000-000000000002', notes: 'Baseline measurement',                      created_at: '2024-04-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000002', indicator_id: 'e0000000-0000-0000-0000-000000000001', value: 12,   period: '2024-Q2', submitted_by: 'b0000000-0000-0000-0000-000000000002', notes: 'SW zone rollout started',                  created_at: '2024-07-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000003', indicator_id: 'e0000000-0000-0000-0000-000000000001', value: 22,   period: '2024-Q3', submitted_by: 'b0000000-0000-0000-0000-000000000005', notes: 'NC zone added',                            created_at: '2024-10-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000004', indicator_id: 'e0000000-0000-0000-0000-000000000001', value: 31,   period: '2024-Q4', submitted_by: 'b0000000-0000-0000-0000-000000000005', notes: 'Community schemes contributing significantly', created_at: '2025-01-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000005', indicator_id: 'e0000000-0000-0000-0000-000000000002', value: 2000, period: '2024-Q1', submitted_by: 'b0000000-0000-0000-0000-000000000002', notes: null, created_at: '2024-04-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000006', indicator_id: 'e0000000-0000-0000-0000-000000000002', value: 3200, period: '2024-Q2', submitted_by: 'b0000000-0000-0000-0000-000000000002', notes: null, created_at: '2024-07-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000007', indicator_id: 'e0000000-0000-0000-0000-000000000002', value: 4800, period: '2024-Q3', submitted_by: 'b0000000-0000-0000-0000-000000000005', notes: null, created_at: '2024-10-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000008', indicator_id: 'e0000000-0000-0000-0000-000000000002', value: 6100, period: '2024-Q4', submitted_by: 'b0000000-0000-0000-0000-000000000005', notes: null, created_at: '2025-01-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000009', indicator_id: 'e0000000-0000-0000-0000-000000000004', value: 0,    period: '2024-Q1', submitted_by: 'b0000000-0000-0000-0000-000000000003', notes: 'Project commenced',  created_at: '2024-04-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000010', indicator_id: 'e0000000-0000-0000-0000-000000000004', value: 350,  period: '2024-Q2', submitted_by: 'b0000000-0000-0000-0000-000000000003', notes: null,                 created_at: '2024-07-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000011', indicator_id: 'e0000000-0000-0000-0000-000000000004', value: 900,  period: '2024-Q3', submitted_by: 'b0000000-0000-0000-0000-000000000003', notes: null,                 created_at: '2024-10-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000012', indicator_id: 'e0000000-0000-0000-0000-000000000004', value: 1400, period: '2024-Q4', submitted_by: 'b0000000-0000-0000-0000-000000000003', notes: 'Rainy season delays', created_at: '2025-01-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000013', indicator_id: 'e0000000-0000-0000-0000-000000000006', value: 72,   period: '2024-03', submitted_by: 'b0000000-0000-0000-0000-000000000001', notes: 'Baseline',           created_at: '2024-04-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000014', indicator_id: 'e0000000-0000-0000-0000-000000000006', value: 60,   period: '2024-04', submitted_by: 'b0000000-0000-0000-0000-000000000001', notes: null,                 created_at: '2024-05-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000015', indicator_id: 'e0000000-0000-0000-0000-000000000006', value: 45,   period: '2024-05', submitted_by: 'b0000000-0000-0000-0000-000000000001', notes: null,                 created_at: '2024-06-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000016', indicator_id: 'e0000000-0000-0000-0000-000000000006', value: 30,   period: '2024-06', submitted_by: 'b0000000-0000-0000-0000-000000000001', notes: 'CERT team expanded', created_at: '2024-07-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000017', indicator_id: 'e0000000-0000-0000-0000-000000000006', value: 22,   period: '2024-07', submitted_by: 'b0000000-0000-0000-0000-000000000001', notes: null,                 created_at: '2024-08-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000018', indicator_id: 'e0000000-0000-0000-0000-000000000008', value: 15,   period: '2024-Q1', submitted_by: 'b0000000-0000-0000-0000-000000000006', notes: 'Pre-policy baseline',               created_at: '2024-04-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000019', indicator_id: 'e0000000-0000-0000-0000-000000000008', value: 28,   period: '2024-Q2', submitted_by: 'b0000000-0000-0000-0000-000000000006', notes: null,                               created_at: '2024-07-01T09:00:00Z' },
  { id: 'f0000000-0000-0000-0000-000000000020', indicator_id: 'e0000000-0000-0000-0000-000000000008', value: 45,   period: '2024-Q3', submitted_by: 'b0000000-0000-0000-0000-000000000006', notes: 'Platform registrations increasing', created_at: '2024-10-01T09:00:00Z' },
];

// ─── Audit Logs ───
export const auditLogs: AuditLog[] = [
  { id: '00000000-a000-0000-0000-000000000001', actor_id: 'b0000000-0000-0000-0000-000000000002', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000001', action: 'created',              diff: { title: 'National Health Insurance Scheme Expansion Policy' }, created_at: '2024-03-15T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000002', actor_id: 'b0000000-0000-0000-0000-000000000002', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000001', action: 'updated',              diff: { body: 'Added implementation strategy section' },              created_at: '2024-04-20T14:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000003', actor_id: 'b0000000-0000-0000-0000-000000000002', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000001', action: 'submitted_for_review', diff: {},                                                             created_at: '2024-05-01T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000004', actor_id: 'b0000000-0000-0000-0000-000000000004', entity_type: 'workflow_step', entity_id: 'd0000000-0000-0000-0000-000000000001', action: 'approved',             diff: { comment: 'Excellent policy document' },                       created_at: '2024-05-10T10:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000005', actor_id: 'b0000000-0000-0000-0000-000000000001', entity_type: 'workflow_step', entity_id: 'd0000000-0000-0000-0000-000000000002', action: 'approved',             diff: { comment: 'Approved for publication' },                        created_at: '2024-06-20T14:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000006', actor_id: 'b0000000-0000-0000-0000-000000000001', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000001', action: 'published',            diff: { status: 'published' },                                        created_at: '2024-06-20T14:30:00Z' },
  { id: '00000000-a000-0000-0000-000000000007', actor_id: 'b0000000-0000-0000-0000-000000000003', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000002', action: 'created',              diff: { title: 'Digital Economy Tax Modernization Framework' },       created_at: '2024-05-01T10:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000008', actor_id: 'b0000000-0000-0000-0000-000000000006', entity_type: 'workflow_step', entity_id: 'd0000000-0000-0000-0000-000000000003', action: 'approved',             diff: {},                                                             created_at: '2024-06-15T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000009', actor_id: 'b0000000-0000-0000-0000-000000000005', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000003', action: 'created',              diff: { title: 'National Education Technology Integration Policy' },  created_at: '2024-07-05T08:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000010', actor_id: 'b0000000-0000-0000-0000-000000000003', entity_type: 'workflow_step', entity_id: 'd0000000-0000-0000-0000-000000000005', action: 'rejected',             diff: { comment: 'Budget allocation needs revision' },               created_at: '2024-07-20T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000011', actor_id: 'b0000000-0000-0000-0000-000000000001', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000004', action: 'created',              diff: {},                                                             created_at: '2024-02-01T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000012', actor_id: 'b0000000-0000-0000-0000-000000000002', entity_type: 'indicator',     entity_id: 'e0000000-0000-0000-0000-000000000001', action: 'reading_submitted',    diff: { value: 31, period: '2024-Q4' },                               created_at: '2025-01-01T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000013', actor_id: 'b0000000-0000-0000-0000-000000000001', entity_type: 'user',          entity_id: 'b0000000-0000-0000-0000-000000000007', action: 'created_user',         diff: { full_name: 'Ibrahim Musa', role: 'policy_officer' },          created_at: '2024-04-01T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000014', actor_id: 'b0000000-0000-0000-0000-000000000006', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000002', action: 'submitted_for_review', diff: {},                                                             created_at: '2024-06-01T09:00:00Z' },
  { id: '00000000-a000-0000-0000-000000000015', actor_id: 'b0000000-0000-0000-0000-000000000007', entity_type: 'policy',        entity_id: 'c0000000-0000-0000-0000-000000000006', action: 'created',              diff: { title: 'Agricultural Value Chain Development Policy' },       created_at: '2024-06-01T09:00:00Z' },
];

// ─── Helper Functions ───
export function getMDA(id: string) {
  return mdas.find((m) => m.id === id);
}

export function getProfile(id: string) {
  return profiles.find((p) => p.id === id);
}

export function getPolicyWithRelations(id: string) {
  const policy = policies.find((p) => p.id === id);
  if (!policy) return null;
  return {
    ...policy,
    mda: getMDA(policy.mda_id),
    owner: getProfile(policy.owner_id),
    workflow_steps: workflowSteps
      .filter((ws) => ws.policy_id === id)
      .map((ws) => ({ ...ws, approver: getProfile(ws.approver_id) })),
    indicators: indicators.filter((ind) => ind.policy_id === id),
  };
}

export function getIndicatorsWithReadings(policyId: string) {
  return indicators
    .filter((ind) => ind.policy_id === policyId)
    .map((ind) => ({
      ...ind,
      indicator_readings: indicatorReadings
        .filter((ir) => ir.indicator_id === ind.id)
        .sort((a, b) => a.period.localeCompare(b.period)),
    }));
}

export function getAuditLogsWithActors(entityId?: string) {
  const filtered = entityId
    ? auditLogs.filter((al) => al.entity_id === entityId)
    : auditLogs;
  return filtered
    .map((al) => ({ ...al, actor: getProfile(al.actor_id) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ─── Dashboard Stats ───
export function getDashboardStats() {
  const totalPolicies = policies.length;
  const published = policies.filter((p) => p.status === 'published').length;
  const inReview = policies.filter((p) => p.status === 'in_review').length;
  const drafts = policies.filter((p) => p.status === 'draft').length;
  const pendingApprovals = workflowSteps.filter((ws) => ws.status === 'pending').length;

  return {
    totalPolicies,
    published,
    inReview,
    drafts,
    pendingApprovals,
    totalMDAs: mdas.length,
    totalUsers: profiles.length,
    totalIndicators: indicators.length,
  };
}
