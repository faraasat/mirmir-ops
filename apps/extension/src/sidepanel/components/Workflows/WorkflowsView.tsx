import { useState, useEffect, useCallback } from 'react';
import type { Workflow } from '@/lib/workflows';
import { 
  getWorkflows, 
  getWorkflowExecutor, 
  deleteWorkflow, 
  exportWorkflow,
  duplicateWorkflow,
  importWorkflow,
  getRecentExecutions,
} from '@/lib/workflows';

export function WorkflowsView() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const [workflowList] = await Promise.all([
        getWorkflows({ limit: 50 }),
        getRecentExecutions(5),
      ]);
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleRun = useCallback(async (workflow: Workflow) => {
    const executor = getWorkflowExecutor();
    try {
      await executor.execute(workflow.id);
      loadWorkflows(); // Refresh to update run count
    } catch (error) {
      console.error('Workflow execution failed:', error);
    }
  }, [loadWorkflows]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await deleteWorkflow(id);
    loadWorkflows();
  }, [loadWorkflows]);

  const handleExport = useCallback((workflow: Workflow) => {
    const json = exportWorkflow(workflow);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '-')}.workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDuplicate = useCallback(async (workflow: Workflow) => {
    await duplicateWorkflow(workflow.id);
    loadWorkflows();
  }, [loadWorkflows]);

  const handleImport = useCallback(async (json: string) => {
    try {
      await importWorkflow(json);
      loadWorkflows();
      setShowImport(false);
    } catch (error) {
      alert('Invalid workflow file');
    }
  }, [loadWorkflows]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Workflows</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Save and replay automation sequences
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Workflows List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <WorkflowIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No workflows yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Workflows let you save and replay sequences of actions. Create your first workflow by completing a task and saving it.
            </p>
            <button 
              onClick={() => setShowImport(true)}
              className="btn-primary text-sm"
            >
              Import Workflow
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {workflows.map((workflow) => (
              <WorkflowItem 
                key={workflow.id} 
                workflow={workflow}
                onRun={() => handleRun(workflow)}
                onDelete={() => handleDelete(workflow.id)}
                onExport={() => handleExport(workflow)}
                onDuplicate={() => handleDuplicate(workflow)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border flex gap-2">
        <button 
          onClick={() => setShowImport(true)}
          className="flex-1 btn-secondary text-sm"
        >
          <ImportIcon className="w-4 h-4 mr-2" />
          Import
        </button>
        <button className="flex-1 btn-primary text-sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Create
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal 
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

interface WorkflowItemProps {
  workflow: Workflow;
  onRun: () => void;
  onDelete: () => void;
  onExport: () => void;
  onDuplicate: () => void;
}

function WorkflowItem({ workflow, onRun, onDelete, onExport, onDuplicate }: WorkflowItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const successRate = workflow.runCount > 0 
    ? Math.round((workflow.successCount / workflow.runCount) * 100)
    : null;

  return (
    <div className="px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{workflow.name}</h4>
          {workflow.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onRun} className="btn-ghost btn-icon" title="Run workflow">
            <PlayIcon className="w-4 h-4" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="btn-ghost btn-icon"
            >
              <MoreIcon className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                <button onClick={() => { onDuplicate(); setShowMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted">
                  Duplicate
                </button>
                <button onClick={() => { onExport(); setShowMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted">
                  Export
                </button>
                <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span>{workflow.steps.length} steps</span>
        <span>Run {workflow.runCount}x</span>
        {successRate !== null && (
          <span className={successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
            {successRate}% success
          </span>
        )}
        {workflow.trigger?.enabled && (
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
            {workflow.trigger.type}
          </span>
        )}
      </div>
    </div>
  );
}

function ImportModal({ onImport, onClose }: { onImport: (json: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setText(reader.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-4 w-[90%] max-w-md">
        <h3 className="font-semibold mb-3">Import Workflow</h3>
        <input
          type="file"
          accept=".json"
          onChange={handleFile}
          className="w-full mb-3 text-sm"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or paste workflow JSON here..."
          className="input w-full h-32 text-xs font-mono"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => onImport(text)} className="flex-1 btn-primary" disabled={!text.trim()}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
