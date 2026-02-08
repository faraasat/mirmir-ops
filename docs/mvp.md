# MVP

## Goal

Demonstrate a browser-native intent engine that can complete a real cross-site task with clear permissions, user control, and local memory. The MVP proves that AI can act safely and transparently across the web while respecting user agency.

## Primary User Flow

"Plan a 3‑day trip to Tokyo in April: check my calendar for the best weekend, find a hotel under $200/night with a gym, and draft an itinerary."

This flow exercises every core capability: voice input, cross-site reading, preference application, background execution, and micro-confirmations.

## Secondary User Flows

- "Compare these three products and summarize the differences."
- "Find the return policy on this site and explain it simply."
- "What was that article I read last week about remote work?"

These flows validate breadth without requiring the full depth of the primary flow.

## MVP Scope

### Input and Interaction

- Voice input with push-to-talk activation.
- Text input via the agent panel.
- Contextual triggers from selected text or right-click menu.
- Progress updates during execution (visual and optional audio).

### Browser Context

- Read the DOM and visible content of the active tab.
- Extract structured data (prices, dates, names, addresses) from pages.
- Open and manage up to four background (shadow) tabs.
- Navigate, scroll, and interact with forms in controlled tabs.

### Cross-Site Orchestration

- Execute a single intent across two or more distinct domains.
- Aggregate and compare data from multiple sources.
- Present unified results in the agent panel or a summary tab.

### Permissions

- Read-only and safe mutable actions supported by default.
- Critical actions (payments, deletion) are blocked and require explicit user approval.
- Per-task permission prompts with clear scope description.

### Memory

- Local preference store with fields: budget, seating, dietary, brands, accessibility needs.
- Simple semantic recall to reuse preferences across tasks.
- Session memory that persists within a browsing session.
- Optional long-term memory that survives browser restarts.

### Output and Results

- Summary panel with structured results (tables, lists, key facts).
- Draft outputs (emails, itineraries, notes) in editable format.
- Action log with timestamps, targets, and rationale.
- One-click copy or export of results.

## What the MVP Must Demonstrate

### Clear Boundaries

- The user can see exactly what the agent is allowed to see and do.
- Permissions are displayed before execution begins.
- Denied or blocked actions are explained.

### Cross-Site Orchestration

- One intent results in coordinated actions across multiple tabs.
- Data flows between sites without manual copy-paste.

### Micro-Confirmations

- The agent pauses before any irreversible or high-risk step.
- Confirmations are contextual, not interruptive for low-risk actions.

### Audit Log

- Complete list of actions taken with timestamps, targets, and outcomes.
- Users can replay or inspect every step after completion.

### Preference Application

- The agent applies stored preferences (budget, seating, etc.) without re-prompting.
- Preferences influence search, filtering, and recommendations.

### Graceful Failure

- When a site blocks automation or data extraction fails, the agent explains clearly.
- The agent offers manual fallback or alternative approaches.

## Out of Scope for MVP

- Payments or irreversible financial transactions.
- Full account management or credential storage.
- Long-term cloud memory or external data syncing.
- Mobile browser support.
- Offline execution. (nice to have)

## User Experience Requirements

### Onboarding

- First-run tutorial that explains permissions, capabilities, and privacy.
- Optional preference setup wizard (budget, dietary, seating, etc.).
- Clear explanation of what data stays local vs. what may be sent to LLM providers.

### During Execution

- Visual indicator of agent activity (which tab, what action).
- Progress bar or step counter for multi-step tasks.
- Ability to pause, cancel, or modify the task mid-execution.

### After Completion

- Summary of what was done and what was found.
- Editable draft outputs.
- Feedback prompt to improve future performance.

## Success Criteria

- The primary workflow completes in under 3 minutes for a new user.
- Users can replay or inspect every step taken.
- The final itinerary and recommendations are accurate and tied to user preferences.
- Users report understanding what the agent did and why.
- No critical action executes without explicit user confirmation.
- The agent handles at least one site failure gracefully during testing.

## Testing Scenarios

- Happy path: all sites respond normally, preferences are set, task completes.
- Missing preferences: user has not set budget; agent prompts or uses reasonable defaults.
- Site failure: one target site is down or blocks scraping; agent explains and continues with partial results.
- Permission denied: user declines a permission; agent adapts the plan or explains limitations.
- Long-running task: workflow takes over 60 seconds; user receives progress updates and can cancel.
