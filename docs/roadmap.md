# Roadmap

## Overview

This roadmap outlines the development phases from initial foundation to a mature ecosystem. Each phase builds on the previous, with clear deliverables and validation criteria.

---

## Phase 1: Foundation

### Objective

Establish the core extension architecture and basic agent capabilities.

### Deliverables

- Extension shell with background service worker and content script injection.
- Agent panel UI with text input and basic chat interface.
- Permission tier definitions and enforcement framework.
- Read-only context extraction from active tab.
- Action logging infrastructure with timestamps and targets.
- Basic LLM integration with one provider (user-provided API key).

### Validation

- Extension loads and runs on both Firefox and Chrome.
- Agent can summarize the current page content.
- All actions appear in the audit log.
- Permission prompts display before any page interaction.

---

## Phase 2: MVP Flow

### Objective

Deliver the complete Tokyo trip planning workflow end-to-end.

### Deliverables

- Voice input with push-to-talk and speech-to-text.
- Cross-tab coordination with background (shadow) tab execution.
- Structured data extraction (dates, prices, addresses).
- Local preference memory with basic fields (budget, seating, dietary).
- Simple semantic recall for preference application.
- Micro-confirmations for mutable actions.
- Progress indicators and step-by-step updates in agent panel.
- Summary output with editable draft itinerary.

### Validation

- User completes the Tokyo trip flow in under 3 minutes.
- Preferences (budget, gym requirement) are applied without re-prompting.
- Agent pauses for confirmation before any high-risk action.
- Results are accurate and clearly tied to user input.

---

## Phase 3: Trust and Control

### Objective

Deepen user trust through transparency, fine-grained permissions, and robust error handling.

### Deliverables

- Per-site permission controls with allow/deny lists.
- Time-bounded consent with automatic expiration.
- Revocation and permission history viewer.
- Step-by-step preview before execution begins.
- Graceful failure handling with clear explanations.
- Manual fallback options when automation fails.
- Pause, cancel, and modify controls during execution.

### Validation

- Users can grant permissions to specific sites only.
- Permissions expire after the configured time window.
- Users can revoke any permission and see the effect immediately.
- When a site blocks scraping, the agent explains and offers alternatives.

---

## Phase 4: Memory and Recall

### Objective

Enable persistent, semantic memory that improves over time.

### Deliverables

- Long-term preference storage that survives browser restarts.
- Semantic memory index with local embeddings.
- Intent-based history search ("What was that article about X?").
- Privacy-preserving summarization before external LLM calls.
- Memory inspection and editing in options page.
- Import/export for backup and portability.

### Validation

- User recalls a previously visited page by describing its content.
- Preferences persist across sessions and are applied automatically.
- Sensitive data is redacted or anonymized before leaving the device.

---

## Phase 5: Voice and Multi-Modal

### Objective

Expand input modalities beyond text to voice, images, and selections.

### Deliverables

- Full voice-native flow with conversational confirmations.
- Audio progress updates during long-running tasks.
- Image and screenshot interpretation ("What product is this?").
- Right-click context menu for selected text and images.
- Wake word detection (opt-in with always-on listening consent).

### Validation

- User completes a full workflow using only voice.
- Agent identifies a product from a screenshot and finds purchase options.
- Selected text triggers contextual suggestions.

---

## Phase 6: Usability and Scale

### Objective

Expand beyond travel to diverse use cases and improve reliability.

### Deliverables

- Additional workflow templates: shopping comparison, expense reports, research aggregation.
- Configurable intent templates for common tasks.
- Improved DOM parsing for complex and dynamic sites.
- Performance optimizations for faster execution.
- Error recovery and automatic retry logic.
- User feedback loop for continuous improvement.

### Validation

- Agent successfully handles at least five distinct workflow categories.
- Execution time improves by measurable margin.
- Error rate decreases with each iteration.

---

## Phase 7: Multi-LLM and Local Inference

### Objective

Give users full control over model selection and enable local-only operation.

### Deliverables

- Pluggable LLM provider architecture with multiple backends.
- Model selection per task type (fast vs. capable).
- Local inference support via WebGPU/WebAssembly.
- Cost and token usage tracking.
- Offline mode for local-only tasks.

### Validation

- User switches between providers without workflow changes.
- Simple tasks complete using local model with no external calls.
- Token usage is visible and trackable.

---

## Phase 8: Ecosystem and Developer API

### Objective

Enable third-party integrations and community contributions.

### Deliverables

- Public API for website-provided tools and capabilities.
- MCP server integration for external tool calling.
- Plugin architecture for community extensions.
- Documentation and developer onboarding materials.
- Best practices guide for safe cross-site execution.

### Validation

- External developers can build and publish plugins.
- At least one MCP server integration works end-to-end.
- Documentation enables new developers to contribute.

---

## Phase 9: Enterprise and Collaboration

### Objective

Support team use cases and organizational policies.

### Deliverables

- Optional cloud sync for preferences and templates.
- Shared workflow templates with access controls.
- Team-level permission policies.
- Admin dashboard for usage and compliance.
- Single sign-on and identity provider integration.

### Validation

- Teams can share and enforce workflow templates.
- Admins can audit agent activity across users.
- SSO integration works with major identity providers.
