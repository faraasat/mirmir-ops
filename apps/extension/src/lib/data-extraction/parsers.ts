// Structured Data Parsers - Extract structured data from web pages
import { normalizePrice, normalizeDate, type PriceData, type DateData } from './normalizers';

/**
 * Structured data from JSON-LD, Microdata, or Open Graph
 */
export interface StructuredData {
  type: string;
  source: 'json-ld' | 'microdata' | 'opengraph' | 'meta';
  data: Record<string, unknown>;
}

/**
 * Product data extracted from e-commerce pages
 */
export interface ProductData {
  name: string;
  description?: string;
  price?: PriceData;
  originalPrice?: PriceData;
  currency?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
  brand?: string;
  sku?: string;
  images: string[];
  url: string;
  source: string;
}

/**
 * Event data extracted from event pages
 */
export interface EventData {
  name: string;
  description?: string;
  startDate?: DateData;
  endDate?: DateData;
  location?: {
    name?: string;
    address?: string;
    url?: string;
  };
  organizer?: string;
  price?: PriceData;
  url: string;
  images: string[];
}

/**
 * Article/news data
 */
export interface ArticleData {
  title: string;
  description?: string;
  author?: string;
  publishedDate?: DateData;
  modifiedDate?: DateData;
  publisher?: string;
  content?: string;
  images: string[];
  url: string;
}

/**
 * Business/organization data
 */
export interface BusinessData {
  name: string;
  type?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  hours?: string[];
  rating?: number;
  reviewCount?: number;
}

/**
 * Parse all JSON-LD scripts on the page
 */
export function parseJsonLd(document: Document): StructuredData[] {
  const results: StructuredData[] = [];
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      
      // Handle arrays of items
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item['@type']) {
            results.push({
              type: item['@type'],
              source: 'json-ld',
              data: item,
            });
          }
        });
      } else if (data['@graph']) {
        // Handle @graph format
        data['@graph'].forEach((item: Record<string, unknown>) => {
          if (item['@type']) {
            results.push({
              type: item['@type'] as string,
              source: 'json-ld',
              data: item,
            });
          }
        });
      } else if (data['@type']) {
        results.push({
          type: data['@type'],
          source: 'json-ld',
          data,
        });
      }
    } catch {
      // Invalid JSON, skip
    }
  });
  
  return results;
}

/**
 * Parse Open Graph meta tags
 */
export function parseOpenGraph(document: Document): StructuredData | null {
  const ogData: Record<string, unknown> = {};
  
  const ogTags = document.querySelectorAll('meta[property^="og:"]');
  if (ogTags.length === 0) return null;
  
  ogTags.forEach(tag => {
    const property = tag.getAttribute('property')?.replace('og:', '');
    const content = tag.getAttribute('content');
    if (property && content) {
      ogData[property] = content;
    }
  });
  
  // Also get Twitter cards
  const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
  twitterTags.forEach(tag => {
    const name = tag.getAttribute('name')?.replace('twitter:', 'twitter_');
    const content = tag.getAttribute('content');
    if (name && content) {
      ogData[name] = content;
    }
  });
  
  return {
    type: ogData.type as string || 'website',
    source: 'opengraph',
    data: ogData,
  };
}

/**
 * Parse Microdata (schema.org itemscope/itemprop)
 */
export function parseMicrodata(document: Document): StructuredData[] {
  const results: StructuredData[] = [];
  const items = document.querySelectorAll('[itemscope]');
  
  items.forEach(item => {
    // Skip nested itemscopes (they'll be processed as part of parent)
    if (item.parentElement?.closest('[itemscope]')) return;
    
    const data = extractMicrodataItem(item);
    if (data.type && typeof data.type === 'string') {
      results.push({
        type: data.type,
        source: 'microdata',
        data,
      });
    }
  });
  
  return results;
}

/**
 * Extract microdata from an itemscope element
 */
function extractMicrodataItem(element: Element): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  
  // Get item type
  const itemType = element.getAttribute('itemtype');
  if (itemType) {
    data.type = itemType.split('/').pop() || itemType;
  }
  
  // Get item properties
  const props = element.querySelectorAll('[itemprop]');
  props.forEach(prop => {
    // Skip if this prop belongs to a nested itemscope
    const closestScope = prop.closest('[itemscope]');
    if (closestScope !== element) return;
    
    const propName = prop.getAttribute('itemprop');
    if (!propName) return;
    
    let value: unknown;
    
    if (prop.hasAttribute('itemscope')) {
      value = extractMicrodataItem(prop);
    } else if (prop.hasAttribute('content')) {
      value = prop.getAttribute('content');
    } else if (prop instanceof HTMLAnchorElement) {
      value = prop.href;
    } else if (prop instanceof HTMLImageElement) {
      value = prop.src;
    } else if (prop instanceof HTMLTimeElement) {
      value = prop.dateTime || prop.textContent;
    } else if (prop instanceof HTMLMetaElement) {
      value = prop.content;
    } else {
      value = prop.textContent?.trim();
    }
    
    // Handle multiple values for same property
    if (data[propName] !== undefined) {
      if (Array.isArray(data[propName])) {
        (data[propName] as unknown[]).push(value);
      } else {
        data[propName] = [data[propName], value];
      }
    } else {
      data[propName] = value;
    }
  });
  
  return data;
}

/**
 * Parse all structured data from a page
 */
export function parseAllStructuredData(document: Document): StructuredData[] {
  const results: StructuredData[] = [];
  
  // JSON-LD
  results.push(...parseJsonLd(document));
  
  // Open Graph
  const og = parseOpenGraph(document);
  if (og) results.push(og);
  
  // Microdata
  results.push(...parseMicrodata(document));
  
  return results;
}

/**
 * Extract product data from structured data or page content
 */
export function extractProductData(
  document: Document,
  structuredData?: StructuredData[]
): ProductData | null {
  const data = structuredData || parseAllStructuredData(document);
  
  // Find Product schema
  const productSchema = data.find(d => 
    d.type === 'Product' || 
    d.type.includes('Product')
  );
  
  if (productSchema) {
    return parseProductFromSchema(productSchema.data, document);
  }
  
  // Fallback: extract from common CSS selectors
  return extractProductFromSelectors(document);
}

/**
 * Parse product from schema.org data
 */
function parseProductFromSchema(
  schema: Record<string, unknown>,
  document: Document
): ProductData {
  const offers = schema.offers as Record<string, unknown> | undefined;
  const offerData = Array.isArray(offers) ? offers[0] : offers;
  
  let price: PriceData | undefined;
  let originalPrice: PriceData | undefined;
  
  if (offerData?.price) {
    const currency = (offerData.priceCurrency as string) || 'USD';
    price = normalizePrice(String(offerData.price), currency);
  }
  
  if (offerData?.highPrice && offerData.highPrice !== offerData?.price) {
    originalPrice = normalizePrice(String(offerData.highPrice));
  }
  
  const aggregateRating = schema.aggregateRating as Record<string, unknown> | undefined;
  
  return {
    name: String(schema.name || ''),
    description: String(schema.description || ''),
    price,
    originalPrice,
    currency: (offerData?.priceCurrency as string) || undefined,
    availability: offerData?.availability 
      ? String(offerData.availability).split('/').pop() 
      : undefined,
    rating: aggregateRating?.ratingValue 
      ? parseFloat(String(aggregateRating.ratingValue)) 
      : undefined,
    reviewCount: aggregateRating?.reviewCount 
      ? parseInt(String(aggregateRating.reviewCount)) 
      : undefined,
    brand: typeof schema.brand === 'object' 
      ? String((schema.brand as Record<string, unknown>).name || '')
      : String(schema.brand || ''),
    sku: String(schema.sku || ''),
    images: extractImages(schema.image),
    url: document.location.href,
    source: 'schema',
  };
}

/**
 * Extract product data from common selectors (fallback)
 */
function extractProductFromSelectors(document: Document): ProductData | null {
  // Common product name selectors
  const nameSelectors = [
    'h1[itemprop="name"]',
    '.product-title',
    '.product-name',
    '#product-title',
    'h1.title',
    '[data-testid="product-title"]',
    '.pdp-title',
    'h1',
  ];
  
  const name = findFirstText(document, nameSelectors);
  if (!name) return null;
  
  // Common price selectors
  const priceSelectors = [
    '[itemprop="price"]',
    '.price-current',
    '.product-price',
    '.price',
    '[data-price]',
    '.sale-price',
    '.final-price',
    '#price',
  ];
  
  const priceText = findFirstText(document, priceSelectors);
  const price = priceText ? normalizePrice(priceText) : undefined;
  
  // Original price selectors
  const originalPriceSelectors = [
    '.original-price',
    '.was-price',
    '.list-price',
    '.price-regular',
    'del .price',
    '.price-was',
  ];
  
  const originalPriceText = findFirstText(document, originalPriceSelectors);
  const originalPrice = originalPriceText ? normalizePrice(originalPriceText) : undefined;
  
  // Images
  const images: string[] = [];
  const imgSelectors = [
    '.product-image img',
    '.gallery-image img',
    '[data-gallery-role="gallery-image"] img',
    '.pdp-image img',
    'img[itemprop="image"]',
  ];
  
  for (const selector of imgSelectors) {
    document.querySelectorAll(selector).forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src && !images.includes(src)) {
        images.push(src);
      }
    });
    if (images.length > 0) break;
  }
  
  return {
    name,
    price,
    originalPrice,
    images,
    url: document.location.href,
    source: 'selectors',
  };
}

/**
 * Extract event data from structured data or page content
 */
export function extractEventData(
  document: Document,
  structuredData?: StructuredData[]
): EventData | null {
  const data = structuredData || parseAllStructuredData(document);
  
  // Find Event schema
  const eventSchema = data.find(d => 
    d.type === 'Event' || 
    d.type.includes('Event')
  );
  
  if (eventSchema) {
    return parseEventFromSchema(eventSchema.data, document);
  }
  
  return null;
}

/**
 * Parse event from schema.org data
 */
function parseEventFromSchema(
  schema: Record<string, unknown>,
  document: Document
): EventData {
  const location = schema.location as Record<string, unknown> | undefined;
  const offers = schema.offers as Record<string, unknown> | undefined;
  const offerData = Array.isArray(offers) ? offers[0] : offers;
  
  return {
    name: String(schema.name || ''),
    description: String(schema.description || ''),
    startDate: schema.startDate ? normalizeDate(String(schema.startDate)) : undefined,
    endDate: schema.endDate ? normalizeDate(String(schema.endDate)) : undefined,
    location: location ? {
      name: String(location.name || ''),
      address: typeof location.address === 'object'
        ? formatAddress(location.address as Record<string, unknown>)
        : String(location.address || ''),
      url: String(location.url || ''),
    } : undefined,
    organizer: typeof schema.organizer === 'object'
      ? (schema.organizer as Record<string, unknown>).name as string
      : String(schema.organizer || ''),
    price: offerData?.price 
      ? normalizePrice(String(offerData.price)) 
      : undefined,
    url: document.location.href,
    images: extractImages(schema.image),
  };
}

/**
 * Extract article data from structured data or page content
 */
export function extractArticleData(
  document: Document,
  structuredData?: StructuredData[]
): ArticleData | null {
  const data = structuredData || parseAllStructuredData(document);
  
  // Find Article schema
  const articleSchema = data.find(d => 
    d.type === 'Article' || 
    d.type === 'NewsArticle' ||
    d.type === 'BlogPosting' ||
    d.type.includes('Article')
  );
  
  if (articleSchema) {
    return parseArticleFromSchema(articleSchema.data, document);
  }
  
  // Try Open Graph
  const og = data.find(d => d.source === 'opengraph');
  if (og && og.data.type === 'article') {
    return parseArticleFromOG(og.data, document);
  }
  
  return extractArticleFromMeta(document);
}

/**
 * Parse article from schema.org data
 */
function parseArticleFromSchema(
  schema: Record<string, unknown>,
  document: Document
): ArticleData {
  const author = schema.author as Record<string, unknown> | string | undefined;
  const publisher = schema.publisher as Record<string, unknown> | string | undefined;
  
  return {
    title: String(schema.headline || schema.name || ''),
    description: String(schema.description || ''),
    author: typeof author === 'object' ? String(author.name || '') : String(author || ''),
    publishedDate: schema.datePublished ? normalizeDate(String(schema.datePublished)) : undefined,
    modifiedDate: schema.dateModified ? normalizeDate(String(schema.dateModified)) : undefined,
    publisher: typeof publisher === 'object' ? String(publisher.name || '') : String(publisher || ''),
    images: extractImages(schema.image),
    url: document.location.href,
  };
}

/**
 * Parse article from Open Graph data
 */
function parseArticleFromOG(
  og: Record<string, unknown>,
  document: Document
): ArticleData {
  return {
    title: String(og.title || document.title),
    description: String(og.description || ''),
    author: String(og.author || og['article:author'] || ''),
    publishedDate: og['article:published_time'] 
      ? normalizeDate(String(og['article:published_time'])) 
      : undefined,
    modifiedDate: og['article:modified_time']
      ? normalizeDate(String(og['article:modified_time']))
      : undefined,
    images: og.image ? [String(og.image)] : [],
    url: document.location.href,
  };
}

/**
 * Extract article from meta tags (fallback)
 */
function extractArticleFromMeta(document: Document): ArticleData | null {
  const title = document.title;
  if (!title) return null;
  
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const author = document.querySelector('meta[name="author"]')?.getAttribute('content') || '';
  
  return {
    title,
    description,
    author: author || undefined,
    images: [],
    url: document.location.href,
  };
}

// Helper functions

function extractImages(imageData: unknown): string[] {
  if (!imageData) return [];
  
  if (typeof imageData === 'string') {
    return [imageData];
  }
  
  if (Array.isArray(imageData)) {
    return imageData.map(img => 
      typeof img === 'string' ? img : (img as Record<string, unknown>).url as string
    ).filter(Boolean);
  }
  
  if (typeof imageData === 'object') {
    return [(imageData as Record<string, unknown>).url as string].filter(Boolean);
  }
  
  return [];
}

function formatAddress(address: Record<string, unknown>): string {
  const parts = [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
    address.addressCountry,
  ].filter(Boolean);
  
  return parts.join(', ');
}

function findFirstText(document: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return '';
}
