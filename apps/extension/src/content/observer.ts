// DOM Observer - Watch for dynamic content changes

import browser from 'webextension-polyfill';

interface ObserverConfig {
  mutations: boolean;
  intersection: boolean;
  resize: boolean;
}

export class DOMObserver {
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isRunning = false;
  
  private config: ObserverConfig = {
    mutations: true,
    intersection: true,
    resize: false,
  };

  start(config?: Partial<ObserverConfig>): void {
    if (this.isRunning) return;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.mutations) {
      this.startMutationObserver();
    }
    
    if (this.config.intersection) {
      this.startIntersectionObserver();
    }
    
    if (this.config.resize) {
      this.startResizeObserver();
    }
    
    this.isRunning = true;
    console.log('[MirmirOps Observer] Started');
  }

  stop(): void {
    this.mutationObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.resizeObserver?.disconnect();
    
    this.mutationObserver = null;
    this.intersectionObserver = null;
    this.resizeObserver = null;
    
    this.isRunning = false;
    console.log('[MirmirOps Observer] Stopped');
  }

  private startMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'disabled'],
    });
  }

  private handleMutations(mutations: MutationRecord[]): void {
    const significantChanges: {
      type: string;
      target: string;
      added?: number;
      removed?: number;
    }[] = [];

    for (const mutation of mutations) {
      // Track significant DOM changes
      if (mutation.type === 'childList') {
        const added = mutation.addedNodes.length;
        const removed = mutation.removedNodes.length;
        
        // Only track significant changes (not single text nodes)
        if (added > 3 || removed > 3) {
          significantChanges.push({
            type: 'content',
            target: this.getElementPath(mutation.target as Element),
            added,
            removed,
          });
        }
        
        // Check for new forms
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) {
            if (node.tagName === 'FORM' || node.querySelector('form')) {
              significantChanges.push({
                type: 'form-added',
                target: this.getElementPath(node),
              });
            }
            
            // Check for modals/dialogs
            if (this.isModalLike(node)) {
              significantChanges.push({
                type: 'modal-opened',
                target: this.getElementPath(node),
              });
            }
          }
        });
      }
      
      // Track visibility changes
      if (mutation.type === 'attributes' && mutation.attributeName) {
        const target = mutation.target as Element;
        const attr = mutation.attributeName;
        
        if (['hidden', 'style', 'class'].includes(attr)) {
          const isNowVisible = this.isVisible(target);
          
          if (this.isModalLike(target)) {
            significantChanges.push({
              type: isNowVisible ? 'modal-opened' : 'modal-closed',
              target: this.getElementPath(target),
            });
          }
        }
      }
    }

    // Notify background if significant changes occurred
    if (significantChanges.length > 0) {
      this.notifyChanges(significantChanges);
    }
  }

  private startIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.handleIntersection(entries);
      },
      {
        root: null,
        threshold: [0, 0.5, 1],
      }
    );

    // Observe important elements
    document.querySelectorAll('form, [role="dialog"], [role="alert"]').forEach(el => {
      this.intersectionObserver?.observe(el);
    });
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        const target = entry.target;
        
        // Form came into view
        if (target.tagName === 'FORM') {
          console.log('[MirmirOps Observer] Form visible:', this.getElementPath(target));
        }
      }
    }
  }

  private startResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Could track layout changes here
        console.log('[MirmirOps Observer] Element resized:', entry.contentRect);
      }
    });
  }

  private isModalLike(element: Element): boolean {
    // Check for common modal patterns
    const role = element.getAttribute('role');
    if (role === 'dialog' || role === 'alertdialog') return true;
    
    const className = element.className?.toLowerCase?.() || '';
    if (
      className.includes('modal') ||
      className.includes('dialog') ||
      className.includes('popup') ||
      className.includes('overlay')
    ) {
      return true;
    }
    
    // Check for fixed/absolute positioning with high z-index
    const style = window.getComputedStyle(element);
    if (
      (style.position === 'fixed' || style.position === 'absolute') &&
      parseInt(style.zIndex || '0') > 100
    ) {
      return true;
    }
    
    return false;
  }

  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      !element.hasAttribute('hidden')
    );
  }

  private getElementPath(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body && parts.length < 4) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c).slice(0, 2);
        if (classes.length) {
          selector += `.${classes.join('.')}`;
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    
    return parts.join(' > ');
  }

  private async notifyChanges(changes: unknown[]): Promise<void> {
    try {
      await browser.runtime.sendMessage({
        type: 'DOM_CHANGES',
        payload: {
          url: window.location.href,
          changes,
          timestamp: Date.now(),
        },
      });
    } catch {
      // Background not ready, ignore
    }
  }

  // Public methods to observe specific elements
  observeElement(element: Element): void {
    this.intersectionObserver?.observe(element);
  }

  unobserveElement(element: Element): void {
    this.intersectionObserver?.unobserve(element);
  }
}
