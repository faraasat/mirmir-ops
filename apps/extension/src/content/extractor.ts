// DOM Extractor - Extract structured data from web pages

export interface PageContext {
  url: string;
  title: string;
  description: string;
  mainContent: string;
  headings: string[];
  forms: FormData[];
  links: LinkData[];
  images: ImageData[];
  selection: string;
}

export interface FormData {
  id: string;
  action: string;
  method: string;
  fields: FormFieldData[];
}

export interface FormFieldData {
  name: string;
  type: string;
  label: string;
  value: string;
  required: boolean;
  options?: string[];
}

export interface LinkData {
  text: string;
  href: string;
  isExternal: boolean;
}

export interface ImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export class DOMExtractor {
  getPageContext(): PageContext {
    return {
      url: window.location.href,
      title: document.title,
      description: this.getMetaDescription(),
      mainContent: this.getMainContent(),
      headings: this.getHeadings(),
      forms: this.extractForms(),
      links: this.extractLinks().slice(0, 20), // Limit for context
      images: this.extractImages().slice(0, 10),
      selection: this.getSelection(),
    };
  }

  private getMetaDescription(): string {
    const meta = document.querySelector('meta[name="description"]');
    return meta?.getAttribute('content') || '';
  }

  private getMainContent(): string {
    // Try to find main content area
    const main = document.querySelector('main, [role="main"], article, .content, #content');
    if (main) {
      return this.cleanText(main.textContent || '');
    }
    
    // Fallback to body, excluding nav/header/footer
    const body = document.body.cloneNode(true) as HTMLElement;
    const toRemove = body.querySelectorAll('nav, header, footer, script, style, noscript');
    toRemove.forEach(el => el.remove());
    
    return this.cleanText(body.textContent || '').slice(0, 5000); // Limit size
  }

  private getHeadings(): string[] {
    const headings: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
      const text = this.cleanText(h.textContent || '');
      if (text) headings.push(text);
    });
    return headings.slice(0, 20);
  }

  private getSelection(): string {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  extractForms(): FormData[] {
    const forms: FormData[] = [];
    
    document.querySelectorAll('form').forEach((form, index) => {
      const fields: FormFieldData[] = [];
      
      form.querySelectorAll('input, select, textarea').forEach(input => {
        const inputEl = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const field: FormFieldData = {
          name: inputEl.name || inputEl.id || `field_${fields.length}`,
          type: inputEl.type || 'text',
          label: this.findLabel(inputEl),
          value: inputEl.value,
          required: inputEl.required,
        };
        
        if (inputEl instanceof HTMLSelectElement) {
          field.options = Array.from(inputEl.options).map(opt => opt.text);
        }
        
        fields.push(field);
      });
      
      forms.push({
        id: form.id || `form_${index}`,
        action: form.action,
        method: form.method || 'GET',
        fields,
      });
    });
    
    return forms;
  }

  private findLabel(input: HTMLElement): string {
    // Check for associated label
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return this.cleanText(label.textContent || '');
    }
    
    // Check parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return this.cleanText(parentLabel.textContent || '');
    }
    
    // Check aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Check placeholder
    const placeholder = input.getAttribute('placeholder');
    if (placeholder) return placeholder;
    
    return input.getAttribute('name') || '';
  }

  extractLinks(): LinkData[] {
    const links: LinkData[] = [];
    const currentHost = window.location.hostname;
    
    document.querySelectorAll('a[href]').forEach(anchor => {
      const a = anchor as HTMLAnchorElement;
      const href = a.href;
      
      // Skip empty, javascript:, and anchor links
      if (!href || href.startsWith('javascript:') || href === '#') return;
      
      try {
        const url = new URL(href);
        links.push({
          text: this.cleanText(a.textContent || a.title || ''),
          href: href,
          isExternal: url.hostname !== currentHost,
        });
      } catch {
        // Invalid URL, skip
      }
    });
    
    return links;
  }

  extractImages(): ImageData[] {
    const images: ImageData[] = [];
    
    document.querySelectorAll('img[src]').forEach(img => {
      const image = img as HTMLImageElement;
      
      // Skip tiny images (likely icons/trackers)
      if (image.width < 50 || image.height < 50) return;
      
      images.push({
        src: image.src,
        alt: image.alt || '',
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    });
    
    return images;
  }

  extractTables(): TableData[] {
    const tables: TableData[] = [];
    
    document.querySelectorAll('table').forEach(table => {
      const headers: string[] = [];
      const rows: string[][] = [];
      
      // Extract headers
      table.querySelectorAll('thead th, tr:first-child th').forEach(th => {
        headers.push(this.cleanText(th.textContent || ''));
      });
      
      // Extract rows
      table.querySelectorAll('tbody tr, tr:not(:first-child)').forEach(tr => {
        const cells: string[] = [];
        tr.querySelectorAll('td, th').forEach(cell => {
          cells.push(this.cleanText(cell.textContent || ''));
        });
        if (cells.length > 0) rows.push(cells);
      });
      
      if (headers.length > 0 || rows.length > 0) {
        tables.push({ headers, rows });
      }
    });
    
    return tables;
  }

  extractBySelector(selector: string): unknown {
    try {
      const elements = document.querySelectorAll(selector);
      const results: unknown[] = [];
      
      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          results.push({
            tag: tagName,
            name: (el as HTMLInputElement).name,
            value: (el as HTMLInputElement).value,
          });
        } else if (tagName === 'a') {
          results.push({
            tag: tagName,
            text: el.textContent?.trim(),
            href: (el as HTMLAnchorElement).href,
          });
        } else if (tagName === 'img') {
          results.push({
            tag: tagName,
            src: (el as HTMLImageElement).src,
            alt: (el as HTMLImageElement).alt,
          });
        } else {
          results.push({
            tag: tagName,
            text: el.textContent?.trim(),
            html: el.innerHTML.slice(0, 500),
          });
        }
      });
      
      return results;
    } catch (error) {
      throw new Error(`Invalid selector: ${selector}`);
    }
  }

  extractPageSummary(): {
    url: string;
    title: string;
    description: string;
    headings: string[];
    wordCount: number;
    formCount: number;
    linkCount: number;
    imageCount: number;
  } {
    return {
      url: window.location.href,
      title: document.title,
      description: this.getMetaDescription(),
      headings: this.getHeadings(),
      wordCount: (document.body.textContent || '').split(/\s+/).length,
      formCount: document.querySelectorAll('form').length,
      linkCount: document.querySelectorAll('a[href]').length,
      imageCount: document.querySelectorAll('img[src]').length,
    };
  }
}
