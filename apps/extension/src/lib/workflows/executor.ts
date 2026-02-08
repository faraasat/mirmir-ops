// Workflow Executor - Runs workflow steps

import browser from 'webextension-polyfill';
import type { 
  Workflow, 
  WorkflowStep, 
  WorkflowExecution, 
  StepResult,
  StepCondition,
  ExecutionStatus 
} from './types';
import { 
  createExecution, 
  updateExecution, 
  updateWorkflowStats,
  getWorkflow,
  getExecution 
} from './storage';

export interface ExecutorCallbacks {
  onStepStart?: (step: WorkflowStep, execution: WorkflowExecution) => void;
  onStepComplete?: (step: WorkflowStep, result: StepResult, execution: WorkflowExecution) => void;
  onProgress?: (execution: WorkflowExecution) => void;
  onComplete?: (execution: WorkflowExecution) => void;
  onError?: (error: string, step?: WorkflowStep, execution?: WorkflowExecution) => void;
}

export class WorkflowExecutor {
  private callbacks: ExecutorCallbacks = {};
  private currentExecution: WorkflowExecution | null = null;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;

  setCallbacks(callbacks: ExecutorCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflowId: string,
    options: {
      tabId?: number;
      startUrl?: string;
      variables?: Record<string, unknown>;
    } = {}
  ): Promise<WorkflowExecution> {
    const workflow = await getWorkflow(workflowId);
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create execution record
    this.currentExecution = await createExecution(
      workflowId,
      options.startUrl,
      options.tabId
    );
    
    if (options.variables) {
      this.currentExecution.variables = { ...options.variables };
    }

    this.isPaused = false;
    this.isCancelled = false;

    // Update status to running
    await this.updateStatus('running');

    try {
      // Execute steps
      await this.executeSteps(workflow.steps, options.tabId);
      
      // Update final status
      if (!this.isCancelled) {
        await this.updateStatus('completed');
        await updateWorkflowStats(
          workflowId,
          true,
          Date.now() - this.currentExecution.startedAt
        );
      }
      
      this.callbacks.onComplete?.(this.currentExecution);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Workflow execution failed';
      
      await updateExecution(this.currentExecution.id, {
        status: 'failed',
        endedAt: Date.now(),
        error: errorMessage,
      });
      
      await updateWorkflowStats(
        workflowId,
        false,
        Date.now() - this.currentExecution.startedAt
      );
      
      this.callbacks.onError?.(errorMessage, undefined, this.currentExecution);
    }

    return this.currentExecution;
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.isPaused = true;
    if (this.currentExecution) {
      this.updateStatus('paused');
    }
  }

  /**
   * Resume execution
   */
  resume(): void {
    this.isPaused = false;
    if (this.currentExecution) {
      this.updateStatus('running');
    }
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    this.isCancelled = true;
    if (this.currentExecution) {
      this.updateStatus('cancelled');
    }
  }

  /**
   * Get current execution
   */
  getCurrentExecution(): WorkflowExecution | null {
    return this.currentExecution;
  }

  private async updateStatus(status: ExecutionStatus): Promise<void> {
    if (!this.currentExecution) return;
    
    this.currentExecution.status = status;
    
    const updates: Partial<WorkflowExecution> = { status };
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.endedAt = Date.now();
    }
    
    await updateExecution(this.currentExecution.id, updates);
    this.callbacks.onProgress?.(this.currentExecution);
  }

  private async executeSteps(steps: WorkflowStep[], tabId?: number): Promise<void> {
    let currentStepIndex = 0;
    
    while (currentStepIndex < steps.length) {
      // Check for pause/cancel
      if (this.isCancelled) {
        break;
      }
      
      while (this.isPaused) {
        await this.sleep(100);
        if (this.isCancelled) return;
      }
      
      const step = steps[currentStepIndex];
      this.currentExecution!.currentStepId = step.id;
      
      this.callbacks.onStepStart?.(step, this.currentExecution!);
      
      // Check conditions
      const conditionsMet = await this.checkConditions(step.conditions, tabId);
      
      if (!conditionsMet) {
        // Skip step if conditions not met
        const result: StepResult = {
          stepId: step.id,
          status: 'skipped',
          startedAt: Date.now(),
          endedAt: Date.now(),
        };
        
        this.currentExecution!.stepResults[step.id] = result;
        this.callbacks.onStepComplete?.(step, result, this.currentExecution!);
        
        currentStepIndex++;
        continue;
      }
      
      // Execute step with retry logic
      let result: StepResult | null = null;
      let retries = 0;
      const maxRetries = step.retryCount || 0;
      
      while (retries <= maxRetries) {
        try {
          result = await this.executeStep(step, tabId);
          break;
        } catch (error) {
          retries++;
          
          if (retries > maxRetries) {
            result = {
              stepId: step.id,
              status: 'failure',
              startedAt: Date.now(),
              endedAt: Date.now(),
              error: error instanceof Error ? error.message : 'Step failed',
              retryCount: retries - 1,
            };
          } else {
            // Wait before retry
            await this.sleep(step.retryDelay || 1000);
          }
        }
      }
      
      if (result) {
        this.currentExecution!.stepResults[step.id] = result;
        this.currentExecution!.completedSteps.push(step.id);
        
        // Handle output mapping
        if (result.status === 'success' && step.outputMapping && result.data) {
          for (const [varName, dataPath] of Object.entries(step.outputMapping)) {
            this.currentExecution!.variables[varName] = this.getNestedValue(
              result.data as Record<string, unknown>,
              dataPath
            );
          }
        }
        
        this.callbacks.onStepComplete?.(step, result, this.currentExecution!);
        
        // Update progress
        await updateExecution(this.currentExecution!.id, {
          currentStepId: step.id,
          completedSteps: this.currentExecution!.completedSteps,
          variables: this.currentExecution!.variables,
          stepResults: this.currentExecution!.stepResults,
        });
        
        // Determine next step
        if (result.status === 'failure') {
          const onFailure = step.onFailure || 'abort';
          
          if (onFailure === 'abort') {
            throw new Error(`Step "${step.name}" failed: ${result.error}`);
          } else if (onFailure === 'skip') {
            currentStepIndex++;
          } else {
            // Go to specific step
            const targetIndex = steps.findIndex(s => s.id === onFailure);
            if (targetIndex !== -1) {
              currentStepIndex = targetIndex;
            } else {
              currentStepIndex++;
            }
          }
        } else {
          // Success case
          if (step.onSuccess === 'end') {
            break;
          } else if (step.onSuccess) {
            const targetIndex = steps.findIndex(s => s.id === step.onSuccess);
            if (targetIndex !== -1) {
              currentStepIndex = targetIndex;
            } else {
              currentStepIndex++;
            }
          } else {
            currentStepIndex++;
          }
        }
        
        // Wait after step if configured
        if (step.waitAfter) {
          await this.sleep(step.waitAfter);
        }
      }
    }
  }

  private async executeStep(step: WorkflowStep, tabId?: number): Promise<StepResult> {
    const startedAt = Date.now();
    
    try {
      // Apply input mapping
      const parameters = { ...step.action.parameters };
      
      if (step.inputMapping) {
        for (const [paramName, varName] of Object.entries(step.inputMapping)) {
          parameters[paramName] = this.currentExecution!.variables[varName];
        }
      }
      
      // Execute action via content script
      const result = await this.executeAction(step.action, parameters, tabId);
      
      return {
        stepId: step.id,
        status: 'success',
        startedAt,
        endedAt: Date.now(),
        data: result,
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: 'failure',
        startedAt,
        endedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Action failed',
      };
    }
  }

  private async executeAction(
    action: WorkflowStep['action'],
    parameters: Record<string, unknown>,
    tabId?: number
  ): Promise<unknown> {
    if (!tabId) {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      tabId = tabs[0]?.id;
    }
    
    if (!tabId) {
      throw new Error('No active tab');
    }
    
    // Send action to content script
    const response = await browser.tabs.sendMessage(tabId, {
      type: 'EXECUTE_ACTION',
      payload: {
        action: action.type,
        target: action.target,
        value: action.value,
        ...parameters,
      },
      timestamp: Date.now(),
    });
    
    if (!response?.success) {
      throw new Error(response?.error || 'Action failed');
    }
    
    return response.data;
  }

  private async checkConditions(
    conditions: StepCondition[] | undefined,
    tabId?: number
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }
    
    for (const condition of conditions) {
      if (condition.type === 'always') {
        continue;
      }
      
      let result = false;
      
      switch (condition.type) {
        case 'element-exists':
          result = await this.checkElementExists(condition.selector!, tabId);
          break;
        case 'element-visible':
          result = await this.checkElementVisible(condition.selector!, tabId);
          break;
        case 'url-matches':
          result = await this.checkUrlMatches(condition.value as string, tabId);
          break;
        case 'variable-equals':
          result = this.currentExecution!.variables[condition.selector!] === condition.value;
          break;
      }
      
      if (condition.negate) {
        result = !result;
      }
      
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  private async checkElementExists(selector: string, tabId?: number): Promise<boolean> {
    if (!tabId) return false;
    
    try {
      const response = await browser.tabs.sendMessage(tabId, {
        type: 'CHECK_ELEMENT',
        payload: { selector, check: 'exists' },
        timestamp: Date.now(),
      });
      return response?.data?.exists ?? false;
    } catch {
      return false;
    }
  }

  private async checkElementVisible(selector: string, tabId?: number): Promise<boolean> {
    if (!tabId) return false;
    
    try {
      const response = await browser.tabs.sendMessage(tabId, {
        type: 'CHECK_ELEMENT',
        payload: { selector, check: 'visible' },
        timestamp: Date.now(),
      });
      return response?.data?.visible ?? false;
    } catch {
      return false;
    }
  }

  private async checkUrlMatches(pattern: string, tabId?: number): Promise<boolean> {
    if (!tabId) return false;
    
    try {
      const tab = await browser.tabs.get(tabId);
      const regex = new RegExp(pattern);
      return regex.test(tab.url || '');
    } catch {
      return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton executor
let executorInstance: WorkflowExecutor | null = null;

export function getWorkflowExecutor(): WorkflowExecutor {
  if (!executorInstance) {
    executorInstance = new WorkflowExecutor();
  }
  return executorInstance;
}
