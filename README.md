# MirmirOps - Unified Browser Intent Engine

AI-powered browser assistant with voice commands, cross-site automation, and intelligent memory.

MirmirOps is a browser-native AI assistant that transforms how users interact with the web. It provides voice-driven commands, cross-site automation, and intelligent memory while keeping users in complete control of their data and privacy.

## Key Features

- **Voice-Native Interaction**: Speak naturally to control your browser, fill forms, navigate sites, and automate tasks
- **Local-First AI (WebLLM)**: Run powerful language models directly in your browser using WebGPU - no data leaves your device
- **Multi-Provider LLM Support**: Connect to OpenAI, Anthropic, Ollama, or bring your own API keys
- **Cross-Site Orchestration**: Shadow tabs execute research and comparisons in the background across multiple sites
- **Intelligent Memory**: Semantic memory, context tracking, and preference learning that persists across sessions
- **Workflow Automation**: Record, save, and replay complex multi-step workflows with scheduling support
- **Privacy & Security**: Encrypted storage, CSP compliance, comprehensive privacy controls
- **Permission System**: Tiered permission model with micro-confirmations for safe execution

## Project Structure

```plaintext
mirmir-ops/
├── apps/
│   ├── extension/        # Browser Extension (Chrome/Firefox)
│   └── admin/            # Admin Dashboard (Next.js)
├── packages/
│   ├── api/              # Backend API (Express + MongoDB)
│   └── shared/           # Shared types and constants
└── docs/                 # Documentation
```

## Tech Stack

### Browser Extension

- **Build**: Vite + vite-plugin-web-extension
- **UI**: React 19 + TailwindCSS
- **State**: Zustand
- **Storage**: IndexedDB (via Dexie.js) + chrome.storage
- **LLM**: WebLLM (local) + multi-llm-ts (cloud providers)
- **Voice**: Web Speech API (Recognition + Synthesis)
- **NLP**: Compromise.js for entity extraction

### Backend API

- **Framework**: Express.js + TypeScript
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT with refresh tokens

### Admin Panel

- **Framework**: Next.js 16 (App Router)
- **Auth**: NextAuth.js v5
- **UI**: TailwindCSS
- **Data Fetching**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn 4+ (with corepack)
- MongoDB (local or Atlas)
- Chrome or Firefox browser

### Installation

```bash
# Clone the repository
git clone https://github.com/faraasat/mirmir-ops.git
cd mirmir-ops

# Enable corepack for Yarn 4
corepack enable

# Install dependencies
yarn install

# Set up environment variables
cp packages/api/.env.example packages/api/.env
# Edit .env with your MongoDB URI and secrets
```

### Development

```bash
# Run all apps concurrently
yarn dev

# Run individually:
yarn workspace extension dev       # Extension (opens Vite dev server)
yarn workspace admin dev           # Admin panel (http://localhost:3000)
yarn workspace @mirmir/api dev     # API server (http://localhost:3001)
```

### Building

```bash
# Build all packages
yarn build

# Build extension only
yarn workspace extension build

# Extension outputs to:
# - apps/extension/dist/chrome/  (Chrome extension)
# - apps/extension/dist/firefox/ (Firefox extension)
```

### Loading the Extension

**Chrome:**

1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension/dist/chrome`

**Firefox:**

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in `apps/extension/dist/firefox`

## Extension Architecture

### Core Modules

| Module              | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `lib/llm`           | Multi-provider LLM router (WebLLM, OpenAI, Anthropic, Ollama, BYOK) |
| `lib/voice`         | Voice recognition and synthesis using Web Speech APIs               |
| `lib/nlp`           | Intent classification and entity extraction                         |
| `lib/web-agent`     | Browser automation agent with context gathering                     |
| `lib/workflows`     | Workflow recording, storage, execution, and scheduling              |
| `lib/memory`        | Semantic memory, preferences, context, and learning engine          |
| `lib/history`       | Comprehensive action history with auto-deletion                     |
| `lib/orchestration` | Cross-site execution and result aggregation                         |
| `lib/permissions`   | Domain rules, permission tiers, and micro-confirmations             |
| `lib/analytics`     | Event tracking, usage stats, and aggregation                        |
| `lib/security`      | Encryption, privacy controls, and CSP compliance                    |

### Background Services

- **Message Handler**: Central message routing between components
- **Action Executor**: Executes browser actions (navigate, click, type, etc.)
- **Shadow Tab Manager**: Background tab lifecycle management
- **Usage Tracker**: Plan limit enforcement and usage counting
- **Voice Handler**: Processes voice commands

### UI Components

- **ChatView**: Main conversational interface
- **HistoryView**: Browse and search action history
- **WorkflowsView**: Manage saved workflows
- **MemoryView**: Inspect and manage agent memory
- **AnalyticsView**: Usage statistics dashboard
- **PermissionsView**: Domain permission management
- **SettingsView**: Configuration with privacy, security, and theme tabs
- **AuthView**: Login/signup and subscription management

## Subscription Plans

| Feature             | Free         | Pro          | Enterprise     |
| ------------------- | ------------ | ------------ | -------------- |
| WebLLM (Local AI)   | Unlimited    | Unlimited    | Unlimited      |
| Cloud LLM Requests  | 50/month     | 2,000/month  | Custom         |
| BYOK Requests       | 100/month    | Unlimited    | Unlimited      |
| Voice Commands      | 20/day       | Unlimited    | Unlimited      |
| Shadow Tabs         | 2 concurrent | 6 concurrent | Custom         |
| Saved Workflows     | 3            | Unlimited    | Unlimited      |
| Scheduled Workflows | -            | 5 active     | Unlimited      |
| History Retention   | 7 days       | 90 days      | Custom         |
| Memory Entries      | 1,000        | 50,000       | Unlimited      |
| Analytics           | Basic        | Full         | Full + Reports |
| Support             | Community    | Email        | Dedicated      |

## Admin Panel

The admin panel provides:

- **Dashboard**: User stats, MRR, and recent activity
- **User Management**: Search, filter, and edit user plans
- **Plan Editor**: Configure pricing, limits, and features
- **Enterprise Management**: Invite customers, set custom limits
- **Analytics**: Usage charts, revenue tracking, subscription changes

## Security & Privacy

- **Encrypted Storage**: AES-256-GCM encryption for sensitive data
- **Local-First**: All data stored locally by default
- **Privacy Controls**: Granular settings for data collection and retention
- **CSP Compliance**: Content Security Policy monitoring
- **Input Sanitization**: XSS prevention and input validation
- **Permission Model**: Tiered permissions with audit logging

## API Documentation

The backend API provides endpoints for:

- Authentication (login, signup, token refresh)
- User management
- Subscription and plan management
- Usage tracking and sync
- Admin operations

See `packages/api/src/routes/` for full endpoint documentation.

## Contributing

This is a private project. Please contact the maintainers for contribution guidelines.

## License

Private - All rights reserved
