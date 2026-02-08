// Memory Module - Export all memory-related functionality

export * from './preference-memory';
export * from './semantic-memory';
export * from './context-memory';
export * from './learning-engine';

// Re-export initialization functions
import { initializePreferenceMemory } from './preference-memory';
import { initializeSemanticMemory } from './semantic-memory';
import { initializeContextMemory } from './context-memory';
import { initializeLearningEngine } from './learning-engine';

/**
 * Initialize all memory systems
 */
export async function initializeMemorySystems(): Promise<void> {
  await Promise.all([
    initializePreferenceMemory(),
    initializeSemanticMemory(),
    initializeContextMemory(),
    initializeLearningEngine(),
  ]);
  
  console.log('[Memory] All memory systems initialized');
}
