import { supabase } from '@/lib/supabase';
import type { ProjectWizardData } from '@/lib/wizard-types';
import { DEFAULT_MILESTONES, DEFAULT_PHASES } from '@/lib/wizard-types';

export interface CreationResult {
  success: boolean;
  project_id?: string;
  project_code?: string;
  error?: string;
  details?: string[];
}

export async function createProjectWithWizard(
  data: ProjectWizardData,
  creatorId: string
): Promise<CreationResult> {
  const details: string[] = [];
  try {
    // 1. Resolve customer
    let customerId: string | null = null;
    if (data.project_type !== 'internal') {
      if (data.owner_type === 'existing') {
        customerId = data.existing_customer_id || null;
      } else if (data.owner_type === 'new' && data.new_customer.name) {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            name: data.new_customer.name,
            company: data.new_customer.company || data.new_customer.name,
            email: data.new_customer.email,
            phone: data.new_customer.phone,
            country: data.new_customer.country,
            industry: data.new_customer.industry,
            city: data.new_customer.city,
            tin: data.new_customer.tin,
            registration_number: data.new_customer.registration_number,
            website: data.new_customer.website,
            physical_address: data.new_customer.physical_address,
            postal_address: data.new_customer.postal_address,
            contact_person_name: data.new_customer.contact_person_name,
            contact_position: data.new_customer.contact_position,
            contact_email: data.new_customer.contact_email,
            contact_phone: data.new_customer.contact_phone,
            billing_contact: data.new_customer.billing_contact,
            finance_contact: data.new_customer.finance_contact,
            status: 'active',
            created_by: creatorId,
          })
          .select()
          .single();
        if (custErr) throw new Error(`Customer creation failed: ${custErr.message}`);
        customerId = newCust.id;
        details.push('Customer record created');
      }
    }

    // 2. Create the project
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .insert({
        name: data.name,
        description: data.description,
        status: 'planning',
        priority: data.priority,
        customer_id: customerId,
        budget: data.budget.estimated_cost || 0,
        spent: 0,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        progress: 0,
        created_by: creatorId,
        project_code: data.project_code,
        project_type: data.project_type,
        department: data.department,
        category: data.category,
        objectives: data.objectives,
        deliverables: data.deliverables,
        success_criteria: data.success_criteria,
        tags: data.tags,
        customer_price: data.budget.customer_price,
        discount: data.budget.discount,
        taxes: data.budget.taxes,
        expected_revenue: data.budget.customer_price,
        estimated_costs: data.budget.estimated_costs,
        warranty_end: data.warranty_end || null,
        support_end: data.support_end || null,
        deployment_date: data.deployment_date || null,
        maintenance_end: data.maintenance_end || null,
        communication_channels: data.communication.channels,
        meeting_frequency: data.communication.meeting_frequency,
        escalation_contacts: data.communication.escalation_contacts,
        notification_recipients: data.communication.notification_recipients,
        approval_needed: data.requirements.approval_needed,
        approval_person: data.requirements.approval_person,
        brand_assets: data.requirements.brand_assets,
        credentials_required: data.requirements.credentials_required,
        git_repo_url: data.git_repo_url,
        doc_links: data.doc_links,
      })
      .select()
      .single();
    if (projErr) throw new Error(`Project creation failed: ${projErr.message}`);
    const projectId = project.id;
    details.push('Project record created');

    // 3. Budget proposal (if create new)
    if (data.budget.budget_source === 'new' && data.budget.budget_name) {
      const { error: budgetErr } = await supabase
        .from('budget_proposals')
        .insert({
          title: data.budget.budget_name,
          description: `Budget for ${data.name}`,
          amount: data.budget.estimated_cost,
          currency: data.budget.currency,
          category: data.budget.department || 'general',
          project_id: projectId,
          proposed_by: creatorId,
          status: 'pending',
          priority: data.priority,
        });
      if (budgetErr) details.push(`Budget proposal warning: ${budgetErr.message}`);
      else details.push('Budget proposal created');
    }

    // 4. Finance records - projected revenue, estimated costs
    const financeRecords: any[] = [];
    if (data.budget.customer_price > 0) {
      financeRecords.push({
        title: `Projected Revenue - ${data.name}`,
        type: 'income',
        amount: data.budget.customer_price,
        currency: data.budget.currency,
        category: 'project_revenue',
        project_id: projectId,
        description: `Expected revenue from ${data.name}`,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_by: creatorId,
      });
    }
    const totalCost = Object.values(data.budget.estimated_costs).reduce(
      (s, v) => s + (Number(v) || 0),
      0
    );
    if (totalCost > 0) {
      financeRecords.push({
        title: `Estimated Costs - ${data.name}`,
        type: 'expense',
        amount: totalCost,
        currency: data.budget.currency,
        category: 'project_cost',
        project_id: projectId,
        description: `Estimated costs for ${data.name}`,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_by: creatorId,
      });
    }
    if (financeRecords.length > 0) {
      const { error: finErr } = await supabase
        .from('financial_records')
        .insert(financeRecords);
      if (finErr) details.push(`Finance records warning: ${finErr.message}`);
      else details.push('Finance records created (revenue + costs)');
    }

    // 5. Team assignments
    const assignments = data.team
      .filter((t) => t.member_id)
      .map((t) => ({
        project_id: projectId,
        member_id: t.member_id,
        role_in_project: t.role,
        can_edit_tasks: t.permissions.includes('write'),
        can_edit_project: t.permissions.includes('manage'),
        can_manage_members: t.permissions.includes('manage'),
        can_view_analytics: t.permissions.includes('read') || t.permissions.includes('approve'),
        can_import_export: t.permissions.includes('finance'),
      }));
    if (assignments.length > 0) {
      const { error: assignErr } = await supabase
        .from('project_assignments')
        .insert(assignments);
      if (assignErr) details.push(`Team assignment warning: ${assignErr.message}`);
      else details.push(`${assignments.length} team members assigned`);
    }

    // 6. Notifications to team members
    const notifications = data.team
      .filter((t) => t.member_id)
      .map((t) => ({
        user_id: t.member_id,
        title: 'Assigned to Project',
        message: `You have been assigned to "${data.name}" as ${t.role.replace('_', ' ')}.`,
        type: 'task' as const,
        is_read: false,
        link: `/projects/${projectId}`,
      }));
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // 7. Milestones
    const milestones =
      data.milestones.length > 0 ? data.milestones : DEFAULT_MILESTONES;
    const milestoneRows = milestones.map((m, i) => ({
      project_id: projectId,
      name: m.name,
      target_date: m.target_date || null,
      status: m.status,
      sort_order: i,
    }));
    const { error: mileErr } = await supabase
      .from('project_milestones')
      .insert(milestoneRows);
    if (mileErr) details.push(`Milestones warning: ${mileErr.message}`);
    else details.push(`${milestoneRows.length} milestones created`);

    // 8. Phases + tasks
    const phases = data.phases.length > 0 ? data.phases : DEFAULT_PHASES;
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const { data: phaseRow, error: phaseErr } = await supabase
        .from('project_phases')
        .insert({
          project_id: projectId,
          name: phase.name,
          description: phase.description,
          sort_order: i,
          status: 'planned',
          start_date: phase.start_date || null,
          end_date: phase.end_date || null,
        })
        .select()
        .single();
      if (phaseErr) {
        details.push(`Phase warning: ${phaseErr.message}`);
        continue;
      }
      // Create tasks for this phase
      const taskRows = phase.tasks.map((t) => ({
        project_id: projectId,
        title: t.title,
        description: t.description,
        status: 'todo',
        priority: data.priority,
        assigned_to: t.owner_id,
        estimated_hours: t.estimated_hours || 0,
        created_by: creatorId,
      }));
      if (taskRows.length > 0) {
        const { data: insertedTasks, error: taskErr } = await supabase
          .from('tasks')
          .insert(taskRows)
          .select();
        if (taskErr) details.push(`Tasks warning: ${taskErr.message}`);
        else if (insertedTasks) {
          // Create subtasks
          for (let j = 0; j < phase.tasks.length; j++) {
            const task = phase.tasks[j];
            const inserted = insertedTasks[j];
            if (task.subtasks.length > 0 && inserted) {
              const subRows = task.subtasks.map((st) => ({
                task_id: inserted.id,
                title: st,
                is_completed: false,
                assigned_to: task.owner_id,
              }));
              await supabase.from('task_subtasks').insert(subRows);
            }
          }
        }
      }
    }
    details.push(`${phases.length} phases created with tasks`);

    // 9. Risks
    if (data.risks.length > 0) {
      const riskRows = data.risks.map((r) => ({
        project_id: projectId,
        risk: r.risk,
        probability: r.probability,
        impact: r.impact,
        owner: r.owner_id,
        mitigation: r.mitigation,
        status: 'open',
      }));
      const { error: riskErr } = await supabase
        .from('project_risks')
        .insert(riskRows);
      if (riskErr) details.push(`Risks warning: ${riskErr.message}`);
      else details.push(`${riskRows.length} risks registered`);
    }

    // 10. Dependencies
    if (data.dependencies.length > 0) {
      const depRows = data.dependencies.map((d) => ({
        project_id: projectId,
        description: d.description,
        dependency_type: d.dependency_type,
        status: 'pending',
        due_date: d.due_date || null,
      }));
      const { error: depErr } = await supabase
        .from('project_dependencies')
        .insert(depRows);
      if (depErr) details.push(`Dependencies warning: ${depErr.message}`);
      else details.push(`${depRows.length} dependencies tracked`);
    }

    // 11. Documents
    if (data.documents.length > 0) {
      const docRows = data.documents.map((d) => {
        const folderMap: Record<string, string> = {
          proposal: 'other',
          quotation: 'finance',
          contract: 'contracts',
          scope: 'requirements',
          requirements: 'requirements',
          design: 'design',
          meeting_minutes: 'meetings',
          invoice: 'finance',
          purchase_order: 'finance',
          research: 'other',
          wireframes: 'design',
          ui: 'design',
          api_docs: 'requirements',
          other: 'other',
        };
        return {
          project_id: projectId,
          name: d.name,
          document_type: d.document_type,
          folder: folderMap[d.document_type] || 'other',
          url: d.url,
          description: d.description,
          uploaded_by: creatorId,
        };
      });
      const { error: docErr } = await supabase
        .from('project_documents')
        .insert(docRows);
      if (docErr) details.push(`Documents warning: ${docErr.message}`);
      else details.push(`${docRows.length} documents indexed`);
    }

    // 12. Requirements checklist
    if (data.requirements.information_needed.length > 0) {
      const checkRows = data.requirements.information_needed.map((item, i) => ({
        project_id: projectId,
        item,
        is_done: false,
        sort_order: i,
      }));
      await supabase.from('project_requirements_checklist').insert(checkRows);
      details.push(`${checkRows.length} checklist items created`);
    }

    // 13. Communication channel
    const channelName = `proj-${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;
    const { data: channel, error: chanErr } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        description: `Discussion space for ${data.name}`,
        type: 'private',
        created_by: creatorId,
      })
      .select()
      .single();
    if (chanErr) {
      details.push(`Channel warning: ${chanErr.message}`);
    } else if (channel) {
      details.push('Communication channel created');
      // Add creator + team members to channel
      const channelMembers = [
        { channel_id: channel.id, member_id: creatorId },
        ...data.team
          .filter((t) => t.member_id)
          .map((t) => ({ channel_id: channel.id, member_id: t.member_id })),
      ];
      await supabase.from('channel_members').insert(channelMembers);
    }

    // 14. Activity log - "Project Created"
    const { error: actErr } = await supabase
      .from('project_activity_log')
      .insert({
        project_id: projectId,
        action: 'project_created',
        description: `Project "${data.name}" created`,
        actor_id: creatorId,
        metadata: { project_type: data.project_type, project_code: data.project_code },
      });
    if (actErr) details.push(`Activity log warning: ${actErr.message}`);
    else details.push('Activity timeline initialized');

    // 15. Link channel to project
    if (channel) {
      await supabase.from('project_links').insert({
        project_id: projectId,
        linked_entity_type: 'channel',
        linked_entity_id: channel.id,
        linked_entity_name: channel.name,
        created_by: creatorId,
      });
    }

    return {
      success: true,
      project_id: projectId,
      project_code: data.project_code,
      details,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error during project creation',
      details,
    };
  }
}
