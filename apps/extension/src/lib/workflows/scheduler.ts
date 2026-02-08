// Workflow Scheduler - Manages scheduled workflow execution
import browser from 'webextension-polyfill';
import { getWorkflows, getWorkflow } from './storage';
import { WorkflowExecutor } from './executor';
import type { Workflow, WorkflowExecution } from './types';

// Cron expression parser (simplified - supports minute, hour, day of month, month, day of week)
interface CronParts {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

const ALARM_PREFIX = 'workflow-schedule-';

// In-memory cache of scheduled workflows
let scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();

interface ScheduledWorkflow {
  workflowId: string;
  alarmName: string;
  cronExpression: string;
  timezone: string;
  nextRun: number;
  enabled: boolean;
}

/**
 * Initialize the workflow scheduler
 */
export async function initializeScheduler(): Promise<void> {
  // Clear any stale alarms
  const existingAlarms = await browser.alarms.getAll();
  for (const alarm of existingAlarms) {
    if (alarm.name.startsWith(ALARM_PREFIX)) {
      await browser.alarms.clear(alarm.name);
    }
  }
  
  // Load all scheduled workflows
  const workflows = await getWorkflows({ hasSchedule: true });
  
  for (const workflow of workflows) {
    if (workflow.trigger?.type === 'scheduled' && workflow.trigger.enabled) {
      await scheduleWorkflow(workflow);
    }
  }
  
  console.log(`[Scheduler] Initialized with ${scheduledWorkflows.size} scheduled workflows`);
}

/**
 * Schedule a workflow based on its trigger configuration
 */
export async function scheduleWorkflow(workflow: Workflow): Promise<void> {
  if (!workflow.trigger || workflow.trigger.type !== 'scheduled') {
    return;
  }
  
  const { cron, timezone = 'UTC' } = workflow.trigger.config;
  
  if (!cron) {
    console.warn(`[Scheduler] Workflow ${workflow.id} has no cron expression`);
    return;
  }
  
  // Clear existing schedule for this workflow
  await unscheduleWorkflow(workflow.id);
  
  // Calculate next run time
  const nextRun = getNextRunTime(cron, timezone);
  
  if (!nextRun) {
    console.error(`[Scheduler] Invalid cron expression for workflow ${workflow.id}: ${cron}`);
    return;
  }
  
  // Create alarm
  const alarmName = `${ALARM_PREFIX}${workflow.id}`;
  
  await browser.alarms.create(alarmName, {
    when: nextRun,
  });
  
  // Store in cache
  scheduledWorkflows.set(workflow.id, {
    workflowId: workflow.id,
    alarmName,
    cronExpression: cron,
    timezone,
    nextRun,
    enabled: workflow.trigger.enabled,
  });
  
  console.log(`[Scheduler] Scheduled workflow ${workflow.id} for ${new Date(nextRun).toISOString()}`);
}

/**
 * Unschedule a workflow
 */
export async function unscheduleWorkflow(workflowId: string): Promise<void> {
  const scheduled = scheduledWorkflows.get(workflowId);
  
  if (scheduled) {
    await browser.alarms.clear(scheduled.alarmName);
    scheduledWorkflows.delete(workflowId);
    console.log(`[Scheduler] Unscheduled workflow ${workflowId}`);
  }
}

/**
 * Handle alarm firing - execute the scheduled workflow
 */
export async function handleScheduledAlarm(alarmName: string): Promise<void> {
  if (!alarmName.startsWith(ALARM_PREFIX)) {
    return;
  }
  
  const workflowId = alarmName.replace(ALARM_PREFIX, '');
  const scheduled = scheduledWorkflows.get(workflowId);
  
  if (!scheduled || !scheduled.enabled) {
    return;
  }
  
  console.log(`[Scheduler] Executing scheduled workflow ${workflowId}`);
  
  try {
    // Get fresh workflow data
    const workflow = await getWorkflow(workflowId);
    
    if (!workflow) {
      console.error(`[Scheduler] Workflow ${workflowId} not found`);
      await unscheduleWorkflow(workflowId);
      return;
    }
    
    // Execute the workflow
    const executor = new WorkflowExecutor();
    const execution = await executor.execute(workflowId);
    
    // Notify if configured
    if (workflow.settings?.notifyOnComplete || workflow.settings?.notifyOnError) {
      await notifyWorkflowResult(workflow, execution);
    }
    
    // Re-schedule for next occurrence
    await scheduleWorkflow(workflow);
    
  } catch (error) {
    console.error(`[Scheduler] Failed to execute workflow ${workflowId}:`, error);
    
    // Still try to reschedule
    const workflow = await getWorkflow(workflowId);
    if (workflow) {
      await scheduleWorkflow(workflow);
    }
  }
}

/**
 * Notify user of workflow execution result
 */
async function notifyWorkflowResult(
  workflow: Workflow,
  execution: WorkflowExecution
): Promise<void> {
  const isSuccess = execution.status === 'completed';
  
  if (isSuccess && !workflow.settings?.notifyOnComplete) return;
  if (!isSuccess && !workflow.settings?.notifyOnError) return;
  
  await browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('icons/icon-48.png'),
    title: `Workflow ${isSuccess ? 'Completed' : 'Failed'}: ${workflow.name}`,
    message: isSuccess 
      ? `Workflow executed successfully in ${Math.round((execution.endedAt! - execution.startedAt) / 1000)}s`
      : `Workflow failed: ${execution.error || 'Unknown error'}`,
  });
}

/**
 * Get next run time from cron expression
 */
export function getNextRunTime(cron: string, _timezone: string = 'UTC'): number | null {
  try {
    const parts = parseCron(cron);
    if (!parts) return null;
    
    const now = new Date();
    let next = new Date(now);
    
    // Set to start of current minute
    next.setSeconds(0);
    next.setMilliseconds(0);
    
    // Add one minute to start checking from next minute
    next.setMinutes(next.getMinutes() + 1);
    
    // Find next matching time (max 1 year ahead)
    const maxIterations = 365 * 24 * 60; // 1 year in minutes
    
    for (let i = 0; i < maxIterations; i++) {
      if (matchesCron(next, parts)) {
        return next.getTime();
      }
      next.setMinutes(next.getMinutes() + 1);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse cron expression into parts
 */
function parseCron(cron: string): CronParts | null {
  const fields = cron.trim().split(/\s+/);
  
  if (fields.length !== 5) {
    return null;
  }
  
  try {
    return {
      minute: parseField(fields[0], 0, 59),
      hour: parseField(fields[1], 0, 23),
      dayOfMonth: parseField(fields[2], 1, 31),
      month: parseField(fields[3], 1, 12),
      dayOfWeek: parseField(fields[4], 0, 6),
    };
  } catch {
    return null;
  }
}

/**
 * Parse a single cron field
 */
function parseField(field: string, min: number, max: number): number[] {
  const values: number[] = [];
  
  // Handle wildcard
  if (field === '*') {
    for (let i = min; i <= max; i++) {
      values.push(i);
    }
    return values;
  }
  
  // Handle step values (e.g., */15)
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) throw new Error('Invalid step');
    
    for (let i = min; i <= max; i += step) {
      values.push(i);
    }
    return values;
  }
  
  // Handle comma-separated values
  const parts = field.split(',');
  
  for (const part of parts) {
    // Handle range (e.g., 1-5)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s, 10));
      if (isNaN(start) || isNaN(end)) throw new Error('Invalid range');
      
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.push(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num)) throw new Error('Invalid number');
      if (num >= min && num <= max) values.push(num);
    }
  }
  
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Check if a date matches the cron expression
 */
function matchesCron(date: Date, parts: CronParts): boolean {
  return (
    parts.minute.includes(date.getMinutes()) &&
    parts.hour.includes(date.getHours()) &&
    parts.dayOfMonth.includes(date.getDate()) &&
    parts.month.includes(date.getMonth() + 1) &&
    parts.dayOfWeek.includes(date.getDay())
  );
}

/**
 * Get all scheduled workflows
 */
export function getScheduledWorkflows(): ScheduledWorkflow[] {
  return Array.from(scheduledWorkflows.values());
}

/**
 * Get a specific scheduled workflow
 */
export function getScheduledWorkflow(workflowId: string): ScheduledWorkflow | undefined {
  return scheduledWorkflows.get(workflowId);
}

/**
 * Enable/disable a scheduled workflow
 */
export async function setScheduleEnabled(workflowId: string, enabled: boolean): Promise<void> {
  const scheduled = scheduledWorkflows.get(workflowId);
  
  if (!scheduled) return;
  
  if (enabled && !scheduled.enabled) {
    // Re-enable: reschedule
    const workflow = await getWorkflow(workflowId);
    if (workflow) {
      await scheduleWorkflow(workflow);
    }
  } else if (!enabled && scheduled.enabled) {
    // Disable: clear alarm but keep in cache
    await browser.alarms.clear(scheduled.alarmName);
    scheduled.enabled = false;
  }
}

/**
 * Get human-readable description of cron expression
 */
export function describeCron(cron: string): string {
  const parts = parseCron(cron);
  if (!parts) return 'Invalid cron expression';
  
  const { minute, hour, dayOfWeek } = parts;
  
  let description = '';
  
  // Handle common patterns
  if (minute.length === 60 && hour.length === 24) {
    description = 'Every minute';
  } else if (minute.length === 1 && hour.length === 24) {
    description = `Every hour at minute ${minute[0]}`;
  } else if (minute.length === 1 && hour.length === 1) {
    const timeStr = `${hour[0].toString().padStart(2, '0')}:${minute[0].toString().padStart(2, '0')}`;
    description = `Daily at ${timeStr}`;
  } else {
    description = 'Custom schedule';
  }
  
  // Add day-of-week info
  if (dayOfWeek.length < 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = dayOfWeek.map(d => days[d]).join(', ');
    description += ` on ${dayNames}`;
  }
  
  return description;
}

/**
 * Validate a cron expression
 */
export function validateCron(cron: string): { valid: boolean; error?: string } {
  const parts = parseCron(cron);
  
  if (!parts) {
    return { valid: false, error: 'Invalid cron format. Expected 5 fields: minute hour day month weekday' };
  }
  
  if (parts.minute.length === 0) {
    return { valid: false, error: 'Invalid minute field' };
  }
  if (parts.hour.length === 0) {
    return { valid: false, error: 'Invalid hour field' };
  }
  if (parts.dayOfMonth.length === 0) {
    return { valid: false, error: 'Invalid day of month field' };
  }
  if (parts.month.length === 0) {
    return { valid: false, error: 'Invalid month field' };
  }
  if (parts.dayOfWeek.length === 0) {
    return { valid: false, error: 'Invalid day of week field' };
  }
  
  return { valid: true };
}
