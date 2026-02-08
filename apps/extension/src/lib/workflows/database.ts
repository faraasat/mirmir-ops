// Workflow Database using Dexie

import Dexie, { type Table } from 'dexie';
import type { Workflow, WorkflowExecution } from './types';

export class WorkflowDatabase extends Dexie {
  workflows!: Table<Workflow, string>;
  executions!: Table<WorkflowExecution, string>;

  constructor() {
    super('MirmirOpsWorkflows');
    
    this.version(1).stores({
      workflows: 'id, name, createdAt, updatedAt, *tags',
      executions: 'id, workflowId, startedAt, status, [workflowId+startedAt]',
    });
  }
}

// Singleton database instance
let db: WorkflowDatabase | null = null;

export function getWorkflowDatabase(): WorkflowDatabase {
  if (!db) {
    db = new WorkflowDatabase();
  }
  return db;
}

/**
 * Clear all workflow data
 */
export async function clearWorkflowDatabase(): Promise<void> {
  const database = getWorkflowDatabase();
  await database.workflows.clear();
  await database.executions.clear();
}
