import React, { useState, useEffect, useCallback } from 'react';
import {
  getCurrentStep,
  nextStep,
  previousStep,
  skipStep,
  skipOnboarding,
  startOnboarding,
  needsOnboarding,
  type OnboardingStep,
  type OnboardingFlow,
} from '@/lib/onboarding';

interface OnboardingOverlayProps {
  onComplete?: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [, setCurrentFlow] = useState<OnboardingFlow | null>(null);
  const [currentStepData, setCurrentStepData] = useState<OnboardingStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  // Check if onboarding is needed on mount
  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const needs = await needsOnboarding();
    if (needs) {
      await startOnboarding('initial');
      await loadCurrentStep();
      setIsActive(true);
    }
  };

  const loadCurrentStep = async () => {
    const stepData = await getCurrentStep();
    if (stepData) {
      setCurrentFlow(stepData.flow);
      setCurrentStepData(stepData.step);
      setStepIndex(stepData.stepIndex);
      setTotalSteps(stepData.totalSteps);

      // Find target element if specified
      if (stepData.step.target) {
        const el = document.querySelector(stepData.step.target) as HTMLElement;
        setTargetElement(el);
      } else {
        setTargetElement(null);
      }
    } else {
      setIsActive(false);
      onComplete?.();
    }
  };

  const handleNext = async () => {
    const completed = await nextStep();
    if (completed) {
      setIsActive(false);
      onComplete?.();
    } else {
      await loadCurrentStep();
    }
  };

  const handlePrevious = async () => {
    await previousStep();
    await loadCurrentStep();
  };

  const handleSkip = async () => {
    const completed = await skipStep();
    if (completed) {
      setIsActive(false);
      onComplete?.();
    } else {
      await loadCurrentStep();
    }
  };

  const handleSkipAll = async () => {
    await skipOnboarding();
    setIsActive(false);
    onComplete?.();
  };

  if (!isActive || !currentStepData) {
    return null;
  }

  const position = currentStepData.position || 'center';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Highlight target element */}
      {targetElement && <HighlightBox element={targetElement} />}

      {/* Tooltip */}
      <OnboardingTooltip
        step={currentStepData}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        position={position}
        targetElement={targetElement}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={handleSkip}
        onSkipAll={handleSkipAll}
      />

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === stepIndex
                ? 'bg-blue-500'
                : i < stepIndex
                ? 'bg-blue-300'
                : 'bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Highlight box around target element
const HighlightBox: React.FC<{ element: HTMLElement }> = ({ element }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      setRect(element.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [element]);

  if (!rect) return null;

  const padding = 8;

  return (
    <div
      className="absolute border-2 border-blue-500 rounded-lg pointer-events-none z-40"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
    </div>
  );
};

// Tooltip component
const OnboardingTooltip: React.FC<{
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  position: string;
  targetElement: HTMLElement | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
}> = ({
  step,
  stepIndex,
  totalSteps,
  position,
  targetElement,
  onNext,
  onPrevious,
  onSkip,
  onSkipAll,
}) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (position === 'center' || !targetElement) {
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const gap = 16;

    let style: React.CSSProperties = {};

    switch (position) {
      case 'top':
        style = {
          bottom: window.innerHeight - rect.top + gap,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
        break;
      case 'bottom':
        style = {
          top: rect.bottom + gap,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
        break;
      case 'left':
        style = {
          top: rect.top + rect.height / 2,
          right: window.innerWidth - rect.left + gap,
          transform: 'translateY(-50%)',
        };
        break;
      case 'right':
        style = {
          top: rect.top + rect.height / 2,
          left: rect.right + gap,
          transform: 'translateY(-50%)',
        };
        break;
    }

    setTooltipStyle(style);
  }, [position, targetElement]);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div
      className="absolute z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5"
      style={tooltipStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <button
          onClick={onSkipAll}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Skip tour
        </button>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {step.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {step.description}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={isFirstStep}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            isFirstStep
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Back
        </button>

        <div className="flex gap-2">
          {step.canSkip !== false && !isLastStep && (
            <button
              onClick={onSkip}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip
            </button>
          )}
          <button
            onClick={onNext}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      {/* Arrow pointer */}
      {position !== 'center' && targetElement && (
        <div
          className={`absolute w-3 h-3 bg-white dark:bg-gray-800 transform rotate-45 ${
            position === 'top'
              ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
              : position === 'bottom'
              ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'
              : position === 'left'
              ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'
              : 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}
        />
      )}
    </div>
  );
};

// Hook for triggering onboarding from other components
export function useOnboarding() {
  const [isOnboarding, setIsOnboarding] = useState(false);

  const startFlow = useCallback(async (flowId: string) => {
    await startOnboarding(flowId);
    setIsOnboarding(true);
  }, []);

  const checkAndStart = useCallback(async () => {
    const needs = await needsOnboarding();
    if (needs) {
      await startOnboarding('initial');
      setIsOnboarding(true);
    }
  }, []);

  return {
    isOnboarding,
    startFlow,
    checkAndStart,
    setIsOnboarding,
  };
}

export default OnboardingOverlay;
