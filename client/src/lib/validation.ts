// Client-side validation utilities for Parul LeadDesk

export const sanitizeMobile = (val: string): string => {
  if (!val) return '';
  let cleaned = val.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

// Indian 10-digit mobile validator: starts with 6, 7, 8, 9
export const indianMobileRegex = /^[6-9]\d{9}$/;
