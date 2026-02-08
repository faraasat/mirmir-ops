# MirmirOps: A Unified Browser Intent Engine

## Vision

MirmirOps is a browser-native intent engine that lets people bring their own AI to every website while keeping control, privacy, and permissions at the center. Instead of each website embedding its own assistant, the browser becomes the coordinating layer where the agent can see relevant context, take actions the user allows, and carry preferences across sites and sessions.

The browser is no longer just a renderer. It becomes a personal execution environment where intelligence is portable, context is persistent, and the user remains sovereign over every action.

## The Problem

Today, users are the "Human API." They copy dates from emails to calendars, compare prices across tabs, remember preferences in their heads, and manually coordinate tasks that span multiple sites. AI assistants exist, but they are siloed: each website offers its own chatbot, none of them know your history, and you re-explain context everywhere you go.

This fragmentation creates friction:

- No memory: every interaction starts from scratch.
- No coordination: tasks that span sites require manual copy-paste.
- No control: users cannot choose their model or see what the AI does.
- No privacy: cloud-based assistants require sending personal data off-device.

## Why Now

AI has become capable at reasoning and generation, but execution still breaks down because intent is scattered across tabs, sites, and logins. The browser is where identity, context, and real actions converge, yet it lacks a coherent way for users to bring their own AI to the web.

Browser APIs have matured. Local inference is increasingly practical. Users are ready for AI that respects their agency. MirmirOps makes the browser the place where AI can safely and transparently act on a user's behalf.

## Core Principles

- **User-Owned AI**: The user chooses the model, data sources, and level of autonomy. No vendor lock-in.
- **Permission-First Execution**: Actions are scoped, time-bounded, and transparent. Nothing happens without consent.
- **Local-First Memory**: Sensitive context stays on device unless explicitly shared. Privacy is the default.
- **Cross-Site Coordination**: One intent can span multiple tabs and domains seamlessly.
- **Human-in-the-Loop**: The agent is helpful but never silent about critical actions. Users stay informed.
- **Graceful Degradation**: When sites block automation or change structure, the agent explains and offers alternatives.

## The Unified Intent Loop

1. **Understand**: Interpret the user's goal using voice, text, or contextual triggers.
2. **Gather**: Read live browser context, history, preferences, and relevant open tabs.
3. **Plan**: Decide a minimal set of steps, check permission tiers, and estimate completion.
4. **Preview**: Show the user what will happen before execution begins.
5. **Act**: Execute in visible or background tabs with a clear audit trail.
6. **Confirm**: Present outcomes and ask for approval on critical or irreversible steps.
7. **Learn**: Update local memory and preferences when the user agrees.

## Key Capabilities

### 1) Voice-Native Flow

Low-friction, high-intent input with conversational confirmations and progress updates. Users can speak naturally and receive verbal feedback during long-running tasks to reduce anxiety and maintain awareness.

### 2) Cross-Site Orchestration

The agent can read from one site, act on another, and coordinate multiple tabs to complete a single goal. A single command like "book the cheapest flight and add it to my calendar" triggers a coordinated workflow across travel sites, email, and calendar apps.

### 3) Local-First Memory (Privacy Vault)

A private, encrypted memory store captures preferences, past actions, and personal context. It supports semantic recall while preserving privacy. When external LLMs are needed, a local summarization model redacts or anonymizes sensitive data before sending scrubbed queries.

### 4) Shadow Tab Execution

Background tabs allow research and comparisons without disrupting the user's current page. The agent spawns headless tabs, gathers data, and presents results in a unified view. The user never leaves their current context.

### 5) Micro-Confirmations

Small, contextual confirmations prevent accidental or unsafe actions while keeping workflows fast. Instead of blocking every step, the agent groups low-risk actions and pauses only for high-stakes decisions.

### 6) Intent-Based Semantic Search

Traditional history search is keyword-based. MirmirOps uses semantic memory to find content by meaning. "What was that article I read about salt-water batteries?" returns the exact paragraph even if you forgot the title or website.

### 7) Contextual Suggestion Engine

The agent proactively suggests actions based on the current page. On a product page, it might offer to compare prices elsewhere. On an event page, it might offer to check your calendar and draft an RSVP.

### 8) Preference Portability

Budget constraints, accessibility needs, brand preferences, dietary restrictions: context that travels with you across every site. The agent applies your preferences automatically without re-prompting.

### 9) Multi-Modal Input

Beyond voice and text, the agent can interpret screenshots, selected text, or images on a page. "What keyboard is this?" triggers visual identification, search, filtering, and comparison.

### 10) Workflow Replay and Templates

Successful workflows can be saved as templates for future use. "Do my weekly expense report" replays a learned sequence with updated data.

## Permission Model

The agent operates within explicit tiers of capability:

- **Tier 0 (Passive)**: Observe and summarize without any page interaction.
- **Tier 1 (Read-Only)**: Extract data, compare, and analyze across tabs.
- **Tier 2 (Mutable Safe)**: Fill forms, add to cart, draft messages, navigate pages.
- **Tier 3 (Mutable Critical)**: Payments, deletion, account changes, irreversible actions.

Every action is logged with scope, duration, and rationale so the user can review, replay, or revoke. Permissions can be granted per-task, per-site, or time-bounded.

## Target Experiences

- "Find a hotel under $200 with a gym, check my calendar, and draft an itinerary."
- "Compare these three laptops across Amazon, Best Buy, and Newegg."
- "Schedule this event, invite my team, and draft an email update."
- "Find the refund policy on this site and summarize it."
- "What was that recipe I saved last month with chickpeas?"
- "Book the cheapest flight to Tokyo using my airline miles if possible."
- "Summarize all unread emails from my manager this week."

## Differentiation

MirmirOps is not a chatbot, not a single-site assistant, and not a screen recorder that replays clicks. It is a browser-level intent engine that:

- Puts users in control of their AI and data.
- Enables safe, transparent, cross-site execution.
- Maintains persistent, private context across sessions.
- Works with any LLM the user chooses.
- Respects permission boundaries and logs every action.

## Success Metrics

- Reduced clicks per task and fewer context switches.
- Clear, inspectable action logs with full replay.
- Measurable trust: users understand what the agent can do and why.
- Improved task completion time with fewer errors.
- High retention of preference memory across sessions.
- User-reported confidence in privacy and control.
