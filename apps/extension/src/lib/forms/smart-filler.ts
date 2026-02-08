// Smart Form Filler - Intelligent form detection and filling

/**
 * Detected form field with smart labeling
 */
export interface SmartFormField {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  name: string;
  type: string;
  label: string;
  inferredType: InferredFieldType;
  required: boolean;
  pattern?: string;
  options?: string[];
  currentValue: string;
  placeholder?: string;
  autocomplete?: string;
  validationMessage?: string;
}

/**
 * Inferred field types based on heuristics
 */
export type InferredFieldType = 
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'phone'
  | 'address'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'country'
  | 'zipCode'
  | 'creditCard'
  | 'cvv'
  | 'expiryDate'
  | 'username'
  | 'company'
  | 'website'
  | 'message'
  | 'search'
  | 'date'
  | 'dateOfBirth'
  | 'gender'
  | 'quantity'
  | 'price'
  | 'coupon'
  | 'unknown';

/**
 * User preferences for auto-fill
 */
export interface UserPreferences {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  company?: string;
  website?: string;
  username?: string;
  // Credit card info should be handled securely, not stored here
}

/**
 * Field to preference mapping
 */
export interface FieldMapping {
  field: SmartFormField;
  preferenceKey: keyof UserPreferences | null;
  value: string;
  confidence: number;
}

/**
 * Multi-step form information
 */
export interface MultiStepFormInfo {
  isMultiStep: boolean;
  currentStep: number;
  totalSteps: number;
  stepIndicators: string[];
  nextButton?: HTMLElement;
  prevButton?: HTMLElement;
  submitButton?: HTMLElement;
}

/**
 * CAPTCHA detection result
 */
export interface CAPTCHAInfo {
  detected: boolean;
  type: 'recaptcha-v2' | 'recaptcha-v3' | 'hcaptcha' | 'cloudflare' | 'funcaptcha' | 'text-captcha' | 'unknown';
  element?: HTMLElement;
  iframeElement?: HTMLIFrameElement;
  isCompleted?: boolean;
}

/**
 * Form fill result
 */
export interface FillResult {
  success: boolean;
  filledFields: number;
  totalFields: number;
  skippedFields: string[];
  errors: string[];
  captchaDetected: boolean;
}

// Field type inference patterns
const FIELD_PATTERNS: Record<InferredFieldType, RegExp[]> = {
  email: [/email/i, /e-mail/i, /mail/i],
  password: [/password/i, /pass/i, /pwd/i, /secret/i],
  confirmPassword: [/confirm.?pass/i, /password.?confirm/i, /retype.?pass/i, /re.?enter.?pass/i],
  firstName: [/first.?name/i, /fname/i, /given.?name/i, /prenom/i],
  lastName: [/last.?name/i, /lname/i, /surname/i, /family.?name/i, /nom/i],
  fullName: [/full.?name/i, /name/i, /your.?name/i],
  phone: [/phone/i, /tel/i, /mobile/i, /cell/i, /fax/i],
  address: [/address/i, /street/i, /addr/i, /line.?1/i],
  addressLine2: [/line.?2/i, /apt/i, /suite/i, /unit/i, /floor/i],
  city: [/city/i, /town/i, /locality/i, /ville/i],
  state: [/state/i, /province/i, /region/i, /county/i],
  country: [/country/i, /nation/i, /pays/i],
  zipCode: [/zip/i, /postal/i, /post.?code/i, /postcode/i],
  creditCard: [/card.?number/i, /credit.?card/i, /cc.?num/i, /pan/i],
  cvv: [/cvv/i, /cvc/i, /security.?code/i, /card.?code/i],
  expiryDate: [/expir/i, /exp.?date/i, /valid.?thru/i],
  username: [/user.?name/i, /login/i, /account/i, /nickname/i],
  company: [/company/i, /organization/i, /business/i, /employer/i],
  website: [/website/i, /url/i, /homepage/i, /site/i],
  message: [/message/i, /comment/i, /feedback/i, /description/i, /notes/i],
  search: [/search/i, /query/i, /find/i],
  date: [/date/i, /when/i],
  dateOfBirth: [/birth/i, /dob/i, /birthday/i],
  gender: [/gender/i, /sex/i],
  quantity: [/quantity/i, /qty/i, /amount/i, /count/i],
  price: [/price/i, /cost/i, /total/i, /amount/i],
  coupon: [/coupon/i, /promo/i, /discount/i, /voucher/i],
  unknown: [],
};

// Autocomplete attribute to field type mapping
const AUTOCOMPLETE_MAP: Record<string, InferredFieldType> = {
  'email': 'email',
  'username': 'username',
  'current-password': 'password',
  'new-password': 'password',
  'given-name': 'firstName',
  'family-name': 'lastName',
  'name': 'fullName',
  'tel': 'phone',
  'street-address': 'address',
  'address-line1': 'address',
  'address-line2': 'addressLine2',
  'address-level2': 'city',
  'address-level1': 'state',
  'country': 'country',
  'country-name': 'country',
  'postal-code': 'zipCode',
  'cc-number': 'creditCard',
  'cc-csc': 'cvv',
  'cc-exp': 'expiryDate',
  'organization': 'company',
  'url': 'website',
  'bday': 'dateOfBirth',
  'sex': 'gender',
};

/**
 * Detect all form fields with smart labeling
 */
export function detectFormFields(form: HTMLFormElement): SmartFormField[] {
  const fields: SmartFormField[] = [];
  
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    const el = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Skip hidden and submit/button inputs
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'reset') {
      return;
    }
    
    const field = analyzeField(el);
    fields.push(field);
  });
  
  return fields;
}

/**
 * Analyze a single form field
 */
function analyzeField(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): SmartFormField {
  const label = findFieldLabel(el);
  const inferredType = inferFieldType(el, label);
  
  const field: SmartFormField = {
    element: el,
    name: el.name || el.id || '',
    type: el.type || 'text',
    label,
    inferredType,
    required: el.required,
    currentValue: el.value,
    placeholder: 'placeholder' in el ? (el as HTMLInputElement).placeholder || undefined : undefined,
    autocomplete: el.autocomplete || undefined,
  };
  
  if (el instanceof HTMLInputElement) {
    field.pattern = el.pattern || undefined;
  }
  
  if (el instanceof HTMLSelectElement) {
    field.options = Array.from(el.options).map(opt => opt.text);
  }
  
  return field;
}

/**
 * Find the label for a form field
 */
function findFieldLabel(el: HTMLElement): string {
  // Check for associated label
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent) {
      return cleanText(label.textContent);
    }
  }
  
  // Check parent label
  const parentLabel = el.closest('label');
  if (parentLabel?.textContent) {
    // Remove the input's value from label text
    const text = parentLabel.textContent;
    const inputValue = (el as HTMLInputElement).value;
    return cleanText(text.replace(inputValue, ''));
  }
  
  // Check aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl?.textContent) {
      return cleanText(labelEl.textContent);
    }
  }
  
  // Check placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder;
  
  // Check preceding sibling or nearby text
  const prevSibling = el.previousElementSibling;
  if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN')) {
    return cleanText(prevSibling.textContent || '');
  }
  
  // Use name or id as fallback
  return (el as HTMLInputElement).name || el.id || '';
}

/**
 * Infer the field type based on various signals
 */
function inferFieldType(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  label: string
): InferredFieldType {
  // Check autocomplete attribute first (most reliable)
  const autocomplete = el.autocomplete;
  if (autocomplete && AUTOCOMPLETE_MAP[autocomplete]) {
    return AUTOCOMPLETE_MAP[autocomplete];
  }
  
  // Check input type
  if (el instanceof HTMLInputElement) {
    if (el.type === 'email') return 'email';
    if (el.type === 'password') return 'password';
    if (el.type === 'tel') return 'phone';
    if (el.type === 'url') return 'website';
    if (el.type === 'search') return 'search';
    if (el.type === 'date') return 'date';
  }
  
  // Check name, id, and label against patterns
  const searchStrings = [
    label,
    el.name,
    el.id,
    'placeholder' in el ? (el as HTMLInputElement).placeholder || '' : '',
    el.getAttribute('data-field') || '',
    el.className,
  ].join(' ').toLowerCase();
  
  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS) as [InferredFieldType, RegExp[]][]) {
    if (fieldType === 'unknown') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(searchStrings)) {
        return fieldType;
      }
    }
  }
  
  // Special case: if it looks like a name field but follows another name field
  if (el.type === 'text' && /name/i.test(searchStrings)) {
    const prevInput = el.previousElementSibling;
    if (prevInput instanceof HTMLInputElement && 
        /first/i.test(prevInput.name + prevInput.id)) {
      return 'lastName';
    }
  }
  
  return 'unknown';
}

/**
 * Match form fields to user preferences
 */
export function matchFieldsToPreferences(
  fields: SmartFormField[],
  prefs: UserPreferences
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  
  for (const field of fields) {
    const mapping = mapFieldToPreference(field, prefs);
    mappings.push(mapping);
  }
  
  return mappings;
}

/**
 * Map a single field to a preference value
 */
function mapFieldToPreference(
  field: SmartFormField,
  prefs: UserPreferences
): FieldMapping {
  const typeToPreference: Partial<Record<InferredFieldType, keyof UserPreferences>> = {
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    fullName: 'fullName',
    phone: 'phone',
    address: 'address',
    addressLine2: 'addressLine2',
    city: 'city',
    state: 'state',
    country: 'country',
    zipCode: 'zipCode',
    company: 'company',
    website: 'website',
    username: 'username',
  };
  
  const prefKey = typeToPreference[field.inferredType] || null;
  const value = prefKey ? prefs[prefKey] || '' : '';
  
  // Calculate confidence based on how the match was made
  let confidence = 0;
  if (prefKey && value) {
    if (field.autocomplete && AUTOCOMPLETE_MAP[field.autocomplete]) {
      confidence = 0.95; // Autocomplete is very reliable
    } else if (field.type === 'email' && field.inferredType === 'email') {
      confidence = 0.9;
    } else {
      confidence = 0.7; // Pattern matching
    }
  }
  
  return {
    field,
    preferenceKey: prefKey,
    value,
    confidence,
  };
}

/**
 * Detect CAPTCHA on a page or form
 */
export function detectCAPTCHA(element?: HTMLElement): CAPTCHAInfo {
  const root = element || document.body;
  
  // reCAPTCHA v2
  const recaptchaV2 = root.querySelector('.g-recaptcha, [data-sitekey]');
  if (recaptchaV2) {
    const iframe = document.querySelector('iframe[src*="recaptcha"]') as HTMLIFrameElement | null;
    return {
      detected: true,
      type: 'recaptcha-v2',
      element: recaptchaV2 as HTMLElement,
      iframeElement: iframe || undefined,
      isCompleted: checkRecaptchaCompleted(),
    };
  }
  
  // reCAPTCHA v3 (invisible)
  const recaptchaV3Script = document.querySelector('script[src*="recaptcha/api.js?render"]');
  if (recaptchaV3Script) {
    return {
      detected: true,
      type: 'recaptcha-v3',
      isCompleted: true, // v3 is invisible, assume completed
    };
  }
  
  // hCaptcha
  const hcaptcha = root.querySelector('.h-captcha, [data-hcaptcha]');
  if (hcaptcha) {
    const iframe = document.querySelector('iframe[src*="hcaptcha"]') as HTMLIFrameElement | null;
    return {
      detected: true,
      type: 'hcaptcha',
      element: hcaptcha as HTMLElement,
      iframeElement: iframe || undefined,
      isCompleted: checkHCaptchaCompleted(),
    };
  }
  
  // Cloudflare Turnstile
  const cloudflare = root.querySelector('.cf-turnstile, [data-sitekey][data-cfasync]');
  if (cloudflare) {
    return {
      detected: true,
      type: 'cloudflare',
      element: cloudflare as HTMLElement,
      isCompleted: checkCloudflareChallengeCompleted(),
    };
  }
  
  // FunCaptcha
  const funcaptcha = root.querySelector('#funcaptcha, .arkose-challenge');
  if (funcaptcha) {
    return {
      detected: true,
      type: 'funcaptcha',
      element: funcaptcha as HTMLElement,
    };
  }
  
  // Generic text CAPTCHA (image-based)
  const textCaptcha = root.querySelector(
    'img[src*="captcha"], input[name*="captcha"], .captcha-image'
  );
  if (textCaptcha) {
    return {
      detected: true,
      type: 'text-captcha',
      element: textCaptcha as HTMLElement,
    };
  }
  
  // Check for CAPTCHA in iframe titles or src
  const iframes = root.querySelectorAll('iframe');
  for (const iframe of iframes) {
    const src = iframe.src.toLowerCase();
    const title = iframe.title.toLowerCase();
    
    if (src.includes('captcha') || title.includes('captcha')) {
      return {
        detected: true,
        type: 'unknown',
        iframeElement: iframe as HTMLIFrameElement,
      };
    }
  }
  
  return { detected: false, type: 'unknown' };
}

/**
 * Check if reCAPTCHA has been completed
 */
function checkRecaptchaCompleted(): boolean {
  // Check for grecaptcha response
  const responseInput = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement | null;
  if (responseInput && responseInput.value) {
    return true;
  }
  
  // Check for the checkmark visual
  const checkmark = document.querySelector('.recaptcha-checkbox-checked');
  return !!checkmark;
}

/**
 * Check if hCaptcha has been completed
 */
function checkHCaptchaCompleted(): boolean {
  const responseInput = document.querySelector('textarea[name="h-captcha-response"]') as HTMLTextAreaElement | null;
  return !!(responseInput && responseInput.value);
}

/**
 * Check if Cloudflare challenge has been completed
 */
function checkCloudflareChallengeCompleted(): boolean {
  const responseInput = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
  return !!(responseInput && responseInput.value);
}

/**
 * Detect multi-step form
 */
export function detectMultiStepForm(form: HTMLFormElement): MultiStepFormInfo {
  // Look for step indicators
  const stepIndicators: string[] = [];
  
  // Common step indicator selectors
  const indicatorSelectors = [
    '.step', '.wizard-step', '.form-step',
    '[data-step]', '.progress-step', '.stepper-item',
    'li.active', '.step-indicator',
  ];
  
  for (const selector of indicatorSelectors) {
    const steps = form.querySelectorAll(selector);
    if (steps.length > 1) {
      steps.forEach((step, i) => {
        stepIndicators.push(step.textContent?.trim() || `Step ${i + 1}`);
      });
      break;
    }
  }
  
  // Also check document (step indicators might be outside form)
  if (stepIndicators.length === 0) {
    const documentSteps = document.querySelectorAll('.wizard-steps li, .form-steps li, .stepper li');
    documentSteps.forEach((step, i) => {
      stepIndicators.push(step.textContent?.trim() || `Step ${i + 1}`);
    });
  }
  
  // Determine current step
  let currentStep = 1;
  const activeStep = form.querySelector('.step.active, .step.current, [data-step].active');
  if (activeStep) {
    const stepNum = activeStep.getAttribute('data-step') || 
                    activeStep.querySelector('[data-step]')?.getAttribute('data-step');
    if (stepNum) {
      currentStep = parseInt(stepNum);
    }
  }
  
  // Find navigation buttons
  const nextButton = form.querySelector(
    'button[type="button"]:not([type="submit"]), .next-step, .btn-next, [data-action="next"]'
  ) as HTMLElement | null;
  
  const prevButton = form.querySelector(
    '.prev-step, .btn-prev, .back-step, [data-action="prev"], [data-action="back"]'
  ) as HTMLElement | null;
  
  const submitButton = form.querySelector(
    'button[type="submit"], input[type="submit"], .submit-btn'
  ) as HTMLElement | null;
  
  const isMultiStep = stepIndicators.length > 1 || !!nextButton;
  
  return {
    isMultiStep,
    currentStep,
    totalSteps: stepIndicators.length || (isMultiStep ? 2 : 1),
    stepIndicators,
    nextButton: nextButton || undefined,
    prevButton: prevButton || undefined,
    submitButton: submitButton || undefined,
  };
}

/**
 * Fill form with user preferences
 */
export async function fillFormWithPreferences(
  form: HTMLFormElement,
  prefs: UserPreferences
): Promise<FillResult> {
  const fields = detectFormFields(form);
  const mappings = matchFieldsToPreferences(fields, prefs);
  const captchaInfo = detectCAPTCHA(form);
  
  const result: FillResult = {
    success: true,
    filledFields: 0,
    totalFields: fields.length,
    skippedFields: [],
    errors: [],
    captchaDetected: captchaInfo.detected,
  };
  
  for (const mapping of mappings) {
    if (!mapping.value || mapping.confidence < 0.5) {
      result.skippedFields.push(mapping.field.name || mapping.field.inferredType);
      continue;
    }
    
    try {
      await fillField(mapping.field.element, mapping.value);
      result.filledFields++;
    } catch (error) {
      result.errors.push(`Failed to fill ${mapping.field.name}: ${error}`);
    }
  }
  
  result.success = result.errors.length === 0 && result.filledFields > 0;
  
  return result;
}

/**
 * Fill a single form field with a value
 */
async function fillField(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string
): Promise<void> {
  // Focus the element
  element.focus();
  
  // Clear existing value
  element.value = '';
  
  // Set new value
  element.value = value;
  
  // Dispatch events for validation
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // Small delay for any JavaScript handlers
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Clean text by removing extra whitespace
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Analyze a form completely
 */
export function analyzeForm(form: HTMLFormElement): {
  fields: SmartFormField[];
  multiStep: MultiStepFormInfo;
  captcha: CAPTCHAInfo;
  submitButton?: HTMLElement;
} {
  return {
    fields: detectFormFields(form),
    multiStep: detectMultiStepForm(form),
    captcha: detectCAPTCHA(form),
    submitButton: form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | undefined,
  };
}
