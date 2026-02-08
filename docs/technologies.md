# Technologies

IMPORTANT: Everything library/technology used, must be latest and its documentation should be reviewed carefully. If some library/technology have cli commands for scaffolding, prefer to use them for creating the scaffolding.

## Browser Targets

### Mozilla Firefox

- WebExtensions API with Manifest V3 compatibility.
- Background scripts for persistent orchestration.
- Sidebar panel for agent UI.
- Native messaging for optional local model integration.

### Google Chrome

- Manifest V3 with service workers.
- Side panel API for persistent agent interface.
- Offscreen documents for background processing.
- Chrome storage sync for cross-device preference portability (optional).

### Cross-Browser Considerations

- Unified codebase with browser-specific adapters.
- Feature detection for graceful degradation.
- Consistent UI and UX across both browsers.

## Extension Architecture

### Background Service Worker

- Central orchestration hub for all agent operations.
- Permission management and enforcement.
- Tab lifecycle management and coordination.
- Message routing between content scripts and UI.
- Rate limiting and request queuing.

### Content Scripts

- DOM access and page interaction.
- Structured data extraction (prices, dates, addresses, names).
- Form filling and navigation control.
- Mutation observers for dynamic content detection.
- Isolation from page scripts for security.

### Agent Panel (Popup/Side Panel)

- Primary user interface for chat and commands.
- Voice input with push-to-talk activation.
- Progress indicators and step-by-step updates.
- Micro-confirmation dialogs.
- Results display with structured formatting.

### Options Page

- Preference management (budget, dietary, seating, etc.).
- Permission controls and site-specific rules.
- LLM provider configuration and API key management.
- Memory inspection and export/import.
- Action log viewer with replay capability.

### Shadow Tab Manager

- Background tab spawning and lifecycle control.
- Resource throttling to minimize system impact.
- Parallel execution coordinator.
- Result aggregation and deduplication.

## Core Capabilities

### Tab and Navigation Control

- Open, close, and switch tabs programmatically.
- Navigate to URLs and handle redirects.
- Detect page load completion and dynamic content.
- Handle authentication prompts and login flows (with user consent).

### Page Context Extraction

- DOM parsing and content extraction.
- Structured data recognition (schema.org, Open Graph, custom patterns).
- Text summarization and key fact extraction.
- Image and media metadata extraction.
- Table and list parsing into structured formats.

### Form Interaction

- Field detection and labeling.
- Auto-fill with preference data.
- Dropdown, checkbox, and radio button handling.
- File upload support (for user-selected files only).
- CAPTCHA detection and user handoff.

### Clipboard and Selection

- Read selected text for contextual commands.
- Copy results to clipboard.
- Paste data into forms (with user consent).

## AI and Language Models

### LLM Integration

- Pluggable provider architecture (OpenAI, Anthropic, local models, etc.).
- User-configured API keys stored securely in local storage.
- Model selection per task type (fast for simple, capable for complex).
- Streaming responses for real-time feedback.
- Token usage tracking and cost awareness.

### Local Inference (Optional)

- WebGPU and WebAssembly support for in-browser models.
- Small language model for privacy-sensitive summarization.
- Local embedding model for semantic search.
- Fallback to cloud when local resources are insufficient.

### Prompt Engineering

- Task-specific prompt templates.
- Context injection from memory and current page.
- Structured output parsing (JSON mode where supported).
- Error recovery and retry logic.

## Memory and Storage

### Local Preference Store

- Key-value storage for user preferences (budget, dietary, seating, brands).
- Encrypted at rest using browser-native encryption.
- Import/export for backup and portability.

### Semantic Memory Index

- Local vector store for embeddings.
- Indexing of browsing history summaries (opt-in).
- Fast similarity search for intent-based recall.
- Periodic pruning and relevance decay.

### Session Memory

- Short-term context for multi-step tasks.
- Conversation history within a session.
- Automatic cleanup on session end.

### Action Log

- Immutable append-only log of all agent actions.
- Timestamps, targets, outcomes, and rationale.
- Replay capability for debugging and transparency.
- User-controlled retention period.

## Security and Privacy

### Permission Model

- Tier-based capability system (passive, read-only, mutable safe, mutable critical).
- Per-domain permission gating.
- Time-bounded consent with automatic expiration.
- Revocation and audit trail.

### Data Isolation

- Content script isolation from page scripts.
- No cross-origin data leakage.
- Sandboxed execution for untrusted content.

### Privacy Controls

- Local-only storage as default.
- Redaction and anonymization before external LLM calls.
- User-visible data flow indicators.
- No telemetry without explicit opt-in.

### Credential Handling

- No storage of passwords or sensitive credentials.
- OAuth and session cookies handled by browser natively.
- User-initiated login flows only.

## Observability and Debugging

### Action Logs

- Structured JSON logs for every action.
- Severity levels (info, warning, error).
- Correlation IDs for multi-step workflows.

### User-Facing Notifications

- Toast notifications for key events.
- Step-by-step progress in agent panel.
- Error explanations in plain language.

### Developer Tools

- Debug mode with verbose logging.
- Network request inspector.
- State viewer for memory and preferences.

## Voice and Audio

### Speech Recognition

- Web Speech API for voice input.
- Push-to-talk activation to avoid false triggers.
- Wake word detection (optional, requires always-on listening consent).

### Speech Synthesis

- Text-to-speech for progress updates and confirmations.
- Configurable voice and speed.
- Mute option for silent operation.

## Build and Tooling

### Language and Framework

- TypeScript for all extension code.
- Strict type checking and linting.
- Modular architecture with clear separation of concerns.

### Build System

- Bundler with tree-shaking and minification.
- Separate builds for Firefox and Chrome.
- Hot reload during development.

### Testing

- Unit tests for core logic.
- Integration tests with browser automation.
- Manual test suites for permission and UI flows.

### Distribution

- Firefox Add-ons (AMO) submission.
- Chrome Web Store submission.
- Self-hosted distribution option for enterprise.

## Future Considerations

### Mobile Support

- Firefox for Android extension compatibility.
- Chrome on Android (limited extension support).
- Progressive Web App fallback for mobile.

### Sync and Collaboration

- Optional cloud sync for preferences and templates.
- Shared workflow templates with privacy controls.
- Team-level permission policies.

### Developer Ecosystem

- Public API for website-provided tools.
- MCP server integration for external capabilities.
- Plugin architecture for community extensions.
