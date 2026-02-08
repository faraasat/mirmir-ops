// Workflow Storage Operations

import { v4 as uuid } from 'uuid';
import { getWorkflowDatabase } from './database';
import type { Workflow, WorkflowExecution, WorkflowFilter, ExecutionStatus } from './types';

/**
 * Create a new workflow
 */
export async function createWorkflow(
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'successCount'>
): Promise<Workflow> {
  const now = Date.now();
  
  const newWorkflow: Workflow = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    runCount: 0,
    successCount: 0,
    version: '1.0.0',
    ...workflow,
  };
  
  const db = getWorkflowDatabase();
  await db.workflows.add(newWorkflow);
  
  return newWorkflow;
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  id: string,
  updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>
): Promise<Workflow | undefined> {
  const db = getWorkflowDatabase();
  
  await db.workflows.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
  
  return db.workflows.get(id);
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(id: string): Promise<Workflow | undefined> {
  const db = getWorkflowDatabase();
  return db.workflows.get(id);
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const db = getWorkflowDatabase();
  
  // Delete workflow and its executions
  await db.transaction('rw', [db.workflows, db.executions], async () => {
    await db.executions.where('workflowId').equals(id).delete();
    await db.workflows.delete(id);
  });
}

/**
 * Get all workflows with optional filtering
 */
export async function getWorkflows(filter?: WorkflowFilter): Promise<Workflow[]> {
  const db = getWorkflowDatabase();
  let collection = db.workflows.orderBy('updatedAt').reverse();
  
  let workflows = await collection.toArray();
  
  // Apply filters
  if (filter?.tags && filter.tags.length > 0) {
    workflows = workflows.filter(w => 
      w.tags?.some(t => filter.tags!.includes(t))
    );
  }
  
  if (filter?.searchText) {
    const search = filter.searchText.toLowerCase();
    workflows = workflows.filter(w =>
      w.name.toLowerCase().includes(search) ||
      w.description?.toLowerCase().includes(search)
    );
  }
  
  if (filter?.triggerType) {
    workflows = workflows.filter(w => w.trigger?.type === filter.triggerType);
  }
  
  if (filter?.hasSchedule !== undefined) {
    workflows = workflows.filter(w =>
      filter.hasSchedule 
        ? w.trigger?.type === 'scheduled' && w.trigger.enabled
        : w.trigger?.type !== 'scheduled' || !w.trigger.enabled
    );
  }
  
  // Pagination
  if (filter?.offset) {
    workflows = workflows.slice(filter.offset);
  }
  
  if (filter?.limit) {
    workflows = workflows.slice(0, filter.limit);
  }
  
  return workflows;
}

/**
 * Count workflows
 */
export async function countWorkflows(): Promise<number> {
  const db = getWorkflowDatabase();
  return db.workflows.count();
}

/**
 * Create a workflow execution record
 */
export async function createExecution(
  workflowId: string,
  startUrl?: string,
  tabId?: number
): Promise<WorkflowExecution> {
  const execution: WorkflowExecution = {
    id: uuid(),
    workflowId,
    startedAt: Date.now(),
    status: 'pending',
    completedSteps: [],
    variables: {},
    stepResults: {},
    startUrl,
    tabId,
  };
  
  const db = getWorkflowDatabase();
  await db.executions.add(execution);
  
  return execution;
}

/**
 * Update execution status and progress
 */
export async function updateExecution(
  id: string,
  updates: Partial<Omit<WorkflowExecution, 'id' | 'workflowId' | 'startedAt'>>
): Promise<void> {
  const db = getWorkflowDatabase();
  await db.executions.update(id, updates);
}

/**
 * Get execution by ID
 */
export async function getExecution(id: string): Promise<WorkflowExecution | undefined> {
  const db = getWorkflowDatabase();
  return db.executions.get(id);
}

/**
 * Get executions for a workflow
 */
export async function getWorkflowExecutions(
  workflowId: string,
  limit: number = 10
): Promise<WorkflowExecution[]> {
  const db = getWorkflowDatabase();
  return db.executions
    .where('workflowId')
    .equals(workflowId)
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get recent executions
 */
export async function getRecentExecutions(limit: number = 20): Promise<WorkflowExecution[]> {
  const db = getWorkflowDatabase();
  return db.executions
    .orderBy('startedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Update workflow stats after execution
 */
export async function updateWorkflowStats(
  workflowId: string,
  success: boolean,
  duration: number
): Promise<void> {
  const db = getWorkflowDatabase();
  const workflow = await db.workflows.get(workflowId);
  
  if (workflow) {
    const newRunCount = workflow.runCount + 1;
    const newSuccessCount = workflow.successCount + (success ? 1 : 0);
    const avgDuration = workflow.averageDuration
      ? (workflow.averageDuration * workflow.runCount + duration) / newRunCount
      : duration;
    
    await db.workflows.update(workflowId, {
      runCount: newRunCount,
      successCount: newSuccessCount,
      lastRunAt: Date.now(),
      averageDuration: avgDuration,
    });
  }
}

/**
 * Export workflow as JSON
 */
export function exportWorkflow(workflow: Workflow): string {
  // Remove internal stats for export
  const exported = {
    name: workflow.name,
    description: workflow.description,
    version: workflow.version,
    steps: workflow.steps,
    trigger: workflow.trigger,
    settings: workflow.settings,
    tags: workflow.tags,
  };
  
  return JSON.stringify(exported, null, 2);
}

/**
 * Import workflow from JSON
 */
export async function importWorkflow(json: string): Promise<Workflow> {
  const data = JSON.parse(json);
  
  // Validate required fields
  if (!data.name || !data.steps || !Array.isArray(data.steps)) {
    throw new Error('Invalid workflow format: missing name or steps');
  }
  
  return createWorkflow({
    name: data.name,
    description: data.description,
    version: data.version || '1.0.0',
    steps: data.steps,
    trigger: data.trigger,
    settings: data.settings,
    tags: data.tags,
  });
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(id: string): Promise<Workflow> {
  const original = await getWorkflow(id);
  
  if (!original) {
    throw new Error('Workflow not found');
  }
  
  return createWorkflow({
    name: `${original.name} (Copy)`,
    description: original.description,
    version: original.version,
    steps: original.steps.map(step => ({ ...step, id: uuid() })),
    trigger: undefined, // Don't copy trigger
    settings: original.settings,
    tags: original.tags,
  });
}
