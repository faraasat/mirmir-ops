// DOM Controller - Execute actions on web pages
// Provides smart element finding and robust interaction

import type { Action, ActionType } from '@/shared/types';

interface ActionResultInternal {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class DOMController {
  async executeAction(action: Action): Promise<ActionResultInternal> {
    const handler = this.actionHandlers[action.type];
    
    if (!handler) {
      return { success: false, error: `Unknown action type: ${action.type}` };
    }

    try {
      const result = await handler.call(this, action);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
      };
    }
  }

  private actionHandlers: Record<ActionType, (action: Action) => Promise<ActionResultInternal>> = {
    navigate: async (action) => {
      const url = action.value as string;
      if (!url) return { success: false, error: 'No URL provided' };
      
      window.location.href = url;
      return { success: true, data: { navigatedTo: url } };
    },

    click: async (action) => {
      const target = action.target || action.value as string || '';
      
      // If target looks like CSS selectors (contains commas, #, or complex patterns), try each selector
      let element: Element | null = null;
      
      if (target.includes(',') || target.includes('ytd-') || target.includes('[') || target.startsWith('#') || target.startsWith('.')) {
        // Try each selector in the comma-separated list
        const selectors = target.split(',').map(s => s.trim());
        for (const selector of selectors) {
          try {
            const found = document.querySelector(selector);
            if (found && this.isVisible(found)) {
              element = found;
              break;
            }
          } catch { /* invalid selector, try next */ }
        }
      }
      
      // Fall back to smart element finding if selector approach didn't work
      if (!element) {
        element = this.smartFindElement(target, 'clickable');
      }
      
      if (!element) return { success: false, error: `Element not found: ${target}` };
      
      // Scroll into view first
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 300));
      
      // Simulate a realistic click
      const rect = element.getBoundingClientRect();
      const clickX = rect.left + rect.width / 2;
      const clickY = rect.top + rect.height / 2;
      
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: clickX, clientY: clickY }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: clickX, clientY: clickY }));
      (element as HTMLElement).click();
      
      return { success: true, data: { clicked: target, element: element.tagName, text: element.textContent?.trim().slice(0, 80) } };
    },

    type: async (action) => {
      const target = action.target || '';
      const element = this.smartFindElement(target, 'input') as HTMLInputElement | HTMLTextAreaElement;
      if (!element) return { success: false, error: `Input element not found: ${target}` };
      
      const text = action.value as string;
      
      // Clear existing content if specified
      if (action.options?.clear) {
        element.value = '';
      }
      
      // Simulate typing
      element.focus();
      element.value += text;
      
      // Dispatch events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { success: true, data: { typed: text, target: action.target } };
    },

    // "fill" action: find an input (smartly) then type into it and optionally submit
    fill: async (action) => {
      const target = action.target || '';
      const value = action.value as string || '';
      
      // Find the best input element
      const element = this.smartFindElement(target, 'input') as HTMLInputElement | HTMLTextAreaElement;
      if (!element) return { success: false, error: `Input element not found: ${target}` };
      
      // Focus, clear, fill
      element.focus();
      element.value = '';
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      
      // Simulate typing character by character for React/Angular apps
      for (const char of value) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      }
      
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      // If the action has submit option or the target mentions "search", submit
      if (action.options?.submit) {
        await new Promise(r => setTimeout(r, 200));
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        
        // Also try form submission
        const form = element.closest('form');
        if (form) {
          if (form.requestSubmit) { form.requestSubmit(); } else { form.submit(); }
        }
      }
      
      return { success: true, data: { filled: value, target, submitted: !!action.options?.submit } };
    },

    scroll: async (action) => {
      const { x, y, behavior } = action.value as { x?: number; y?: number; behavior?: ScrollBehavior };
      
      if (action.target) {
        const element = this.smartFindElement(action.target, 'any');
        if (element) {
          element.scrollIntoView({ behavior: behavior || 'smooth' });
          return { success: true, data: { scrolledTo: action.target } };
        }
      }
      
      window.scrollTo({
        left: x || 0,
        top: y || 0,
        behavior: behavior || 'smooth',
      });
      
      return { success: true, data: { scrolled: { x, y } } };
    },

    extract: async (action) => {
      const selector = action.target || action.value as string;
      if (!selector) return { success: false, error: 'No selector provided' };
      
      const elements = document.querySelectorAll(selector);
      const data = Array.from(elements).map(el => ({
        text: el.textContent?.trim(),
        html: el.innerHTML.slice(0, 500),
      }));
      
      return { success: true, data };
    },

    wait: async (action) => {
      const { timeout = 5000, condition } = action.options || {};
      
      if (action.target) {
        const result = await this.waitForElement(
          action.target,
          timeout as number,
          condition as 'exists' | 'visible' | 'hidden'
        );
        return { success: result, data: { waited: action.target } };
      }
      
      const duration = action.value as number || 1000;
      await new Promise(resolve => setTimeout(resolve, duration));
      return { success: true, data: { waited: duration } };
    },

    screenshot: async () => {
      return { 
        success: false, 
        error: 'Screenshot must be triggered from background script' 
      };
    },

    copy: async (action) => {
      let text: string;
      
      if (action.target) {
        const element = this.smartFindElement(action.target, 'any');
        text = element?.textContent?.trim() || '';
      } else {
        text = action.value as string || '';
      }
      
      await navigator.clipboard.writeText(text);
      return { success: true, data: { copied: text.slice(0, 100) } };
    },

    paste: async (action) => {
      const element = this.smartFindElement(action.target || '', 'input') as HTMLInputElement | HTMLTextAreaElement;
      if (!element) return { success: false, error: `Element not found: ${action.target}` };
      
      const text = await navigator.clipboard.readText();
      element.focus();
      element.value += text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      return { success: true, data: { pasted: text.slice(0, 100) } };
    },

    select: async (action) => {
      if (action.target) {
        const element = this.smartFindElement(action.target, 'any');
        if (!element) return { success: false, error: `Element not found: ${action.target}` };
        
        const range = document.createRange();
        range.selectNodeContents(element);
        
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        return { success: true, data: { selected: element.textContent?.slice(0, 100) } };
      }
      
      return { success: false, error: 'No target specified for select' };
    },

    hover: async (action) => {
      const element = this.smartFindElement(action.target || '', 'any');
      if (!element) return { success: false, error: `Element not found: ${action.target}` };
      
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      
      return { success: true, data: { hovered: action.target } };
    },

    'fill-form': async (action) => {
      const fields = action.value as Record<string, string>;
      if (!fields) return { success: false, error: 'No form fields provided' };
      
      const filled: string[] = [];
      
      for (const [selector, value] of Object.entries(fields)) {
        const element = this.smartFindElement(selector, 'input') as HTMLInputElement | HTMLSelectElement;
        if (element) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filled.push(selector);
        }
      }
      
      return { success: true, data: { filled } };
    },

    submit: async (action) => {
      const form = this.smartFindElement(action.target || '', 'any') as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') {
        const element = this.smartFindElement(action.target || '', 'any');
        const closestForm = element?.closest('form');
        if (closestForm) {
          if (closestForm.requestSubmit) { closestForm.requestSubmit(); } else { closestForm.submit(); }
          return { success: true, data: { submitted: true } };
        }
        return { success: false, error: 'Form not found' };
      }
      
      if (form.requestSubmit) { form.requestSubmit(); } else { form.submit(); }
      return { success: true, data: { submitted: true } };
    },

    download: async (action) => {
      const url = action.value as string;
      if (!url) return { success: false, error: 'No URL provided for download' };
      
      const a = document.createElement('a');
      a.href = url;
      a.download = (action.options?.filename as string) || '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      return { success: true, data: { downloaded: url } };
    },
  };

  // ─── Smart Element Finding ──────────────────────────────────────────────
  // Uses multiple strategies to find the right element based on natural
  // language descriptions from the LLM.

  private smartFindElement(
    target: string,
    context: 'clickable' | 'input' | 'any'
  ): Element | null {
    if (!target) return null;
    
    const strategies: (() => Element | null)[] = [];

    if (context === 'input') {
      strategies.push(
        // 1. Smart input finding: search boxes, text inputs, textareas
        () => this.findInputElement(target),
      );
    }

    if (context === 'clickable') {
      strategies.push(
        // 1. Partial text match on clickable elements
        () => this.findClickableByText(target),
      );
    }

    // Common strategies for all contexts
    strategies.push(
      // CSS selector
      () => { try { return document.querySelector(target); } catch { return null; } },
      // ID
      () => document.getElementById(target),
      // name attribute
      () => { try { return document.querySelector(`[name="${target}"]`); } catch { return null; } },
      // aria-label (exact)
      () => { try { return document.querySelector(`[aria-label="${target}"]`); } catch { return null; } },
      // aria-label (partial, case-insensitive)
      () => this.findByAttributeContains('aria-label', target),
      // placeholder (partial)
      () => this.findByAttributeContains('placeholder', target),
      // title attribute
      () => this.findByAttributeContains('title', target),
      // data-testid
      () => { try { return document.querySelector(`[data-testid*="${target}"]`); } catch { return null; } },
      // Partial text match on all visible elements
      () => this.findByPartialText(target, context),
    );

    for (const strategy of strategies) {
      try {
        const el = strategy();
        if (el && this.isVisible(el)) return el;
      } catch { /* try next strategy */ }
    }

    return null;
  }

  /**
   * Find the most relevant input element on the page.
   * Handles natural language like "search box", "search", "email field", etc.
   */
  private findInputElement(target: string): Element | null {
    const targetLower = target.toLowerCase();
    
    // Collect all visible input-like elements
    const inputs = Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), ' +
        'textarea, ' +
        '[contenteditable="true"], ' +
        '[role="textbox"], ' +
        '[role="searchbox"], ' +
        '[role="combobox"]'
      )
    ).filter(el => this.isVisible(el));

    if (inputs.length === 0) return null;

    // Score each input based on how well it matches the target description
    const scored = inputs.map(el => {
      let score = 0;
      const input = el as HTMLInputElement;
      const type = input.type?.toLowerCase() || '';
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const className = (el.className || '').toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();

      // Search-related matching
      const isSearchTarget = /search|find|query|look/i.test(targetLower);
      if (isSearchTarget) {
        if (type === 'search') score += 100;
        if (role === 'searchbox' || role === 'combobox') score += 90;
        if (name.includes('search') || name.includes('query') || name.includes('q')) score += 80;
        if (id.includes('search') || id.includes('query')) score += 70;
        if (placeholder.includes('search')) score += 60;
        if (ariaLabel.includes('search')) score += 50;
        if (className.includes('search')) score += 40;
      }

      // Direct attribute matching
      if (name.includes(targetLower) || targetLower.includes(name)) score += 30;
      if (id.includes(targetLower) || targetLower.includes(id)) score += 30;
      if (placeholder.includes(targetLower) || targetLower.includes(placeholder)) score += 25;
      if (ariaLabel.includes(targetLower) || targetLower.includes(ariaLabel)) score += 25;

      // Prefer text/search type inputs
      if (type === 'text' || type === 'search' || type === '') score += 10;
      
      // Prefer inputs that are larger (likely primary inputs)
      const rect = el.getBoundingClientRect();
      if (rect.width > 200) score += 5;
      
      // Prefer inputs near the top of the page
      if (rect.top < 300) score += 5;

      return { element: el, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // If no match scored well, return the first visible text/search input
    if (scored[0]?.score === 0) {
      const defaultInput = inputs.find(el => {
        const type = (el as HTMLInputElement).type?.toLowerCase() || '';
        return type === 'text' || type === 'search' || type === '' || el.tagName === 'TEXTAREA';
      });
      return defaultInput || inputs[0] || null;
    }

    return scored[0]?.element || null;
  }

  /**
   * Find a clickable element by partial text match.
   * Searches links, buttons, and other interactive elements.
   */
  private findClickableByText(target: string): Element | null {
    const targetLower = target.toLowerCase();
    
    // All clickable elements
    const clickables = Array.from(
      document.querySelectorAll(
        'a, button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], ' +
        '[onclick], [tabindex], summary, label, ' +
        'h1 a, h2 a, h3 a, h4 a, ' +
        '[class*="card"], [class*="item"], [class*="result"], [class*="video"], [class*="thumbnail"]'
      )
    ).filter(el => this.isVisible(el));

    // Score based on match quality
    const scored = clickables.map(el => {
      let score = 0;
      const text = (el.textContent || '').trim().toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const href = (el as HTMLAnchorElement).href?.toLowerCase() || '';

      // Exact text match
      if (text === targetLower) score += 100;
      // Text starts with target
      if (text.startsWith(targetLower)) score += 80;
      // Text contains target
      if (text.includes(targetLower)) score += 60;
      // Target contains text (for short button labels)
      if (targetLower.includes(text) && text.length > 2) score += 40;
      
      // Attribute matches
      if (ariaLabel.includes(targetLower)) score += 70;
      if (title.includes(targetLower)) score += 65;
      if (href.includes(targetLower.replace(/\s+/g, ''))) score += 50;
      if (href.includes(targetLower.replace(/\s+/g, '-'))) score += 50;
      if (href.includes(targetLower.replace(/\s+/g, '_'))) score += 50;

      // Penalty for very long text (probably not the right element)
      if (text.length > 200) score -= 20;
      
      // Bonus for prominent elements
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 30) score += 5;

      return { element: el, score };
    });

    scored.sort((a, b) => b.score - a.score);
    
    if (scored[0]?.score > 0) {
      return scored[0].element;
    }

    return null;
  }

  /**
   * Find element by partial attribute value match (case-insensitive)
   */
  private findByAttributeContains(attr: string, value: string): Element | null {
    const valueLower = value.toLowerCase();
    const all = document.querySelectorAll(`[${attr}]`);
    for (const el of all) {
      const attrVal = (el.getAttribute(attr) || '').toLowerCase();
      if (attrVal.includes(valueLower) && this.isVisible(el)) {
        return el;
      }
    }
    return null;
  }

  /**
   * Find any visible element by partial text content
   */
  private findByPartialText(target: string, context: 'clickable' | 'input' | 'any'): Element | null {
    const targetLower = target.toLowerCase();
    let selector = '*';
    
    if (context === 'clickable') {
      selector = 'a, button, [role="button"], [role="link"], h1, h2, h3, h4, [tabindex]';
    } else if (context === 'input') {
      selector = 'input, textarea, [contenteditable], [role="textbox"], [role="searchbox"]';
    }

    const elements = document.querySelectorAll(selector);
    let bestMatch: Element | null = null;
    let bestScore = 0;

    for (const el of elements) {
      if (!this.isVisible(el)) continue;
      const text = (el.textContent || '').trim().toLowerCase();
      
      if (text.includes(targetLower)) {
        // Prefer shorter text (more specific match)
        const score = 1000 - text.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = el;
        }
      }
    }

    return bestMatch;
  }

  private async waitForElement(
    selector: string,
    timeout: number,
    condition: 'exists' | 'visible' | 'hidden' = 'exists'
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = this.smartFindElement(selector, 'any');
      
      switch (condition) {
        case 'exists':
          if (element) return true;
          break;
        case 'visible':
          if (element && this.isVisible(element)) return true;
          break;
        case 'hidden':
          if (!element || !this.isVisible(element)) return true;
          break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  private isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  }
}
