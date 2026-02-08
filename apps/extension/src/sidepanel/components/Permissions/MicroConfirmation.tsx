// Micro-confirmation Dialog for permission requests
import { useState, useEffect } from 'react';
import type { PermissionRequest } from '@/lib/permissions';
import { handlePermissionResponse } from '@/lib/permissions';

interface MicroConfirmationProps {
  request: PermissionRequest;
  onClose: () => void;
}

export function MicroConfirmation({ request, onClose }: MicroConfirmationProps) {
  const [remember, setRemember] = useState(false);
  const [duration, setDuration] = useState<'session' | 'hour' | 'day' | 'always'>('session');
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-close after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDeny();
    }, 30000); // 30 second timeout

    return () => clearTimeout(timer);
  }, [request.id]);

  async function handleAllow() {
    setIsProcessing(true);
    
    let durationMs: number | undefined;
    if (remember) {
      switch (duration) {
        case 'hour':
          durationMs = 60 * 60 * 1000;
          break;
        case 'day':
          durationMs = 24 * 60 * 60 * 1000;
          break;
        case 'always':
          durationMs = undefined; // No expiry
          break;
        default:
          durationMs = undefined; // Session only (will expire)
      }
    }

    await handlePermissionResponse(request.id, true, remember, durationMs);
    onClose();
  }

  async function handleDeny() {
    setIsProcessing(true);
    await handlePermissionResponse(request.id, false, false);
    onClose();
  }

  const tierColors: Record<string, string> = {
    'passive': 'bg-gray-100 text-gray-800',
    'read-only': 'bg-blue-100 text-blue-800',
    'mutable-safe': 'bg-yellow-100 text-yellow-800',
    'mutable-critical': 'bg-red-100 text-red-800',
  };

  const tierDescriptions: Record<string, string> = {
    'passive': 'This action only observes the page.',
    'read-only': 'This action can read content but not modify it.',
    'mutable-safe': 'This action can make reversible changes.',
    'mutable-critical': 'This action may make irreversible changes.',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <h3 className="font-semibold">Permission Request</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Action info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[request.tier]}`}>
                {request.tier.toUpperCase()}
              </span>
              <span className="text-sm text-muted-foreground">
                {tierDescriptions[request.tier]}
              </span>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Action:</span>
                <span className="text-sm font-medium">{formatAction(request.action)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Domain:</span>
                <span className="text-sm font-medium truncate max-w-[200px]">{request.domain}</span>
              </div>
              {request.context?.description && (
                <div className="pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    {request.context.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Remember option */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Remember this decision</span>
            </label>

            {remember && (
              <div className="ml-6 space-y-1">
                {['session', 'hour', 'day', 'always'].map((d) => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duration"
                      checked={duration === d}
                      onChange={() => setDuration(d as typeof duration)}
                      className="text-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      {d === 'session' && 'This session only'}
                      {d === 'hour' && 'For 1 hour'}
                      {d === 'day' && 'For 24 hours'}
                      {d === 'always' && 'Always allow'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Warning for critical actions */}
          {request.tier === 'mutable-critical' && (
            <div className="flex gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-red-700 dark:text-red-300 text-xs">
              <span>⚠️</span>
              <span>
                This is a critical action that may have irreversible effects.
                Only allow if you trust this operation.
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={handleDeny}
            disabled={isProcessing}
            className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Deny
          </button>
          <button
            onClick={handleAllow}
            disabled={isProcessing}
            className={`px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
              request.tier === 'mutable-critical'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Allow'}
          </button>
        </div>

        {/* Timeout indicator */}
        <div className="px-4 pb-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary/50 animate-shrink"
              style={{ 
                animation: 'shrink 30s linear forwards',
              }}
            />
          </div>
          <style>{`
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Hook to listen for permission requests
 */
export function usePermissionRequests() {
  const [pendingRequest, setPendingRequest] = useState<PermissionRequest | null>(null);

  useEffect(() => {
    function handleMessage(message: { type: string; payload: PermissionRequest }) {
      if (message.type === 'PERMISSION_REQUEST') {
        setPendingRequest(message.payload);
      }
    }

    // Listen for permission request messages
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  function dismissRequest() {
    setPendingRequest(null);
  }

  return { pendingRequest, dismissRequest };
}
