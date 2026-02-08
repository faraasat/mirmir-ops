// DOM Controller - Execute actions on web pages

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
      const element = this.findElement(action.target);
      if (!element) return { success: false, error: `Element not found: ${action.target}` };
      
      (element as HTMLElement).click();
      return { success: true, data: { clicked: action.target } };
    },

    type: async (action) => {
      const element = this.findElement(action.target) as HTMLInputElement | HTMLTextAreaElement;
      if (!element) return { success: false, error: `Element not found: ${action.target}` };
      
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

    scroll: async (action) => {
      const { x, y, behavior } = action.value as { x?: number; y?: number; behavior?: ScrollBehavior };
      
      if (action.target) {
        const element = this.findElement(action.target);
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
        // Wait for element
        const result = await this.waitForElement(
          action.target,
          timeout as number,
          condition as 'exists' | 'visible' | 'hidden'
        );
        return { success: result, data: { waited: action.target } };
      }
      
      // Wait for duration
      const duration = action.value as number || 1000;
      await new Promise(resolve => setTimeout(resolve, duration));
      return { success: true, data: { waited: duration } };
    },

    screenshot: async () => {
      // Note: Full screenshot requires background script and tabs API
      // Content script can only capture visible viewport via canvas
      return { 
        success: false, 
        error: 'Screenshot must be triggered from background script' 
      };
    },

    copy: async (action) => {
      let text: string;
      
      if (action.target) {
        const element = this.findElement(action.target);
        text = element?.textContent?.trim() || '';
      } else {
        text = action.value as string || '';
      }
      
      await navigator.clipboard.writeText(text);
      return { success: true, data: { copied: text.slice(0, 100) } };
    },

    paste: async (action) => {
      const element = this.findElement(action.target) as HTMLInputElement | HTMLTextAreaElement;
      if (!element) return { success: false, error: `Element not found: ${action.target}` };
      
      const text = await navigator.clipboard.readText();
      element.focus();
      element.value += text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      return { success: true, data: { pasted: text.slice(0, 100) } };
    },

    select: async (action) => {
      if (action.target) {
        const element = this.findElement(action.target);
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
      const element = this.findElement(action.target);
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
        const element = this.findElement(selector) as HTMLInputElement | HTMLSelectElement;
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
      const form = this.findElement(action.target) as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') {
        // Try to find the closest form
        const element = this.findElement(action.target);
        const closestForm = element?.closest('form');
        if (closestForm) {
          closestForm.submit();
          return { success: true, data: { submitted: true } };
        }
        return { success: false, error: 'Form not found' };
      }
      
      form.submit();
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

  private findElement(selector?: string): Element | null {
    if (!selector) return null;
    
    try {
      // Try as CSS selector first
      let element = document.querySelector(selector);
      if (element) return element;
      
      // Try by ID
      element = document.getElementById(selector);
      if (element) return element;
      
      // Try by name
      element = document.querySelector(`[name="${selector}"]`);
      if (element) return element;
      
      // Try by aria-label
      element = document.querySelector(`[aria-label="${selector}"]`);
      if (element) return element;
      
      // Try by text content (buttons, links)
      const textElements = document.querySelectorAll('button, a, [role="button"]');
      for (const el of textElements) {
        if (el.textContent?.trim().toLowerCase() === selector.toLowerCase()) {
          return el;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private async waitForElement(
    selector: string,
    timeout: number,
    condition: 'exists' | 'visible' | 'hidden' = 'exists'
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = this.findElement(selector);
      
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
