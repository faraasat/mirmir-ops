# MirmirOps: A Unified Browser Intent Engine

## 1. The Core Philosophy

Today, you are the "Human API." You copy a date from an email, paste it into a calendar, check a flight price, and then message a friend. **MirmirOps** eliminates this manual labor by treating the entire browser session as a single, multi-dimensional workspace.

### The Three-Pillar Architecture

| Pillar                       | Function                                                           | The "Magic" Moment                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Voice-Native Flow**        | The interface for high-intent, low-effort commands.                | "Nexus, find that rug I liked on Pinterest and see if it's on sale at any local shops."                              |
| **Cross-Site Orchestration** | The ability to execute a single task across multiple domains.      | The agent navigates, logs in (with permission), and aggregates data from 4 tabs simultaneously.                      |
| **Local-First Memory**       | A private, encrypted vector store of your preferences and history. | "You usually prefer the aisle seat, but since this flight is under 2 hours, I've flagged the cheaper window option." |

## 2. Advanced Features

To make this truly comprehensive, we need features that address the "friction" of current AI:

### A. The "Shadow Tab" Execution Engine

Instead of cluttering your view, the agent spawns **headless background tabs** to perform research.

* **Example:** You ask to "Compare these three GPUs." The agent opens the tabs in the background, parses the specs, and presents a comparison table directly in your current view without you ever leaving the page you’re on.

### B. The "Privacy Vault" (Local-First RAG)

Your browsing history is a goldmine of context, but sending it to the cloud is a privacy nightmare.

* **Feature:** The agent uses a **Local Small Language Model (sLM)** to index your history. When you ask a question, the local model "redacts" or "summarizes" the context before sending a scrubbed, relevant query to the larger LLM.

### C. Voice-to-Action "Micro-Confirmations"

To solve the "AI Hallucination" problem in execution, the agent uses a **Confirmation Loop**.

* **Feature:** Instead of just buying something, the agent says, *"I've added the keyboard to the cart and applied a 10% coupon I found. Ready for you to hit 'Order' whenever you're ready."*

### D. Intent-Based Semantic Search

Traditional history search is keyword-based. MirmirOps uses **Semantic Memory**.

* **Query:** "What was that article I read last month about the future of salt-water batteries?"
* **Result:** The agent finds the exact paragraph, even if you don't remember the title or the website.

## 3. The Comprehensive Prompt for Developers/Hackathons

> **"Build a Browser Agent that functions as a Unified Execution Layer."**

### **The Objective**

Create a browser extension or integration using the **Web Agent API** that bridges the gap between user intent and multi-site execution. The solution must demonstrate a "closed-loop" workflow where the AI sees, thinks, and acts.

### **Technical Requirements**

1. **Context Injection:** The agent must pull data from "Memory" (e.g., a `.json` file of user preferences like 'Budget: $50' or 'Dietary: Vegan') and apply it to a live web search.
2. **Multi-Tab Coordination:** The agent must be able to "Read" Tab A (an event page) and "Write" to Tab B (a calendar or email draft).
3. **Voice Feedback Loop:** Implement a "Push-to-Talk" interface where the agent provides verbal progress updates ("Checking your calendar now...") to reduce user anxiety during long-running tasks.
4. **Safety Guardrails:** Define an "Action Permission" schema.
   * *Tier 1 (Read Only):* Summarizing a page.
   * *Tier 2 (Mutable - Safe):* Adding items to a cart, drafting an email.
   * *Tier 3 (Mutable - Critical):* Finalizing payments, deleting data. (Requires biometric or explicit UI confirmation).

### **User Scenario to Solve**

> "I want to plan a 3-day trip to Tokyo in April. Check my calendar for the best weekend, find a hotel under $200/night that has a gym, and draft an itinerary. Use my airline miles if possible."

## 4. Evaluation Criteria: What Defines Success?

* **Contextual Integrity:** Does the agent remember the user's budget across different sites?
* **Friction Reduction:** Does the agent decrease the "Click-to-Goal" ratio? (e.g., performing a task in 1 voice command that usually takes 15 clicks).
* **Transparency:** Can the user see a "log" of what the agent did in the background?
* **Resilience:** How does the agent handle a site with a complex UI or a pop-up ad?
