# Technologies

## Browser Targets

- Mozilla Firefox (WebExtensions)
- Google Chrome (Manifest V3)

## Extension Architecture

- Background service worker for orchestration and permissions
- Content scripts for DOM access and page interaction
- Extension UI panel for chat, progress, and confirmations
- Optional side panel for logs and memory inspection

## Core Capabilities

- Browser tab management and navigation
- Page context extraction and structured parsing
- Local storage for preferences and memory
- Action audit log and permission scoping

## AI and Memory

- Pluggable LLM provider with user-chosen model
- Local semantic index for preferences and browsing context
- Lightweight embedding model for local retrieval

## Security and Privacy

- Per-domain permission gating
- Time-bounded consent for mutable actions
- Local-only storage with optional export

## Observability

- Structured action logs
- Clear user-facing notifications for each step

## Build and Tooling

- TypeScript for extension code
- WebExtension-compatible tooling for cross-browser builds
- Minimal UI framework for the agent panel
