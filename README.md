# MirmirOps - Unified Browser Intent Engine

<div align="center">
  <img src="apps/extension/public/icons/icon-128.svg" alt="MirmirOps Logo" width="128" height="128">
  
  **AI-powered browser assistant with voice commands, cross-site automation, and intelligent memory.**
  
  [![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![Next.js](https://img.shields.io/badge/Next.js-15+-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
</div>

---

MirmirOps is a browser-native AI assistant that transforms how users interact with the web. It provides voice-driven commands, cross-site automation, and intelligent memory while keeping users in complete control of their data and privacy.

## Table of Contents

- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Building](#building)
- [Loading the Extension](#loading-the-extension)
- [Extension Architecture](#extension-architecture)
- [Admin Panel](#admin-panel)
- [Backend API](#backend-api)
- [Subscription Plans](#subscription-plans)
- [Security & Privacy](#security--privacy)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Voice-Native Interaction** | Speak naturally to control your browser, fill forms, navigate sites, and automate tasks |
| **Local-First AI (WebLLM)** | Run powerful language models directly in your browser using WebGPU - no data leaves your device |
| **Multi-Provider LLM Support** | Connect to OpenAI, Anthropic, Ollama, or bring your own API keys (BYOK) |
| **Cross-Site Orchestration** | Shadow tabs execute research and comparisons in the background across multiple sites |
| **Intelligent Memory** | Semantic memory, context tracking, and preference learning that persists across sessions |
| **Workflow Automation** | Record, save, and replay complex multi-step workflows with scheduling support |
| **Privacy & Security** | Encrypted storage, CSP compliance, comprehensive privacy controls |
| **Permission System** | Tiered permission model with micro-confirmations for safe execution |

---

## Project Structure

```
mirmir-ops/
├── apps/
│   ├── extension/          # Browser Extension (Chrome/Firefox)
│   │   ├── src/
│   │   │   ├── background/     # Service worker & background scripts
│   │   │   ├── content/        # Content scripts
│   │   │   ├── sidepanel/      # Main UI (React)
│   │   │   ├── options/        # Options page
│   │   │   ├── lib/            # Core libraries (LLM, voice, memory, etc.)
│   │   │   └── shared/         # Shared utilities & types
│   │   ├── public/             # Static assets & icons
│   │   └── dist/               # Build output
│   │
│   └── admin/              # Admin Dashboard (Next.js)
│       ├── src/
│       │   ├── app/            # Next.js App Router pages
│       │   ├── components/     # React components
│       │   └── lib/            # Utilities & API client
│       └── public/             # Static assets
│
├── packages/
│   ├── api/                # Backend API (Express + MongoDB)
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── models/         # Mongoose models
│   │   │   ├── middleware/     # Auth & validation
│   │   │   └── services/       # Business logic
│   │   └── dist/               # Build output
│   │
│   └── shared/             # Shared types and constants
│       └── src/
│
├── docs/                   # Documentation
├── turbo.json              # Turborepo configuration
├── package.json            # Root package.json (workspaces)
└── README.md
```

---

## Tech Stack

### Browser Extension

| Category | Technology |
|----------|------------|
| **Build** | Vite + @crxjs/vite-plugin |
| **UI** | React 19 + TailwindCSS |
| **State** | Zustand |
| **Storage** | IndexedDB (Dexie.js) + chrome.storage |
| **LLM** | WebLLM (local) + multi-llm-ts (cloud) |
| **Voice** | Web Speech API (Recognition + Synthesis) |
| **NLP** | Compromise.js |

### Backend API

| Category | Technology |
|----------|------------|
| **Framework** | Express.js + TypeScript |
| **Database** | MongoDB (Mongoose) |
| **Auth** | JWT with refresh tokens |
| **Validation** | Zod |
| **Security** | Helmet, bcrypt, CORS |
| **Payments** | Stripe |

### Admin Panel

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Auth** | NextAuth.js v5 |
| **UI** | TailwindCSS |
| **Data Fetching** | TanStack Query |
| **Charts** | Recharts |

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.0.0 or higher
- **Yarn** 4+ (via corepack)
- **MongoDB** (local installation or MongoDB Atlas)
- **Chrome** or **Firefox** browser

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/faraasat/mirmir-ops.git
cd mirmir-ops

# 2. Enable corepack for Yarn 4
corepack enable

# 3. Install all dependencies
yarn install

# 4. Set up environment variables
cp packages/api/.env.example packages/api/.env
cp apps/admin/.env.example apps/admin/.env
# Edit both .env files with your configuration

# 5. Start all services in development mode
yarn dev
```

---

## Development

### Running All Services

```bash
# Start all apps concurrently (extension, admin, api)
yarn dev
```

This starts:
- **Extension**: Vite dev server with HMR
- **Admin Panel**: http://localhost:3002
- **API Server**: http://localhost:3001

### Running Individual Services

| Service | Command | URL/Output |
|---------|---------|------------|
| **Extension** | `yarn workspace extension dev` | Vite dev server |
| **Admin Panel** | `yarn workspace admin dev` | http://localhost:3002 |
| **API Server** | `yarn workspace @mirmir/api dev` | http://localhost:3001 |

### Workspace Commands

```bash
# Run a command in a specific workspace
yarn workspace <workspace-name> <command>

# Examples:
yarn workspace extension dev
yarn workspace admin dev
yarn workspace @mirmir/api dev
yarn workspace @mirmir/shared build
```

### Linting & Formatting

```bash
# Lint all packages
yarn lint

# Format all files
yarn format

# Check formatting without changes
yarn format:check
```

### Testing

```bash
# Run all tests
yarn test

# Run extension tests in watch mode
yarn workspace extension test:watch
```

---

## Building

### Build All Packages

```bash
# Build everything (extension, admin, api, shared)
yarn build
```

### Build Extension

```bash
# Build for both Chrome and Firefox
yarn workspace extension build

# Build for Chrome only
yarn workspace extension build:chrome

# Build for Firefox only
yarn workspace extension build:firefox

# Build for both browsers explicitly
yarn workspace extension build:all
```

**Output locations:**
- Chrome: `apps/extension/dist/chrome/`
- Firefox: `apps/extension/dist/firefox/`

### Build Admin Panel

```bash
# Build for production
yarn workspace admin build

# Start production server
yarn workspace admin start
```

**Output location:** `apps/admin/.next/`

### Build API

```bash
# Compile TypeScript
yarn workspace @mirmir/api build

# Start production server
yarn workspace @mirmir/api start
```

**Output location:** `packages/api/dist/`

---

## Loading the Extension

### Chrome

1. Build the extension: `yarn workspace extension build:chrome`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **"Developer mode"** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select the folder: `apps/extension/dist/chrome`
6. The MirmirOps icon should appear in your toolbar

### Firefox

1. Build the extension: `yarn workspace extension build:firefox`
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on..."**
4. Select any file in: `apps/extension/dist/firefox`
5. The MirmirOps icon should appear in your toolbar

> **Note**: Firefox temporary add-ons are removed when the browser closes. For persistent installation, the extension needs to be signed by Mozilla.

---

## Extension Architecture

### Core Libraries (`apps/extension/src/lib/`)

| Module | Description |
|--------|-------------|
| `llm/` | Multi-provider LLM router (WebLLM, OpenAI, Anthropic, Ollama, BYOK) |
| `voice/` | Voice recognition and synthesis using Web Speech APIs |
| `nlp/` | Intent classification and entity extraction |
| `web-agent/` | Browser automation agent with context gathering |
| `workflows/` | Workflow recording, storage, execution, and scheduling |
| `memory/` | Semantic memory, preferences, context, and learning engine |
| `history/` | Comprehensive action history with retention policies |
| `orchestration/` | Cross-site execution and result aggregation |
| `permissions/` | Domain rules, permission tiers, and micro-confirmations |
| `analytics/` | Event tracking, usage stats, and aggregation |
| `security/` | Encryption, privacy controls, and CSP compliance |
| `auth/` | User authentication and subscription management |
| `notifications/` | Desktop and in-app notification system |
| `keyboard/` | Keyboard shortcut management |

### Background Services (`apps/extension/src/background/`)

| Service | Description |
|---------|-------------|
| `message-handler.ts` | Central message routing between components |
| `action-executor.ts` | Executes browser actions (navigate, click, type, etc.) |
| `shadow-tab-manager.ts` | Background tab lifecycle management |
| `tab-manager.ts` | Active tab tracking and state management |
| `usage-tracker.ts` | Plan limit enforcement and usage counting |
| `voice-handler.ts` | Processes voice commands with NLP |
| `permissions.ts` | Permission checking and granting |
| `storage.ts` | Secure storage initialization |

### UI Components (`apps/extension/src/sidepanel/`)

| View | Description |
|------|-------------|
| `ChatView` | Main conversational interface |
| `HistoryView` | Browse and search action history |
| `WorkflowsView` | Manage saved workflows |
| `MemoryView` | Inspect and manage agent memory |
| `AnalyticsView` | Usage statistics dashboard |
| `PermissionsView` | Domain permission management |
| `SettingsView` | Configuration (privacy, security, theme, AI) |
| `AccountView` | Login/signup and subscription management |

---

## Admin Panel

The admin panel (`apps/admin/`) provides administrative control over the MirmirOps platform.

### Features

| Page | Description |
|------|-------------|
| **Dashboard** | User stats, MRR, and recent activity overview |
| **Users** | Search, filter, view, and edit user plans |
| **Plans** | Configure pricing, limits, and features for each tier |
| **Enterprise** | Invite enterprise customers, set custom limits |
| **Analytics** | Usage charts, revenue tracking, subscription metrics |

### Default Admin Credentials

The admin panel comes with a pre-configured admin account for development and testing:

| Field | Value |
|-------|-------|
| **Email** | `admin@mirmir.com` |
| **Password** | `admin123` |

> ⚠️ **Security Warning**: These are default development credentials. In production, you should:
> 1. Change the admin password immediately
> 2. Update the hashed password in `packages/api/src/routes/admin.ts`
> 3. Or implement a proper admin user management system with database storage

### Authentication

The admin panel uses NextAuth.js v5 with credentials-based authentication. It authenticates against the backend API at `/api/admin/login`.

### Running Admin Panel

```bash
# Development
yarn workspace admin dev     # http://localhost:3002

# Production
yarn workspace admin build
yarn workspace admin start   # http://localhost:3002
```

### Accessing the Admin Panel

1. Start the API server: `yarn workspace @mirmir/api dev`
2. Start the admin panel: `yarn workspace admin dev`
3. Open http://localhost:3002
4. Login with the credentials above

---

## Backend API

The backend API (`packages/api/`) provides server-side functionality for user management, subscriptions, and data sync.

### Endpoints

| Category | Endpoints |
|----------|-----------|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/refresh` |
| **Users** | `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id` |
| **Plans** | `GET /api/plans`, `PATCH /api/plans/:id` |
| **Enterprise** | `GET /api/enterprise/customers`, `POST /api/enterprise/invite` |
| **Usage** | `POST /api/usage/sync`, `GET /api/usage/stats` |
| **Admin** | `GET /api/admin/stats`, `GET /api/admin/analytics` |

### Running API Server

```bash
# Development (with hot reload)
yarn workspace @mirmir/api dev   # http://localhost:3001

# Production
yarn workspace @mirmir/api build
yarn workspace @mirmir/api start
```

---

## Subscription Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **WebLLM (Local AI)** | Unlimited | Unlimited | Unlimited |
| **Cloud LLM Requests** | 50/month | 2,000/month | Custom |
| **BYOK Requests** | 100/month | Unlimited | Unlimited |
| **Voice Commands** | 20/day | Unlimited | Unlimited |
| **Shadow Tabs** | 2 concurrent | 6 concurrent | Custom |
| **Saved Workflows** | 3 | Unlimited | Unlimited |
| **Scheduled Workflows** | - | 5 active | Unlimited |
| **History Retention** | 7 days | 90 days | Custom |
| **Memory Entries** | 1,000 | 50,000 | Unlimited |
| **Analytics** | Basic | Full | Full + Reports |
| **Support** | Community | Email | Dedicated |

---

## Security & Privacy

| Feature | Description |
|---------|-------------|
| **Encrypted Storage** | AES-256-GCM encryption for sensitive data |
| **Local-First** | All data stored locally by default |
| **Privacy Controls** | Granular settings for data collection and retention |
| **CSP Compliance** | Content Security Policy monitoring and enforcement |
| **Input Sanitization** | XSS prevention and input validation |
| **Permission Model** | Tiered permissions with audit logging |
| **Secure Communication** | HTTPS-only for API communication |
| **Token Security** | JWT with refresh token rotation |

---

## Environment Variables

### API (`packages/api/.env`)

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mirmirops

# JWT Secrets
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Admin Panel (`apps/admin/.env`)

```env
# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3002

# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password
```

---

## Troubleshooting

### Common Issues

**Extension not loading in Chrome:**
- Ensure you're loading the `dist/chrome` folder, not the `src` folder
- Check for errors in `chrome://extensions`
- Make sure Developer mode is enabled

**API connection errors:**
- Verify MongoDB is running
- Check that `.env` files are properly configured
- Ensure ports 3001 and 3002 are not in use

**Build failures:**
- Run `yarn install` to ensure all dependencies are installed
- Clear build caches: `rm -rf node_modules/.cache apps/*/dist packages/*/dist`
- Check Node.js version is 20+

**WebLLM not working:**
- WebLLM requires WebGPU support (Chrome 113+ or Firefox with flags)
- Check browser compatibility at `chrome://gpu`
- Fallback to cloud providers if WebGPU unavailable

### Getting Help

- Check the `docs/` folder for detailed documentation
- Review console logs in the browser's developer tools
- Check the extension's background page for service worker logs

---

## Scripts Reference

### Root Level

| Command | Description |
|---------|-------------|
| `yarn dev` | Start all services in development mode |
| `yarn build` | Build all packages for production |
| `yarn lint` | Lint all packages |
| `yarn test` | Run all tests |
| `yarn format` | Format all files with Prettier |
| `yarn format:check` | Check formatting without changes |

### Extension (`yarn workspace extension ...`)

| Command | Description |
|---------|-------------|
| `dev` | Start Vite dev server |
| `build` | Build for production (both browsers) |
| `build:chrome` | Build for Chrome only |
| `build:firefox` | Build for Firefox only |
| `build:all` | Build for both browsers |
| `icons` | Generate PNG icons from SVG |
| `lint` | Lint extension code |
| `test` | Run extension tests |
| `test:watch` | Run tests in watch mode |

### Admin (`yarn workspace admin ...`)

| Command | Description |
|---------|-------------|
| `dev` | Start Next.js dev server (port 3002) |
| `build` | Build for production |
| `start` | Start production server (port 3002) |
| `lint` | Lint admin code |

### API (`yarn workspace @mirmir/api ...`)

| Command | Description |
|---------|-------------|
| `dev` | Start with hot reload (tsx watch) |
| `build` | Compile TypeScript |
| `start` | Start production server |
| `lint` | Lint API code |

---

## License

Private - All rights reserved

---

<div align="center">
  <b>Built with ❤️ for a smarter browsing experience</b>
</div>
