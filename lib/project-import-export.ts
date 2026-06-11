import { supabase as clientSupabase } from './supabase';
import type {
  Project,
  ProjectRow,
  ProjectCustomField,
  ImportJob,
  ExtendedProject,
} from './database.types';

type SupabaseLikeClient = typeof clientSupabase;

function normalizeFieldName(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';
}

function dedupeHeaders(headers: string[]) {
  const seen = new Map<string, number>();

  return headers.map((header, index) => {
    const baseLabel = header.trim() || `Column ${index + 1}`;
    const fieldName = normalizeFieldName(baseLabel);
    const existing = seen.get(fieldName) ?? 0;
    seen.set(fieldName, existing + 1);

    return existing === 0 ? baseLabel : `${baseLabel} ${existing + 1}`;
  });
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  return lines.map(line => {
    // Handle quoted values with commas inside
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

/**
 * Parse XLSX file using a simple approach (basic support)
 * For production, consider using 'xlsx' package
 */
export async function parseXLSX(file: File): Promise<{
  sheets: Record<string, string[][]>;
  sheetNames: string[];
}> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
  });

  const sheetNames = workbook.SheetNames;
  const sheets = Object.fromEntries(
    sheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });

      return [
        sheetName,
        rows
          .map((row) => row.map((value) => String(value ?? '').trimEnd()))
          .filter((row) => row.some((cell) => cell.trim() !== '')),
      ];
    })
  );

  return { sheets, sheetNames };
}

/**
 * Detect headers from raw data
 */
export function detectHeaders(data: string[][]): {
  headers: string[];
  startRow: number;
} {
  if (data.length === 0) return { headers: [], startRow: 0 };
  
  // First row is typically headers
  return {
    headers: data[0],
    startRow: 1,
  };
}

/**
 * Create custom fields from headers
 */
export async function createCustomFieldsFromHeaders(
  projectId: string,
  headers: string[],
  supabaseClient?: SupabaseLikeClient
): Promise<ProjectCustomField[]> {
  const supabase = supabaseClient || clientSupabase;
  const normalizedHeaders = dedupeHeaders(headers);
  const { data: existingFields, error: existingError } = await supabase
    .from('project_custom_fields')
    .select('field_name')
    .eq('project_id', projectId);

  if (existingError) throw existingError;

  const existingFieldNames = new Set(
    (existingFields ?? []).map((field: { field_name: string }) => field.field_name)
  );

  const customFields: Partial<ProjectCustomField>[] = normalizedHeaders
    .map((header, index) => ({
    project_id: projectId,
    field_name: normalizeFieldName(header),
    field_label: header,
    field_type: 'text',
    sort_order: index,
    is_visible: true,
    }))
    .filter((field) => field.field_name && !existingFieldNames.has(field.field_name));

  if (customFields.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_custom_fields')
    .insert(customFields)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Import project data from CSV
 */
export async function importProjectData(
  projectId: string,
  csvData: string[][],
  headers: string[],
  userId: string,
  fileName: string
, supabaseClient?: SupabaseLikeClient
): Promise<ImportJob> {
  const supabase = supabaseClient || clientSupabase;
  const normalizedHeaders = dedupeHeaders(headers);
  // Create import job record
  const { data: importJob, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      project_id: projectId,
      file_name: fileName,
      file_type: 'csv',
      total_rows: csvData.length - 1, // Exclude header row
      status: 'processing',
      created_by: userId,
    })
    .select()
    .single();

  if (jobError) throw jobError;

  try {
    // Insert data rows
    const rows: Partial<ProjectRow>[] = csvData.slice(1).map(row => ({
      project_id: projectId,
      data: Object.fromEntries(
        normalizedHeaders.map((header, index) => [normalizeFieldName(header), row[index] || ''])
      ),
    }));

    const { error: insertError } = await supabase
      .from('project_rows')
      .insert(rows);

    if (insertError) throw insertError;

    // Update import job status
    const { error: updateError } = await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        imported_rows: csvData.length - 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importJob.id);

    if (updateError) throw updateError;

    // Update project with import metadata
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        import_source: 'csv',
        source_file_name: fileName,
        column_mapping: Object.fromEntries(normalizedHeaders.map((header, index) => [index, header])),
      })
      .eq('id', projectId);

    if (projectError) throw projectError;

    return importJob;
  } catch (error) {
    // Update job with error
    await supabase
      .from('import_jobs')
      .update({
        status: 'failed',
        error_message: String(error),
      })
      .eq('id', importJob.id);
    throw error;
  }
}

/**
 * Export project data to CSV format
 */
export async function exportProjectDataToCSV(projectId: string, supabaseClient?: SupabaseLikeClient): Promise<string> {
  const supabase = supabaseClient || clientSupabase;
  // Fetch custom fields
  const { data: fields } = await supabase
    .from('project_custom_fields')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');

  // Fetch project rows
  const { data: rows } = await supabase
    .from('project_rows')
    .select('*')
    .eq('project_id', projectId);

  if (!fields || !rows) return '';

  const headers = fields.map((field: { field_label: string }) => field.field_label);
  const headerRow = headers.map((h: string) => `"${h}"`).join(',');

  const dataRows = rows.map((row: ProjectRow) => {
    return headers
      .map((header: string) => {
        const key = normalizeFieldName(header);
        const value = row.data[key] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Get project data for export with analytics
 */
export async function getProjectExportData(projectId: string, supabaseClient?: SupabaseLikeClient) {
  const supabase = supabaseClient || clientSupabase;
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);

  const { data: fields } = await supabase
    .from('project_custom_fields')
    .select('*')
    .eq('project_id', projectId);

  const { data: rows } = await supabase
    .from('project_rows')
    .select('*')
    .eq('project_id', projectId);

  const { data: analytics } = await supabase
    .from('project_analytics')
    .select('*')
    .eq('project_id', projectId);

  return {
    project,
    tasks,
    fields,
    rows,
    analytics,
  };
}

/**
 * Create a project from template
 */
export async function createProjectFromTemplate(
  templateId: string,
  projectData: Partial<ExtendedProject>,
  userId: string
, supabaseClient?: SupabaseLikeClient
): Promise<Project> {
  const supabase = supabaseClient || clientSupabase;
  const { data: template } = await supabase
    .from('project_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) throw new Error('Template not found');

  // Create new project
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      is_template: false,
      category: template.category,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Copy custom fields from template
  if (template.custom_fields) {
    const fieldsToInsert = template.custom_fields.map((field: ProjectCustomField) => ({
      ...field,
      project_id: newProject.id,
      id: undefined,
    }));

    await supabase
      .from('project_custom_fields')
      .insert(fieldsToInsert);
  }

  return newProject;
}

/**
 * Validate import data structure
 */
export function validateImportData(
  data: string[][],
  options?: {
    minRows?: number;
    minCols?: number;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push('No data provided');
  }

  if (!data[0]) {
    errors.push('Header row is missing');
  }

  if (data.length < (options?.minRows || 2)) {
    errors.push(`Expected at least ${options?.minRows || 2} rows (including header)`);
  }

  if (data[0] && data[0].length < (options?.minCols || 1)) {
    errors.push(`Expected at least ${options?.minCols || 1} columns`);
  }

  // Check for empty headers
  if (data[0] && data[0].some(h => !h || h.trim() === '')) {
    errors.push('Headers cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Map imported columns to existing or new fields
 */
export async function mapAndImportColumns(
  projectId: string,
  headers: string[],
  mapping: Record<string, string>,
  data: string[][],
  userId: string
, supabaseClient?: SupabaseLikeClient
): Promise<void> {
  const supabase = supabaseClient || clientSupabase;
  // Create any missing fields
  const existingFields = await supabase
    .from('project_custom_fields')
    .select('field_label')
    .eq('project_id', projectId);

  const existingLabels = existingFields.data?.map((field: { field_label: string }) => field.field_label) || [];
  const normalizedHeaders = dedupeHeaders(headers);
  const mappedHeaders = normalizedHeaders.map((header) => mapping[header] || header);
  const newHeaders = mappedHeaders.filter((header) => !existingLabels.includes(header));

  if (newHeaders.length > 0) {
    await createCustomFieldsFromHeaders(projectId, newHeaders, supabase);
  }

  // Import data with mapping
  const mappedData = data.slice(1).map((row) => {
    const mapped: Record<string, string> = {};
    normalizedHeaders.forEach((header, index) => {
      const mappedKey = mapping[header] || header;
      mapped[normalizeFieldName(mappedKey)] = row[index] || '';
    });
    return mapped;
  });

  const rows: Partial<ProjectRow>[] = mappedData.map(data => ({
    project_id: projectId,
    data,
  }));

  const { error } = await supabase
    .from('project_rows')
    .insert(rows);

  if (error) throw error;
}
