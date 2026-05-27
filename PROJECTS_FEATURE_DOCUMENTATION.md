# Operation Visible Future — Enhanced Projects Feature

## Overview

This document describes the comprehensive rebuild of the VAC-P project management feature, including import/export capabilities, RBAC, task management with deadlines and priorities, and integrated analytics.

---

## New Database Schema

### Core Tables

#### 1. **projects** (Extended)
Enhanced projects table with import/export and template support.

```sql
ALTER TABLE projects ADD:
- import_source: text ('manual', 'csv', 'excel', 'api')
- source_file_name: text
- raw_import_data: jsonb (original uploaded data)
- column_mapping: jsonb (header → field mappings)
- is_template: boolean
- template_name: text
- category: text ('marketing', 'development', 'sales', 'operations', 'hr', 'finance', 'general')
```

#### 2. **project_custom_fields** (New)
Dynamic columns for imported project data.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | Project reference |
| field_name | text | Database field name |
| field_type | text | 'text', 'number', 'date', 'select', 'checkbox', 'currency' |
| field_label | text | Display name |
| is_visible | boolean | Show/hide in UI |
| sort_order | integer | Column order |
| options | jsonb | For 'select' type fields |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

**Indexes:** `project_id`

#### 3. **project_rows** (New)
Imported data rows for projects.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | Project reference |
| data | jsonb | Row data (flexible schema) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

**Indexes:** `project_id`

#### 4. **task_messages** (New)
Messages linked to tasks visible in chat.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | Task reference |
| channel_id | uuid | Optional channel reference |
| message_text | text | Message content |
| created_by | uuid | Message author |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

**Indexes:** `task_id`

#### 5. **project_analytics** (New)
Analytics metrics tracked per project.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | Project reference |
| metric_name | text | Metric identifier |
| metric_value | numeric | Metric value |
| metric_date | date | Date recorded |
| dimension_1 | text | Optional dimension (e.g., team member) |
| dimension_2 | text | Optional dimension (e.g., category) |
| created_at | timestamptz | Creation timestamp |

**Indexes:** `project_id`, `metric_name`, `metric_date`

#### 6. **import_jobs** (New)
Track data import jobs and their status.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | Project reference |
| file_name | text | Original file name |
| file_type | text | 'csv' or 'xlsx' |
| total_rows | integer | Expected rows |
| imported_rows | integer | Successfully imported |
| failed_rows | integer | Failed imports |
| status | text | 'pending', 'processing', 'completed', 'failed' |
| error_message | text | Error details if failed |
| created_by | uuid | User who initiated |
| created_at | timestamptz | Job start time |
| completed_at | timestamptz | Job completion time |

**Indexes:** `project_id`, `status`

#### 7. **project_templates** (New)
Reusable project templates for quick creation.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Template name |
| description | text | Template description |
| category | text | Category |
| structure | jsonb | Template configuration |
| custom_fields | jsonb | Pre-configured fields |
| is_public | boolean | Visibility |
| created_by | uuid | Creator |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

#### 8. **project_assignments** (Enhanced)
Enhanced with detailed RBAC capabilities.

```sql
ALTER TABLE project_assignments ADD:
- can_edit_tasks: boolean
- can_edit_project: boolean
- can_manage_members: boolean
- can_view_analytics: boolean
- can_import_export: boolean
```

New role_in_project check: `'viewer' | 'editor' | 'admin'`

#### 9. **tasks** (Enhanced)
Enhanced with additional tracking fields.

```sql
ALTER TABLE tasks ADD:
- message_context: text (channel or context info)
- parent_task_id: uuid (for subtask relationships)
- estimated_hours: numeric(8,2)
- actual_hours: numeric(8,2)
- visible_in_chat: boolean
```

---

## TypeScript Types

### New Types

```typescript
// Custom project fields
type ProjectCustomField = {
  id: string;
  project_id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'currency';
  field_label: string;
  is_visible: boolean;
  sort_order: number;
  options?: any[];
  created_at: string;
  updated_at: string;
};

// Project data rows
type ProjectRow = {
  id: string;
  project_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

// Task messages
type TaskMessage = {
  id: string;
  task_id: string;
  channel_id?: string;
  message_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Analytics
type ProjectAnalytic = {
  id: string;
  project_id: string;
  metric_name: string;
  metric_value: number;
  metric_date: string;
  dimension_1?: string;
  dimension_2?: string;
  created_at: string;
};

// Import jobs
type ImportJob = {
  id: string;
  project_id: string;
  file_name: string;
  file_type: 'csv' | 'xlsx';
  total_rows?: number;
  imported_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;
};

// Templates
type ProjectTemplate = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  structure: Record<string, any>;
  custom_fields?: ProjectCustomField[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Extended types
type ExtendedProject = Project & {
  import_source?: 'manual' | 'csv' | 'excel' | 'api';
  source_file_name?: string;
  raw_import_data?: Record<string, any>;
  column_mapping?: Record<string, any>;
  is_template?: boolean;
  template_name?: string;
  category?: string;
};

type ExtendedTask = Task & {
  message_context?: string;
  parent_task_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  visible_in_chat?: boolean;
};
```

---

## Core Features

### 1. CSV/Excel Import

**Location:** `lib/project-import-export.ts`

**Key Functions:**
- `parseCSV()` - Parse CSV content into arrays
- `parseXLSX()` - Parse Excel files (requires xlsx package)
- `detectHeaders()` - Auto-detect column headers
- `createCustomFieldsFromHeaders()` - Create fields from headers
- `importProjectData()` - Import and store data
- `validateImportData()` - Validate structure
- `mapAndImportColumns()` - Map columns with custom names

**Workflow:**
1. User uploads CSV/Excel file
2. System parses and validates data
3. Create custom fields from headers
4. Map columns to database fields
5. Import rows as project_rows

### 2. Project Export

**Supported Formats:**
- CSV (comma-separated values)
- Excel (via xlsx package)

**Export Data Includes:**
- Project metadata
- Tasks
- Custom fields
- Data rows
- Analytics

**Function:** `exportProjectDataToCSV()`

### 3. Project Templates

**Template System Allows:**
- Save projects as templates
- Create new projects from templates
- Share templates across team
- Pre-configure fields and workflows

**Functions:**
- `createProjectFromTemplate()` - Create project from template
- `generateOperationVisibleFutureTemplate()` - Built-in template

### 4. Task Management with Deadlines & Priorities

**Task Fields:**
- `title` - Task name
- `description` - Full description
- `priority` - low | medium | high | critical
- `status` - todo | started | in_progress | review | done | blocked | cancelled
- `due_date` - Deadline date
- `assigned_to` - Team member UUID
- `estimated_hours` - Estimated effort
- `actual_hours` - Time tracked
- `visible_in_chat` - Show in chat notifications

**Assignment Form Includes:**
- Task details (title, description, priority)
- Team member assignment
- Deadline setting
- Estimated hours
- Chat visibility toggle
- Message context

### 5. Task-Chat Integration

**Location:** `lib/task-chat-integration.ts`

**Key Features:**
- Task assignments post to channels
- Task updates send notifications
- Task completion messages
- Task messages searchable in chat
- Link tasks to channels
- Create tasks from chat messages

**Functions:**
- `createTaskMessage()` - Create task message
- `postTaskAssignmentToChannel()` - Notify on assignment
- `postTaskUpdateToChannel()` - Notify on changes
- `postTaskCompletionToChannel()` - Notify completion
- `getTaskSummaryForChat()` - Get task info for chat
- `createTaskFromChatMessage()` - Create task from message

### 6. Project Analytics & Dashboards

**Location:** `lib/project-analytics.ts`

**Metrics Tracked:**
- Task completion rate
- Health score (0-100)
- Overdue tasks
- Team performance
- Burndown data
- Trending metrics

**Dashboard Components:**
- KPI cards (health, completion, tasks, team)
- Task status distribution (pie chart)
- Priority breakdown (bar chart)
- Team performance (progress bars)
- Trend analysis (7-day comparison)
- Alerts for overdue tasks

**Key Functions:**
- `calculateTaskCompletionRate()` - % tasks done
- `calculateProjectHealthScore()` - Overall health
- `getTaskStatistics()` - Task breakdown
- `getTeamPerformance()` - Member metrics
- `getTrendingMetrics()` - Week-over-week comparison
- `updateProjectAnalytics()` - Batch update metrics

### 7. RBAC for Projects

**Roles:**
- `viewer` - Can view project data only
- `editor` - Can view and edit tasks
- `admin` - Can manage project and members

**Fine-grained Permissions:**
- `can_edit_tasks` - Edit task details
- `can_edit_project` - Edit project settings
- `can_manage_members` - Manage team
- `can_view_analytics` - Access analytics
- `can_import_export` - Import/export data

**Policies:**
- All authenticated users can view projects
- Admin, director, manager can create projects
- Project members can access assigned items
- Only project admin can import/export

---

## React Components

### 1. ProjectImportWizard
**Location:** `components/ProjectImportWizard.tsx`

Multi-step wizard for importing project data:
- Step 1: File upload
- Step 2: Data preview
- Step 3: Column mapping
- Step 4: Confirmation

**Props:**
```typescript
interface ProjectImportWizardProps {
  projectId: string;
  onComplete: () => void;
  onCancel: () => void;
}
```

### 2. TaskAssignmentForm
**Location:** `components/TaskAssignmentForm.tsx`

Multi-tab form for creating/editing tasks:
- Tab 1: Task details (title, description, priority, due date, estimated hours)
- Tab 2: Assignment (team member, context, actual hours)
- Tab 3: Visibility (chat visibility, notifications, priority alert)

**Props:**
```typescript
interface TaskAssignmentFormProps {
  projectId: string;
  taskId?: string;
  onComplete?: (task: ExtendedTask) => void;
  onCancel?: () => void;
}
```

### 3. ProjectAnalyticsDashboard
**Location:** `components/ProjectAnalyticsDashboard.tsx`

Comprehensive analytics dashboard with:
- KPI cards
- Status/priority distribution charts
- Team performance metrics
- Trend analysis
- Overdue task alerts

**Props:**
```typescript
interface ProjectAnalyticsDashboardProps {
  projectId: string;
}
```

### 4. ProjectTemplatesDialog
**Location:** `components/ProjectTemplatesDialog.tsx`

Template selection and project creation:
- Browse available templates
- Select template
- Enter project name
- Create project from template

**Props:**
```typescript
interface ProjectTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (template: ProjectTemplate) => void;
  onCreateFromTemplate?: (projectId: string, template: ProjectTemplate) => void;
}
```

---

## Excel Workbook Template

### Location
`lib/excel-workbook-template.ts`

### Sheets Included

1. **Dashboard** - Project overview, weekly status, KPI charts
2. **Master Roadmap** - All tasks with timeline
3. **Daily Execution** - Daily team tracking
4. **Social Media Tracker** - Social metrics and engagement
5. **Content Calendar** - Content planning and schedule
6. **Ogera User Tracker** - User acquisition data
7. **Employer Pipeline** - Employer outreach status
8. **Client Acquisition** - Sales pipeline
9. **Team Management** - Team performance tracking
10. **Cogniforge AI Lab** - AI projects visibility
11. **Financial Tracker** - Income and expenses
12. **Meetings & Decisions** - Meeting notes and actions
13. **Risks & Blockers** - Risk management
14. **Launch Control Center** - Launch readiness checklist
15. **Ideas & Innovation Vault** - Idea tracking

### Features
- Data validation dropdowns
- Conditional formatting (color-coded status)
- Formulas for automatic calculations
- Frozen panes for easy navigation
- Protected formulas
- Pre-configured charts

### Usage
```typescript
import { generateOperationVisibleFutureTemplate } from '@/lib/excel-workbook-template';

// Generate template structure
const template = generateOperationVisibleFutureTemplate();

// Use with xlsx or exceljs package to create file
import { write, utils } from 'xlsx';

const workbook = utils.book_new();
template.sheets.forEach(sheet => {
  const ws = utils.aoa_to_sheet(sheet.rows.map(r => r.cells.map(c => c.value)));
  utils.book_append_sheet(workbook, ws, sheet.name);
});

write(workbook, { fileName: template.name });
```

---

## Row-Level Security (RLS)

### project_custom_fields
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: Project admins

### project_rows
- SELECT: Project members and admins
- INSERT/UPDATE/DELETE: Project admins

### task_messages
- SELECT: All authenticated users
- INSERT: Authenticated users
- UPDATE/DELETE: Creator or admins

### project_analytics
- SELECT: Project members and admins
- INSERT: System (trigger-based)

### import_jobs
- SELECT: Project members and admins
- INSERT: Project admins

### project_templates
- SELECT: Public or creator
- INSERT: Authenticated users

---

## Best Practices

### 1. Data Import
- Always validate data before import
- Handle duplicates gracefully
- Provide detailed error messages
- Support column mapping flexibility
- Track import jobs for auditing

### 2. Task Management
- Set realistic deadlines
- Use priority levels consistently
- Update actual hours regularly
- Make tasks visible in chat for collaboration
- Link related tasks with parent_task_id

### 3. Analytics
- Update metrics daily
- Calculate health score weekly
- Monitor trends for insights
- Set performance benchmarks
- Use data to drive decisions

### 4. Templates
- Create templates for recurring project types
- Include best practices in templates
- Test templates before sharing
- Version control templates
- Document template usage

---

## Migration Steps

1. Run migration: `20260527140000_project_import_export_analytics.sql`
2. Update database types in `lib/database.types.ts`
3. Deploy utility functions
4. Deploy React components
5. Update projects page to use new features
6. Test import/export workflow
7. Create templates for team

---

## Testing Checklist

- [ ] Import CSV with various data types
- [ ] Export project to CSV
- [ ] Validate column mapping
- [ ] Create project from template
- [ ] Assign task with deadline and priority
- [ ] Post task to channel
- [ ] View project analytics
- [ ] Track task completion
- [ ] Test RBAC permissions
- [ ] Verify RLS policies
- [ ] Test with large datasets
- [ ] Performance testing

---

## Future Enhancements

1. Webhook integrations for real-time updates
2. Advanced filtering and search
3. Gantt chart view
4. Resource allocation planning
5. Budget tracking and forecasting
6. Automated notifications
7. Report generation
8. API for third-party tools
9. Mobile app support
10. Collaborative editing

---

## Support & Documentation

For questions or issues:
1. Check this documentation
2. Review example implementations
3. Check database schema for constraints
4. Run test suite
5. Contact development team

---

## Version History

- v1.0 (2026-05-27): Initial release with import/export, templates, and analytics
