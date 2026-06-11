import { supabase as clientSupabase } from './supabase';
import type { Project, ProjectRow, ProjectCustomField, ImportJob, ExtendedProject } from './database.types';

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
  // This is a placeholder - in production, use the 'xlsx' npm package
  // For now, we'll require the file to be converted to CSV
  throw new Error('Direct XLSX parsing requires the xlsx package. Please convert to CSV or implement xlsx parsing.');
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
  supabaseClient?: any
): Promise<ProjectCustomField[]> {
  const supabase = supabaseClient || clientSupabase;
  const customFields: Partial<ProjectCustomField>[] = headers.map((header, index) => ({
    project_id: projectId,
    field_name: header.toLowerCase().replace(/\s+/g, '_'),
    field_label: header,
    field_type: 'text',
    sort_order: index,
    is_visible: true,
  }));

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
, supabaseClient?: any
): Promise<ImportJob> {
  const supabase = supabaseClient || clientSupabase;
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
      data: Object.fromEntries(headers.map((h, i) => [h.toLowerCase().replace(/\s+/g, '_'), row[i] || ''])),
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
        column_mapping: Object.fromEntries(headers.map((h, i) => [i, h])),
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
export async function exportProjectDataToCSV(projectId: string, supabaseClient?: any): Promise<string> {
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

  const headers = fields.map((f: any) => f.field_label);
  const headerRow = headers.map((h: string) => `"${h}"`).join(',');

  const dataRows = rows.map((row: any) => {
    return headers
      .map((header: string) => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
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
export async function getProjectExportData(projectId: string, supabaseClient?: any) {
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
, supabaseClient?: any
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
    const fieldsToInsert = template.custom_fields.map((field: any) => ({
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

  if (data.length < (options?.minRows || 2)) {
    errors.push(`Expected at least ${options?.minRows || 2} rows (including header)`);
  }

  if (data[0].length < (options?.minCols || 1)) {
    errors.push(`Expected at least ${options?.minCols || 1} columns`);
  }

  // Check for empty headers
  if (data[0].some(h => !h || h.trim() === '')) {
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
, supabaseClient?: any
): Promise<void> {
  const supabase = supabaseClient || clientSupabase;
  // Create any missing fields
  const existingFields = await supabase
    .from('project_custom_fields')
    .select('field_label')
    .eq('project_id', projectId);

  const existingLabels = existingFields.data?.map((f: any) => f.field_label) || [];
  const newHeaders = headers.filter(h => !existingLabels.includes(h));

  if (newHeaders.length > 0) {
    await createCustomFieldsFromHeaders(projectId, newHeaders);
  }

  // Import data with mapping
  const mappedData = data.slice(1).map((row: any) => {
    const mapped: Record<string, any> = {};
    headers.forEach((header: string, index: number) => {
      const mappedKey = mapping[header] || header;
      mapped[mappedKey.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
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
