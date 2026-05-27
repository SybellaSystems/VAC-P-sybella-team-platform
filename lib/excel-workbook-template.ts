/**
 * Excel Workbook Template Generator
 * Generates the "Operation Visible Future" Excel workbook structure
 * 
 * This file provides the data structure needed to create the Excel workbook.
 * In production, use the 'xlsx' or 'exceljs' npm package to generate the actual file.
 */

export interface ExcelWorkbookTemplate {
  name: string;
  sheets: ExcelSheet[];
}

export interface ExcelSheet {
  name: string;
  rows: ExcelRow[];
  columns?: ExcelColumn[];
  freezePane?: { row: number; col: number };
  charts?: ExcelChart[];
  dataValidations?: DataValidation[];
  conditionalFormatting?: ConditionalFormat[];
}

export interface ExcelRow {
  cells: ExcelCell[];
  height?: number;
}

export interface ExcelCell {
  value: any;
  type?: 'text' | 'number' | 'date' | 'formula' | 'boolean';
  format?: string;
  bold?: boolean;
  fontSize?: number;
  bgColor?: string;
  textColor?: string;
  alignment?: 'left' | 'center' | 'right';
  border?: boolean;
}

export interface ExcelColumn {
  width: number;
}

export interface ExcelChart {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  dataRange: string;
  position: string;
}

export interface DataValidation {
  range: string;
  type: 'list' | 'date' | 'number' | 'text';
  formula?: string;
  values?: string[];
}

export interface ConditionalFormat {
  range: string;
  type: 'colorScale' | 'databar' | 'iconSet' | 'cellIs';
  rules: FormatRule[];
}

export interface FormatRule {
  condition?: string;
  value?: any;
  bgColor?: string;
  textColor?: string;
}

/**
 * Generate the Operation Visible Future Excel workbook template
 */
export function generateOperationVisibleFutureTemplate(): ExcelWorkbookTemplate {
  return {
    name: 'Operation_Visible_Future_Master.xlsx',
    sheets: [
      generateDashboardSheet(),
      generateMasterRoadmapSheet(),
      generateDailyExecutionTrackerSheet(),
      generateSocialMediaTrackerSheet(),
      generateContentCalendarSheet(),
      generateOgeraUserTrackerSheet(),
      generateEmployerPipelineSheet(),
      generateClientAcquisitionSheet(),
      generateTeamManagementSheet(),
      generateCogniforgeAiLabSheet(),
      generateFinancialTrackerSheet(),
      generateMeetingsDecisionsSheet(),
      generateRisksBlockersSheet(),
      generateLaunchControlCenterSheet(),
      generateIdeasVaultSheet(),
    ],
  };
}

function generateDashboardSheet(): ExcelSheet {
  return {
    name: 'Dashboard',
    rows: [
      {
        cells: [
          { value: 'Operation Visible Future - Dashboard', bold: true, fontSize: 16 },
        ],
      },
      { cells: [{ value: '' }] },
      
      // Project Overview Section
      {
        cells: [
          { value: 'PROJECT OVERVIEW', bold: true, fontSize: 12, bgColor: '#4F46E5', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Metric', bold: true, bgColor: '#E5E7EB' },
          { value: 'Current', bold: true, bgColor: '#E5E7EB' },
          { value: 'Goal', bold: true, bgColor: '#E5E7EB' },
          { value: 'Progress %', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: 'LinkedIn Followers' }, { value: 0, type: 'number' }, { value: 1000 }, { value: '=(B5/D5)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Instagram Followers' }, { value: 0, type: 'number' }, { value: 1000 }, { value: '=(B6/D6)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Facebook Followers' }, { value: 0, type: 'number' }, { value: 1000 }, { value: '=(B7/D7)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Ogera Users' }, { value: 0, type: 'number' }, { value: 500 }, { value: '=(B8/D8)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Employers Onboarded' }, { value: 0, type: 'number' }, { value: 200 }, { value: '=(B9/D9)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Paying Clients' }, { value: 0, type: 'number' }, { value: 2 }, { value: '=(B10/D10)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Posts Published' }, { value: 0, type: 'number' }, { value: 300 }, { value: '=(B11/D11)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Reels Published' }, { value: 0, type: 'number' }, { value: 90 }, { value: '=(B12/D12)*100', type: 'formula', format: '0.0' }] },
      { cells: [{ value: 'Outreach Messages' }, { value: 0, type: 'number' }, { value: 3000 }, { value: '=(B13/D13)*100', type: 'formula', format: '0.0' }] },
      
      { cells: [{ value: '' }] },
      
      // Weekly Status Section
      {
        cells: [
          { value: 'WEEKLY STATUS', bold: true, fontSize: 12, bgColor: '#4F46E5', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Area', bold: true, bgColor: '#E5E7EB' },
          { value: 'Status', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: 'Branding' }, { value: 'On Track' }, { value: '' }] },
      { cells: [{ value: 'Ogera Launch' }, { value: 'On Track' }, { value: '' }] },
      { cells: [{ value: 'Content Production' }, { value: 'On Track' }, { value: '' }] },
      { cells: [{ value: 'Employer Outreach' }, { value: 'On Track' }, { value: '' }] },
      { cells: [{ value: 'Team Motivation' }, { value: 'On Track' }, { value: '' }] },
      { cells: [{ value: 'AI Branding' }, { value: 'On Track' }, { value: '' }] },
      { cells: [{ value: 'Sales Pipeline' }, { value: 'On Track' }, { value: '' }] },
    ],
    columns: [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ],
    freezePane: { row: 4, col: 0 },
    dataValidations: [
      {
        range: 'B17:B23',
        type: 'list',
        values: ['On Track', 'Delayed', 'Critical', 'Completed'],
      },
    ],
  };
}

function generateMasterRoadmapSheet(): ExcelSheet {
  return {
    name: 'Master Roadmap',
    rows: [
      {
        cells: [
          { value: 'Task ID', bold: true, bgColor: '#E5E7EB' },
          { value: 'Department', bold: true, bgColor: '#E5E7EB' },
          { value: 'Task', bold: true, bgColor: '#E5E7EB' },
          { value: 'Owner', bold: true, bgColor: '#E5E7EB' },
          { value: 'Start Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Deadline', bold: true, bgColor: '#E5E7EB' },
          { value: 'Priority', bold: true, bgColor: '#E5E7EB' },
          { value: 'Status', bold: true, bgColor: '#E5E7EB' },
          { value: 'Completion %', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(10).fill({ width: 15 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'B:B',
        type: 'list',
        values: ['Branding', 'Social Media', 'Ogera', 'Cogniforge', 'Website Clients', 'Outreach', 'AI Engineering', 'Design', 'Launch Preparation'],
      },
      {
        range: 'G:G',
        type: 'list',
        values: ['Low', 'Medium', 'High', 'Critical'],
      },
      {
        range: 'H:H',
        type: 'list',
        values: ['Not Started', 'In Progress', 'Review', 'Completed', 'Blocked'],
      },
    ],
    conditionalFormatting: [
      {
        range: 'H:H',
        type: 'cellIs',
        rules: [
          { condition: '=', value: 'Overdue', bgColor: '#FEE2E2', textColor: '#991B1B' },
          { condition: '=', value: 'Completed', bgColor: '#DCFCE7', textColor: '#166534' },
          { condition: '=', value: 'In Progress', bgColor: '#FEF3C7', textColor: '#92400E' },
        ],
      },
    ],
  };
}

function generateDailyExecutionTrackerSheet(): ExcelSheet {
  return {
    name: 'Daily Execution',
    rows: [
      {
        cells: [
          { value: 'Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Team Member', bold: true, bgColor: '#E5E7EB' },
          { value: 'Main Goal', bold: true, bgColor: '#E5E7EB' },
          { value: 'Tasks Planned', bold: true, bgColor: '#E5E7EB' },
          { value: 'Tasks Completed', bold: true, bgColor: '#E5E7EB' },
          { value: 'Hours Worked', bold: true, bgColor: '#E5E7EB' },
          { value: 'Productivity Score', bold: true, bgColor: '#E5E7EB' },
          { value: 'Challenges', bold: true, bgColor: '#E5E7EB' },
          { value: 'Wins', bold: true, bgColor: '#E5E7EB' },
          { value: 'Tomorrow Plan', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(10).fill({ width: 15 }),
    freezePane: { row: 1, col: 1 },
  };
}

function generateSocialMediaTrackerSheet(): ExcelSheet {
  return {
    name: 'Social Media',
    rows: [
      {
        cells: [
          { value: 'Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Platform', bold: true, bgColor: '#E5E7EB' },
          { value: 'Followers Start', bold: true, bgColor: '#E5E7EB' },
          { value: 'Followers End', bold: true, bgColor: '#E5E7EB' },
          { value: 'Growth', bold: true, bgColor: '#E5E7EB', type: 'formula' },
          { value: 'Posts', bold: true, bgColor: '#E5E7EB' },
          { value: 'Reels', bold: true, bgColor: '#E5E7EB' },
          { value: 'Engagement %', bold: true, bgColor: '#E5E7EB', type: 'formula' },
          { value: 'Best Post', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
          { value: 'Likes', bold: true, bgColor: '#F3F4F6' },
          { value: 'Comments', bold: true, bgColor: '#F3F4F6' },
          { value: 'Shares', bold: true, bgColor: '#F3F4F6' },
        ],
      },
    ],
    columns: Array(13).fill({ width: 12 }),
    freezePane: { row: 1, col: 1 },
    dataValidations: [
      {
        range: 'B:B',
        type: 'list',
        values: ['LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'X'],
      },
    ],
  };
}

function generateContentCalendarSheet(): ExcelSheet {
  return {
    name: 'Content Calendar',
    rows: [
      {
        cells: [
          { value: 'Content ID', bold: true, bgColor: '#E5E7EB' },
          { value: 'Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Platform', bold: true, bgColor: '#E5E7EB' },
          { value: 'Content Type', bold: true, bgColor: '#E5E7EB' },
          { value: 'Topic', bold: true, bgColor: '#E5E7EB' },
          { value: 'Objective', bold: true, bgColor: '#E5E7EB' },
          { value: 'Assigned To', bold: true, bgColor: '#E5E7EB' },
          { value: 'Script Ready', bold: true, bgColor: '#E5E7EB' },
          { value: 'Design Ready', bold: true, bgColor: '#E5E7EB' },
          { value: 'Posted', bold: true, bgColor: '#E5E7EB' },
          { value: 'Performance', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(11).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'D:D',
        type: 'list',
        values: ['Reel', 'Carousel', 'Graphic', 'Founder Story', 'Team Spotlight', 'AI Insight', 'Ogera Update', 'Tutorial', 'Client Showcase', 'Meme'],
      },
      {
        range: 'F:F',
        type: 'list',
        values: ['Awareness', 'Engagement', 'Conversion', 'Trust Building', 'Employer Acquisition', 'Student Acquisition', 'Branding'],
      },
    ],
  };
}

function generateOgeraUserTrackerSheet(): ExcelSheet {
  return {
    name: 'Ogera Users',
    rows: [
      {
        cells: [
          { value: 'User ID', bold: true, bgColor: '#E5E7EB' },
          { value: 'Date Joined', bold: true, bgColor: '#E5E7EB' },
          { value: 'Name', bold: true, bgColor: '#E5E7EB' },
          { value: 'University', bold: true, bgColor: '#E5E7EB' },
          { value: 'Country', bold: true, bgColor: '#E5E7EB' },
          { value: 'Source', bold: true, bgColor: '#E5E7EB' },
          { value: 'Active', bold: true, bgColor: '#E5E7EB' },
          { value: 'Tasks Completed', bold: true, bgColor: '#E5E7EB' },
          { value: 'Verified', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(10).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'F:F',
        type: 'list',
        values: ['Instagram', 'LinkedIn', 'Facebook', 'Referral', 'WhatsApp', 'TikTok', 'Direct Website'],
      },
      {
        range: 'G:G',
        type: 'list',
        values: ['Yes', 'No'],
      },
      {
        range: 'I:I',
        type: 'list',
        values: ['Yes', 'No'],
      },
    ],
  };
}

function generateEmployerPipelineSheet(): ExcelSheet {
  return {
    name: 'Employer Pipeline',
    rows: [
      {
        cells: [
          { value: 'Employer ID', bold: true, bgColor: '#E5E7EB' },
          { value: 'Company Name', bold: true, bgColor: '#E5E7EB' },
          { value: 'Industry', bold: true, bgColor: '#E5E7EB' },
          { value: 'Contact Person', bold: true, bgColor: '#E5E7EB' },
          { value: 'Email', bold: true, bgColor: '#E5E7EB' },
          { value: 'Phone', bold: true, bgColor: '#E5E7EB' },
          { value: 'Outreach Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Status', bold: true, bgColor: '#E5E7EB' },
          { value: 'Follow-up Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Interested', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(11).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'H:H',
        type: 'list',
        values: ['Contacted', 'Follow-up Needed', 'Meeting Scheduled', 'Interested', 'Onboarding', 'Registered', 'Rejected'],
      },
      {
        range: 'J:J',
        type: 'list',
        values: ['Yes', 'No', 'Maybe'],
      },
    ],
  };
}

function generateClientAcquisitionSheet(): ExcelSheet {
  return {
    name: 'Client Acquisition',
    rows: [
      {
        cells: [
          { value: 'Lead ID', bold: true, bgColor: '#E5E7EB' },
          { value: 'Business', bold: true, bgColor: '#E5E7EB' },
          { value: 'Industry', bold: true, bgColor: '#E5E7EB' },
          { value: 'Contact', bold: true, bgColor: '#E5E7EB' },
          { value: 'Service Needed', bold: true, bgColor: '#E5E7EB' },
          { value: 'Estimated Value', bold: true, bgColor: '#E5E7EB' },
          { value: 'Stage', bold: true, bgColor: '#E5E7EB' },
          { value: 'Proposal Sent', bold: true, bgColor: '#E5E7EB' },
          { value: 'Closed', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(10).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'G:G',
        type: 'list',
        values: ['Prospect', 'Contacted', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      },
      {
        range: 'H:H',
        type: 'list',
        values: ['Yes', 'No'],
      },
      {
        range: 'I:I',
        type: 'list',
        values: ['Yes', 'No'],
      },
    ],
  };
}

function generateTeamManagementSheet(): ExcelSheet {
  return {
    name: 'Team Management',
    rows: [
      {
        cells: [
          { value: 'Member', bold: true, bgColor: '#E5E7EB' },
          { value: 'Department', bold: true, bgColor: '#E5E7EB' },
          { value: 'Role', bold: true, bgColor: '#E5E7EB' },
          { value: 'Weekly Tasks', bold: true, bgColor: '#E5E7EB' },
          { value: 'Completed', bold: true, bgColor: '#E5E7EB' },
          { value: 'Attendance', bold: true, bgColor: '#E5E7EB' },
          { value: 'Contribution Score', bold: true, bgColor: '#E5E7EB' },
          { value: 'Motivation Level', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(9).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'H:H',
        type: 'list',
        values: ['High', 'Medium', 'Low'],
      },
    ],
  };
}

function generateCogniforgeAiLabSheet(): ExcelSheet {
  return {
    name: 'Cogniforge AI Lab',
    rows: [
      {
        cells: [
          { value: 'Project', bold: true, bgColor: '#E5E7EB' },
          { value: 'Category', bold: true, bgColor: '#E5E7EB' },
          { value: 'Description', bold: true, bgColor: '#E5E7EB' },
          { value: 'Team Lead', bold: true, bgColor: '#E5E7EB' },
          { value: 'Public Post Made', bold: true, bgColor: '#E5E7EB' },
          { value: 'Demo Ready', bold: true, bgColor: '#E5E7EB' },
          { value: 'Github Ready', bold: true, bgColor: '#E5E7EB' },
          { value: 'Visibility Score', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(9).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'B:B',
        type: 'list',
        values: ['AI Agent', 'Automation', 'SaaS', 'AI Research', 'AI Design', 'AI Tools', 'Internal Systems'],
      },
      {
        range: 'E:E',
        type: 'list',
        values: ['Yes', 'No'],
      },
      {
        range: 'F:F',
        type: 'list',
        values: ['Yes', 'No'],
      },
      {
        range: 'G:G',
        type: 'list',
        values: ['Yes', 'No'],
      },
    ],
  };
}

function generateFinancialTrackerSheet(): ExcelSheet {
  return {
    name: 'Financial Tracker',
    rows: [
      {
        cells: [
          { value: 'INCOME', bold: true, fontSize: 12, bgColor: '#10B981', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Source', bold: true, bgColor: '#E5E7EB' },
          { value: 'Description', bold: true, bgColor: '#E5E7EB' },
          { value: 'Amount', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: '' }, { value: '' }, { value: '' }, { value: '', type: 'number' }] },
      { cells: [{ value: '' }] },
      {
        cells: [
          { value: 'EXPENSES', bold: true, fontSize: 12, bgColor: '#EF4444', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Category', bold: true, bgColor: '#E5E7EB' },
          { value: 'Description', bold: true, bgColor: '#E5E7EB' },
          { value: 'Amount', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: '' }, { value: '' }, { value: '' }, { value: '', type: 'number' }] },
      { cells: [{ value: '' }] },
      {
        cells: [
          { value: 'SUMMARY', bold: true, fontSize: 12, bgColor: '#6366F1', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Total Income', bold: true },
          { value: '=SUM(D3:D3)', type: 'formula', bold: true },
        ],
      },
      {
        cells: [
          { value: 'Total Expenses', bold: true },
          { value: '=SUM(D7:D7)', type: 'formula', bold: true },
        ],
      },
      {
        cells: [
          { value: 'Net Profit', bold: true, bgColor: '#DBEAFE', bold: true },
          { value: '=B10-B11', type: 'formula', bold: true, bgColor: '#DBEAFE' },
        ],
      },
    ],
    columns: [{ width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }],
    freezePane: { row: 2, col: 0 },
    dataValidations: [
      {
        range: 'B6:B100',
        type: 'list',
        values: ['Ads', 'Design', 'Software', 'Hosting', 'Team Support', 'Internet', 'Equipment', 'Marketing'],
      },
    ],
  };
}

function generateMeetingsDecisionsSheet(): ExcelSheet {
  return {
    name: 'Meetings & Decisions',
    rows: [
      {
        cells: [
          { value: 'Date', bold: true, bgColor: '#E5E7EB' },
          { value: 'Meeting Type', bold: true, bgColor: '#E5E7EB' },
          { value: 'Attendees', bold: true, bgColor: '#E5E7EB' },
          { value: 'Main Decisions', bold: true, bgColor: '#E5E7EB' },
          { value: 'Action Items', bold: true, bgColor: '#E5E7EB' },
          { value: 'Deadline', bold: true, bgColor: '#E5E7EB' },
          { value: 'Responsible', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(7).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
  };
}

function generateRisksBlockersSheet(): ExcelSheet {
  return {
    name: 'Risks & Blockers',
    rows: [
      {
        cells: [
          { value: 'Risk ID', bold: true, bgColor: '#E5E7EB' },
          { value: 'Problem', bold: true, bgColor: '#E5E7EB' },
          { value: 'Impact', bold: true, bgColor: '#E5E7EB' },
          { value: 'Severity', bold: true, bgColor: '#E5E7EB' },
          { value: 'Solution', bold: true, bgColor: '#E5E7EB' },
          { value: 'Responsible', bold: true, bgColor: '#E5E7EB' },
          { value: 'Deadline', bold: true, bgColor: '#E5E7EB' },
          { value: 'Status', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(8).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'D:D',
        type: 'list',
        values: ['Low', 'Medium', 'High', 'Critical'],
      },
      {
        range: 'H:H',
        type: 'list',
        values: ['Open', 'In Progress', 'Resolved'],
      },
    ],
  };
}

function generateLaunchControlCenterSheet(): ExcelSheet {
  return {
    name: 'Launch Control',
    rows: [
      {
        cells: [
          { value: 'OGERA LAUNCH - JUNE 21', bold: true, fontSize: 14, bgColor: '#4F46E5', textColor: '#FFFFFF' },
        ],
      },
      { cells: [{ value: '' }] },
      {
        cells: [
          { value: 'TECHNICAL READINESS', bold: true, fontSize: 12, bgColor: '#6366F1', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Task', bold: true, bgColor: '#E5E7EB' },
          { value: 'Status', bold: true, bgColor: '#E5E7EB' },
          { value: 'Owner', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: '' }, { value: '' }, { value: '' }] },
      { cells: [{ value: '' }] },
      {
        cells: [
          { value: 'MARKETING READINESS', bold: true, fontSize: 12, bgColor: '#6366F1', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Task', bold: true, bgColor: '#E5E7EB' },
          { value: 'Status', bold: true, bgColor: '#E5E7EB' },
          { value: 'Owner', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: '' }, { value: '' }, { value: '' }] },
      { cells: [{ value: '' }] },
      {
        cells: [
          { value: 'LAUNCH CHECKLIST', bold: true, fontSize: 12, bgColor: '#6366F1', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Item', bold: true, bgColor: '#E5E7EB' },
          { value: 'Completed', bold: true, bgColor: '#E5E7EB' },
        ],
      },
      { cells: [{ value: '' }, { value: 'No' }] },
      { cells: [{ value: '' }] },
      {
        cells: [
          { value: 'COUNTDOWN TRACKER', bold: true, fontSize: 12, bgColor: '#EF4444', textColor: '#FFFFFF' },
        ],
      },
      {
        cells: [
          { value: 'Days to Launch:', bold: true },
          { value: '=DATE(2026,6,21)-TODAY()', type: 'formula' },
        ],
      },
    ],
    columns: [{ width: 20 }, { width: 15 }, { width: 15 }],
    dataValidations: [
      {
        range: 'B:B',
        type: 'list',
        values: ['Not Started', 'In Progress', 'Complete'],
      },
      {
        range: 'B:B',
        type: 'list',
        values: ['Yes', 'No'],
      },
    ],
  };
}

function generateIdeasVaultSheet(): ExcelSheet {
  return {
    name: 'Ideas & Innovation',
    rows: [
      {
        cells: [
          { value: 'Idea', bold: true, bgColor: '#E5E7EB' },
          { value: 'Category', bold: true, bgColor: '#E5E7EB' },
          { value: 'Potential Impact', bold: true, bgColor: '#E5E7EB' },
          { value: 'Difficulty', bold: true, bgColor: '#E5E7EB' },
          { value: 'Priority', bold: true, bgColor: '#E5E7EB' },
          { value: 'Notes', bold: true, bgColor: '#E5E7EB' },
        ],
      },
    ],
    columns: Array(6).fill({ width: 14 }),
    freezePane: { row: 1, col: 0 },
    dataValidations: [
      {
        range: 'D:D',
        type: 'list',
        values: ['Easy', 'Medium', 'Hard', 'Very Hard'],
      },
      {
        range: 'E:E',
        type: 'list',
        values: ['Low', 'Medium', 'High'],
      },
    ],
  };
}
