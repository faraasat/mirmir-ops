// Accessibility Manager - ARIA, focus management, and accessibility utilities

/**
 * Focus trap for modal dialogs
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  let previousActiveElement: HTMLElement | null = null;
  let isActive = false;

  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const getFocusableElements = (): HTMLElement[] => {
    return Array.from(container.querySelectorAll(focusableSelectors));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return {
    activate: () => {
      if (isActive) return;
      isActive = true;

      previousActiveElement = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    },
    deactivate: () => {
      if (!isActive) return;
      isActive = false;

      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    },
  };
}

/**
 * Announce message to screen readers
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcer = getOrCreateAnnouncer(priority);
  
  // Clear previous message
  announcer.textContent = '';
  
  // Set new message after a brief delay to ensure it's announced
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

/**
 * Get or create live region announcer
 */
function getOrCreateAnnouncer(priority: 'polite' | 'assertive'): HTMLElement {
  const id = `a11y-announcer-${priority}`;
  let announcer = document.getElementById(id);

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = id;
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(announcer);
  }

  return announcer;
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Focus first focusable element in container
   */
  focusFirst(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
      return true;
    }
    return false;
  },

  /**
   * Focus last focusable element in container
   */
  focusLast(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
      return true;
    }
    return false;
  },

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    return Array.from(container.querySelectorAll(selectors.join(', ')));
  },

  /**
   * Check if element is focusable
   */
  isFocusable(element: HTMLElement): boolean {
    if (element.matches('[disabled]')) return false;
    if (element.matches('[tabindex="-1"]')) return false;

    const focusableSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]',
    ];

    return focusableSelectors.some(selector => element.matches(selector));
  },

  /**
   * Save current focus state
   */
  saveFocus(): () => void {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      if (activeElement && document.contains(activeElement)) {
        activeElement.focus();
      }
    };
  },
};

/**
 * ARIA utilities
 */
export const aria = {
  /**
   * Set aria-expanded attribute
   */
  setExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', String(expanded));
  },

  /**
   * Set aria-selected attribute
   */
  setSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute('aria-selected', String(selected));
  },

  /**
   * Set aria-hidden attribute
   */
  setHidden(element: HTMLElement, hidden: boolean): void {
    if (hidden) {
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('aria-hidden');
    }
  },

  /**
   * Set aria-disabled attribute
   */
  setDisabled(element: HTMLElement, disabled: boolean): void {
    element.setAttribute('aria-disabled', String(disabled));
    if (disabled) {
      element.setAttribute('tabindex', '-1');
    } else {
      element.removeAttribute('tabindex');
    }
  },

  /**
   * Set aria-busy attribute
   */
  setBusy(element: HTMLElement, busy: boolean): void {
    element.setAttribute('aria-busy', String(busy));
  },

  /**
   * Set aria-label
   */
  setLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
  },

  /**
   * Set aria-describedby
   */
  setDescribedBy(element: HTMLElement, id: string): void {
    element.setAttribute('aria-describedby', id);
  },

  /**
   * Set aria-labelledby
   */
  setLabelledBy(element: HTMLElement, id: string): void {
    element.setAttribute('aria-labelledby', id);
  },

  /**
   * Set aria-controls
   */
  setControls(element: HTMLElement, id: string): void {
    element.setAttribute('aria-controls', id);
  },

  /**
   * Set aria-owns
   */
  setOwns(element: HTMLElement, id: string): void {
    element.setAttribute('aria-owns', id);
  },

  /**
   * Create unique ID
   */
  generateId(prefix: string = 'a11y'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },
};

/**
 * Keyboard navigation helpers
 */
export const keyboardNav = {
  /**
   * Handle arrow key navigation in a list
   */
  handleArrowNav(
    event: KeyboardEvent,
    items: HTMLElement[],
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      loop?: boolean;
      onSelect?: (index: number) => void;
    } = {}
  ): boolean {
    const { orientation = 'vertical', loop = true, onSelect } = options;

    if (items.length === 0) return false;

    const currentIndex = items.findIndex(
      (item) => item === document.activeElement
    );

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation !== 'horizontal') {
          event.preventDefault();
          newIndex = currentIndex - 1;
        }
        break;
      case 'ArrowDown':
        if (orientation !== 'horizontal') {
          event.preventDefault();
          newIndex = currentIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (orientation !== 'vertical') {
          event.preventDefault();
          newIndex = currentIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation !== 'vertical') {
          event.preventDefault();
          newIndex = currentIndex + 1;
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (currentIndex >= 0) {
          event.preventDefault();
          onSelect?.(currentIndex);
          return true;
        }
        return false;
      default:
        return false;
    }

    // Handle looping
    if (loop) {
      if (newIndex < 0) newIndex = items.length - 1;
      if (newIndex >= items.length) newIndex = 0;
    } else {
      newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
      return true;
    }

    return false;
  },

  /**
   * Handle type-ahead search in a list
   */
  createTypeAhead(
    items: HTMLElement[],
    getLabel: (item: HTMLElement) => string
  ): (event: KeyboardEvent) => void {
    let searchString = '';
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;

    return (event: KeyboardEvent) => {
      // Only handle printable characters
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      event.preventDefault();

      // Add to search string
      searchString += event.key.toLowerCase();

      // Clear timeout and set new one
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      searchTimeout = setTimeout(() => {
        searchString = '';
      }, 500);

      // Find matching item
      const matchingItem = items.find((item) =>
        getLabel(item).toLowerCase().startsWith(searchString)
      );

      if (matchingItem) {
        matchingItem.focus();
      }
    };
  },
};

/**
 * Skip link component helper
 */
export function createSkipLink(
  targetId: string,
  label: string = 'Skip to main content'
): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg';
  link.textContent = label;

  link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  });

  return link;
}

/**
 * Reduced motion preference check
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode check
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Color scheme preference
 */
export function preferredColorScheme(): 'light' | 'dark' | 'no-preference' {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'no-preference';
}

/**
 * Initialize accessibility features
 */
export function initializeAccessibility(): void {
  // Add reduced motion class if needed
  if (prefersReducedMotion()) {
    document.documentElement.classList.add('reduce-motion');
  }

  // Listen for preference changes
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  });

  // Add high contrast class if needed
  if (prefersHighContrast()) {
    document.documentElement.classList.add('high-contrast');
  }

  window.matchMedia('(prefers-contrast: more)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  });

  console.log('[Accessibility] Initialized');
}
