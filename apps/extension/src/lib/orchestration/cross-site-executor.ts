// Cross-Site Executor - Orchestrates tasks across multiple sites/tabs

import { 
  createShadowTab, 
  closeShadowTab, 
  closeTaskShadowTabs,
  executeInShadowTab, 
  extractFromShadowTab,
  navigateShadowTab,
  markShadowTabCompleted,
  type ShadowTab,
  type ShadowTabResult,
} from '@/background/shadow-tab-manager';

import {
  aggregateResults,
  aggregateProducts,
  aggregateEvents,
  aggregateArticles,
  type TabResult,
  type AggregatedResult,
  type RankingCriteria,
  type DeduplicationOptions,
} from './result-aggregator';

import { logAction } from '@/lib/history';

/**
 * Cross-site task definition
 */
export interface CrossSiteTask {
  id: string;
  name: string;
  description?: string;
  urls: string[];
  actions: TaskAction[];
  aggregation?: AggregationConfig;
  options?: TaskOptions;
}

/**
 * Action to perform on each site
 */
export interface TaskAction {
  id: string;
  type: 'extract' | 'fill-form' | 'click' | 'navigate' | 'wait' | 'custom';
  selector?: string;
  value?: unknown;
  options?: Record<string, unknown>;
  continueOnError?: boolean;
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  type: 'products' | 'events' | 'articles' | 'generic' | 'none';
  deduplication?: DeduplicationOptions;
  ranking?: RankingCriteria[];
  mergeStrategy?: 'union' | 'intersection' | 'priority';
}

/**
 * Task execution options
 */
export interface TaskOptions {
  parallel?: boolean;           // Execute sites in parallel
  maxConcurrent?: number;       // Max concurrent tabs (default: 3)
  throttle?: 'low' | 'medium' | 'high';
  timeout?: number;             // Overall task timeout (ms)
  perSiteTimeout?: number;      // Per-site timeout (ms)
  retryFailed?: boolean;        // Retry failed sites
  maxRetries?: number;          // Max retries per site
  autoClose?: boolean;          // Auto-close tabs after completion
}

/**
 * Task execution result
 */
export interface TaskResult<T = unknown> {
  taskId: string;
  success: boolean;
  aggregated: AggregatedResult<T> | null;
  summary: {
    totalSites: number;
    successfulSites: number;
    failedSites: number;
    totalDuration: number;
    averageSiteTime: number;
  };
  errors: Array<{ url: string; error: string }>;
}

/**
 * Cross-Site Executor class
 */
export class CrossSiteExecutor {
  private taskId: string;
  private shadowTabs: Map<number, ShadowTab> = new Map();
  private results: TabResult[] = [];
  private isRunning: boolean = false;
  private aborted: boolean = false;
  
  constructor(taskId?: string) {
    this.taskId = taskId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  
  /**
   * Execute a cross-site task
   */
  async execute<T = unknown>(task: CrossSiteTask): Promise<TaskResult<T>> {
    const startTime = Date.now();
    this.isRunning = true;
    this.aborted = false;
    this.results = [];
    
    const options = {
      parallel: true,
      maxConcurrent: 3,
      throttle: 'medium' as const,
      timeout: 120000,
      perSiteTimeout: 30000,
      retryFailed: true,
      maxRetries: 1,
      autoClose: true,
      ...task.options,
    };
    
    const errors: Array<{ url: string; error: string }> = [];
    
    try {
      // Log task start
      await logAction(
        { type: 'cross-site-task-start', target: task.name },
        { success: true, data: { taskId: this.taskId, urls: task.urls } },
        { url: task.urls[0], title: task.name }
      );
      
      // Execute based on parallel setting
      if (options.parallel) {
        await this.executeParallel(task, options, errors);
      } else {
        await this.executeSequential(task, options, errors);
      }
      
      // Aggregate results
      let aggregated: AggregatedResult<T> | null = null;
      
      if (task.aggregation && task.aggregation.type !== 'none') {
        aggregated = this.aggregateByType<T>(task.aggregation);
      }
      
      // Calculate summary
      const summary = this.calculateSummary(startTime);
      
      // Cleanup
      if (options.autoClose) {
        await closeTaskShadowTabs(this.taskId);
      }
      
      // Log task completion
      await logAction(
        { type: 'cross-site-task-complete', target: task.name },
        { success: true, data: { summary } },
        { url: task.urls[0], title: task.name }
      );
      
      this.isRunning = false;
      
      return {
        taskId: this.taskId,
        success: errors.length === 0,
        aggregated,
        summary,
        errors,
      };
      
    } catch (error) {
      this.isRunning = false;
      
      const errorMessage = error instanceof Error ? error.message : 'Task execution failed';
      
      await logAction(
        { type: 'cross-site-task-error', target: task.name },
        { success: false, error: errorMessage },
        { url: task.urls[0], title: task.name }
      );
      
      return {
        taskId: this.taskId,
        success: false,
        aggregated: null,
        summary: this.calculateSummary(startTime),
        errors: [...errors, { url: 'task', error: errorMessage }],
      };
    }
  }
  
  /**
   * Execute sites in parallel with concurrency limit
   */
  private async executeParallel(
    task: CrossSiteTask,
    options: Required<TaskOptions>,
    errors: Array<{ url: string; error: string }>
  ): Promise<void> {
    const queue = [...task.urls];
    const running: Promise<void>[] = [];
    
    while (queue.length > 0 || running.length > 0) {
      if (this.aborted) break;
      
      // Fill up to maxConcurrent
      while (queue.length > 0 && running.length < options.maxConcurrent) {
        const url = queue.shift()!;
        const promise = this.processSite(url, task.actions, options, errors)
          .then(() => {
            // Remove from running when done
            const index = running.indexOf(promise);
            if (index > -1) running.splice(index, 1);
          });
        running.push(promise);
      }
      
      // Wait for at least one to complete
      if (running.length > 0) {
        await Promise.race(running);
      }
    }
  }
  
  /**
   * Execute sites sequentially
   */
  private async executeSequential(
    task: CrossSiteTask,
    options: Required<TaskOptions>,
    errors: Array<{ url: string; error: string }>
  ): Promise<void> {
    for (const url of task.urls) {
      if (this.aborted) break;
      await this.processSite(url, task.actions, options, errors);
    }
  }
  
  /**
   * Process a single site
   */
  private async processSite(
    url: string,
    actions: TaskAction[],
    options: Required<TaskOptions>,
    errors: Array<{ url: string; error: string }>,
    retryCount: number = 0
  ): Promise<void> {
    const startTime = Date.now();
    let tabId: number | null = null;
    
    try {
      // Create shadow tab
      const shadowTab = await createShadowTab({
        url,
        taskId: this.taskId,
        waitForLoad: true,
        timeout: options.perSiteTimeout,
        throttle: options.throttle,
        autoClose: options.autoClose,
      });
      
      tabId = shadowTab.id;
      this.shadowTabs.set(tabId, shadowTab);
      
      // Execute actions
      const actionResults: unknown[] = [];
      
      for (const action of actions) {
        if (this.aborted) break;
        
        const result = await this.executeAction(tabId, action, options.perSiteTimeout);
        
        if (!result.success && !action.continueOnError) {
          throw new Error(result.error || `Action ${action.type} failed`);
        }
        
        if (result.data) {
          actionResults.push(result.data);
        }
      }
      
      // Store result
      this.results.push({
        tabId,
        url,
        source: new URL(url).hostname,
        timestamp: Date.now(),
        success: true,
        data: actionResults.length === 1 ? actionResults[0] : actionResults,
        duration: Date.now() - startTime,
      });
      
      markShadowTabCompleted(tabId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Site processing failed';
      
      // Retry logic
      if (options.retryFailed && retryCount < options.maxRetries) {
        console.log(`[CrossSiteExecutor] Retrying ${url} (attempt ${retryCount + 2})`);
        
        // Close failed tab
        if (tabId) {
          await closeShadowTab(tabId).catch(() => {});
        }
        
        // Wait before retry
        await sleep(1000 * (retryCount + 1));
        
        return this.processSite(url, actions, options, errors, retryCount + 1);
      }
      
      // Record error
      errors.push({ url, error: errorMessage });
      
      this.results.push({
        tabId: tabId || -1,
        url,
        source: new URL(url).hostname,
        timestamp: Date.now(),
        success: false,
        data: null,
        error: errorMessage,
        duration: Date.now() - startTime,
      });
      
      // Close failed tab
      if (tabId) {
        await closeShadowTab(tabId).catch(() => {});
      }
    }
  }
  
  /**
   * Execute a single action in a tab
   */
  private async executeAction(
    tabId: number,
    action: TaskAction,
    timeout: number
  ): Promise<ShadowTabResult> {
    const timeoutPromise = new Promise<ShadowTabResult>((_, reject) =>
      setTimeout(() => reject(new Error('Action timeout')), timeout)
    );
    
    const actionPromise = (async (): Promise<ShadowTabResult> => {
      switch (action.type) {
        case 'extract':
          return extractFromShadowTab(tabId, {
            selector: action.selector,
            extractType: action.options?.extractType as 'tables' | 'forms' | 'links' | 'images' | 'structured' | 'all',
          });
        
        case 'fill-form':
          return executeInShadowTab(tabId, {
            type: 'fill-form',
            target: action.selector,
            value: action.value,
            options: action.options,
          });
        
        case 'click':
          return executeInShadowTab(tabId, {
            type: 'click',
            target: action.selector,
            options: action.options,
          });
        
        case 'navigate':
          await navigateShadowTab(tabId, action.value as string, true, timeout);
          return {
            tabId,
            success: true,
            duration: 0,
          };
        
        case 'wait':
          await sleep(action.value as number || 1000);
          return {
            tabId,
            success: true,
            duration: action.value as number || 1000,
          };
        
        case 'custom':
          return executeInShadowTab(tabId, {
            type: action.options?.customType as string || 'custom',
            target: action.selector,
            value: action.value,
            options: action.options,
          });
        
        default:
          return {
            tabId,
            success: false,
            error: `Unknown action type: ${action.type}`,
            duration: 0,
          };
      }
    })();
    
    try {
      return await Promise.race([actionPromise, timeoutPromise]);
    } catch (error) {
      return {
        tabId,
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
        duration: 0,
      };
    }
  }
  
  /**
   * Aggregate results based on type
   */
  private aggregateByType<T>(config: AggregationConfig): AggregatedResult<T> {
    switch (config.type) {
      case 'products':
        return aggregateProducts(this.results as TabResult<any>[]) as unknown as AggregatedResult<T>;
      
      case 'events':
        return aggregateEvents(this.results as TabResult<any>[]) as unknown as AggregatedResult<T>;
      
      case 'articles':
        return aggregateArticles(this.results as TabResult<any>[]) as unknown as AggregatedResult<T>;
      
      case 'generic':
      default:
        return aggregateResults(this.results, {
          deduplication: config.deduplication,
          ranking: config.ranking,
          mergeStrategy: config.mergeStrategy,
        }) as AggregatedResult<T>;
    }
  }
  
  /**
   * Calculate execution summary
   */
  private calculateSummary(startTime: number): TaskResult['summary'] {
    const successfulResults = this.results.filter(r => r.success);
    const totalDuration = Date.now() - startTime;
    
    return {
      totalSites: this.results.length,
      successfulSites: successfulResults.length,
      failedSites: this.results.length - successfulResults.length,
      totalDuration,
      averageSiteTime: this.results.length > 0
        ? this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length
        : 0,
    };
  }
  
  /**
   * Abort the current task
   */
  abort(): void {
    this.aborted = true;
  }
  
  /**
   * Check if task is running
   */
  isTaskRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Get task ID
   */
  getTaskId(): string {
    return this.taskId;
  }
  
  /**
   * Get current results
   */
  getResults(): TabResult[] {
    return [...this.results];
  }
}

// Convenience functions

/**
 * Execute a price comparison task
 */
export async function comparePrices(
  productName: string,
  urls: string[]
): Promise<TaskResult> {
  const executor = new CrossSiteExecutor();
  
  return executor.execute({
    id: `price-compare-${Date.now()}`,
    name: `Price comparison: ${productName}`,
    urls,
    actions: [
      {
        id: 'search',
        type: 'fill-form',
        selector: 'input[type="search"], input[name="q"], input[name="search"]',
        value: productName,
        continueOnError: true,
      },
      {
        id: 'submit',
        type: 'click',
        selector: 'button[type="submit"], input[type="submit"], .search-btn',
        continueOnError: true,
      },
      {
        id: 'wait',
        type: 'wait',
        value: 2000,
      },
      {
        id: 'extract',
        type: 'extract',
        options: { extractType: 'structured' },
      },
    ],
    aggregation: {
      type: 'products',
      ranking: [{ field: 'price.amount', direction: 'asc' }],
    },
    options: {
      parallel: true,
      maxConcurrent: 3,
    },
  });
}

/**
 * Execute data scraping from multiple sites
 */
export async function scrapeMultipleSites(
  urls: string[],
  selector?: string
): Promise<TaskResult> {
  const executor = new CrossSiteExecutor();
  
  return executor.execute({
    id: `scrape-${Date.now()}`,
    name: 'Multi-site scrape',
    urls,
    actions: [
      {
        id: 'extract',
        type: 'extract',
        selector,
        options: { extractType: selector ? 'all' : 'structured' },
      },
    ],
    aggregation: {
      type: 'generic',
    },
    options: {
      parallel: true,
      maxConcurrent: 5,
    },
  });
}

/**
 * Fill the same form data across multiple sites
 */
export async function fillFormsAcrossSites(
  urls: string[],
  formData: Record<string, string>
): Promise<TaskResult> {
  const executor = new CrossSiteExecutor();
  
  const actions: TaskAction[] = [];
  
  // Create fill action for each form field
  for (const [name, value] of Object.entries(formData)) {
    actions.push({
      id: `fill-${name}`,
      type: 'fill-form',
      selector: `input[name="${name}"], input[id="${name}"], [data-field="${name}"]`,
      value,
      continueOnError: true,
    });
  }
  
  return executor.execute({
    id: `form-fill-${Date.now()}`,
    name: 'Multi-site form fill',
    urls,
    actions,
    aggregation: { type: 'none' },
    options: {
      parallel: false, // Sequential for form filling
      autoClose: false, // Keep tabs open for review
    },
  });
}

// Helper

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
