/** Default currency: Sri Lankan Rupee */
export const DEFAULT_CURRENCY = "LKR";

/** Default customer booking / admin mobile background */
export const DEFAULT_BACKGROUND_COLOR = "#0a0a0a";

/** Default desktop admin dashboard background */
export const DEFAULT_ADMIN_BACKGROUND_COLOR = "#f0f2f5";

/** Default brand accent */
export const DEFAULT_BRAND_COLOR = "#f5c518";

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

// Business Industry Categories
export const INDUSTRY_CATEGORIES = [
  { value: "general", label: "General / Other" },
  { value: "automotive", label: "Automotive & Vehicle Services" },
  { value: "salon_wellness", label: "Salon & Wellness" },
  { value: "healthcare", label: "Healthcare & Medical" },
  { value: "fitness", label: "Fitness & Sports" },
  { value: "education", label: "Education & Training" },
  { value: "home_services", label: "Home Services & Repair" },
  { value: "pets", label: "Pet Care & Veterinary" },
  { value: "legal", label: "Legal Services" },
  { value: "consulting", label: "Consulting & Professional Services" },
] as const;

export type IndustryCategory = typeof INDUSTRY_CATEGORIES[number]["value"];

// Custom fields configuration per industry category
export interface CustomFieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "tel" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  description?: string;
}

export const CATEGORY_CUSTOM_FIELDS: Record<IndustryCategory, CustomFieldConfig[]> = {
  general: [],

  automotive: [
    {
      name: "vehicle_number",
      label: "Vehicle Number / License Plate",
      type: "text",
      placeholder: "e.g., ABC-1234",
      required: true,
      description: "Enter your vehicle registration number"
    },
    {
      name: "vehicle_make",
      label: "Vehicle Make & Model",
      type: "text",
      placeholder: "e.g., Toyota Camry 2020",
      required: false,
    },
    {
      name: "mileage",
      label: "Current Mileage (km)",
      type: "number",
      placeholder: "e.g., 45000",
      required: false,
    },
  ],

  salon_wellness: [
    {
      name: "preferred_stylist",
      label: "Preferred Stylist (Optional)",
      type: "text",
      placeholder: "Any specific stylist you prefer",
      required: false,
    },
    {
      name: "allergies",
      label: "Allergies or Sensitivities",
      type: "textarea",
      placeholder: "List any allergies or product sensitivities",
      required: false,
    },
  ],

  healthcare: [
    {
      name: "patient_id",
      label: "Patient ID (if existing)",
      type: "text",
      placeholder: "Your patient ID number",
      required: false,
    },
    {
      name: "reason_for_visit",
      label: "Reason for Visit",
      type: "textarea",
      placeholder: "Brief description of your concern",
      required: true,
    },
    {
      name: "insurance_provider",
      label: "Insurance Provider",
      type: "text",
      placeholder: "Your insurance company name",
      required: false,
    },
  ],

  fitness: [
    {
      name: "fitness_level",
      label: "Fitness Level",
      type: "select",
      required: false,
      options: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
      ],
    },
    {
      name: "health_conditions",
      label: "Health Conditions or Injuries",
      type: "textarea",
      placeholder: "Any conditions we should know about",
      required: false,
    },
  ],

  education: [
    {
      name: "student_id",
      label: "Student ID",
      type: "text",
      placeholder: "Your student ID number",
      required: false,
    },
    {
      name: "course_interest",
      label: "Course/Subject Interest",
      type: "text",
      placeholder: "What would you like to learn",
      required: false,
    },
  ],

  home_services: [
    {
      name: "property_type",
      label: "Property Type",
      type: "select",
      required: false,
      options: [
        { value: "house", label: "House" },
        { value: "apartment", label: "Apartment" },
        { value: "condo", label: "Condo" },
        { value: "office", label: "Office" },
      ],
    },
    {
      name: "service_location",
      label: "Service Address",
      type: "textarea",
      placeholder: "Full address where service is needed",
      required: true,
    },
  ],

  pets: [
    {
      name: "pet_name",
      label: "Pet Name",
      type: "text",
      placeholder: "Your pet's name",
      required: true,
    },
    {
      name: "pet_type",
      label: "Pet Type & Breed",
      type: "text",
      placeholder: "e.g., Dog - Golden Retriever",
      required: true,
    },
    {
      name: "pet_age",
      label: "Pet Age",
      type: "text",
      placeholder: "e.g., 3 years",
      required: false,
    },
    {
      name: "vaccination_status",
      label: "Vaccination Status",
      type: "text",
      placeholder: "Up to date / Due soon / Unknown",
      required: false,
    },
  ],

  legal: [
    {
      name: "case_type",
      label: "Case Type",
      type: "select",
      required: false,
      options: [
        { value: "consultation", label: "General Consultation" },
        { value: "family", label: "Family Law" },
        { value: "business", label: "Business Law" },
        { value: "criminal", label: "Criminal Law" },
        { value: "property", label: "Property Law" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "case_description",
      label: "Brief Case Description",
      type: "textarea",
      placeholder: "Briefly describe your legal matter",
      required: true,
    },
  ],

  consulting: [
    {
      name: "company_name",
      label: "Company Name",
      type: "text",
      placeholder: "Your company or organization",
      required: false,
    },
    {
      name: "consultation_topic",
      label: "Consultation Topic",
      type: "textarea",
      placeholder: "What would you like to discuss",
      required: true,
    },
  ],
};
