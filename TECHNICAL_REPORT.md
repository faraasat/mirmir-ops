# MirmirOps - Technical Report

**Unified Browser Intent Engine**  
**Version:** 0.1.0  
**Date:** February 2026  
**Document Type:** Technical Review Report

---

## Executive Summary

MirmirOps is a browser-native AI assistant that transforms web interaction through voice commands, cross-site automation, and intelligent memory. The system operates as a Chrome/Firefox browser extension with a supporting backend API and admin dashboard, implementing a privacy-first, local-first architecture while providing flexibility for cloud-based AI providers.

### Key Achievements
- Full Manifest V3 compliance for modern browser extension standards
- Local-first AI execution via WebLLM with WebGPU acceleration
- Multi-provider LLM support (WebLLM, OpenAI, Anthropic, Ollama, BYOK)
- Tiered permission system with audit logging
- End-to-end encryption for sensitive data storage
- Cross-site workflow orchestration with shadow tab execution
- Voice-driven interaction with Web Speech API integration
- Subscription-based monetization with three tiers (Free, Pro, Enterprise)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Browser Extension Architecture](#3-browser-extension-architecture)
4. [AI/LLM Integration](#4-aillm-integration)
5. [Voice Processing System](#5-voice-processing-system)
6. [Natural Language Processing](#6-natural-language-processing)
7. [Web Automation Agent](#7-web-automation-agent)
8. [Memory & Learning System](#8-memory--learning-system)
9. [Workflow Engine](#9-workflow-engine)
10. [Security Architecture](#10-security-architecture)
11. [Backend API](#11-backend-api)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Subscription & Monetization](#13-subscription--monetization)
14. [Data Flow & Communication](#14-data-flow--communication)
15. [Performance Considerations](#15-performance-considerations)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment Architecture](#17-deployment-architecture)
18. [Known Limitations](#18-known-limitations)
19. [Future Roadmap](#19-future-roadmap)
20. [Appendix](#20-appendix)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MirmirOps System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Browser Extension (Client)                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │   │
│  │  │ Side     │  │Background│  │ Content  │  │    Options Page      │ │   │
│  │  │ Panel    │  │ Service  │  │ Scripts  │  │                      │ │   │
│  │  │ (React)  │  │ Worker   │  │          │  │                      │ │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────────────┘ │   │
│  │       │             │             │                                  │   │
│  │       └─────────────┴─────────────┘                                  │   │
│  │                     │                                                │   │
│  │  ┌──────────────────┴───────────────────────────────────────────┐   │   │
│  │  │                    Core Libraries                             │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │   │
│  │  │  │   LLM   │ │  Voice  │ │   NLP   │ │Web Agent│ │ Memory  │ │   │   │
│  │  │  │ Router  │ │ Engine  │ │ Parser  │ │Executor │ │ Store   │ │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │   │
│  │  │  │Workflow │ │ History │ │Security │ │Analytics│ │Permiss. │ │   │   │
│  │  │  │ Engine  │ │ Manager │ │ Module  │ │ Tracker │ │ Manager │ │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ HTTPS/WSS                              │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Backend API (Express)                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │   │
│  │  │   Auth   │  │ Usage    │  │ Subscr.  │  │      Admin API       │ │   │
│  │  │ Service  │  │ Tracking │  │ Manager  │  │                      │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │                    ┌──────────────────┐                              │   │
│  │                    │    MongoDB       │                              │   │
│  │                    └──────────────────┘                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Admin Dashboard (Next.js)                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │   │
│  │  │Dashboard │  │ User     │  │  Plan    │  │    Enterprise        │ │   │
│  │  │ Stats    │  │ Mgmt     │  │  Editor  │  │    Management        │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Monorepo Structure

```
mirmir-ops/
├── apps/
│   ├── extension/          # Browser Extension (Chrome/Firefox)
│   │   ├── src/
│   │   │   ├── background/     # Service Worker
│   │   │   ├── content/        # Content Scripts
│   │   │   ├── sidepanel/      # React UI (Side Panel)
│   │   │   ├── options/        # Options Page
│   │   │   ├── lib/            # Core Libraries
│   │   │   └── shared/         # Types & Constants
│   │   ├── public/             # Static Assets
│   │   └── dist/               # Build Output
│   │       ├── chrome/
│   │       └── firefox/
│   │
│   └── admin/              # Admin Dashboard
│       └── src/
│           ├── app/            # Next.js App Router
│           ├── components/     # UI Components
│           └── lib/            # Utilities
│
├── packages/
│   ├── api/                # Backend API
│   │   └── src/
│   │       ├── db/             # Database Connection
│   │       ├── middleware/     # Express Middleware
│   │       ├── models/         # Mongoose Models
│   │       └── routes/         # API Routes
│   │
│   └── shared/             # Shared Types & Utils
│
└── docs/                   # Documentation
```

### 1.3 Package Dependencies

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   extension    │────▶│  @mirmir/api   │────▶│ @mirmir/shared │
└────────────────┘     └────────────────┘     └────────────────┘
        │                                             ▲
        │                                             │
        ▼                                             │
┌────────────────┐                                    │
│     admin      │────────────────────────────────────┘
└────────────────┘
```

---

## 2. Technology Stack

### 2.1 Browser Extension

| Category         | Technology            | Version    | Purpose                        |
| ---------------- | --------------------- | ---------- | ------------------------------ |
| **Build**        | Vite                  | 5.4.x      | Fast development and bundling  |
| **Build**        | @crxjs/vite-plugin    | 2.0.0-beta | Manifest V3 extension bundling |
| **UI Framework** | React                 | 19.0.0     | Component-based UI             |
| **Styling**      | TailwindCSS           | 3.4.x      | Utility-first CSS              |
| **State**        | Zustand               | 5.0.0      | Lightweight state management   |
| **Storage**      | Dexie.js              | 4.0.0      | IndexedDB wrapper              |
| **Storage**      | chrome.storage        | Native     | Extension storage              |
| **LLM (Local)**  | @mlc-ai/web-llm       | 0.2.0      | Local AI inference             |
| **LLM (Cloud)**  | multi-llm-ts          | 1.0.0      | Multi-provider support         |
| **NLP**          | Compromise            | 14.12.0    | Entity extraction              |
| **Voice**        | Web Speech API        | Native     | Speech recognition/synthesis   |
| **Schema**       | Zod                   | 3.22.0     | Runtime validation             |
| **Browser**      | webextension-polyfill | 0.12.0     | Cross-browser compatibility    |
| **Date**         | date-fns              | 3.3.0      | Date manipulation              |
| **IDs**          | uuid                  | 9.0.0      | Unique identifiers             |

### 2.2 Backend API

| Category       | Technology | Version | Purpose              |
| -------------- | ---------- | ------- | -------------------- |
| **Runtime**    | Node.js    | 20.x    | JavaScript runtime   |
| **Framework**  | Express    | 4.18.x  | HTTP server          |
| **Database**   | MongoDB    | 7.x     | Document database    |
| **ODM**        | Mongoose   | 8.1.x   | MongoDB modeling     |
| **Auth**       | JWT        | 9.0.0   | Token authentication |
| **Encryption** | bcryptjs   | 2.4.3   | Password hashing     |
| **Security**   | Helmet     | 7.1.0   | HTTP headers         |
| **Payments**   | Stripe     | 14.14.0 | Subscription billing |
| **Validation** | Zod        | 3.22.0  | Request validation   |
| **Dev**        | tsx        | 4.7.0   | TypeScript execution |

### 2.3 Admin Dashboard

| Category      | Technology     | Version       | Purpose            |
| ------------- | -------------- | ------------- | ------------------ |
| **Framework** | Next.js        | Latest (16.x) | React framework    |
| **Auth**      | NextAuth.js    | 5.0.0-beta    | Authentication     |
| **Data**      | TanStack Query | 5.17.x        | Data fetching      |
| **Tables**    | TanStack Table | 8.11.x        | Data tables        |
| **Charts**    | Recharts       | 2.10.x        | Data visualization |
| **Icons**     | Lucide React   | 0.311.x       | Icon library       |
| **Styling**   | TailwindCSS    | 3.4.x         | Utility-first CSS  |
| **Utilities** | clsx, cva      | Latest        | Class utilities    |

### 2.4 Development Tools

| Tool                | Version    | Purpose |
| ------------------- | ---------- | ------- |
| **Monorepo**        | Turborepo  | 2.3.x   | Build orchestration   |
| **Package Manager** | Yarn       | 4.12.0  | Dependency management |
| **Language**        | TypeScript | 5.3.x   | Type safety           |
| **Linting**         | ESLint     | 8.57.x  | Code quality          |
| **Formatting**      | Prettier   | 3.2.x   | Code formatting       |
| **Testing**         | Vitest     | 1.6.x   | Unit testing          |

---

## 3. Browser Extension Architecture

### 3.1 Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "MirmirOps",
  "version": "0.1.0",
  
  "permissions": [
    "activeTab", "tabs", "storage", "scripting",
    "sidePanel", "contextMenus", "notifications",
    "clipboardRead", "clipboardWrite", "alarms"
  ],
  
  "optional_permissions": [
    "history", "bookmarks", "webNavigation"
  ],
  
  "host_permissions": ["<all_urls>"],
  
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  
  "background": {
    "service_worker": "service-worker-loader.js",
    "type": "module"
  },
  
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  }
}
```

### 3.2 Extension Components

#### 3.2.1 Background Service Worker
- **Message Router**: Central hub for inter-component communication
- **Action Executor**: Executes browser automation commands
- **Usage Tracker**: Monitors plan limits and usage
- **Shadow Tab Manager**: Background tab lifecycle
- **Alarm Handler**: Scheduled workflow execution

#### 3.2.2 Content Scripts
- **DOM Context Extraction**: Gather page structure
- **Element Interaction**: Click, type, scroll actions
- **Data Extraction**: Extract structured data
- **Form Detection**: Identify fillable forms

#### 3.2.3 Side Panel UI
- **ChatView**: Conversational AI interface
- **HistoryView**: Action history browser
- **WorkflowsView**: Workflow management
- **MemoryView**: Agent memory inspection
- **AnalyticsView**: Usage statistics
- **PermissionsView**: Domain permissions
- **SettingsView**: Configuration
- **AuthView**: Login/signup

### 3.3 Core Library Modules

| Module            | Path                 | Description                                      |
| ----------------- | -------------------- | ------------------------------------------------ |
| **llm**           | `lib/llm/`           | Multi-provider LLM router with streaming support |
| **voice**         | `lib/voice/`         | Speech recognition and synthesis                 |
| **nlp**           | `lib/nlp/`           | Intent classification, entity extraction         |
| **web-agent**     | `lib/web-agent/`     | Browser automation execution                     |
| **memory**        | `lib/memory/`        | Semantic, preference, and context memory         |
| **workflows**     | `lib/workflows/`     | Recording, storage, scheduling, execution        |
| **history**       | `lib/history/`       | Action logging with auto-retention               |
| **orchestration** | `lib/orchestration/` | Cross-site execution                             |
| **permissions**   | `lib/permissions/`   | Tiered permission management                     |
| **security**      | `lib/security/`      | Encryption, CSP, sanitization                    |
| **analytics**     | `lib/analytics/`     | Event tracking and aggregation                   |

---

## 4. AI/LLM Integration

### 4.1 LLM Router Architecture

```typescript
// Provider abstraction
interface LLMProvider {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<LLMChunk>;
}

// Router configuration
interface LLMRouterConfig {
  defaultProvider: LLMProvider;
  providers: Map<string, LLMProvider>;
  fallbackOrder: string[];
}
```

### 4.2 Supported Providers

| Provider      | Type         | Models                                             | Notes                               |
| ------------- | ------------ | -------------------------------------------------- | ----------------------------------- |
| **WebLLM**    | Local        | Llama 3.2 (1B, 3B), Phi 3.5, Gemma 2, Qwen 2.5     | WebGPU-accelerated, offline capable |
| **OpenAI**    | Cloud        | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5          | API key required                    |
| **Anthropic** | Cloud        | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus | API key required                    |
| **Ollama**    | Local Server | Llama 3.2, Mistral, Code Llama, Phi-3, Gemma 2     | Requires Ollama installation        |
| **BYOK**      | Custom       | User-defined                                       | OpenAI-compatible endpoints         |

### 4.3 WebLLM Integration

```typescript
// WebLLM initialization
const webllm = new WebLLMProvider({
  modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  onProgress: (progress: WebLLMProgress) => {
    // Update UI with download/loading progress
  }
});

// Model loading with WebGPU
await webllm.loadModel();

// Inference
const response = await webllm.complete([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userQuery }
]);
```

### 4.4 Streaming Support

All providers support streaming for real-time response display:

```typescript
for await (const chunk of llmRouter.stream(messages)) {
  // Append chunk.content to UI
  updateUI(chunk.content);
}
```

---

## 5. Voice Processing System

### 5.1 Speech Recognition

```typescript
// Web Speech API integration
interface VoiceRecognitionConfig {
  language: string;        // 'en-US', 'es-ES', etc.
  continuous: boolean;     // Keep listening after result
  interimResults: boolean; // Show partial transcriptions
  maxAlternatives: number; // Recognition alternatives
}

// Recognition flow
SpeechRecognition.start()
  → onresult(transcript)
  → parseIntent(transcript)
  → executeAction(intent)
```

### 5.2 Speech Synthesis (TTS)

```typescript
// Agent response vocalization
interface VoiceSynthesisConfig {
  rate: number;   // 0.1 - 10.0 (default: 1.0)
  pitch: number;  // 0 - 2.0 (default: 1.0)
  voice: SpeechSynthesisVoice;
}

// Synthesis flow
speak(text) → SpeechSynthesis.speak() → Audio output
```

### 5.3 Voice Command Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Speech  │────▶│   NLP    │────▶│  Action  │
│  Speech  │     │  Recog.  │     │  Parser  │     │ Executor │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                  │
                      ▼                                  ▼
               ┌──────────┐                       ┌──────────┐
               │ Interim  │                       │  Speech  │
               │  Result  │                       │ Synthesis│
               └──────────┘                       └──────────┘
```

---

## 6. Natural Language Processing

### 6.1 Intent Classification

```typescript
// Intent types
type IntentType = 
  | 'navigation'    // "Go to Google"
  | 'search'        // "Search for AI news"
  | 'click'         // "Click the login button"
  | 'type'          // "Type hello world"
  | 'extract'       // "Get all prices"
  | 'fill_form'     // "Fill this form"
  | 'compare'       // "Compare prices"
  | 'workflow'      // "Run my daily report"
  | 'memory'        // "Remember my preference"
  | 'question'      // "What can you do?"
  | 'unknown';

// Intent parsing result
interface ParsedIntent {
  action: IntentType;
  target?: string;
  parameters: Record<string, unknown>;
  confidence: number;
  entities: ExtractedEntity[];
}
```

### 6.2 Entity Extraction

Using Compromise.js for entity recognition:

```typescript
// Entity types
type EntityType = 'url' | 'email' | 'date' | 'number' | 'selector' | 'text';

// Extraction examples
"Go to google.com" → { type: 'url', value: 'google.com' }
"Email john@example.com" → { type: 'email', value: 'john@example.com' }
"Schedule for tomorrow" → { type: 'date', value: '2026-02-09' }
"Under $200" → { type: 'number', value: 200 }
```

### 6.3 NLP Pipeline

```
Input Text
    │
    ▼
┌─────────────────┐
│   Tokenization  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Entity Extract  │ (Compromise.js)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intent Classify │ (Pattern + LLM fallback)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parameter Map   │
└────────┬────────┘
         │
         ▼
ParsedIntent
```

---

## 7. Web Automation Agent

### 7.1 Action Types

| Action       | Permission Tier  | Description            |
| ------------ | ---------------- | ---------------------- |
| `extract`    | Passive          | Extract data from page |
| `screenshot` | Passive          | Capture visible area   |
| `navigate`   | Read-Only        | Navigate to URL        |
| `scroll`     | Read-Only        | Scroll page            |
| `wait`       | Read-Only        | Wait for element/time  |
| `copy`       | Read-Only        | Copy to clipboard      |
| `select`     | Read-Only        | Select text            |
| `hover`      | Read-Only        | Hover over element     |
| `click`      | Mutable-Safe     | Click element          |
| `type`       | Mutable-Safe     | Type text              |
| `fill-form`  | Mutable-Safe     | Auto-fill form         |
| `submit`     | Mutable-Critical | Submit form            |
| `download`   | Mutable-Critical | Download file          |
| `paste`      | Mutable-Critical | Paste from clipboard   |

### 7.2 Action Execution Flow

```typescript
// Action structure
interface Action {
  id: string;
  type: ActionType;
  target?: string;      // CSS selector or description
  value?: unknown;      // Input value
  options?: {
    timeout?: number;
    retries?: number;
    waitForElement?: boolean;
  };
  permissionTier: PermissionTier;
}

// Execution result
interface ActionResult {
  actionId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  timestamp: number;
}
```

### 7.3 Context Gathering

```typescript
// Page context for LLM reasoning
interface PageContext {
  url: string;
  title: string;
  domain: string;
  visibleText: string;
  forms: FormInfo[];
  links: LinkInfo[];
  buttons: ButtonInfo[];
  inputs: InputInfo[];
  tables: TableInfo[];
  metadata: Record<string, string>;
}
```

### 7.4 Shadow Tab Execution

Cross-site operations run in background tabs:

```typescript
// Shadow tab lifecycle
createShadowTab(url) → executeInTab(actions) → extractResults() → closeShadowTab()

// Concurrent limits by plan
Free: 2 concurrent shadow tabs
Pro: 6 concurrent shadow tabs
Enterprise: Unlimited
```

---

## 8. Memory & Learning System

### 8.1 Memory Types

| Type                  | Storage   | Purpose                      |
| --------------------- | --------- | ---------------------------- |
| **Semantic Memory**   | IndexedDB | Content recall by meaning    |
| **Preference Memory** | IndexedDB | User preferences/constraints |
| **Context Memory**    | Session   | Current task context         |
| **Learning Engine**   | IndexedDB | Pattern recognition          |

### 8.2 Semantic Memory

```typescript
// Semantic entry
interface SemanticMemoryEntry {
  id: string;
  content: string;
  embedding: Float32Array;  // Vector representation
  source: {
    url: string;
    title: string;
    timestamp: number;
  };
  tags: string[];
}

// Similarity search
const results = await semanticMemory.search(
  "article about salt-water batteries",
  { limit: 5, threshold: 0.7 }
);
```

### 8.3 Preference Memory

```typescript
// Preference types
interface UserPreference {
  category: 'budget' | 'brand' | 'dietary' | 'accessibility' | 'custom';
  key: string;
  value: unknown;
  confidence: number;
  learnedFrom: string[];  // Source interactions
  updatedAt: number;
}

// Example preferences
{ category: 'budget', key: 'max_price', value: 200 }
{ category: 'brand', key: 'preferred', value: ['Apple', 'Sony'] }
{ category: 'dietary', key: 'restrictions', value: ['vegetarian'] }
```

### 8.4 Learning Engine

```typescript
// Pattern recognition
interface LearnedPattern {
  trigger: string;
  actions: Action[];
  frequency: number;
  lastUsed: number;
  confidence: number;
}

// Automatic suggestions
const suggestions = await learningEngine.getSuggestions(currentContext);
```

---

## 9. Workflow Engine

### 9.1 Workflow Structure

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  trigger?: WorkflowTrigger;
  createdAt: number;
  updatedAt: number;
  runCount: number;
  lastRunAt?: number;
}

interface WorkflowStep {
  id: string;
  action: Action;
  conditions?: WorkflowCondition[];
  onSuccess?: string;  // Next step ID
  onFailure?: string;  // Step ID or 'abort'
  retryCount?: number;
  timeout?: number;
}
```

### 9.2 Workflow Triggers

| Trigger Type | Description                  |
| ------------ | ---------------------------- |
| `manual`     | User-initiated execution     |
| `scheduled`  | Cron-based scheduling        |
| `url-match`  | Auto-run on matching URLs    |
| `shortcut`   | Keyboard shortcut activation |

### 9.3 Workflow Execution

```
┌─────────────┐
│   Trigger   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Load Steps  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ Check Cond. │────▶│ Skip Step   │
└──────┬──────┘  No └─────────────┘
       │ Yes
       ▼
┌─────────────┐
│Execute Step │
└──────┬──────┘
       │
   ┌───┴───┐
   │Success?│
   └───┬───┘
    Yes│    No
       │     │
       ▼     ▼
┌──────────┐ ┌──────────┐
│onSuccess │ │onFailure │
│  Step    │ │ / Abort  │
└──────────┘ └──────────┘
```

### 9.4 Scheduling (Cron)

```typescript
// Using browser alarms API for scheduling
interface ScheduledWorkflow {
  workflowId: string;
  cronExpression: string;  // "0 9 * * 1-5" (9 AM weekdays)
  nextRun: number;
  enabled: boolean;
}
```

---

## 10. Security Architecture

### 10.1 Encryption

```typescript
// AES-256-GCM encryption
interface CryptoConfig {
  algorithm: 'AES-GCM';
  keyLength: 256;
  ivLength: 12;
  tagLength: 128;
}

// Key derivation
masterKey = PBKDF2(userSecret, salt, 100000, 256);

// Encryption flow
encrypt(data) → iv + ciphertext + authTag
decrypt(encrypted) → plainData
```

### 10.2 Secure Storage

```typescript
// Storage categories
'sensitive': AES-256-GCM encrypted   // API keys, tokens
'private': Encrypted on request      // Preferences
'normal': Plain storage              // Non-sensitive settings
```

### 10.3 Content Security Policy

```typescript
// CSP monitoring
document.addEventListener('securitypolicyviolation', (event) => {
  logCSPViolation({
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    originalPolicy: event.originalPolicy
  });
});
```

### 10.4 Input Sanitization

```typescript
// XSS prevention
sanitizeHTML(input): string
sanitizeURL(input): string
sanitizeSelector(input): string

// Validation with Zod
const schema = z.object({
  url: z.string().url(),
  selector: z.string().max(500),
  value: z.unknown()
});
```

### 10.5 Permission Tiers

| Tier                 | Actions                | Auto-Grant | Confirmation |
| -------------------- | ---------------------- | ---------- | ------------ |
| **Passive**          | Extract, Screenshot    | Yes        | No           |
| **Read-Only**        | Navigate, Scroll, Copy | Per-domain | Grouped      |
| **Mutable-Safe**     | Click, Type, Fill      | Per-action | Individual   |
| **Mutable-Critical** | Submit, Delete, Pay    | Never      | Always       |

---

## 11. Backend API

### 11.1 API Routes

| Method | Endpoint               | Description          |
| ------ | ---------------------- | -------------------- |
| `POST` | `/auth/login`          | User authentication  |
| `POST` | `/auth/register`       | User registration    |
| `POST` | `/auth/refresh`        | Token refresh        |
| `GET`  | `/user/me`             | Get current user     |
| `PUT`  | `/user/me`             | Update user profile  |
| `GET`  | `/usage/sync`          | Sync usage data      |
| `GET`  | `/usage/limits`        | Get plan limits      |
| `POST` | `/subscription/create` | Create subscription  |
| `PUT`  | `/subscription/update` | Update plan          |
| `POST` | `/admin/login`         | Admin authentication |
| `GET`  | `/admin/users`         | List users           |
| `PUT`  | `/admin/users/:id`     | Update user          |
| `GET`  | `/admin/plans`         | List plans           |
| `PUT`  | `/admin/plans/:id`     | Update plan          |
| `GET`  | `/admin/analytics`     | Get analytics        |

### 11.2 Data Models

```typescript
// User model
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  plan: PlanType;
  customLimits?: PlanLimits;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Usage model
interface Usage {
  _id: ObjectId;
  userId: ObjectId;
  period: string;  // "2026-02"
  cloudLlmRequests: number;
  byokRequests: number;
  voiceCommands: number;
  lastSyncedAt: Date;
}

// Subscription model
interface Subscription {
  _id: ObjectId;
  userId: ObjectId;
  plan: PlanType;
  status: 'active' | 'cancelled' | 'past_due';
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
}
```

### 11.3 Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│  API    │────▶│ MongoDB │
│         │     │         │     │         │
│ Login   │     │ Verify  │     │ Query   │
│ Request │     │ Creds   │     │ User    │
└─────────┘     └────┬────┘     └─────────┘
                     │
                     ▼
               ┌───────────┐
               │ Generate  │
               │   JWT     │
               │ + Refresh │
               └─────┬─────┘
                     │
                     ▼
               ┌───────────┐
               │  Return   │
               │  Tokens   │
               └───────────┘
```

---

## 12. Admin Dashboard

### 12.1 Features

| Feature             | Description                        |
| ------------------- | ---------------------------------- |
| **Dashboard**       | User stats, MRR, activity overview |
| **User Management** | Search, filter, edit users         |
| **Plan Editor**     | Configure pricing and limits       |
| **Enterprise Mgmt** | Custom limits, dedicated support   |
| **Analytics**       | Charts, usage trends, revenue      |

### 12.2 Authentication

```typescript
// NextAuth.js v5 configuration
export const authOptions = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        // Verify against API
        const response = await fetch('/api/admin/login', ...);
        return response.ok ? await response.json() : null;
      }
    })
  ],
  callbacks: {
    jwt: ({ token, user }) => { /* Store user in token */ },
    session: ({ session, token }) => { /* Attach to session */ }
  }
};
```

### 12.3 Data Fetching

```typescript
// TanStack Query for data management
const { data: users } = useQuery({
  queryKey: ['users', filters],
  queryFn: () => adminApi.getUsers(filters),
  staleTime: 60 * 1000
});

// Mutations with optimistic updates
const updateUser = useMutation({
  mutationFn: adminApi.updateUser,
  onSuccess: () => queryClient.invalidateQueries(['users'])
});
```

---

## 13. Subscription & Monetization

### 13.1 Plan Comparison

| Feature            | Free      | Pro         | Enterprise |
| ------------------ | --------- | ----------- | ---------- |
| **WebLLM (Local)** | Unlimited | Unlimited   | Unlimited  |
| **Cloud LLM**      | 50/month  | 2,000/month | Custom     |
| **BYOK Requests**  | 100/month | Unlimited   | Unlimited  |
| **Voice Commands** | 20/day    | Unlimited   | Unlimited  |
| **Shadow Tabs**    | 2         | 6           | Custom     |
| **Workflows**      | 3         | Unlimited   | Unlimited  |
| **Scheduled**      | None      | 5 active    | Unlimited  |
| **History**        | 7 days    | 90 days     | Custom     |
| **Memory**         | 1,000     | 50,000      | Unlimited  |
| **Support**        | Community | Email       | Dedicated  |

### 13.2 Limit Enforcement

```typescript
// Usage check before action
async function checkLimits(action: ActionType): Promise<boolean> {
  const usage = await getUsage();
  const limits = await getLimits();
  
  switch (action) {
    case 'cloud_llm':
      return usage.cloudLlmRequests < limits.cloudLlmRequests;
    case 'voice':
      return usage.voiceCommands < limits.voiceCommands;
    // ... other checks
  }
}
```

### 13.3 Pro Trial

- 3-day free trial for Pro features
- No credit card required for trial
- Automatic downgrade to Free after trial

---

## 14. Data Flow & Communication

### 14.1 Message Passing

```typescript
// Message types
type MessageType =
  | 'EXECUTE_ACTION'     // Run browser action
  | 'LLM_REQUEST'        // AI inference
  | 'VOICE_COMMAND'      // Voice input
  | 'SAVE_HISTORY'       // Log action
  | 'RUN_WORKFLOW'       // Execute workflow
  | 'CHECK_PERMISSION'   // Permission query
  | 'SYNC_USAGE'         // Backend sync
  | 'CREATE_SHADOW_TAB'; // Background tab

// Message structure
interface Message<T> {
  type: MessageType;
  payload: T;
  tabId?: number;
  timestamp: number;
}
```

### 14.2 Communication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Side Panel (UI)                          │
└────────────────────────────┬─────────────────────────────────┘
                             │ chrome.runtime.sendMessage
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Background Service Worker                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ LLM Router  │  │ Workflow    │  │ Usage Tracker       │   │
│  │             │  │ Executor    │  │                     │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└────────────────────────────┬─────────────────────────────────┘
                             │ chrome.tabs.sendMessage
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      Content Script                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ DOM Actions │  │ Data Extract│  │ Form Filler         │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 15. Performance Considerations

### 15.1 Bundle Size Optimization

```
Current bundle sizes (gzipped):
- Main bundle: ~2 MB (includes WebLLM models registry)
- Sidepanel: ~44 KB
- Background: ~199 KB
- Styles: ~60 KB
```

### 15.2 Lazy Loading

```typescript
// Dynamic imports for heavy modules
const WebLLMProvider = lazy(() => import('./providers/webllm'));
const WorkflowEditor = lazy(() => import('./components/WorkflowEditor'));
```

### 15.3 Memory Management

- IndexedDB for large data (history, memory)
- chrome.storage.local for settings (5 MB limit)
- In-memory caching with TTL
- Automatic history cleanup based on retention

### 15.4 WebGPU Requirements

| Browser | Minimum Version | Notes               |
| ------- | --------------- | ------------------- |
| Chrome  | 113+            | Full WebGPU support |
| Edge    | 113+            | Full WebGPU support |
| Firefox | Experimental    | Limited support     |
| Safari  | 17+             | Partial support     |

---

## 16. Testing Strategy

### 16.1 Test Types

| Type        | Framework | Coverage       |
| ----------- | --------- | -------------- |
| Unit Tests  | Vitest    | Core libraries |
| Integration | Vitest    | API routes     |
| E2E         | Planned   | User flows     |

### 16.2 Test Structure

```
tests/
├── unit/
│   ├── llm/
│   ├── nlp/
│   ├── memory/
│   └── workflows/
├── integration/
│   ├── api/
│   └── storage/
└── e2e/
    ├── chat/
    └── workflows/
```

---

## 17. Deployment Architecture

### 17.1 Extension Distribution

| Store            | Status  | URL |
| ---------------- | ------- | --- |
| Chrome Web Store | Pending | -   |
| Firefox Add-ons  | Pending | -   |
| Edge Add-ons     | Planned | -   |

### 17.2 Backend Deployment

```
┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────▶│   API Server    │
│   (HTTPS)       │     │   (Express)     │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   MongoDB Atlas │
                        │   (Cluster)     │
                        └─────────────────┘
```

### 17.3 Admin Dashboard Deployment

- Platform: Vercel (recommended) or self-hosted
- Auth: NextAuth.js with environment secrets
- API: Proxied to backend server

---

## 18. Known Limitations

### 18.1 Technical Limitations

| Limitation                | Impact                          | Mitigation               |
| ------------------------- | ------------------------------- | ------------------------ |
| WebGPU browser support    | Local AI limited to Chrome/Edge | Cloud fallback           |
| Service Worker lifecycle  | Background tasks may interrupt  | Persistent storage       |
| 5 MB storage limit        | Settings only                   | IndexedDB for large data |
| Cross-origin restrictions | Shadow tabs limited             | Same-origin workflows    |
| WebLLM model size         | Large initial download          | Progressive loading      |

### 18.2 Feature Limitations

| Feature            | Current State | Planned            |
| ------------------ | ------------- | ------------------ |
| Multi-language NLP | English only  | Q2 2026            |
| Mobile support     | Desktop only  | Not planned        |
| Safari support     | Limited       | When WebGPU stable |
| Offline cloud LLM  | Not available | Not possible       |

---

## 19. Future Roadmap

### 19.1 Short-term (Q1 2026)

- [ ] Chrome Web Store submission
- [ ] Firefox Add-ons submission
- [ ] Performance optimization
- [ ] Extended model support

### 19.2 Medium-term (Q2-Q3 2026)

- [ ] Multi-language support
- [ ] Advanced workflow templates
- [ ] Team/organization features
- [ ] API for external integrations

### 19.3 Long-term (Q4 2026+)

- [ ] Custom model fine-tuning
- [ ] Enterprise SSO
- [ ] Self-hosted option
- [ ] Mobile companion app

---

## 20. Appendix

### 20.1 Environment Variables

**API Server (`.env`)**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/mirmir
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Admin Dashboard (`.env.local`)**
```env
AUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 20.2 Build Commands

```bash
# Development
yarn dev                    # All apps
yarn workspace extension dev  # Extension only
yarn workspace admin dev      # Admin only
yarn workspace @mirmir/api dev # API only

# Production builds
yarn build                  # All apps
yarn workspace extension build:chrome
yarn workspace extension build:firefox
yarn workspace extension build:all
yarn workspace admin build
yarn workspace @mirmir/api build
```

### 20.3 Key File Locations

| Component          | Path                                          |
| ------------------ | --------------------------------------------- |
| Extension Manifest | `apps/extension/src/manifest/index.ts`        |
| LLM Router         | `apps/extension/src/lib/llm/router.ts`        |
| Voice Recognition  | `apps/extension/src/lib/voice/recognition.ts` |
| Web Agent          | `apps/extension/src/lib/web-agent/agent.ts`   |
| Memory Store       | `apps/extension/src/lib/memory/`              |
| API Routes         | `packages/api/src/routes/`                    |
| Admin Auth         | `apps/admin/src/auth.ts`                      |

### 20.4 API Response Formats

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### 20.5 Version History

| Version | Date     | Changes         |
| ------- | -------- | --------------- |
| 0.1.0   | Feb 2026 | Initial release |

---

## Document Information

**Prepared by:** MirmirOps Development Team  
**Last Updated:** February 8, 2026  
**Classification:** Technical Documentation  
**Distribution:** External Reviewers

---

*This document is confidential and intended for technical review purposes only.*
