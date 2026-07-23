export const emailRegex = /^[a-zA-Z0-9._%-]+(?:\+[a-zA-Z0-9._%-]+)?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 1. Email Format Validator
export function validateEmailField(email: string): { isValid: boolean; error?: string } {
  const trimmed = email ? email.trim() : '';
  if (!trimmed) return { isValid: false, error: "Please enter a valid email address" };
  
  const parts = trimmed.split('@');
  if (parts.length !== 2) return { isValid: false, error: "Please enter a valid email address" };
  
  const localPart = parts[0];
  const domainPart = parts[1];
  
  if (!localPart || !domainPart) return { isValid: false, error: "Please enter a valid email address" };
  
  // Check domain part: must have characters before and after dot, and a dot itself.
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domainPart)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  // Check localPart:
  // It can contain letters, numbers, dots, hyphens, underscores, and plus.
  if (!/^[a-zA-Z0-9._%+-]+$/.test(localPart)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  // "+" must have characters before and after it before "@"
  if (localPart.startsWith('+') || localPart.endsWith('+') || localPart.includes('++')) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  const generalEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!generalEmailRegex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  return { isValid: true };
}

export function validateEmail(email: string): boolean {
  return validateEmailField(email).isValid;
}

export function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^\d{10}$/.test(phone);
}

// 2. Name Validator
export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name ? name.trim() : '';
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50) {
    return { isValid: false, error: "Name must contain only letters (min 2 characters)" };
  }
  // Only letters, spaces, dots, hyphens allowed. No special chars. No numbers.
  if (!/^[a-zA-Z\s.\-]+$/.test(trimmed)) {
    return { isValid: false, error: "Name must contain only letters (min 2 characters)" };
  }
  return { isValid: true };
}

// 3. Designation Validator
export function validateDesignation(designation: string): { isValid: boolean; error?: string } {
  const trimmed = designation ? designation.trim() : '';
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50 || !/[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: "Designation must contain valid text (min 2 characters)" };
  }
  return { isValid: true };
}

// 4. Course Name Validator
export function validateCourseName(title: string): { isValid: boolean; error?: string } {
  const trimmed = title ? title.trim() : '';
  if (!trimmed || trimmed.length < 3 || trimmed.length > 100 || !/[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: "Course name must contain valid text (min 3 characters)" };
  }
  return { isValid: true };
}

// 5. Description Validator
export function validateDescription(desc: string | undefined | null, isRequired = false): { isValid: boolean; error?: string } {
  const trimmed = desc ? desc.trim() : '';
  if (!trimmed || trimmed.length < 10 || trimmed.length > 1000 || !/[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: "Description must contain valid text (min 10 characters)" };
  }
  return { isValid: true };
}

// 6. URL Validator
export function validateURL(url: string | undefined | null, isRequired = false): { isValid: boolean; error?: string } {
  if (url === undefined || url === null) return { isValid: true };
  const trimmed = url.trim();
  if (trimmed === "") return { isValid: true };
  
  // Starting with http:// or https://
  if (!/^https?:\/\//i.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid URL starting with http:// or https://" };
  }
  try {
    new URL(trimmed);
  } catch (e) {
    return { isValid: false, error: "Please enter a valid URL starting with http:// or https://" };
  }
  return { isValid: true };
}

// 7. Numeric Range Validator (for Duration)
export function validateNumericRange(val: any, min: number, max: number, fieldName: string): { isValid: boolean; error?: string } {
  const isDuration = fieldName.toLowerCase() === 'duration' || fieldName.toLowerCase() === 'completion_duration_days' || fieldName.toLowerCase() === 'completion duration (days)';
  const errMessage = isDuration ? "Duration must be between 1 and 365 days" : `${fieldName} must be between ${min} and ${max}`;
  
  if (val === undefined || val === null || val === '') {
    return { isValid: false, error: errMessage };
  }
  const strVal = String(val).trim();
  // Pos number only, no negative numbers, no text, no decimal.
  if (!/^\d+$/.test(strVal)) {
    return { isValid: false, error: errMessage };
  }
  const num = Number(strVal);
  if (num < min || num > max) {
    return { isValid: false, error: errMessage };
  }
  return { isValid: true };
}

// 8. Employee ID Validator
export function validateEmployeeId(empId: string | undefined | null): { isValid: boolean; error?: string } {
  if (empId === undefined || empId === null) return { isValid: true };
  const trimmed = empId.trim();
  if (trimmed === "") return { isValid: true };
  
  // only letters and numbers allowed, no spaces, no special characters
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: "Employee ID must contain only letters and numbers, no spaces" };
  }
  return { isValid: true };
}
