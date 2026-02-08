# MirmirOps: A Unified Intent Engine

## Vision

MirmirOps is a browser-native intent engine that lets people bring their own AI to every website while keeping control, privacy, and permissions at the center. Instead of each website embedding its own assistant, the browser becomes the coordinating layer where the agent can see relevant context, take actions the user allows, and carry preferences across sites and sessions.

## Why Now

AI has become capable at reasoning and generation, but execution still breaks down because intent is scattered across tabs, sites, and logins. The browser is where identity, context, and real actions converge, yet it lacks a coherent way for users to bring their own AI to the web. This project makes the browser the place where AI can safely and transparently act on a user's behalf.

## Core Principles

- User-owned AI: the user chooses the model and data sources.
- Permission-first execution: actions are scoped, time-bounded, and transparent.
- Local-first memory: sensitive context stays on device unless explicitly shared.
- Cross-site coordination: one intent can span multiple tabs and domains.
- Human-in-the-loop: the agent is helpful but never silent about critical actions.

## The Unified Intent Loop

1. Understand: interpret the user’s goal using voice or text.
2. Gather: read live browser context, history, and local preferences.
3. Plan: decide a minimal set of steps, check permission tiers.
4. Act: execute in visible or background tabs with a clear audit trail.
5. Confirm: present outcomes and ask for approval on critical steps.
6. Learn: update local memory and preferences when the user agrees.

## Key Capabilities

### 1) Voice-Native Flow

Low-friction, high-intent input with conversational confirmations and progress updates.

### 2) Cross-Site Orchestration

The agent can read from one site, act on another, and coordinate multiple tabs to complete a single goal.

### 3) Local-First Memory

A private memory store captures preferences, past actions, and personal context. It supports semantic recall while preserving privacy.

### 4) Shadow Tab Execution

Background tabs allow research and comparisons without disrupting the user’s current page.

### 5) Micro-Confirmations

Small, contextual confirmations prevent accidental or unsafe actions while keeping workflows fast.

## Permission Model

The agent operates within explicit tiers of capability.

- Read-only: summarize, extract, compare.
- Mutable safe: fill forms, add to cart, draft messages.
- Mutable critical: payments, deletion, irreversible actions.

Every action is logged with scope, duration, and rationale so the user can review and revoke.

## Target Experiences

- “Find a hotel under $200 with a gym, check my calendar, and draft an itinerary.”
- “Compare these products across three sites and summarize differences.”
- “Schedule this event, invite my team, and draft an email update.”

## Differentiation

MirmirOps is not a chatbot or a single-site assistant. It is a browser-level intent engine that puts users in control while enabling safe, cross-site execution and persistent context.

## Success Metrics

- Reduced clicks per task and fewer context switches.
- Clear, inspectable action logs.
- Measurable trust: users understand what the agent can do and why.
- Improved task completion time with fewer errors.
