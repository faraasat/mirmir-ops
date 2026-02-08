# MirmirOps - Unified Browser Intent Engine

MirmirOps is a browser-native AI assistant that transforms how users interact with the web. It provides voice-driven commands, cross-site automation, and intelligent memory while keeping users in complete control of their data and privacy.

## Project Structure

```
mirmir-ops/
├── apps/
│   ├── extension/     # Browser Extension (PRIMARY)
│   └── admin/         # Admin Panel (Next.js)
├── packages/
│   ├── api/           # Express + MongoDB Backend
│   └── shared/        # Shared types and constants
└── docs/              # Documentation
```

## Tech Stack

### Extension (Primary Focus)
- **Build**: Vite + vite-plugin-web-extension
- **UI**: React 19 + TailwindCSS
- **State**: Zustand
- **Storage**: Dexie.js (IndexedDB)
- **LLM**: WebLLM (local) + multi-llm-ts (cloud)

### Backend
- **API**: Express.js + TypeScript
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT

### Admin Panel
- **Framework**: Next.js (latest)
- **UI**: TailwindCSS + shadcn/ui components

## Getting Started

### Prerequisites
- Node.js 20+
- Yarn 4+
- MongoDB (local or Atlas)

### Installation

```bash
# Install dependencies
yarn install

# Set up environment variables
cp packages/api/.env.example packages/api/.env
# Edit .env with your MongoDB URI and secrets
```

### Development

```bash
# Run all apps in development
yarn dev

# Or run individually:
yarn workspace extension dev      # Extension (Vite dev server)
yarn workspace admin dev          # Admin panel (Next.js)
yarn workspace @mirmir/api dev    # API server
```

### Building

```bash
# Build all
yarn build

# Build extension for Chrome
yarn workspace extension build:chrome

# Build extension for Firefox
yarn workspace extension build:firefox
```

## Extension Features

- **Voice Commands**: Speak to control the browser
- **Local AI (WebLLM)**: Run LLMs in-browser with WebGPU
- **Cloud AI**: Connect to OpenAI, Anthropic, Ollama, or BYOK
- **Cross-Site Automation**: Shadow tabs for multi-page tasks
- **Workflow Templates**: Save and replay automation sequences
- **Comprehensive History**: Track all commands and actions
- **Privacy First**: All data stays local by default

## Subscription Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| WebLLM (Local) | Unlimited | Unlimited | Unlimited |
| Cloud LLM | 50/month | 2,000/month | Custom |
| BYOK | 100/month | Unlimited | Unlimited |
| Voice Commands | 20/day | Unlimited | Unlimited |
| Shadow Tabs | 2 | 6 | Custom |
| Workflows | 3 saved | Unlimited | Unlimited |
| History | 7 days | 90 days | Custom |

## License

Private - All rights reserved
