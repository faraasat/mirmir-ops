# MVP Definition

## Goal

Demonstrate a browser-native intent engine that can complete a real cross-site task with clear permissions, user control, and local memory.

## Primary User Flow

“Plan a 3‑day trip to Tokyo in April: check my calendar for the best weekend, find a hotel under $200/night with a gym, and draft an itinerary.”

## MVP Scope

### Capabilities

- Voice or text input for intents.
- Read browser context from active tab.
- Open and manage two to three background tabs.
- Extract structured data from at least two sites.
- Draft output in a user-visible panel or new tab.

### Permissions

- Read-only and safe mutable actions supported.
- Critical actions are blocked and require explicit user approval.

### Memory

- Local preference store with basic fields (budget, seating, dietary, etc.).
- Simple semantic recall to reuse preferences across tasks.

## What the MVP Must Show

- Clear boundaries: what the agent can see and do are visible to the user.
- Cross-site orchestration: one intent results in actions across multiple tabs.
- Micro-confirmations: the agent pauses before any irreversible step.
- Audit log: list of actions taken with timestamps and targets.

## Out of Scope

- Payments or irreversible actions.
- Full account management or credential storage.
- Long-term cloud memory or external data syncing.
- Complex multi-agent coordination beyond the main task.

## Success Criteria

- The full workflow completes in under 3 minutes for a new user.
- Users can replay or inspect every step.
- The final itinerary and recommendations are accurate and tied to user preferences.
