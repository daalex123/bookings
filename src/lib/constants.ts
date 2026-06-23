/** Default currency: Sri Lankan Rupee */
export const DEFAULT_CURRENCY = "LKR";

/** Default timezone: India Standard Time */
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export const CURRENCY_OPTIONS = [
  { code: "LKR", label: "LKR — Sri Lankan Rupee" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
] as const;

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "IST — Asia/Kolkata (India)" },
  { value: "Asia/Colombo", label: "SLST — Asia/Colombo (Sri Lanka)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (US Eastern)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (US Pacific)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
] as const;

export const LOCALE_BY_CURRENCY: Record<string, string> = {
  LKR: "en-LK",
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AUD: "en-AU",
  SGD: "en-SG",
};
